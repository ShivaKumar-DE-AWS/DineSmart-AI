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
            match_q["name"] = {"$regex": query, "$options": "i"}
            
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
        """Get the current order's items, quantities, and total."""
        session = await db.ai_waiter_sessions.find_one({"session_id": self.session_id})
        if not session or not session.get("order_id"):
            return "The current order is empty."
            
        order = await db.orders.find_one({"id": session["order_id"]})
        if not order:
            return "The current order is empty."
            
        items = order.get("items", [])
        if not items:
            return "The current order is empty."
            
        result = [f"Order Summary (Status: {order.get('status')}):"]
        for idx, item in enumerate(items):
            mod_str = f" (Modifiers: {', '.join(item.get('modifiers', []))})" if item.get("modifiers") else ""
            note_str = f" [Notes: {item.get('notes')}]" if item.get("notes") else ""
            result.append(f"{idx + 1}. {item['name']} x{item['qty']} = ₹{item['price'] * item['qty']}{mod_str}{note_str} (Item ID: {item.get('id')})")
            
        result.append(f"Subtotal: ₹{order.get('subtotal')}")
        result.append(f"Tax: ₹{order.get('tax')}")
        result.append(f"Total: ₹{order.get('total')}")
        return "\n".join(result)

    async def add_to_order(self, menu_item_id: str, quantity: int, modifiers: List[str] = None, notes: str = "") -> str:
        """Add an item to the diner's current order."""
        if quantity <= 0:
            return "Quantity must be greater than 0."
            
        menu_item = await db.menu.find_one({"id": menu_item_id, "restaurant_id": self.restaurant_id})
        if not menu_item:
            return f"Menu item with ID {menu_item_id} not found."
            
        if not menu_item.get("available", True):
            return f"Sorry, {menu_item.get('name')} is currently unavailable."
            
        session = await db.ai_waiter_sessions.find_one({"session_id": self.session_id})
        order_id = session.get("order_id") if session else None
        
        new_item = {
            "id": str(uuid.uuid4()),
            "item_id": menu_item_id,
            "name": menu_item.get("name"),
            "price": menu_item.get("price", 0),
            "qty": quantity,
            "modifiers": modifiers or [],
            "notes": notes
        }
        
        if not order_id:
            order_id = str(uuid.uuid4())
            subtotal = new_item["price"] * quantity
            tax = round(subtotal * 0.05, 2)
            
            order = {
                "id": order_id,
                "token": order_id[:6].upper(),
                "customer_name": "AI Guest",
                "customer_phone": "",
                "restaurant_id": self.restaurant_id,
                "table_number": "", 
                "table_session_id": "", # To be filled if available
                "items": [new_item],
                "subtotal": subtotal,
                "tax": tax,
                "total": subtotal + tax,
                "status": "draft",
                "created_at": now_iso(),
                "updated_at": now_iso(),
                "order_type": "dine_in",
                "payment_status": "pending",
                "is_ai": True,
            }
            await db.orders.insert_one(order)
            await db.ai_waiter_sessions.update_one({"session_id": self.session_id}, {"$set": {"order_id": order_id}})
        else:
            order = await db.orders.find_one({"id": order_id})
            if order.get("status") != "draft":
                return "The current order has already been checked out. Please start a new session."
                
            items = order.get("items", [])
            items.append(new_item)
            
            subtotal = sum(i["price"] * i["qty"] for i in items)
            tax = round(subtotal * 0.05, 2)
            
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "items": items,
                    "subtotal": subtotal,
                    "tax": tax,
                    "total": subtotal + tax,
                    "updated_at": now_iso()
                }}
            )
            
        return f"Successfully added {quantity}x {menu_item.get('name')} to the order."

    async def update_order_item(self, order_item_id: str, quantity: int, modifiers: List[str] = None) -> str:
        """Change quantity or modifiers of an item already in the order. quantity=0 removes it."""
        session = await db.ai_waiter_sessions.find_one({"session_id": self.session_id})
        if not session or not session.get("order_id"):
            return "No active order found."
            
        order_id = session["order_id"]
        order = await db.orders.find_one({"id": order_id})
        if not order:
            return "Order not found."
            
        if order.get("status") != "draft":
            return "Cannot modify an order that has already been checked out."
            
        items = order.get("items", [])
        found_idx = -1
        for idx, item in enumerate(items):
            if item.get("id") == order_item_id:
                found_idx = idx
                break
                
        if found_idx == -1:
            return f"Order item {order_item_id} not found in the current order."
            
        item_name = items[found_idx].get("name")
        
        if quantity == 0:
            items.pop(found_idx)
            msg = f"Removed {item_name} from the order."
        else:
            items[found_idx]["qty"] = quantity
            if modifiers is not None:
                items[found_idx]["modifiers"] = modifiers
            msg = f"Updated {item_name} quantity to {quantity}."
            
        subtotal = sum(i["price"] * i["qty"] for i in items)
        tax = round(subtotal * 0.05, 2)
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "items": items,
                "subtotal": subtotal,
                "tax": tax,
                "total": subtotal + tax,
                "updated_at": now_iso()
            }}
        )
        return msg

    async def checkout(self, confirmed_by_diner: bool) -> str:
        """Finalize the order and send it to the kitchen."""
        if not confirmed_by_diner:
            return "You must confirm the order with the diner before calling checkout."
            
        session = await db.ai_waiter_sessions.find_one({"session_id": self.session_id})
        if not session or not session.get("order_id"):
            return "No active order to checkout."
            
        order_id = session["order_id"]
        order = await db.orders.find_one({"id": order_id})
        
        if not order or order.get("status") != "draft":
            return "Order is already checked out or invalid."
            
        if not order.get("items"):
            return "Cannot checkout an empty order."
            
        from routers.orders import broadcast_order_update
        from deps import next_token
        
        token = await next_token(self.restaurant_id, "dine_in")
        
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": "confirmed",
                "token": token,
                "updated_at": now_iso()
            }}
        )
        
        order["status"] = "confirmed"
        order["token"] = token
        broadcast_order_update(self.restaurant_id, {"type": "new_order", "order": {k: v for k, v in order.items() if k != "_id"}})
        
        await db.ai_waiter_sessions.update_one(
            {"session_id": self.session_id},
            {"$set": {"status": "checked_out", "last_activity_at": now_iso()}}
        )
        
        return f"Checkout successful! Order sent to kitchen with token {token}."

    async def get_recommendations(self, based_on_order: bool = True) -> str:
        """Get upsell/pairing suggestions."""
        session = await db.ai_waiter_sessions.find_one({"session_id": self.session_id})
        order_items = []
        if session and session.get("order_id") and based_on_order:
            order = await db.orders.find_one({"id": session["order_id"]})
            if order:
                order_items = order.get("items", [])
                
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
