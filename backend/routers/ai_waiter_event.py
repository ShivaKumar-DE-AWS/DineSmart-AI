"""Event-Driven AI Waiter router.

Observes silent frontend events (QR_SCAN, ITEM_ADDED, CHECKOUT) and returns
structured Gemini JSON responses dictating what the mobile UI should display:
- Top Toast           (ITEM_ADDED  action_type: ITEM_VALIDATION)
- Bottom Sheet modal  (CHECKOUT    action_type: UPSELL_OFFER)
- Welcome popup       (QR_SCAN     action_type: WELCOME)

Architecture:
  - Redis-backed menu cache (key: menu:{restaurant_id}, TTL 3600 s)
  - MongoDB Motor fallback on cache miss
  - gemini-2.5-flash with Pydantic response_schema (temperature=0.2)
  - Fully async, non-blocking safe for high-frequency tap events
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import List, Optional, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from deps import db, GEMINI_API_KEY, get_gemini_models, redis_client
from cache_service import menu_cache

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai-waiter"])

MENU_CACHE_TTL = 3600  # 1 hour


async def get_favorite_item(device_id: Optional[str]) -> str:
    """Retrieve returning customer's favorite item from Redis fast cache or MongoDB aggregation."""
    if not device_id:
        return ""
    if redis_client:
        try:
            cached = await redis_client.get(f"fav_item:{device_id}")
            if cached:
                return cached.decode() if isinstance(cached, bytes) else str(cached)
        except Exception as e:
            logger.debug("[AI Memory] Redis lookup failed: %s", e)
    try:
        pipeline = [
            {"$match": {"device_id": device_id, "status": {"$ne": "cancelled"}}},
            {"$unwind": "$items"},
            {"$group": {"_id": "$items.name", "count": {"$sum": "$items.qty"}}},
            {"$sort": {"count": -1}},
            {"$limit": 1}
        ]
        res = await db.orders.aggregate(pipeline).to_list(1)
        if res and res[0].get("_id"):
            fav = str(res[0]["_id"])
            if redis_client:
                try:
                    await redis_client.setex(f"fav_item:{device_id}", 86400 * 30, fav)
                except Exception:
                    pass
            return fav
    except Exception as e:
        logger.debug("[AI Memory] MongoDB lookup failed: %s", e)
    return ""


# =========================================================
# Step 1: Pydantic Schemas
# =========================================================

class CartItemPayload(BaseModel):
    """A single item currently in the customer cart."""
    item_id: str
    name: str
    price: float
    qty: int = Field(ge=1, le=99)
    category: Optional[str] = None


class AIWaiterEventRequest(BaseModel):
    """Incoming event payload sent by the frontend."""
    event_type: Optional[str] = "QR_SCAN"
    event: Optional[str] = None
    event_data: Optional[str] = None
    restaurant_id: str
    cart_state: List[CartItemPayload] = []
    current_cart: Optional[List[CartItemPayload]] = None
    added_item: Optional[CartItemPayload] = None
    user_language: str = "English"
    device_id: Optional[str] = None
    session_state: dict = Field(default_factory=dict, description="Current conversation state (stage, budget, preferences)")


class SuggestedItemSchema(BaseModel):
    """A single AI-recommended upsell item (max 2 at CHECKOUT)."""
    item_id: str
    name: str
    price: float
    reason: str = ""


class AIWaiterEventResponse(BaseModel):
    """Strict Gemini output schema enforced via response_schema."""
    dialogue_text: str = Field(description="Brief warm appetizing message. Max 2 sentences.")
    action_type: Literal["WELCOME", "ITEM_VALIDATION", "UPSELL_OFFER"] = Field(
        description="Determines which UI component to trigger."
    )
    suggested_items: List[SuggestedItemSchema] = Field(
        default=[],
        description="Max 2 upsell items. Only for UPSELL_OFFER. Never fabricate."
    )
    quick_replies: List[str] = Field(
        default=[],
        description="Max 4 contextual suggestion chips (e.g., 'Show Starters', 'Vegetarian', 'Skip to Main Course')."
    )
    next_state: dict = Field(
        default_factory=dict,
        description="The updated session state to return to the client. Must include 'stage' (e.g., 'soup', 'starters', 'main_course', 'dessert', 'beverage'). Can also store 'budget', 'diet', 'party_size'."
    )


# =========================================================
# Step 2: Redis Menu Cache Utility
# =========================================================

