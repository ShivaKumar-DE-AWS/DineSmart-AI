import os
import uuid
import re
from typing import List, Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from deps import db, now_iso

# =========================================================
# Diner profile constants — persistent, session-scoped memory
# =========================================================
DIET_TAG_MAP = {
    "veg": {"veg", "vegetarian"},
    "vegetarian": {"veg", "vegetarian"},
    "non_veg": {"non-veg", "non_veg"},
    "vegan": {"vegan"},
    "jain": {"jain"},
}
# Tags that explicitly signal a dish is NOT safe for a given restriction
DIET_CONFLICT_TAGS = {
    "veg": {"non-veg", "non_veg"},
    "vegetarian": {"non-veg", "non_veg"},
    "vegan": {"non-veg", "non_veg", "veg", "vegetarian", "dairy", "egg", "honey"},
    "jain": {"non-veg", "non_veg", "onion", "garlic", "root-vegetable"},
}
# Keyword → allergen family, used to scan name/description/tags for hidden allergens
ALLERGEN_KEYWORDS = {
    "nuts": ["nut", "cashew", "almond", "peanut", "pistachio", "walnut"],
    "peanut": ["peanut", "groundnut"],
    "dairy": ["milk", "cream", "butter", "ghee", "cheese", "paneer", "curd", "yogurt", "yoghurt"],
    "gluten": ["wheat", "maida", "flour", "bread", "naan", "roti", "gluten"],
    "egg": ["egg"],
    "shellfish": ["shrimp", "prawn", "crab", "lobster", "shellfish"],
    "soy": ["soy", "soya", "tofu"],
    "sesame": ["sesame", "til"],
}


def _text_blob(item: Dict[str, Any]) -> str:
    parts = [item.get("name", ""), item.get("description", "")] + list(item.get("tags", []) or [])
    return " ".join(parts).lower()


def _item_conflicts_with_diet(item: Dict[str, Any], diet: str) -> bool:
    diet = (diet or "").lower().strip()
    conflict_tags = DIET_CONFLICT_TAGS.get(diet)
    if not conflict_tags:
        return False
    tags = {str(t).lower() for t in (item.get("tags") or [])}
    return bool(tags & conflict_tags)


def _item_conflicts_with_allergy(item: Dict[str, Any], allergy: str) -> bool:
    allergy = (allergy or "").lower().strip()
    keywords = ALLERGEN_KEYWORDS.get(allergy, [allergy] if allergy else [])
    if not keywords:
        return False
    blob = _text_blob(item)
    return any(kw in blob for kw in keywords)


def _profile_conflict_reason(item: Dict[str, Any], profile: Dict[str, Any]) -> Optional[str]:
    """Returns a human-readable reason if the item conflicts with the diner's stored
    dietary restrictions or allergies, otherwise None. Errs on the side of caution
    for allergies (exact substring match) but only hard-blocks diet on explicit tag conflicts."""
    if not profile:
        return None
    for allergy in profile.get("allergies", []) or []:
        if _item_conflicts_with_allergy(item, allergy):
            return f"contains or may contain {allergy}, which conflicts with the guest's stated allergy"
    for diet in profile.get("dietary_restrictions", []) or []:
        if _item_conflicts_with_diet(item, diet):
            return f"is tagged in a way that conflicts with the guest's {diet} preference"
    return None


