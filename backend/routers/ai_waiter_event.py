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

from deps import db, GEMINI_API_KEY, get_gemini_models
from cache_service import menu_cache

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai-waiter"])

MENU_CACHE_TTL = 3600  # 1 hour


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
    event_type: Literal["QR_SCAN", "ITEM_ADDED", "CHECKOUT"]
    restaurant_id: str
    cart_state: List[CartItemPayload] = []
    added_item: Optional[CartItemPayload] = None
    user_language: str = "English"


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

    base = f"""You are a warm knowledgeable restaurant host at a premium Indian restaurant.
You respond only in {user_language}.
You are NOT a chatbot. You observe the customer dining journey and react with brief
appetizing friendly messages (max 2 sentences) to enhance their experience.
Never be pushy robotic or sales-y. Speak like a knowledgeable friend.

RESTAURANT MENU (JSON):
{menu_json}

CUSTOMER CART:
{cart_summary}"""

    if event_type == "QR_SCAN":
        return f"""{base}

EVENT: Customer just scanned the QR code and opened the menu for the first time.
INSTRUCTIONS:
1. Set action_type = "WELCOME"
2. dialogue_text: warm personal welcome max 2 sentences. Invite them to explore.
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
5. If cart is already balanced (main + drink + bread/side present):
   dialogue_text = "Your order looks incredible. We cannot wait to serve you!"
   suggested_items = []"""

    return base


# =========================================================
# Step 3: Gemini SDK Call
# =========================================================

async def _call_gemini(prompt: str, event_type: str = "WELCOME") -> AIWaiterEventResponse:
    """Call Gemini with automatic model switching and graceful fallback on exhaustion."""
    if not GEMINI_API_KEY:
        logger.warning("[AI Waiter] GEMINI_API_KEY not set. Returning graceful fallback.")
        return _fallback_response(event_type)

    try:
        from google import genai
        from google.genai import types as genai_types

        client_ai = genai.Client(api_key=GEMINI_API_KEY)
        models_to_try = get_gemini_models(client_ai)

        config = genai_types.GenerateContentConfig(
            temperature=0.2,
            max_output_tokens=512,
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
                    timeout=15.0,
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
        return _fallback_response(event_type)

    except Exception as exc:
        logger.error("[AI Waiter] Unexpected error calling Gemini: %s. Using fallback response.", exc)
        return _fallback_response(event_type)


def _fallback_response(event_type: str) -> AIWaiterEventResponse:
    """Return a polite, non-blocking fallback response if models fail or time out."""
    if event_type == "QR_SCAN":
        return AIWaiterEventResponse(
            dialogue_text="Welcome! We are delighted to host you today. Please explore our curated menu and let us know if we can craft anything special for your table.",
            action_type="WELCOME",
            suggested_items=[],
        )
    elif event_type == "ITEM_ADDED":
        return AIWaiterEventResponse(
            dialogue_text="An exquisite selection! Our chefs prepare this dish with the freshest ingredients.",
            action_type="ITEM_VALIDATION",
            suggested_items=[],
        )
    else:
        return AIWaiterEventResponse(
            dialogue_text="Your order looks wonderful. We cannot wait to serve you!",
            action_type="UPSELL_OFFER",
            suggested_items=[],
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
    if not req.restaurant_id or not req.restaurant_id.strip():
        raise HTTPException(status_code=400, detail="restaurant_id is required and cannot be empty.")

    # ITEM_ADDED: infer added_item from last cart entry if caller omitted it
    if req.event_type == "ITEM_ADDED" and not req.added_item and req.cart_state:
        req.added_item = req.cart_state[-1]

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

    # Step 3: Build prompt + call Gemini
    prompt = _build_prompt(
        event_type=req.event_type,
        cart_state=req.cart_state,
        added_item=req.added_item,
        menu_snapshot=menu_snapshot,
        user_language=req.user_language,
    )

    ai_response = await _call_gemini(prompt, req.event_type)

    logger.info(
        "[AI Waiter] event=%s restaurant=%s action=%s suggestions=%d",
        req.event_type,
        req.restaurant_id,
        ai_response.action_type,
        len(ai_response.suggested_items),
    )

    return ai_response
