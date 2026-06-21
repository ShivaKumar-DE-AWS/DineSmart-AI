"""Admin settings, staff, analytics, notifications, push, restaurants, config routes."""
import os
import uuid
import re
import json
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from deps import (
    db, now_iso, hash_password, require_user, require_roles,
    MenuItemModel, TableModel, SettingsUpdateReq, StaffUpdateReq,
    RestaurantRequestReq,
)

router = APIRouter(tags=["admin"])

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:hello@smartdine.ai")


# =========================================================
# Health
# =========================================================
@router.get("/")
async def root():
    return {"status": "ok", "service": "smartdine-ai", "docs": "/docs"}

@router.get("/api/health")
async def health():
    return {"status": "ok", "service": "smartdine-ai", "time": now_iso()}


# =========================================================
# Notifications
# =========================================================
@router.get("/api/notifications")
async def get_notifications(user=Depends(require_user)):
    q: Dict[str, Any] = {"read": False}
    rid = user.get("restaurant_id")
    if rid:
        q["restaurant_id"] = rid
    nots = await db.notifications.find(q).sort("created_at", -1).to_list(100)
    for n in nots:
        n.pop("_id", None)
    return {"notifications": nots}

@router.post("/api/notifications/{n_id}/read")
async def mark_notification_read(n_id: str, user=Depends(require_user)):
    q: Dict[str, Any] = {"id": n_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    await db.notifications.update_one(q, {"$set": {"read": True}})
    return {"ok": True}


# =========================================================
# Cart Broadcast (for table session collaborative carts)
# =========================================================
cart_listeners: Dict[str, List[asyncio.Queue]] = {}
import asyncio

def broadcast_cart(session_id: str, cart_data: Dict[str, Any]):
    if session_id in cart_listeners:
        for q in cart_listeners[session_id]:
            q.put_nowait(cart_data)

@router.post("/api/tables/{session_id}/cart")
async def update_cart(session_id: str, request):
    data = await request.json()
    items = data.get("items", [])
    cart_data = {"session_id": session_id, "items": items, "updated_at": now_iso()}
    await db.table_carts.update_one({"session_id": session_id}, {"$set": cart_data}, upsert=True)
    broadcast_cart(session_id, items)
    return {"ok": True}

@router.get("/api/tables/{session_id}/cart/stream")
async def stream_cart(session_id: str, req):
    from fastapi.responses import StreamingResponse
    async def stream():
        q: asyncio.Queue = asyncio.Queue()
        cart_listeners.setdefault(session_id, []).append(q)
        try:
            current = await db.table_carts.find_one({"session_id": session_id}, {"_id": 0})
            if current:
                yield f"data: {json.dumps(current.get('items', []))}\n\n"
            while True:
                items = await asyncio.wait_for(q.get(), timeout=30)
                yield f"data: {json.dumps(items)}\n\n"
        except asyncio.TimeoutError:
            pass
        except asyncio.CancelledError:
            pass
        finally:
            if session_id in cart_listeners:
                try:
                    cart_listeners[session_id].remove(q)
                except ValueError:
                    pass
    return StreamingResponse(stream(), media_type="text/event-stream",
                            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


# =========================================================
# Billing (mock / stripe)
# =========================================================
@router.get("/api/billing/status", dependencies=[Depends(require_roles("admin"))])
async def billing_status(user=Depends(require_user)):
    rest = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0})
    if not rest:
        return {"plan": "free", "status": "inactive"}
    return {"plan": rest.get("plan", "free"), "status": rest.get("subscription_status", "inactive")}

@router.post("/api/billing/subscribe", dependencies=[Depends(require_roles("admin"))])
async def subscribe_plan(user=Depends(require_user)):
    await db.restaurants.update_one(
        {"id": user["restaurant_id"]},
        {"$set": {"plan": "pro", "subscription_status": "active",
                  "subscription_expiry": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat() + "Z"}}
    )
    return {"ok": True, "plan": "pro"}


