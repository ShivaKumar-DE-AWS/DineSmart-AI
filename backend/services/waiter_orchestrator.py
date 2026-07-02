import json
import logging
import uuid
import re
import asyncio
from typing import List, Dict, Any, Optional
from google import genai
from google.genai import types as genai_types
from deps import db, now_iso, GEMINI_API_KEY
from services.waiter_tools import WaiterTools

logger = logging.getLogger(__name__)

# Define the function declarations for Gemini
WAITER_FUNCTIONS = [
    genai_types.FunctionDeclaration(
        name="search_menu",
        description="Search the restaurant's live menu by free text and/or dietary filter. Always use this instead of guessing menu items.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "query": genai_types.Schema(type=genai_types.Type.STRING, description="Free-text search, e.g. 'spicy chicken'"),
                "dietary_filter": genai_types.Schema(type=genai_types.Type.STRING, description="veg, non_veg, vegan, jain, or any"),
                "category": genai_types.Schema(type=genai_types.Type.STRING, description="Optional category filter, e.g. 'starters'")
            },
            required=["query"]
        )
    ),
    genai_types.FunctionDeclaration(
        name="add_to_order",
        description="Add an item to the diner's current order.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "menu_item_id": genai_types.Schema(type=genai_types.Type.STRING),
                "quantity": genai_types.Schema(type=genai_types.Type.INTEGER),
                "modifiers": genai_types.Schema(type=genai_types.Type.ARRAY, items=genai_types.Schema(type=genai_types.Type.STRING)),
                "notes": genai_types.Schema(type=genai_types.Type.STRING)
            },
            required=["menu_item_id", "quantity"]
        )
    ),
    genai_types.FunctionDeclaration(
        name="update_order_item",
        description="Change quantity or modifiers of an item already in the cart.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "cart_item_id": genai_types.Schema(type=genai_types.Type.STRING, description="The ID of the item in the cart (provided in the prompt cart listing)"),
                "quantity": genai_types.Schema(type=genai_types.Type.INTEGER, description="0 removes the item"),
                "modifiers": genai_types.Schema(type=genai_types.Type.ARRAY, items=genai_types.Schema(type=genai_types.Type.STRING))
            },
            required=["cart_item_id", "quantity"]
        )
    ),
    genai_types.FunctionDeclaration(
        name="get_order_summary",
        description="Get the current order's items, quantities, and total. Use before checkout or whenever the diner asks."
    ),
    genai_types.FunctionDeclaration(
        name="checkout",
        description="Finalize the order and send it to the kitchen. Always confirm the full order summary with the diner first.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "confirmed_by_diner": genai_types.Schema(type=genai_types.Type.BOOLEAN)
            },
            required=["confirmed_by_diner"]
        )
    ),
    genai_types.FunctionDeclaration(
        name="get_recommendations",
        description="Get upsell/pairing suggestions based on current order contents.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "based_on_order": genai_types.Schema(type=genai_types.Type.BOOLEAN)
            }
        )
    ),
    genai_types.FunctionDeclaration(
        name="escalate_to_staff",
        description="Call this when the diner explicitly asks for a human, reports a complaint, or you cannot resolve the request.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "reason": genai_types.Schema(type=genai_types.Type.STRING)
            },
            required=["reason"]
        )
    ),
    genai_types.FunctionDeclaration(
        name="update_diner_profile",
        description="Persist a fact you just learned about the diner — a dietary restriction, allergy, spice preference, budget, or party size. Call this THE MOMENT the guest mentions any of these, even in passing, so it is never forgotten for the rest of the session.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "dietary_restrictions": genai_types.Schema(type=genai_types.Type.ARRAY, items=genai_types.Schema(type=genai_types.Type.STRING), description="e.g. ['vegetarian'], ['vegan'], ['jain']"),
                "allergies": genai_types.Schema(type=genai_types.Type.ARRAY, items=genai_types.Schema(type=genai_types.Type.STRING), description="e.g. ['nuts', 'dairy']"),
                "spice_preference": genai_types.Schema(type=genai_types.Type.STRING, description="e.g. 'mild', 'medium', 'extra spicy'"),
                "budget": genai_types.Schema(type=genai_types.Type.NUMBER, description="Total budget in rupees the guest mentioned"),
                "party_size": genai_types.Schema(type=genai_types.Type.INTEGER, description="Number of people being ordered for")
            }
        )
    ),
    genai_types.FunctionDeclaration(
        name="show_recommendations",
        description="Show specific dish chips in the UI when you recommend them. Pass the IDs of the dishes you are suggesting.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "menu_item_ids": genai_types.Schema(type=genai_types.Type.ARRAY, items=genai_types.Schema(type=genai_types.Type.STRING))
            },
            required=["menu_item_ids"]
        )
    )
]