async def get_cached_menu(restaurant_id: str) -> List[dict]:
    """Fetch menu from Redis cache, falling back to MongoDB.

    Cache key: menu:{restaurant_id}
    TTL: 3600 seconds (1 hour)
    """
    cache_key = f"menu:{restaurant_id}"

    cached = await menu_cache.get(cache_key)
    if cached:
        logger.debug("[AI Waiter] Cache HIT: %s", cache_key)
        return cached  # type: ignore[return-value]

    logger.info("[AI Waiter] Cache MISS: querying MongoDB for %s", restaurant_id)
    try:
        items = await db.menu.find(
            {"restaurant_id": restaurant_id, "available": True},
            {"_id": 0, "id": 1, "name": 1, "description": 1, "price": 1, "category": 1, "tags": 1},
        ).sort("category", 1).to_list(500)
    except Exception as exc:
        logger.error("[AI Waiter] MongoDB fetch failed for %s: %s", restaurant_id, exc)
        return []

    await menu_cache.set(cache_key, items, ttl=MENU_CACHE_TTL)
    logger.info("[AI Waiter] Cached %d items for %s", len(items), restaurant_id)
    return items


# =========================================================
# Step 3: Prompt Engine
# =========================================================

def _build_prompt(
    event_type: str,
    cart_state: List[CartItemPayload],
    added_item: Optional[CartItemPayload],
    menu_snapshot: List[dict],
    user_language: str,
    fav_item: str = "",
    session_state: dict = None,
    event_data: str = None,
) -> str:
    """Build the master Gemini prompt dynamically per event type."""
    if session_state is None:
        session_state = {}
        
    menu_json = json.dumps(
        [
            {
                "id":       item.get("id", ""),
                "name":     item.get("name", ""),
                "price":    item.get("price", 0),
                "category": item.get("category", ""),
                "tags":     item.get("tags", []),
            }
            for item in menu_snapshot
        ],
        ensure_ascii=False,
        separators=(",", ":"),
    )

    cart_summary = (
        ", ".join(
            f"{ci.name} (qty={ci.qty}, Rs{ci.price:.0f}, cat={ci.category or 'Unknown'})"
            for ci in cart_state
        )
        or "empty"
    )

    base = f"""# CONTEXT INJECTIONS
You are a Senior AI Waiter, acting as a highly experienced restaurant dining companion.
Live data:
1. [CURRENT_EVENT]: {event_type}
2. [USER_LANGUAGE]: {user_language}
3. [CART_STATE]: {cart_summary}
4. [SESSION_STATE]: {json.dumps(session_state)}
5. [MENU_METADATA]: {menu_json}

# DINING FLOW RULES
You must guide the customer through a logical meal sequence: Welcome -> Preferences/Party Size -> Soup -> Starters -> Main Course -> Curries -> Breads/Rice -> Desserts -> Beverages.
1. Determine the customer's current `stage` from [SESSION_STATE] (or start at 'welcome').
2. Advance the state logically. For example, if they just added a Starter, transition to Main Course recommendations.
3. Suggest dishes using culinary logic. Automatically infer `pairsWith` and `upsell` relationships based on cuisine (e.g. Butter Chicken pairs with Naan/Roti, Biryani pairs with Raita).
4. Strictly respect the budget or dietary preferences if set in [SESSION_STATE].
5. Provide contextual `quick_replies` to let the customer guide you (e.g., "Skip to Main Course", "Show Rice options").

# EVENT BEHAVIOR RULES
- **LANGUAGE LOCK:** `dialogue_text` must be in {user_language}.
- **STRICT MENU CONSTRAINT:** NEVER fabricate dishes. Only recommend from [MENU_METADATA].
- Update `next_state` with the new conversation stage and any learned preferences.

You MUST respond with valid JSON exactly matching this structure. DO NOT include any preamble text or markdown formatting outside the JSON:
{{
  "dialogue_text": "string (the spoken text)",
  "action_type": "string (e.g. WELCOME, UPSELL_OFFER)",
  "suggested_items": ["string (item IDs)"],
  "quick_replies": ["string (suggested user replies)"],
  "next_state": {{"stage": "string"}}
}}
"""

    if event_type == "QR_SCAN":
        memory_str = f"\n[MEMORY INJECTION: This returning customer frequently orders {fav_item}. Suggest it warmly!]" if fav_item else ""
        return f"""{base}{memory_str}
EVENT: Customer scanned QR code.
INSTRUCTIONS:
1. action_type = "WELCOME"
2. dialogue_text: Warm welcome, ask what they are planning today (e.g. Lunch, Dinner, Snacks). Max 2 sentences.
3. suggested_items: []
4. quick_replies: e.g. ["Lunch", "Dinner", "Quick Meal", "Family Dining"]
5. next_state: {{"stage": "preferences"}}"""

    if event_type == "ITEM_ADDED":
        added_name = added_item.name if added_item else "an item"
        added_cat  = added_item.category if added_item else "Unknown"
        return f"""{base}
EVENT: Customer added "{added_name}" (Category: {added_cat}) to cart.
INSTRUCTIONS:
1. action_type = "UPSELL_OFFER"
2. dialogue_text: Compliment the choice. Then smoothly suggest the logical NEXT course or pairing. E.g., if they added a curry, suggest breads. If they added a main, suggest dessert/drinks.
3. suggested_items: Pick max 2 items from the menu that perfectly pair with the cart or represent the next logical course. NEVER suggest items already in the cart.
4. quick_replies: Generate 3-4 options for the user (e.g., "Add [Suggested Bread]", "Show Desserts", "Skip to Checkout").
5. next_state: Update 'stage' to the next logical step."""

    if event_type == "CHECKOUT" or event_type == "QUICK_REPLY_CLICKED":
        intent = f"User clicked quick reply: '{event_data}'" if event_type == "QUICK_REPLY_CLICKED" else "User clicked Proceed to Pay. This is the checkout upsell moment."
        return f"""{base}
EVENT: {intent}
INSTRUCTIONS:
1. action_type = "UPSELL_OFFER"
2. dialogue_text: Respond naturally to their intent. If they asked to skip to a course, suggest items from that course. If checkout, do a final upsell (Dessert/Drink).
3. suggested_items: Max 2 logical additions matching their intent.
4. quick_replies: e.g. ["Proceed to Pay", "Add Drinks", "Go Back"]
5. next_state: Keep updated."""

    return base


