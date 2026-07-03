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
    restaurant_id: str
    cart_state: List[CartItemPayload] = []
    current_cart: Optional[List[CartItemPayload]] = None
    added_item: Optional[CartItemPayload] = None
    user_language: str = "English"
    device_id: Optional[str] = None


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
) -> str:
    """Build the master Gemini prompt dynamically per event type."""
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
You will receive four pieces of live data per request:
1. [CURRENT_EVENT]: {event_type}
2. [USER_LANGUAGE]: {user_language}
3. [CART_STATE]: {cart_summary}
4. [MENU_METADATA]: {menu_json}

# EVENT BEHAVIOR RULES
- **LANGUAGE LOCK:** The `dialogue_text` output MUST be written fluently and naturally in the language specified in [USER_LANGUAGE]. The `action_type` and JSON keys must remain in English.
- You are a warm knowledgeable restaurant host at a premium Indian restaurant.
- You are NOT a chatbot. You observe the customer dining journey and react with brief appetizing friendly messages (max 2 sentences) to enhance their experience.
- Never be pushy robotic or sales-y. Speak like a knowledgeable friend."""

    if event_type == "QR_SCAN":
        memory_str = f"\n[MEMORY INJECTION: This returning customer frequently orders {fav_item}. Suggest it warmly upon greeting, e.g., 'Welcome back! Would you like to start with your usual {fav_item}?']" if fav_item else ""
        return f"""{base}{memory_str}

EVENT: Customer just scanned the QR code and opened the menu for the first time.
INSTRUCTIONS:
1. Set action_type = "WELCOME"
2. dialogue_text: warm personal welcome max 2 sentences. Invite them to explore.{' Warmly mention their favorite item ' + fav_item + '!' if fav_item else ''}
3. suggested_items: empty list []."""

    if event_type == "ITEM_ADDED":
        added_name = added_item.name if added_item else "an item"
        added_cat  = added_item.category if added_item else "Unknown"
        return f"""{base}

EVENT: Customer just added "{added_name}" (category: {added_cat}) to the cart.
INSTRUCTIONS:
1. Set action_type = "ITEM_VALIDATION"
2. dialogue_text: appetizing 1-2 sentence compliment about "{added_name}".
   You may hint at a natural menu pairing but NEVER suggest an item already in the cart.
   Be specific to this dish. Never generic.
3. suggested_items: empty list []."""

    if event_type == "CHECKOUT":
        cart_cats  = sorted({ci.category.lower() if ci.category else "" for ci in cart_state})
        cart_names = sorted({ci.name.lower() for ci in cart_state})
        return f"""{base}

EVENT: Customer clicked Proceed to Pay. This is the checkout upsell moment.
CART CATEGORIES: {cart_cats}
CART ITEM NAMES: {cart_names}

INSTRUCTIONS:
1. Set action_type = "UPSELL_OFFER"
2. Analyse cart for: missing category (mains but no drink or bread), flavor imbalance
   (spicy dishes but no cooling drink raita lassi), or incomplete meal.
3. Pick AT MOST 2 items from RESTAURANT MENU that genuinely complete the meal.
   NEVER suggest items already in cart (check by name case-insensitive).
   NEVER fabricate items not in menu JSON.
   Use EXACT item_id name price from the menu. Fill reason with <=8 word phrase.
4. dialogue_text: warm 1-2 sentence pitch explaining why these complement the order.
   CRITICAL CULINARY RULE: Your dialogue_text and your suggested_items MUST agree 100%. If your dialogue_text mentions recommending Desserts, EVERY item in suggested_items MUST be a dessert. Never promise one category and suggest dishes from another.
5. If cart is already balanced (main + drink + bread/side present):
   dialogue_text = "Your order looks incredible. We cannot wait to serve you!"
   suggested_items = []"""

    return base


# =========================================================
# Step 3: Gemini SDK Call
# =========================================================

async def _call_gemini(prompt: str, event_type: str = "WELCOME", fav_item: str = "") -> AIWaiterEventResponse:
    """Call Gemini with automatic model switching and graceful fallback on exhaustion."""
    if not GEMINI_API_KEY:
        logger.warning("[AI Waiter] GEMINI_API_KEY not set. Returning graceful fallback.")
        return _fallback_response(event_type, fav_item)

    try:
        from google import genai
        from google.genai import types as genai_types

        client_ai = genai.Client(api_key=GEMINI_API_KEY)
        models_to_try = get_gemini_models(client_ai)

        config = genai_types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=256,
            response_mime_type="application/json",
            response_schema=AIWaiterEventResponse,
        )

        for model_name in models_to_try:
            try:
                response = await asyncio.wait_for(
                    asyncio.to_thread(
                        client_ai.models.generate_content,
                        model=model_name,
                        contents=prompt,
                        config=config,
                    ),
                    timeout=4.5,  # Strategy 3: 4.5s Circuit Breaker timeout
                )

                raw = (getattr(response, "text", None) or "").strip()

                # Defensive markdown fence strip
                if raw.startswith("```json"):
                    raw = raw[7:]
                if raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()

                parsed = AIWaiterEventResponse.model_validate_json(raw)
                parsed.suggested_items = parsed.suggested_items[:2]
                return parsed
            except Exception as model_exc:
                logger.warning("[AI Waiter] Model %s failed (%s), trying next model...", model_name, model_exc)
                continue

        logger.error("[AI Waiter] All Gemini models failed or exhausted. Using fallback response.")
        return _fallback_response(event_type, fav_item)

    except Exception as exc:
        logger.error("[AI Waiter] Unexpected error calling Gemini: %s. Using fallback response.", exc)
        return _fallback_response(event_type, fav_item)


def _fallback_response(event_type: str, fav_item: str = "") -> AIWaiterEventResponse:
    """Return a polite, non-blocking fallback response if models fail or time out."""
    if event_type == "QR_SCAN":
        msg = f"Welcome back! Would you like to start with your usual {fav_item}? We are delighted to host you today." if fav_item else "Welcome! We are delighted to host you today. Please explore our curated menu and let us know if we can craft anything special for your table."
        return AIWaiterEventResponse(
            dialogue_text=msg,
            action_type="WELCOME",
            suggested_items=[],
        )
    elif event_type == "ITEM_ADDED":
        # Strategy 3: Circuit Breaker silent fallback during ITEM_ADDED -> empty dialogue_text
        return AIWaiterEventResponse(
            dialogue_text="",
            action_type="ITEM_VALIDATION",
            suggested_items=[],
        )
    else:
        # Strategy 3: Circuit Breaker fallback during CHECKOUT -> return classic signature pairings
        return AIWaiterEventResponse(
            dialogue_text="To complete your feast, our Chef recommends these signature pairings:",
            action_type="UPSELL_OFFER",
            suggested_items=[
                AISuggestedItem(item_id="bread-naan", name="Butter Naan", price=50.0, reason="Fresh tandoori bread baked to perfection."),
                AISuggestedItem(item_id="bev-lassi", name="Sweet Lassi", price=90.0, reason="Traditional chilled yogurt drink to refresh your palate.")
            ],
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

    # Strategy 1: Semantic Caching (The Traffic Killer)
    cache_key = None
    if redis_client:
        if req.event_type == "ITEM_ADDED" and req.added_item:
            item_ident = req.added_item.item_id or req.added_item.name.lower()
            cache_key = f"ai_cache:ITEM_ADDED:{req.user_language}:{item_ident}"
        elif req.event_type == "QR_SCAN":
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
    )

    ai_response = await _call_gemini(prompt, req.event_type, fav_item)

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
