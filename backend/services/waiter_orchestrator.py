import json
import logging
import uuid
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
        description="Change quantity or modifiers of an item already in the order.",
        parameters=genai_types.Schema(
            type=genai_types.Type.OBJECT,
            properties={
                "order_item_id": genai_types.Schema(type=genai_types.Type.STRING),
                "quantity": genai_types.Schema(type=genai_types.Type.INTEGER, description="0 removes the item"),
                "modifiers": genai_types.Schema(type=genai_types.Type.ARRAY, items=genai_types.Schema(type=genai_types.Type.STRING))
            },
            required=["order_item_id", "quantity"]
        )
    ),
    genai_types.FunctionDeclaration(
        name="get_order_summary",
        description="Get the current order's items, quantities, and total. Use before checkout or whenever the diner asks.",
        parameters=genai_types.Schema(type=genai_types.Type.OBJECT, properties={})
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
    )
]

WAITER_TOOL = genai_types.Tool(function_declarations=WAITER_FUNCTIONS)


class WaiterOrchestrator:
    def __init__(self, session_id: str, restaurant_id: str, table_id: str):
        self.session_id = session_id
        self.restaurant_id = restaurant_id
        self.table_id = table_id
        self.tools = WaiterTools(session_id, restaurant_id, table_id)
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        
    async def build_system_prompt(self) -> str:
        rest = await db.restaurants.find_one({"id": self.restaurant_id})
        restaurant_name = rest.get("name", "SmartDine") if rest else "SmartDine"
        
        menu_docs = await db.menu.find(
            {"available": True, "restaurant_id": self.restaurant_id},
            {"_id": 0, "name": 1, "description": 1, "price": 1, "category": 1, "tags": 1},
        ).to_list(60)
        
        menu_block = "\n".join(
            f"- {m['name']} ({m['category']}) — ₹{int(m['price'])}: {m['description']}"
            + (f" [tags: {', '.join(m.get('tags') or [])}]" if m.get('tags') else "")
            for m in menu_docs
        )
        
        prompt = f"""You are the AI waiter for {restaurant_name}.
You are speaking with a diner at table {self.table_id}.

Rules:
- NEVER state a price or item not present in the menu. Use search_menu to find dishes.
- If asked about allergens/dietary needs and the menu lacks tags, say you're not certain and offer to flag staff (escalate_to_staff).
- ALWAYS confirm quantity and modifiers back to the diner BEFORE adding to the order.
- Before calling checkout, read back the full order and total, and only proceed if the diner confirms.
- Keep responses short and conversational.
- If the diner asks for a human, or seems frustrated, call escalate_to_staff immediately.

Live Menu:
{menu_block}
"""
        return prompt
        
    async def process_message(self, user_text: str) -> str:
        """Processes a single user message and handles the tool loop."""
        # 1. Fetch History
        history_docs = await db.ai_waiter_turns.find({"session_id": self.session_id}).sort("created_at", 1).to_list(20)
        contents = []
        for doc in history_docs:
            if doc["role"] == "user":
                contents.append(genai_types.Content(role="user", parts=[genai_types.Part(text=doc["content"])]))
            elif doc["role"] == "assistant":
                # Handle tool calls if they were recorded
                if doc.get("tool_calls"):
                    parts = []
                    if doc.get("content"):
                        parts.append(genai_types.Part(text=doc["content"]))
                    for tc in doc["tool_calls"]:
                        parts.append(genai_types.Part.from_function_call(
                            name=tc["name"],
                            args=tc["args"]
                        ))
                    contents.append(genai_types.Content(role="model", parts=parts))
                else:
                    contents.append(genai_types.Content(role="model", parts=[genai_types.Part(text=doc["content"])]))
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
        
        # Save user turn
        await db.ai_waiter_turns.insert_one({
            "turn_id": str(uuid.uuid4()),
            "session_id": self.session_id,
            "role": "user",
            "content": user_text,
            "created_at": now_iso()
        })
        
        system_instruction = await self.build_system_prompt()
        config = genai_types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=[WAITER_TOOL],
            temperature=0.4
        )
        
        final_text = ""
        loop_count = 0
        
        while loop_count < 5: # Max 5 tool turns per message
            loop_count += 1
            response = await self.client.aio.models.generate_content(
                model='gemini-2.5-flash',
                contents=contents,
                config=config
            )
            
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
            
            if not function_calls:
                # No more tools to call. This is the final text.
                final_text = text_response
                # Save assistant turn
                await db.ai_waiter_turns.insert_one({
                    "turn_id": str(uuid.uuid4()),
                    "session_id": self.session_id,
                    "role": "assistant",
                    "content": final_text,
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
                model_parts.append(genai_types.Part.from_function_call(name=fc.name, args=fc.args))
                tool_calls_record.append({"name": fc.name, "args": fc.args})
                
            contents.append(genai_types.Content(role="model", parts=model_parts))
            
            # Save the model's tool call turn
            await db.ai_waiter_turns.insert_one({
                "turn_id": str(uuid.uuid4()),
                "session_id": self.session_id,
                "role": "assistant",
                "content": text_response,
                "tool_calls": tool_calls_record,
                "created_at": now_iso()
            })
            
            # Execute them
            for fc in function_calls:
                result_str = ""
                try:
                    args = fc.args
                    if fc.name == "search_menu":
                        result_str = await self.tools.search_menu(args.get("query", ""), args.get("dietary_filter", "any"), args.get("category", ""))
                    elif fc.name == "add_to_order":
                        result_str = await self.tools.add_to_order(args.get("menu_item_id"), args.get("quantity", 1), args.get("modifiers", []), args.get("notes", ""))
                    elif fc.name == "update_order_item":
                        result_str = await self.tools.update_order_item(args.get("order_item_id"), args.get("quantity", 1), args.get("modifiers", []))
                    elif fc.name == "get_order_summary":
                        result_str = await self.tools.get_order_summary()
                    elif fc.name == "checkout":
                        result_str = await self.tools.checkout(args.get("confirmed_by_diner", False))
                    elif fc.name == "get_recommendations":
                        result_str = await self.tools.get_recommendations(args.get("based_on_order", True))
                    elif fc.name == "escalate_to_staff":
                        result_str = await self.tools.escalate_to_staff(args.get("reason", ""))
                    else:
                        result_str = f"Unknown function: {fc.name}"
                except Exception as e:
                    logger.error(f"Error in tool {fc.name}: {e}")
                    result_str = f"Error executing tool: {str(e)}"
                    
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
            
        return final_text