# =========================================================
# Step 3: Gemini SDK Call
# =========================================================

async def _call_llm_engine(prompt: str, event_type: str = "WELCOME", fav_item: str = "", menu_snapshot: Optional[List[dict]] = None) -> AIWaiterEventResponse:
    """Call the LLM abstraction (Groq -> Gemini) and return structured response."""
    from llm_client import generate_structured_json
    
    try:
        parsed = await generate_structured_json(
            prompt=prompt,
            schema_cls=AIWaiterEventResponse,
            system_prompt="",
            model_preference="llama3-70b-8192"
        )
        if parsed:
            parsed.suggested_items = parsed.suggested_items[:2]
            return parsed
            
        logger.error("[AI Waiter] LLM generation returned None. Using fallback response.")
        return _fallback_response(event_type, fav_item, menu_snapshot)
    except Exception as exc:
        logger.error("[AI Waiter] Unexpected error calling LLM: %s. Using fallback response.", exc)
        return _fallback_response(event_type, fav_item, menu_snapshot)


def _fallback_response(event_type: str, fav_item: str = "", menu_snapshot: Optional[List[dict]] = None) -> AIWaiterEventResponse:
    """Return a polite, non-blocking fallback response if models fail or time out."""
    if event_type == "QR_SCAN":
        msg = f"Welcome back! Would you like to start with your usual {fav_item}? We are delighted to host you today." if fav_item else "Welcome! We are delighted to host you today. Please explore our curated menu and let us know if we can craft anything special for your table."
        return AIWaiterEventResponse(
            dialogue_text=msg,
            action_type="WELCOME",
            suggested_items=[],
        )
    elif event_type == "ITEM_ADDED":
        # Strategy 3: Circuit Breaker fallback during ITEM_ADDED -> Return a generic acknowledgement
        return AIWaiterEventResponse(
            dialogue_text="Excellent choice! I've added that to your tray. Please let me know if you'd like to add anything else.",
            action_type="ITEM_VALIDATION",
            suggested_items=[],
        )
    else:
        # Strategy 3: Circuit Breaker fallback during CHECKOUT -> return real menu items from snapshot
        fallback_sugs = []
        if menu_snapshot:
            for item in menu_snapshot:
                if item.get("available", True) is not False:
                    fallback_sugs.append(AISuggestedItem(
                        item_id=str(item.get("id", "")),
                        name=str(item.get("name", "")),
                        price=float(item.get("price", 0.0)),
                        reason=str(item.get("description", "Chef signature recommendation."))
                    ))
                if len(fallback_sugs) >= 2:
                    break
        return AIWaiterEventResponse(
            dialogue_text="To complete your feast, our Chef recommends these signature pairings from our menu:",
            action_type="UPSELL_OFFER",
            suggested_items=fallback_sugs,
        )