class WaiterTools:
    def __init__(self, session_id: str, restaurant_id: str, table_id: str):
        self.session_id = session_id
        self.restaurant_id = restaurant_id
        self.table_id = table_id

    async def get_diner_profile(self) -> Dict[str, Any]:
        """Fetch the persisted diner profile (dietary restrictions, allergies, spice
        preference, budget, party size) for this session. Never raises; returns {} if none."""
        doc = await db.diner_profiles.find_one({"session_id": self.session_id})
        if not doc:
            return {}
        doc.pop("_id", None)
        return doc

    async def update_diner_profile(
        self,
        dietary_restrictions: Optional[List[str]] = None,
        allergies: Optional[List[str]] = None,
        spice_preference: Optional[str] = None,
        budget: Optional[float] = None,
        party_size: Optional[int] = None,
    ) -> str:
        """Persist newly learned facts about the diner (merges with what's already known).
        Call this the moment the diner mentions a dietary restriction, allergy, spice
        preference, budget, or party size — even in passing."""
        existing = await self.get_diner_profile()
        merged_diet = set(existing.get("dietary_restrictions", []) or [])
        merged_allergy = set(existing.get("allergies", []) or [])

        if dietary_restrictions:
            merged_diet |= {str(d).lower().strip() for d in dietary_restrictions if str(d).strip()}
        if allergies:
            merged_allergy |= {str(a).lower().strip() for a in allergies if str(a).strip()}

        update: Dict[str, Any] = {
            "session_id": self.session_id,
            "restaurant_id": self.restaurant_id,
            "dietary_restrictions": sorted(merged_diet),
            "allergies": sorted(merged_allergy),
            "updated_at": now_iso(),
        }
        if spice_preference:
            update["spice_preference"] = str(spice_preference).lower().strip()
        elif existing.get("spice_preference"):
            update["spice_preference"] = existing["spice_preference"]

        if budget is not None:
            update["budget"] = float(budget)
        elif existing.get("budget") is not None:
            update["budget"] = existing["budget"]

        if party_size is not None:
            update["party_size"] = int(party_size)
        elif existing.get("party_size") is not None:
            update["party_size"] = existing["party_size"]

        await db.diner_profiles.update_one(
            {"session_id": self.session_id},
            {"$set": update},
            upsert=True,
        )
        return "Guest profile updated."

    async def search_menu(self, query: str, dietary_filter: str = "any", category: str = "") -> str:
        """Search the restaurant's live menu by free text and/or dietary filter."""
        profile = await self.get_diner_profile()
        match_q: Dict[str, Any] = {"restaurant_id": self.restaurant_id, "available": True}
        
        if query:
            clean_q = str(query).strip()
            escaped_q = re.escape(clean_q)
            or_conditions = [
                {"name": {"$regex": escaped_q, "$options": "i"}},
                {"description": {"$regex": escaped_q, "$options": "i"}},
                {"tags": {"$regex": escaped_q, "$options": "i"}},
                {"category": {"$regex": escaped_q, "$options": "i"}}
            ]
            words = [re.escape(w) for w in re.findall(r"\b\w+\b", clean_q) if len(w) >= 3 and w.lower() not in {"what", "are", "the", "for", "with", "and", "can", "you", "show", "give", "some", "have", "our", "should", "order", "party", "people", "would", "like", "please", "recommend", "suggest", "about", "there", "today", "special", "specials"}]
            if words:
                word_regex = "|".join(words[:5])
                or_conditions.extend([
                    {"name": {"$regex": word_regex, "$options": "i"}},
                    {"description": {"$regex": word_regex, "$options": "i"}},
                    {"tags": {"$regex": word_regex, "$options": "i"}}
                ])
            match_q["$or"] = or_conditions
            
        # If the diner hasn't specified a filter this turn, fall back to their
        # remembered dietary restriction so results never need re-asking.
        effective_filter = dietary_filter
        if effective_filter == "any" and profile.get("dietary_restrictions"):
            for d in profile["dietary_restrictions"]:
                if d in DIET_TAG_MAP:
                    effective_filter = d
                    break

        if effective_filter != "any":
            if effective_filter in ("veg", "vegetarian"):
                match_q["tags"] = {"$in": ["veg", "vegetarian"]}
            elif effective_filter == "non_veg":
                match_q["tags"] = {"$in": ["non-veg", "non_veg"]}
            elif effective_filter == "vegan":
                match_q["tags"] = {"$in": ["vegan"]}
            elif effective_filter == "jain":
                match_q["tags"] = {"$in": ["jain"]}

        if category:
            match_q["category"] = {"$regex": re.escape(str(category).strip()), "$options": "i"}
            
        items = await db.menu.find(match_q).to_list(20)

        # Safety net: drop anything that conflicts with a stated allergy, regardless
        # of which filter/category was searched for.
        if profile.get("allergies"):
            items = [i for i in items if not any(_item_conflicts_with_allergy(i, a) for a in profile["allergies"])]
        
        if not items:
            return "No items found matching the search criteria (some results may have been excluded due to the guest's stated allergies/diet)."
            
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

        # Hard safety check against the guest's remembered allergies/diet before adding.
        profile = await self.get_diner_profile()
        conflict = _profile_conflict_reason(menu_item, profile)
        if conflict:
            return (
                f"Cannot add {menu_item.get('name')}: it {conflict}. "
                f"Please double-check with the guest before proceeding or suggest an alternative."
            )

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

        hint = await self._course_flow_hint(items, menu_item.get("category", ""))
        budget_note = await self._budget_note(items, profile)
        return f"Successfully added {quantity}x {menu_item.get('name')} to the cart.{hint}{budget_note}"

    async def _course_flow_hint(self, cart_items: List[Dict[str, Any]], just_added_category: str) -> str:
        """Deterministic course-flow nudge: Starter -> Main -> Drink -> Dessert.
        Returns a short internal note (not shown to the diner verbatim) telling the
        model what natural upsell category makes sense next, without spamming."""
        cat = (just_added_category or "").lower()
        present_cats = {str(i.get("category", "")).lower() for i in cart_items}

        def has(keyword: str) -> bool:
            return any(keyword in c for c in present_cats)

        if any(k in cat for k in ["main", "biryani", "curry", "rice"]) and not has("drink") and not has("beverage"):
            return " [internal: consider suggesting one drink to pair with this]"
        if any(k in cat for k in ["starter", "appetizer"]) and not any(has(k) for k in ["main", "biryani", "curry"]):
            return " [internal: consider suggesting a main course next]"
        if any(k in cat for k in ["main", "biryani", "curry"]) and not has("dessert") and not has("sweet"):
            return " [internal: once the guest seems done ordering mains, consider suggesting a dessert]"
        return ""

    async def _budget_note(self, cart_items: List[Dict[str, Any]], profile: Dict[str, Any]) -> str:
        """If the guest stated a budget, compute the real running total (incl. 5% tax)
        and flag it if they're close to or over budget, so the model doesn't guess."""
        budget = profile.get("budget") if profile else None
        if not budget:
            return ""
        subtotal = sum(float(i.get("price", 0)) * int(i.get("qty", 1)) for i in cart_items)
        total = round(subtotal * 1.05, 2)
        remaining = round(budget - total, 2)
        if remaining < 0:
            return f" [internal: running total is ₹{total}, which is ₹{abs(remaining)} OVER the guest's stated ₹{budget} budget — flag this to the guest]"
        return f" [internal: running total is ₹{total}, ₹{remaining} remaining within the guest's ₹{budget} budget]"
            
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
        """Get upsell/pairing suggestions, filtered by the guest's remembered diet,
        allergies, and remaining budget."""
        profile = await self.get_diner_profile()
        order_items = []
        cart_subtotal = 0.0
        if based_on_order:
            cart = await db.table_carts.find_one({"session_id": self.session_id})
            if cart:
                order_items = cart.get("items", [])
                cart_subtotal = sum(float(i.get("price", 0)) * int(i.get("qty", 1)) for i in order_items)

        drinks = await db.menu.find({"restaurant_id": self.restaurant_id, "available": True, "category": {"$regex": "drink|beverage", "$options": "i"}}).to_list(10)
        desserts = await db.menu.find({"restaurant_id": self.restaurant_id, "available": True, "category": {"$regex": "dessert|sweet", "$options": "i"}}).to_list(10)

        def allowed(item: Dict[str, Any]) -> bool:
            return _profile_conflict_reason(item, profile) is None

        candidates = [d for d in (drinks + desserts) if allowed(d)]

        budget = profile.get("budget") if profile else None
        if budget:
            remaining = float(budget) / 1.05 - cart_subtotal  # back out tax to compare against menu prices
            candidates = [d for d in candidates if float(d.get("price", 0)) <= max(remaining, 0)]

        recs = []
        if order_items:
            recs.append("Based on the current order, I recommend pairing it with:")
        else:
            recs.append("Here are some popular recommendations:")

        for d in candidates[:5]:
            recs.append(f"- {d['name']} (₹{d['price']}) (ID: {d['id']})")

        if len(recs) == 1:
            bestsellers = await db.menu.find({"restaurant_id": self.restaurant_id, "available": True}).limit(10).to_list(10)
            bestsellers = [b for b in bestsellers if allowed(b)]
            if budget:
                remaining = float(budget) / 1.05 - cart_subtotal
                bestsellers = [b for b in bestsellers if float(b.get("price", 0)) <= max(remaining, 0)]
            for d in bestsellers[:3]:
                recs.append(f"- {d['name']} (₹{d['price']}) (ID: {d['id']})")

        if len(recs) == 1:
            recs.append("Nothing fits within the remaining budget/diet right now — consider mentioning this to the guest.")

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
