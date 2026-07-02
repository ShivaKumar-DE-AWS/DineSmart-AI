import os
import uuid
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from deps import db, now_iso

class WaiterTools:
    def __init__(self, session_id: str, restaurant_id: str, table_id: str):
        self.session_id = session_id
        self.restaurant_id = restaurant_id
        self.table_id = table_id

    async def search_menu(self, query: str, dietary_filter: str = "any", category: str = "") -> str:
        """Search the restaurant's live menu by free text and/or dietary filter."""
        match_q: Dict[str, Any] = {"restaurant_id": self.restaurant_id, "available": True}
        
        if query:
            match_q["$or"] = [
                {"name": {"$regex": query, "$options": "i"}},
                {"description": {"$regex": query, "$options": "i"}},
                {"tags": {"$regex": query, "$options": "i"}},
                {"category": {"$regex": query, "$options": "i"}}
            ]
            
        if dietary_filter != "any":
            if dietary_filter == "veg":
                match_q["tags"] = {"$in": ["veg", "vegetarian"]}
            elif dietary_filter == "non_veg":
                match_q["tags"] = {"$in": ["non-veg", "non_veg"]}
            elif dietary_filter == "vegan":
                match_q["tags"] = {"$in": ["vegan"]}
            elif dietary_filter == "jain":
                match_q["tags"] = {"$in": ["jain"]}

        if category:
            match_q["category"] = {"$regex": category, "$options": "i"}
            
        items = await db.menu.find(match_q).to_list(20)
        
        if not items:
            return "No items found matching the search criteria."
            
        result = []
        for i in items:
            tags = ", ".join(i.get("tags", []))
            tags_str = f" [tags: {tags}]" if tags else ""
            result.append(f"- {i['name']} ({i['category']}) — ₹{int(i['price'])}: {i['description']}{tags_str} (ID: {i['id']})")
        
        return "\n".join(result)

    async def get_order_summary(self) -> str:
        """Get the current cart's items, quantities, and total."""
        cart = await db.table_carts.find_one({"session_id": self.session_id})
        if not cart or not cart.get("items"):
            return "The current cart is empty."
            
        items = cart.get("items", [])
            
        result = ["Cart Summary:"]
        subtotal = 0
        for idx, item in enumerate(items):
            mod_str = f" (Modifiers: {', '.join(item.get('modifiers', []))})" if item.get("modifiers") else ""
            note_str = f" [Notes: {item.get('notes')}]" if item.get("notes") else ""
            item_total = float(item.get('price', 0)) * int(item.get('qty', 1))
            subtotal += item_total
            result.append(f"{idx + 1}. {item['name']} x{item['qty']} = ₹{item_total}{mod_str}{note_str} (Item ID: {item.get('item_id')})")
            
        tax = round(subtotal * 0.05, 2)
        total = subtotal + tax
        result.append(f"Subtotal: ₹{subtotal}")
        result.append(f"Tax: ₹{tax}")
        result.append(f"Total: ₹{total}")
        return "\n".join(result)

    async def add_to_order(self, menu_item_id: str, quantity: int, modifiers: List[str] = None, notes: str = "") -> str:
        """Add an item to the diner's current cart."""
        if quantity <= 0:
            return "Quantity must be greater than 0."
            
        menu_item = await db.menu.find_one({"id": menu_item_id, "restaurant_id": self.restaurant_id})
        if not menu_item:
            return f"Menu item with ID {menu_item_id} not found."
            
        if not menu_item.get("available", True):
            return f"Sorry, {menu_item.get('name')} is currently unavailable."
            
        from routers.cart import broadcast_cart
        
        cart = await db.table_carts.find_one({"session_id": self.session_id})
        items = cart.get("items", []) if cart else []
        
        # Check if item already exists with exact same modifiers and notes
        existing = next((i for i in items if i.get("item_id") == menu_item_id and set(i.get("modifiers", [])) == set(modifiers or []) and i.get("notes", "") == notes), None)
        if existing:
            existing["qty"] += quantity
        else:
            items.append({
                "cart_item_id": str(uuid.uuid4()),
                "item_id": menu_item_id,
                "name": menu_item.get("name"),
                "price": float(menu_item.get("price", 0)),
                "qty": quantity,
                "category": menu_item.get("category", ""),
                "notes": notes if notes else None,
                "modifiers": modifiers or []
            })
            
        await db.table_carts.update_one(
            {"session_id": self.session_id},
            {"$set": {
                "items": items,
                "updated_at": now_iso()
            }},
            upsert=True
        )
        
        broadcast_cart(self.session_id, items)
        return f"Successfully added {quantity}x {menu_item.get('name')} to the cart."
            
    async def update_order_item(self, cart_item_id: str, quantity: int, modifiers: List[str] = None) -> str:
        """Change quantity or modifiers of an item already in the cart. quantity=0 removes it."""
        cart = await db.table_carts.find_one({"session_id": self.session_id})
        if not cart or not cart.get("items"):
            return "No active cart found."
            
        items = cart.get("items", [])
        found_idx = -1
        for idx, item in enumerate(items):
            # fallback to item_id if cart_item_id is somehow missing
            if item.get("cart_item_id", item.get("item_id")) == cart_item_id:
                found_idx = idx
                break
                
        if found_idx == -1:
            return f"Item {cart_item_id} not found in the current cart."
            
        item_name = items[found_idx].get("name")
        
        if quantity == 0:
            items.pop(found_idx)
            msg = f"Removed {item_name} from the cart."
        else:
            items[found_idx]["qty"] = quantity
            if modifiers is not None:
                items[found_idx]["modifiers"] = modifiers
            msg = f"Updated {item_name} quantity to {quantity}."
            
        await db.table_carts.update_one(
            {"session_id": self.session_id},
            {"$set": {
                "items": items,
                "updated_at": now_iso()
            }}
        )
        
        from routers.cart import broadcast_cart
        broadcast_cart(self.session_id, items)
        
        return msg

    async def checkout(self, confirmed_by_diner: bool) -> str:
        """Finalize the cart and send it to the kitchen as an order."""
        if not confirmed_by_diner:
            return "You must confirm the order with the diner before calling checkout."
            
        cart = await db.table_carts.find_one({"session_id": self.session_id})
        if not cart or not cart.get("items"):
            return "Cannot checkout an empty cart."
            
        items = cart.get("items", [])
        
        from routers.orders import broadcast_order_update
        from deps import next_token
        
        token = await next_token(self.restaurant_id, "dine_in")
        
        subtotal = sum(float(i.get("price", 0)) * int(i.get("qty", 1)) for i in items)
        tax = round(subtotal * 0.05, 2)
        total = subtotal + tax
        
        # We need to map item_id to id for the orders collection
        order_items = []
        for i in items:
            order_items.append({
                "id": str(uuid.uuid4()),
                "item_id": i.get("item_id"),
                "name": i.get("name"),
                "price": float(i.get("price", 0)),
                "qty": int(i.get("qty", 1)),
                "modifiers": i.get("modifiers", []),
                "notes": i.get("notes", "")
            })
            
        order_id = str(uuid.uuid4())
        order = {
            "id": order_id,
            "token": token,
            "customer_name": "AI Guest",
            "customer_phone": "",
            "restaurant_id": self.restaurant_id,
            "table_number": str(self.table_id), 
            "table_session_id": self.session_id,
            "items": order_items,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "status": "confirmed",
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "order_type": "dine_in",
            "payment_status": "pending",
            "is_ai": True,
        }
        await db.orders.insert_one(order)
        
        broadcast_order_update(self.restaurant_id, {"type": "new_order", "order": {k: v for k, v in order.items() if k != "_id"}})
        
        await db.ai_waiter_sessions.update_one(
            {"session_id": self.session_id},
            {"$set": {"status": "checked_out", "last_activity_at": now_iso()}}
        )
        
        # Clear the cart now that it's ordered
        await db.table_carts.delete_one({"session_id": self.session_id})
        from routers.cart import broadcast_cart
        broadcast_cart(self.session_id, [])
        
        return f"Checkout successful! Order sent to kitchen with token {token}."

    async def get_recommendations(self, based_on_order: bool = True) -> str:
        """Get upsell/pairing suggestions."""
        order_items = []
        if based_on_order:
            cart = await db.table_carts.find_one({"session_id": self.session_id})
            if cart:
                order_items = cart.get("items", [])
                
        drinks = await db.menu.find({"restaurant_id": self.restaurant_id, "available": True, "category": {"$regex": "drink|beverage", "$options": "i"}}).to_list(5)
        desserts = await db.menu.find({"restaurant_id": self.restaurant_id, "available": True, "category": {"$regex": "dessert|sweet", "$options": "i"}}).to_list(5)
        
        recs = []
        if order_items:
            recs.append("Based on the current order, I recommend pairing it with:")
        else:
            recs.append("Here are some popular recommendations:")
            
        for d in (drinks + desserts)[:5]:
            recs.append(f"- {d['name']} (₹{d['price']})")
            
        if len(recs) == 1:
            bestsellers = await db.menu.find({"restaurant_id": self.restaurant_id, "available": True}).limit(3).to_list(3)
            for d in bestsellers:
                recs.append(f"- {d['name']} (₹{d['price']})")
                
        return "\n".join(recs)

    async def escalate_to_staff(self, reason: str) -> str:
        """Call this to alert human staff."""
        session = await db.ai_waiter_sessions.find_one({"session_id": self.session_id})
        
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "event_key": f"ai_waiter_escalation:{self.session_id}",
            "type": "waiter_call",
            "title": f"Table requires assistance",
            "body": f"AI escalated: {reason}",
            "read": False,
            "restaurant_id": self.restaurant_id,
            "table_id": self.table_id,
            "created_at": now_iso(),
        })
        
        await db.ai_waiter_sessions.update_one(
            {"session_id": self.session_id},
            {"$set": {"status": "escalated", "last_activity_at": now_iso()}}
        )
        
        return "Staff has been notified and will be at the table shortly."