WAITER_TOOL = genai_types.Tool(function_declarations=WAITER_FUNCTIONS)


class WaiterOrchestrator:
    def __init__(self, session_id: str, restaurant_id: str, table_id: str, mode: str = "chat"):
        self.session_id = session_id
        self.restaurant_id = restaurant_id
        self.table_id = table_id
        self.tools = WaiterTools(session_id, restaurant_id, table_id)
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
    async def build_system_prompt(self, cart_state: list = None) -> str:
        rest = await db.restaurants.find_one({"id": self.restaurant_id})
        restaurant_name = rest.get("name", "SmartDine") if rest else "SmartDine"
        
        menu_docs = await db.menu.find(
            {"available": True, "restaurant_id": self.restaurant_id},
            {"_id": 0, "id": 1, "name": 1, "description": 1, "price": 1, "category": 1, "tags": 1, "image_url": 1, "prep_time_min": 1},
        ).to_list(60)
        
        menu_block = "\n".join(
            f"- [ID: {m.get('id', '')}] {m['name']} ({m['category']}) — ₹{int(m['price'])}: {m['description']}"
            + (f" [tags: {', '.join(m.get('tags') or [])}]" if m.get('tags') else "")
            for m in menu_docs
        )
        
        profile = await self.tools.get_diner_profile()
        profile_lines = []
        if profile.get("dietary_restrictions"):
            profile_lines.append(f"- Dietary restriction(s): {', '.join(profile['dietary_restrictions'])}")
        if profile.get("allergies"):
            profile_lines.append(f"- Allergies (NEVER serve these): {', '.join(profile['allergies'])}")
        if profile.get("spice_preference"):
            profile_lines.append(f"- Spice preference: {profile['spice_preference']}")
        if profile.get("budget"):
            profile_lines.append(f"- Budget: ₹{profile['budget']} total (incl. tax)")
        if profile.get("party_size"):
            profile_lines.append(f"- Party size: {profile['party_size']}")
        profile_block = (
            "GUEST PROFILE (remembered facts, authoritative for the whole session — never contradict these):\n"
            + "\n".join(profile_lines)
            if profile_lines else
            "GUEST PROFILE: Nothing remembered yet. The moment the guest mentions a diet, allergy, spice preference, budget, or party size, call update_diner_profile immediately."
        )

        cart_str = "The user currently has NO items in their cart."
        if cart_state is not None:
            if cart_state:
                item_strs = [f"[ID: {i.get('cart_item_id', i.get('item_id'))}] {i.get('qty', 1)}x {i.get('name')}" for i in cart_state]
                cart_str = f"The user currently has these items in their cart:\n" + "\n".join(item_strs)
        else:
            cart_doc = await db.table_carts.find_one({"session_id": self.session_id})
            if cart_doc and cart_doc.get("items"):
                item_strs = [f"[ID: {i.get('cart_item_id', i.get('item_id'))}] {i.get('qty', 1)}x {i.get('name')}" for i in cart_doc.get("items", [])]
                cart_str = f"The user currently has these items in their cart:\n" + "\n".join(item_strs)
        
        prompt = f"""You are 'SmartDine AI Waiter' — the elite, professional, deeply hospitable live waiter for {restaurant_name}.
You are speaking with a diner at table {self.table_id}.
{cart_str}

{profile_block}

### 1. CORE OPERATIONAL RULES & PERSONALITY
- **Personalization & Hospitality:** Be friendly, patient, warm, and attentive. Use natural waiter conversational fillers like "Absolutely!", "Great choice!", "Coming right up!", "Wonderful choice", or "My pleasure!". Mirror the guest's energy and hospitality style.
- **Proactive Up-selling & Course Flow:** Follow the natural dining flow: Starter -> Main Course -> Drink/Accompaniment -> Dessert. Never spam recommendations. Suggest 1 or 2 complementary items naturally based on what they just ordered.
- **Role Consistency:** You are a human professional waiter working inside {restaurant_name}. NEVER break character. Do not mention AI, algorithms, prompts, or language models.
- **Voice-First Design & Extreme Brevity (CRITICAL):** Keep your spoken responses concise, natural, and conversational (1-2 short sentences max per turn). Never use bullet points, asterisks, bold text, or lists in your conversational text. Speak exactly as a fast, polite human waiter would talk aloud at the table.
- **Tone:** Confident, warm, polite, professional restaurant waiter.

### 2. CONVERSATIONAL MEMORY & CONTEXT AWARENESS (CRITICAL)
Throughout the dining session, you MUST remember and strictly respect the guest's preferences and context. This is now backed by a persistent guest profile (see GUEST PROFILE above), not just conversation recall:
- **Dietary Restrictions & Allergies:** The instant the guest mentions "I'm vegetarian", "no onions", "nut allergy", "Jain food", or "vegan", call `update_diner_profile` to save it — then it is enforced automatically for the rest of the session (search and add-to-cart will refuse conflicting items). Never override or contradict what's already in the GUEST PROFILE block.
- **Spice Preference:** If they ask for "extra spicy" or "mild", call `update_diner_profile` with spice_preference, then customize orders and modifiers to match.
- **Budget constraints:** If they say "I have ₹400" or "food under ₹500", call `update_diner_profile` with budget. Tool results may include an `[internal: ...]` note with the real computed running total — use that number, never estimate it yourself, and never say the `[internal: ...]` text aloud to the guest.
- **Party Size:** If they mention ordering for 2, 4, or a family, call `update_diner_profile` with party_size and recommend appropriately sized combo packs, family packs, or scale quantities.
- **Previous Selections:** Acknowledge what is already in their tray when suggesting pairings. Tool results may include an `[internal: ...]` upsell hint (e.g. suggest a drink or dessert next) — treat it as guidance for what to bring up naturally, never read it aloud.

### 3. RECOMMENDATIONS & TOOLS
- When you suggest specific dishes, YOU MUST CALL the `show_recommendations` tool with the menu_item_ids or names of the dishes you are suggesting, so the UI can display them as interactive cards!
- NEVER state a price or item not present in the menu. Use search_menu to find dishes if unsure.
- If the diner asks for a human, or seems frustrated, call escalate_to_staff immediately.

### 4. DYNAMIC QUICK REPLIES (CRITICAL)
- At the very end of EVERY response text, you MUST generate 3 to 5 context-aware quick reply options that guide the user's next logical step in the conversation!
- Format them inside this exact XML tag on the last line of your text response:
  `<quick_replies>Option 1|Option 2|Option 3|Option 4</quick_replies>`
- Example after adding Biryani: `<quick_replies>Add Chicken 65|Show Cold Drinks|Recommend Dessert|View Tray|Checkout</quick_replies>`
- Never apologize for or explain the `<quick_replies>` tag in your spoken text.

Live Menu:
{menu_block}
"""
        return prompt

    def _strip_xml_tags(self, text: str) -> str:
        if not text:
            return ""
        text = re.sub(r"<(quick_replies|recommend|add_to_cart|navigate)>.*?(?:</\1>|$)", "", text, flags=re.DOTALL | re.IGNORECASE)
        return text.strip()

    def _sanitize_for_gemini(self, contents: list[genai_types.Content]) -> list[genai_types.Content]:
        if not contents:
            return []
            
        # Step 1: Normalize roles to "user" or "model"
        valid_turns = []
        for c in contents:
            if not c.parts:
                continue
            role = c.role
            if role in ["assistant", "model"]:
                role = "model"
            elif role in ["user", "tool"]:
                role = "user"
            else:
                role = "user"
            valid_turns.append(genai_types.Content(role=role, parts=list(c.parts)))
            
        if not valid_turns:
            return []
            
        # Step 2: Merge consecutive turns with the same role
        merged = [valid_turns[0]]
        for i in range(1, len(valid_turns)):
            curr = valid_turns[i]
            prev = merged[-1]
            if prev.role == curr.role:
                prev.parts.extend(curr.parts)
            else:
                merged.append(curr)
                
        # Step 3: Validate function call / response pairing
        final_clean = []
        i = 0
        while i < len(merged):
            curr = merged[i]
            has_func_call = any(p.function_call for p in (curr.parts or []))
            has_func_resp = any(p.function_response for p in (curr.parts or []))
            
            if has_func_resp:
                if not final_clean or final_clean[-1].role != "model" or not any(p.function_call for p in final_clean[-1].parts):
                    text_parts = [p for p in curr.parts if p.text]
                    if text_parts:
                        if final_clean and final_clean[-1].role == "user":
                            final_clean[-1].parts.extend(text_parts)
                        else:
                            final_clean.append(genai_types.Content(role="user", parts=text_parts))
                    i += 1
                    continue
            
            if has_func_call:
                if i + 1 < len(merged) and merged[i+1].role == "user" and any(p.function_response for p in merged[i+1].parts):
                    final_clean.append(curr)
                    final_clean.append(merged[i+1])
                    i += 2
                    continue
                else:
                    text_parts = [p for p in curr.parts if p.text]
                    if text_parts:
                        if final_clean and final_clean[-1].role == "model":
                            final_clean[-1].parts.extend(text_parts)
                        else:
                            final_clean.append(genai_types.Content(role="model", parts=text_parts))
                    i += 1
                    continue
                    
            final_clean.append(curr)
            i += 1
            
        # Step 4: Final pass to guarantee strict alternation
        strictly_alternating = []
        for c in final_clean:
            if not c.parts:
                continue
            if not strictly_alternating:
                if c.role == "model":
                    continue
                strictly_alternating.append(c)
            else:
                if strictly_alternating[-1].role == c.role:
                    strictly_alternating[-1].parts.extend(c.parts)
                else:
                    strictly_alternating.append(c)
                    
        return strictly_alternating
        
    async def process_message(self, user_text: str, cart_state: list = None) -> tuple[str, list, list]:
        """Processes a single user message and handles the tool loop. Returns (response_text, recommended_items)."""
        # 1. Fetch History
        history_docs = await db.ai_waiter_turns.find({"session_id": self.session_id}).sort("created_at", 1).to_list(100)
        contents = []
        for doc in history_docs:
            if doc["role"] == "user":
                contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=doc["content"])]))
            elif doc["role"] == "assistant":
                # Handle tool calls if they were recorded
                if doc.get("tool_calls"):
                    parts = []
                    if doc.get("content"):
                        clean_content = self._strip_xml_tags(doc["content"])
                        if clean_content:
                            parts.append(genai_types.Part(text=clean_content))
                    for tc in doc["tool_calls"]:
                        parts.append(genai_types.Part.from_function_call(
                            name=tc["name"],
                            args=tc.get("args") or {}
                        ))
                    contents.append(genai_types.Content(role="model", parts=parts))
                else:
                    clean_content = self._strip_xml_tags(doc.get("content", ""))
                    if clean_content:
                        contents.append(genai_types.Content(role="model", parts=[genai_types.Part(text=clean_content)]))
            elif doc["role"] == "tool":
                # Add tool responses
                if doc.get("tool_responses"):
                    parts = []
                    for tr in doc["tool_responses"]:
                        parts.append(genai_types.Part.from_function_response(
                            name=tr["name"],
                            response={"result": tr["result"]}
                        ))
                    contents.append(genai_types.Content(role="user", parts=parts))

        # Add the new user message
        contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=user_text)]))
        
        # Sanitize contents to guarantee valid, strictly alternating Gemini conversation turns without orphaned calls
        contents = self._sanitize_for_gemini(contents)
        
        # Save user turn
        await db.ai_waiter_turns.insert_one({
            "turn_id": str(uuid.uuid4()),
            "session_id": self.session_id,
            "role": "user",
            "content": user_text,
            "created_at": now_iso()
        })
        
        system_instruction = await self.build_system_prompt(cart_state=cart_state)
        config = genai_types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[WAITER_TOOL],
            temperature=0.4
        )
        
        final_text = ""
        recommended_items = []
        loop_count = 0
        
        while loop_count < 5: # Max 5 tool turns per message
            loop_count += 1
            contents = self._sanitize_for_gemini(contents)
            models_to_try = ["gemini-1.5-flash-latest", "gemini-1.5-flash-002", "gemini-1.5-flash-001", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-1.5-pro-latest", "gemini-1.5-pro"]
            try:
                for m_info in self.client.models.list_models():
                    if "generateContent" in getattr(m_info, "supported_generation_methods", []):
                        name_clean = m_info.name.replace("models/", "")
                        if name_clean not in models_to_try:
                            models_to_try.append(name_clean)
            except Exception:
                pass
            last_err = None
            for model_name in models_to_try:
                try:
                    response = await asyncio.wait_for(
                        self.client.aio.models.generate_content(
                            model=model_name,
                            contents=contents,
                            config=config
                        ),
                        timeout=15.0
                    )
                    break
                except Exception as e:
                    last_err = e
                    logger.warning(f"[WaiterOrchestrator] Model {model_name} failed: {e}")
                    continue
            
            if not response:
                logger.error(f"[WaiterOrchestrator] All models failed: {last_err}")
                raise last_err if last_err else Exception("All model attempts failed")
            
            # Check for function calls
            function_calls = []
            if response.parts:
                for part in response.parts:
                    if part.function_call:
                        function_calls.append(part.function_call)
                        
            text_response = ""
            if response.parts:
                for part in response.parts:
                    if part.text:
                        text_response += part.text
            
            if text_response:
                final_text += text_response.strip() + " "
            
            if not function_calls:
                # No more tools to call. This is the final text.
                final_text = final_text.strip()
                # Save assistant turn
                await db.ai_waiter_turns.insert_one({
                    "turn_id": str(uuid.uuid4()),
                    "session_id": self.session_id,
                    "role": "assistant",
                    "content": self._strip_xml_tags(final_text),
                    "created_at": now_iso()
                })
                break
                
            # Execute function calls
            tool_calls_record = []
            tool_responses_record = []
            tool_parts_for_history = []
            
            # First, append the model's tool calls to contents so Gemini knows what it called
            model_parts = []
            if text_response:
                model_parts.append(genai_types.Part(text=text_response))
            for fc in function_calls:
                model_parts.append(genai_types.Part.from_function_call(name=fc.name, args=fc.args or {}))
                tool_calls_record.append({"name": fc.name, "args": fc.args})
                
            contents.append(genai_types.Content(role="model", parts=model_parts))
            
            # Save the model's tool call turn
            await db.ai_waiter_turns.insert_one({
                "turn_id": str(uuid.uuid4()),
                "session_id": self.session_id,
                "role": "assistant",
                "content": self._strip_xml_tags(text_response),
                "tool_calls": tool_calls_record,
                "created_at": now_iso()
            })
            
            # Execute them
            for fc in function_calls:
                result_str = ""
                try:
                    args = fc.args or {}
                    if fc.name == "search_menu":
                        result_str = await self.tools.search_menu(args.get("query", ""), args.get("dietary_filter", "any"), args.get("category", ""))
                    elif fc.name == "add_to_order":
                        result_str = await self.tools.add_to_order(args.get("menu_item_id"), args.get("quantity", 1), args.get("modifiers", []), args.get("notes", ""))
                    elif fc.name == "update_order_item":
                        result_str = await self.tools.update_order_item(args.get("cart_item_id"), args.get("quantity", 1), args.get("modifiers", []))
                    elif fc.name == "get_order_summary":
                        result_str = await self.tools.get_order_summary()
                    elif fc.name == "checkout":
                        result_str = await self.tools.checkout(args.get("confirmed_by_diner", False))
                    elif fc.name == "get_recommendations":
                        result_str = await self.tools.get_recommendations(args.get("based_on_order", True))
                    elif fc.name == "escalate_to_staff":
                        result_str = await self.tools.escalate_to_staff(args.get("reason", ""))
                    elif fc.name == "update_diner_profile":
                        result_str = await self.tools.update_diner_profile(
                            dietary_restrictions=args.get("dietary_restrictions"),
                            allergies=args.get("allergies"),
                            spice_preference=args.get("spice_preference"),
                            budget=args.get("budget"),
                            party_size=args.get("party_size"),
                        )
                    elif fc.name == "show_recommendations":
                        # Fetch the actual menu items to send to the frontend UI
                        item_ids = args.get("menu_item_ids", [])
                        if isinstance(item_ids, (str, int, float)):
                            item_ids = [str(item_ids)]
                        if not isinstance(item_ids, list):
                            item_ids = []
                        clean_ids = [str(x).strip() for x in item_ids if str(x).strip()]
                        if clean_ids:
                            items_docs = await db.menu.find({
                                "$or": [
                                    {"id": {"$in": clean_ids}},
                                    {"name": {"$in": clean_ids}},
                                    {"name": {"$regex": "|".join([re.escape(x) for x in clean_ids]), "$options": "i"}}
                                ],
                                "available": True
                            }).to_list(10)
                            # Remove _id
                            for d in items_docs:
                                d.pop("_id", None)
                            recommended_items.extend(items_docs)
                        result_str = json.dumps({"status": "UI chips shown to user"})
                    else:
                        result_str = f"Unknown function: {fc.name}"
                except Exception as e:
                    logger.error(f"Error executing tool {fc.name}: {e}")
                    result_str = f"Error: {e}"
                    
                tool_responses_record.append({"name": fc.name, "result": result_str})
                tool_parts_for_history.append(genai_types.Part.from_function_response(
                    name=fc.name,
                    response={"result": result_str}
                ))
                
            # Append the tool responses to contents
            contents.append(genai_types.Content(role="user", parts=tool_parts_for_history))
            
            # Save the tool response turn
            await db.ai_waiter_turns.insert_one({
                "turn_id": str(uuid.uuid4()),
                "session_id": self.session_id,
                "role": "tool",
                "tool_responses": tool_responses_record,
                "created_at": now_iso()
            })
            
            # Loop will continue to give the tool responses back to Gemini
            
        if not final_text:
            final_text = "I encountered an error. Please try again."
            
        # Parse XML tags from final_text (quick_replies, recommend, add_to_cart, navigate)
        quick_replies = []
        qr_match = re.search(r"<quick_replies>(.*?)(?:</quick_replies>|$)", final_text, re.DOTALL | re.IGNORECASE)
        if qr_match:
            raw_qrs = qr_match.group(1).split("|")
            quick_replies = [q.strip() for q in raw_qrs if q.strip() and not q.strip().startswith("<")]
            final_text = re.sub(r"<quick_replies>.*?(?:</quick_replies>|$)", "", final_text, flags=re.DOTALL | re.IGNORECASE).strip()
            
        rec_match = re.search(r"<recommend>(.*?)(?:</recommend>|$)", final_text, re.DOTALL | re.IGNORECASE)
        if rec_match:
            raw_recs = [str(r).strip() for r in rec_match.group(1).split("|") if str(r).strip() and not str(r).strip().startswith("<")]
            if raw_recs:
                extra_docs = await db.menu.find({
                    "$or": [
                        {"name": {"$in": raw_recs}},
                        {"name": {"$regex": "|".join([re.escape(x) for x in raw_recs]), "$options": "i"}}
                    ],
                    "available": True
                }).to_list(10)
                for d in extra_docs:
                    d.pop("_id", None)
                    if not any(r.get("id") == d.get("id") for r in recommended_items):
                        recommended_items.append(d)
            final_text = re.sub(r"<recommend>.*?(?:</recommend>|$)", "", final_text, flags=re.DOTALL | re.IGNORECASE).strip()
            
        # Clean up any stray XML tags
        final_text = self._strip_xml_tags(final_text)
            
        return final_text, recommended_items, quick_replies