# =========================================================
# Analytics
# =========================================================
@router.get("/api/analytics", dependencies=[Depends(require_roles("admin"))])
async def get_analytics(user=Depends(require_user)):
    q = {"status": {"$nin": ["cancelled"]}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    orders = await db.orders.find(q).to_list(1000)
    total_revenue = sum(o.get("total", 0) for o in orders)
    ai_orders = sum(1 for o in orders if o.get("is_ai"))
    manual_orders = len(orders) - ai_orders
    return {"total_revenue": total_revenue, "total_orders": len(orders), "ai_orders": ai_orders, "manual_orders": manual_orders, "recent_orders": orders[-10:]}

@router.get("/api/analytics/dashboard", dependencies=[Depends(require_roles("admin"))])
async def dashboard(user=Depends(require_user)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    q: Dict[str, Any] = {"created_at": {"$gte": today_start}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    orders_today = await db.orders.find(q, {"_id": 0}).to_list(2000)
    revenue_today = sum(o["total"] for o in orders_today if o["status"] != "cancelled")
    avg_ticket = revenue_today / len(orders_today) if orders_today else 0
    item_counts: Dict[str, Dict[str, Any]] = {}
    for o in orders_today:
        for i in o.get("items", []):
            entry = item_counts.setdefault(i["item_id"], {"name": i["name"], "qty": 0, "revenue": 0})
            entry["qty"] += i["qty"]
            entry["revenue"] += i["qty"] * i["price"]
    top_items = sorted(item_counts.values(), key=lambda x: x["qty"], reverse=True)[:5]
    low_stock_q: Dict[str, Any] = {"$expr": {"$lte": ["$qty", "$reorder_level"]}}
    if user.get("restaurant_id"):
        low_stock_q["restaurant_id"] = user["restaurant_id"]
    low_stock = await db.inventory.find(low_stock_q, {"_id": 0}).to_list(50)
    status_counts: Dict[str, int] = {}
    for o in orders_today:
        status_counts[o["status"]] = status_counts.get(o["status"], 0) + 1
    ai_orders_count = sum(1 for o in orders_today if o.get("is_ai"))
    return {
        "revenue_today": round(revenue_today, 2), "orders_today": len(orders_today),
        "ai_orders_today": ai_orders_count, "avg_ticket": round(avg_ticket, 2),
        "top_items": top_items, "low_stock_count": len(low_stock),
        "low_stock": low_stock, "status_counts": status_counts,
    }

@router.get("/api/analytics/revenue", dependencies=[Depends(require_roles("admin"))])
async def revenue_series(days: int = 7, user=Depends(require_user)):
    start = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    q: Dict[str, Any] = {"created_at": {"$gte": start.isoformat()}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    orders = await db.orders.find(q, {"_id": 0}).to_list(5000)
    buckets: Dict[str, float] = {}
    for d in range(days):
        key = (start + timedelta(days=d)).strftime("%Y-%m-%d")
        buckets[key] = 0
    for o in orders:
        if o["status"] == "cancelled":
            continue
        day_key = o["created_at"][:10]
        if day_key in buckets:
            buckets[day_key] += o["total"]
    series = [{"date": k, "revenue": round(v, 2)} for k, v in buckets.items()]
    return {"series": series}

@router.get("/api/analytics/customers", dependencies=[Depends(require_roles("admin"))])
async def customer_analytics(user=Depends(require_user)):
    q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    orders = await db.orders.find(q, {"_id": 0}).to_list(5000)
    by_customer: Dict[str, Dict[str, Any]] = {}
    for o in orders:
        name = o.get("customer_name", "Guest")
        e = by_customer.setdefault(name, {"name": name, "orders": 0, "revenue": 0})
        e["orders"] += 1
        e["revenue"] += o["total"]
    top = sorted(by_customer.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    total_customers = len(by_customer)
    repeat = sum(1 for v in by_customer.values() if v["orders"] > 1)
    return {
        "total_customers": total_customers, "repeat_customers": repeat,
        "repeat_rate": round((repeat / total_customers) * 100, 1) if total_customers else 0,
        "top_customers": top,
    }


# =========================================================
# Admin Settings & Branding
# =========================================================
@router.get("/api/admin/settings", dependencies=[Depends(require_roles("admin"))])
async def get_admin_settings(user=Depends(require_user)):
    rest = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return rest

@router.put("/api/admin/settings", dependencies=[Depends(require_roles("admin"))])
async def update_admin_settings(req: SettingsUpdateReq, user=Depends(require_user)):
    update_data = req.model_dump(exclude_unset=True)
    if not update_data:
        return {"status": "success", "message": "No changes"}
    await db.restaurants.update_one({"id": user["restaurant_id"]}, {"$set": update_data})
    return {"status": "success"}

@router.get("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def get_admin_staff(user=Depends(require_user)):
    staff = await db.users.find(
        {"restaurant_id": user["restaurant_id"], "role": {"$in": ["kitchen", "counter"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return {"staff": staff}

@router.post("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def update_admin_staff(req: StaffUpdateReq, user=Depends(require_user)):
    if req.role not in {"kitchen", "counter"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    update_data = {"name": req.name}
    if req.password:
        update_data["password_hash"] = hash_password(req.password)
    if req.id:
        await db.users.update_one(
            {"id": req.id, "restaurant_id": user["restaurant_id"]},
            {"$set": update_data}
        )
    else:
        raise HTTPException(status_code=400, detail="ID required")
    return {"status": "success"}


# =========================================================
# Web Push notifications (VAPID)
# =========================================================
from pydantic import BaseModel

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    order_id: Optional[str] = None

@router.get("/api/push/vapid-public-key")
async def push_vapid_public_key():
    return {"key": VAPID_PUBLIC_KEY}

@router.post("/api/push/subscribe")
async def push_subscribe(sub: PushSubscription):
    if not sub.endpoint or "auth" not in sub.keys or "p256dh" not in sub.keys:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    doc = {"id": str(uuid.uuid4()), "endpoint": sub.endpoint, "keys": sub.keys, "order_id": sub.order_id, "created_at": now_iso()}
    await db.push_subscriptions.update_one({"endpoint": sub.endpoint, "order_id": sub.order_id}, {"$set": doc}, upsert=True)
    return {"ok": True}

@router.post("/api/push/test/{order_id}")
async def push_test(order_id: str):
    if not VAPID_PRIVATE_KEY:
        return {"sent": 0, "removed": 0, "skipped": True}
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return {"sent": 0, "removed": 0, "skipped": True}
    subs = await db.push_subscriptions.find({"order_id": order_id}, {"_id": 0}).to_list(500)
    payload = json.dumps({"title": "SmartDine test", "body": "Push is alive and well", "data": {"test": True}, "order_id": order_id})
    sent = 0
    removed = 0
    for s in subs:
        try:
            webpush(subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]}, data=payload, vapid_private_key=VAPID_PRIVATE_KEY, vapid_claims={"sub": VAPID_CONTACT})
            sent += 1
        except Exception as e:
            code = getattr(getattr(e, "response", None), "status_code", 0) if hasattr(e, "response") else 0
            if code in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
                removed += 1
    return {"sent": sent, "removed": removed}


# =========================================================
# Auto-Create Restaurant (Request Form)
# =========================================================
SAMPLE_MENU_GENERIC = [
    {"name": "House Special Salad", "description": "Fresh garden salad with house dressing.", "price": 180, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian", "healthy"]},
    {"name": "Crispy Chicken Wings", "description": "Golden fried chicken wings with spicy dip.", "price": 280, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1608039829572-9b1e6a8ad40e?w=600&q=80", "prep_time_min": 12, "tags": ["bestseller"]},
    {"name": "Grilled Fish", "description": "Herb-crusted fish fillet with lemon butter sauce.", "price": 380, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1599084993091-1cb5c49e3b0b?w=600&q=80", "prep_time_min": 18, "tags": ["signature", "gluten-free"]},
    {"name": "Pasta Primavera", "description": "Seasonal vegetables in creamy garlic sauce.", "price": 320, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80", "prep_time_min": 14, "tags": ["vegetarian"]},
    {"name": "Grilled Chicken Steak", "description": "Tender chicken breast with mushroom sauce.", "price": 340, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1432139549614-0e64e0a5c6c7?w=600&q=80", "prep_time_min": 16, "tags": ["bestseller"]},
    {"name": "Chocolate Lava Cake", "description": "Warm chocolate cake with molten center.", "price": 220, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80", "prep_time_min": 12, "tags": ["signature"]},
    {"name": "Fresh Juice", "description": "Seasonal fresh fruit juice.", "price": 120, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80", "prep_time_min": 5, "tags": ["refreshing"]},
    {"name": "Signature Dessert Platter", "description": "Assortment of house-made desserts.", "price": 280, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80", "prep_time_min": 10, "tags": ["bestseller", "sharing"]},
]
SAMPLE_MENU_INDIAN = [
    {"name": "Paneer Tikka", "description": "Chargrilled cottage cheese with bell peppers.", "price": 260, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80", "prep_time_min": 14, "tags": ["vegetarian", "bestseller"]},
    {"name": "Chicken Curry", "description": "Traditional spiced chicken curry.", "price": 320, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", "prep_time_min": 22, "tags": ["classic"]},
    {"name": "Dal Tadka", "description": "Yellow lentils tempered with cumin and garlic.", "price": 200, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80", "prep_time_min": 18, "tags": ["vegetarian", "comfort"]},
    {"name": "Biryani", "description": "Fragrant rice layered with spiced meat and saffron.", "price": 350, "category": "Rice & Biryani", "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80", "prep_time_min": 25, "tags": ["signature", "bestseller"]},
    {"name": "Garlic Naan", "description": "Tandoor-baked leavened bread with garlic butter.", "price": 60, "category": "Breads", "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian"]},
    {"name": "Gulab Jamun", "description": "Milk dumplings in rose syrup.", "price": 150, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1666190466521-0e4a38f7e2be?w=600&q=80", "prep_time_min": 10, "tags": ["must-try"]},
]
SAMPLE_MENU_ITALIAN = [
    {"name": "Bruschetta", "description": "Toasted bread with tomato, basil, and olive oil.", "price": 220, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian"]},
    {"name": "Margherita Pizza", "description": "Classic tomato, mozzarella, and basil pizza.", "price": 380, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80", "prep_time_min": 16, "tags": ["bestseller", "vegetarian"]},
    {"name": "Spaghetti Carbonara", "description": "Creamy egg-based pasta with pancetta.", "price": 340, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80", "prep_time_min": 14, "tags": ["classic"]},
    {"name": "Tiramisu", "description": "Coffee-soaked ladyfingers with mascarpone cream.", "price": 250, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80", "prep_time_min": 5, "tags": ["signature"]},
]
SAMPLE_MENU_CAFE = [
    {"name": "Avocado Toast", "description": "Smashed avocado on sourdough with poached egg.", "price": 280, "category": "Breakfast", "image_url": "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&q=80", "prep_time_min": 10, "tags": ["bestseller", "healthy"]},
    {"name": "Cappuccino", "description": "Espresso with steamed milk and foam.", "price": 180, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80", "prep_time_min": 5, "tags": ["classic"]},
    {"name": "Club Sandwich", "description": "Triple-layer sandwich with chicken and veggies.", "price": 260, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80", "prep_time_min": 12, "tags": ["bestseller"]},
    {"name": "Blueberry Pancakes", "description": "Fluffy pancakes with fresh blueberries and maple syrup.", "price": 300, "category": "Breakfast", "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80", "prep_time_min": 14, "tags": ["signature"]},
    {"name": "Cold Brew", "description": "Slow-steeped cold brew coffee.", "price": 200, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80", "prep_time_min": 3, "tags": ["refreshing"]},
]

def generate_frontend_config(name: str, slug: str, rest_id: str, phone: str, email: str, cuisine: str) -> dict:
    short_slug = slug.split('-')[0]
    return {
        "id": rest_id, "name": name, "slug": slug,
        "tagline": f"Welcome to {name}",
        "description": f"A wonderful dining experience at {name}. Serving delicious {cuisine} cuisine with love and passion.",
        "logo_url": "", "primary_color": "#8A1A2A", "secondary_color": "#C9A348", "accent_color": "#E8A317",
        "hero_images": [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
            "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80"
        ],
        "hero_quote": f"Every meal tells a story at {name}.",
        "history_intro": f"Welcome to {name}, where every dish is crafted with passion and served with warmth.",
        "history": [],
        "specialties": [f"Authentic {cuisine} Cuisine", "Fresh Ingredients", "Warm Hospitality"],
        "famous_dishes": [],
        "why_us": [
            {"icon": "Crown", "title": "Quality Food", "description": "We use only the freshest ingredients sourced daily."},
            {"icon": "Heart", "title": "Made with Love", "description": "Every dish is crafted with care and passion."},
            {"icon": "Users", "title": "Family Friendly", "description": "A warm welcome awaits you and your loved ones."},
            {"icon": "ChefHat", "title": "Expert Chefs", "description": "Our talented chefs bring years of experience."},
            {"icon": "Sparkles", "title": "AI Powered", "description": "Smart ordering and personalized recommendations."},
        ],
        "contact": {"phone": phone, "email": email, "address": "Your Restaurant Address", "google_map_url": "", "latitude": 12.9716, "longitude": 77.5946},
        "social_links": {"instagram": "", "facebook": ""},
        "hours": {"lunch": "12:00 PM to 3:00 PM", "dinner": "6:00 PM to 11:00 PM", "open_days": "Open all 7 days"},
        "ai_waiter": {"name": f"{name} AI", "personality": f"Warm, knowledgeable about {cuisine} cuisine, and always happy to recommend.", "greeting": f"Welcome to {name}! I'm your AI dining assistant. How can I help you today?", "languages": ["en"], "tones": ["friendly"]},
        "reviews": [], "offers": [],
        "menu_config": {"category_order": ["Starters", "Mains", "Desserts", "Beverages"], "show_best_sellers": True, "show_chef_specials": True, "show_recommendations": True},
    }

@router.post("/api/restaurants/request", status_code=201)
async def request_restaurant(req: RestaurantRequestReq):
    slug = re.sub(r'[^a-z0-9-]', '', req.name.lower().replace(' ', '-').replace('&', 'and'))
    while slug and slug[-1] == '-': slug = slug[:-1]
    while slug and slug[0] == '-': slug = slug[1:]
    if not slug or len(slug) < 2:
        raise HTTPException(status_code=400, detail="Invalid restaurant name. Use at least 2 characters.")
    existing = await db.restaurants.find_one({"slug": slug})
    if existing:
        raise HTTPException(status_code=409, detail=f"Restaurant '{req.name}' already exists.")
    rest_id = f"rest_{slug}_001"
    short_slug = slug
    await db.restaurants.insert_one({"id": rest_id, "name": req.name, "slug": slug, "plan": "trial", "created_at": now_iso()})
    users = [
        {"email": f"{short_slug}@smartdine.ai", "password": "Owner@123", "name": f"{req.name} Owner", "role": "admin"},
        {"email": f"admin-{short_slug}@smartdine.ai", "password": "Admin@123", "name": f"{req.name} Admin", "role": "admin"},
        {"email": f"kitchen-{short_slug}@smartdine.ai", "password": "Chef@123", "name": "Head Chef", "role": "kitchen"},
        {"email": f"counter-{short_slug}@smartdine.ai", "password": "Counter@123", "name": "Counter Staff", "role": "counter"},
    ]
    for u in users:
        await db.users.insert_one({"id": str(uuid.uuid4()), "restaurant_id": rest_id, "restaurant_slug": slug, "email": u["email"], "name": u["name"], "role": u["role"], "password_hash": hash_password(u["password"]), "created_at": now_iso()})
    cuisine_lower = req.cuisine.lower()
    if "indian" in cuisine_lower: sample_menu = SAMPLE_MENU_INDIAN
    elif "italian" in cuisine_lower or "pizza" in cuisine_lower or "pasta" in cuisine_lower: sample_menu = SAMPLE_MENU_ITALIAN
    elif "cafe" in cuisine_lower or "coffee" in cuisine_lower or "breakfast" in cuisine_lower: sample_menu = SAMPLE_MENU_CAFE
    else: sample_menu = SAMPLE_MENU_GENERIC
    for m in sample_menu:
        doc = MenuItemModel(**m, restaurant_id=rest_id).model_dump()
        await db.menu.insert_one(doc)
    for i in range(1, req.tables_count + 1):
        table_doc = TableModel(number=i, capacity=4).model_dump()
        table_doc["restaurant_id"] = rest_id
        await db.tables.insert_one(table_doc)
    frontend_config = generate_frontend_config(req.name, slug, rest_id, req.phone, req.email, req.cuisine)
    await db.restaurant_configs.replace_one({"slug": slug}, {"slug": slug, "config": frontend_config, "created_at": now_iso()}, upsert=True)
    return {
        "status": "created", "slug": slug, "url": f"/r/{slug}",
        "credentials": {
            "owner": {"email": f"{short_slug}@smartdine.ai", "hint": "Owner@123"},
            "admin": {"email": f"admin-{short_slug}@smartdine.ai", "hint": "Admin@123"},
            "kitchen": {"email": f"kitchen-{short_slug}@smartdine.ai", "hint": "Chef@123"},
            "counter": {"email": f"counter-{short_slug}@smartdine.ai", "hint": "Counter@123"},
        },
        "table_count": req.tables_count, "menu_items": len(sample_menu),
    }

@router.get("/api/restaurants/{slug}")
async def get_restaurant_by_slug(slug: str):
    rest = await db.restaurants.find_one({"slug": slug}, {"_id": 0})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return rest

@router.get("/api/config/list")
async def list_restaurant_configs():
    docs = await db.restaurant_configs.find({}, {"_id": 0, "config.name": 1, "slug": 1}).to_list(100)
    out = []
    for d in docs:
        cfg = d.get("config", {})
        slug = d.get("slug", "")
        out.append({"slug": slug, "name": cfg.get("name", slug), "email": f"{slug}@smartdine.ai"})
    return {"configs": out}

@router.get("/api/config/{slug}")
async def get_restaurant_config(slug: str):
    doc = await db.restaurant_configs.find_one({"slug": slug}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Restaurant config not found")
    return doc.get("config", doc)