# =========================================================
# Core Endpoint: POST /api/ai-waiter/event
# =========================================================

@router.post("/api/ai-waiter/event", response_model=AIWaiterEventResponse)
async def ai_waiter_event(req: AIWaiterEventRequest):
    """Process a silent frontend event and return a structured AI Waiter response.

    Event to UI mapping:
      QR_SCAN    -> Welcome modal or floating badge
      ITEM_ADDED -> Top Toast (auto-dismiss 3 s)
      CHECKOUT   -> Bottom Sheet upsell modal

    Returns:
        AIWaiterEventResponse: { dialogue_text, action_type, suggested_items }
    """
    if not req.event_type and req.event:
        req.event_type = req.event
    if not req.cart_state and req.current_cart:
        req.cart_state = req.current_cart

    if not req.restaurant_id or not req.restaurant_id.strip():
        raise HTTPException(status_code=400, detail="restaurant_id is required and cannot be empty.")

    # ITEM_ADDED: infer added_item from last cart entry if caller omitted it
    if req.event_type == "ITEM_ADDED" and not req.added_item and req.cart_state:
        req.added_item = req.cart_state[-1]

    fav_item = ""
    if req.device_id and req.event_type == "QR_SCAN":
        fav_item = await get_favorite_item(req.device_id)

    # Step 2: Get menu (Redis -> MongoDB fallback)
    menu_snapshot = await get_cached_menu(req.restaurant_id)

    # Graceful degradation: no menu at checkout -> safe fallback
    if not menu_snapshot and req.event_type == "CHECKOUT":
        logger.warning("[AI Waiter] Empty menu for %s at CHECKOUT", req.restaurant_id)
        return AIWaiterEventResponse(
            dialogue_text="Your order looks wonderful. We cannot wait to serve you!",
            action_type="UPSELL_OFFER",
            suggested_items=[],
        )

    # Strategy 1: Semantic Caching (Only for QR_SCAN to prevent stale dynamic states)
    cache_key = None
    if redis_client:
        if req.event_type == "QR_SCAN":
            cache_key = f"ai_cache:QR_SCAN:{req.user_language}:{req.restaurant_id}:{fav_item}"

        if cache_key:
            try:
                cached_data = await redis_client.get(cache_key)
                if cached_data:
                    logger.debug("[AI Waiter] Semantic Cache HIT: %s", cache_key)
                    raw_str = cached_data.decode() if isinstance(cached_data, bytes) else str(cached_data)
                    return AIWaiterEventResponse.model_validate_json(raw_str)
            except Exception as cache_exc:
                logger.debug("[AI Waiter] Redis semantic cache read error: %s", cache_exc)

    # Step 3: Build prompt + call Gemini
    prompt = _build_prompt(
        event_type=req.event_type,
        cart_state=req.cart_state,
        added_item=req.added_item,
        menu_snapshot=menu_snapshot,
        user_language=req.user_language,
        fav_item=fav_item,
        session_state=req.session_state,
        event_data=req.event_data,
    )

    ai_response = await _call_llm_engine(prompt, req.event_type, fav_item, menu_snapshot)

    # Step 4: Strict Menu Validation - strip out any suggestion not in menu_snapshot
    if ai_response and ai_response.suggested_items and menu_snapshot:
        valid_suggestions = []
        for sug in ai_response.suggested_items:
            matched = next(
                (m for m in menu_snapshot if str(m.get("id")) == str(sug.item_id) or str(m.get("name", "")).lower().strip() == str(sug.name).lower().strip()),
                None
            )
            if matched and matched.get("available", True) is not False:
                sug.item_id = str(matched.get("id", sug.item_id))
                sug.name = str(matched.get("name", sug.name))
                sug.price = float(matched.get("price", sug.price))
                valid_suggestions.append(sug)
            else:
                logger.warning("[AI Waiter] Dropped non-menu or unavailable suggestion: %s (%s)", sug.name, sug.item_id)
        ai_response.suggested_items = valid_suggestions

    if cache_key and redis_client and ai_response and ai_response.dialogue_text:
        try:
            await redis_client.setex(cache_key, 86400, ai_response.model_dump_json())
            logger.debug("[AI Waiter] Saved semantic cache for %s", cache_key)
        except Exception as cache_exc:
            logger.debug("[AI Waiter] Redis semantic cache write error: %s", cache_exc)

    logger.info(
        "[AI Waiter] event=%s restaurant=%s action=%s suggestions=%d",
        req.event_type,
        req.restaurant_id,
        ai_response.action_type,
        len(ai_response.suggested_items),
    )

    return ai_response
