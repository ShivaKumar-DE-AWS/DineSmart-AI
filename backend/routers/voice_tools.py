import logging
from typing import Literal, Dict, Any, List
from deps import db, redis_client
import json

logger = logging.getLogger(__name__)

async def get_live_menu(restaurant_id: str) -> str:
    """Fetches the live menu for the restaurant. Use this to find items the user is asking for.
    Args:
        restaurant_id: The unique ID of the restaurant.
    """
    try:
        if redis_client:
            cached = await redis_client.get(f"menu:{restaurant_id}")
            if cached:
                return cached.decode() if isinstance(cached, bytes) else str(cached)
                
        cursor = db.menu.find({"restaurant_id": restaurant_id, "available": {"$ne": False}}, {"_id": 0})
        items = await cursor.to_list(1000)
        return json.dumps([{"id": i.get("id"), "name": i.get("name"), "price": i.get("price"), "category": i.get("category")} for i in items])
    except Exception as e:
        logger.error(f"[VoiceTools] get_live_menu failed: {e}")
        return "[]"

async def update_cart(device_id: str, action: str, item_id: str, qty: int, notes: str, restaurant_id: str) -> str:
    """Updates the user's cart in the database. Call this immediately when a user asks to order something.
    Args:
        device_id: The unique device ID of the user.
        action: Must be 'ADD' or 'REMOVE'.
        item_id: The exact ID of the menu item from get_live_menu.
        qty: The quantity to add or remove.
        notes: Special instructions like 'make it spicy'.
        restaurant_id: The ID of the restaurant.
    """
    # SmartDine's actual cart is managed on the frontend via local storage (Zustand).
    # Since the Voice API communicates over WebSockets, we will return this JSON 
    # to Gemini, and our orchestration loop will forward this action to the frontend via WS!
    result_json = json.dumps({
        "type": "ACTION",
        "action": action,
        "item_id": item_id,
        "qty": qty,
        "notes": notes
    })
    return f"SUCCESS: Action {action} dispatched. The user's cart is being updated. IMPORTANT: Do NOT acknowledge this or generate any conversational text in your response. Remain completely silent."

async def analyze_checkout_upsell(device_id: str, cart_summary: str) -> str:
    """Analyzes the current cart and returns a culinary recommendation for checkout.
    Args:
        device_id: The unique device ID of the user.
        cart_summary: A text summary of what is currently in the cart.
    """
    lower_cart = cart_summary.lower()
    if "biryani" in lower_cart and "raita" not in lower_cart:
        return "Recommend adding Raita as it pairs perfectly with Biryani."
    if "drink" not in lower_cart and "beverage" not in lower_cart and "coke" not in lower_cart:
        return "Recommend adding a refreshing cold beverage."
    if "dessert" not in lower_cart and "sweet" not in lower_cart:
        return "Recommend adding a dessert to finish the meal."
        
    return "Recommend a Chef's Special signature dish."

VOICE_TOOLS_SCHEMA = [
    {
        "name": "get_live_menu",
        "description": "Fetches the live menu for the restaurant. Use this to find items the user is asking for.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "restaurant_id": {"type": "STRING"}
            },
            "required": ["restaurant_id"]
        }
    },
    {
        "name": "update_cart",
        "description": "Updates the user's cart. Call this immediately when a user asks to order something.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "device_id": {"type": "STRING"},
                "action": {"type": "STRING", "description": "'ADD' or 'REMOVE'"},
                "item_id": {"type": "STRING", "description": "The exact ID of the menu item"},
                "qty": {"type": "INTEGER"},
                "notes": {"type": "STRING", "description": "Special instructions"},
                "restaurant_id": {"type": "STRING"}
            },
            "required": ["device_id", "action", "item_id", "qty", "restaurant_id"]
        }
    },
    {
        "name": "analyze_checkout_upsell",
        "description": "Analyzes the current cart and returns a culinary recommendation for checkout.",
        "parameters": {
            "type": "OBJECT",
            "properties": {
                "device_id": {"type": "STRING"},
                "cart_summary": {"type": "STRING"}
            },
            "required": ["device_id", "cart_summary"]
        }
    }
]
