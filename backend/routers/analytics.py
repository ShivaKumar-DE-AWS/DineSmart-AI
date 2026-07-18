"""Analytics routes: dashboard, revenue series, customer analytics."""
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends
from deps import db, now_iso, require_user, require_roles

router = APIRouter(tags=["analytics"])

@router.get("/api/analytics", dependencies=[Depends(require_roles("admin"))])
async def get_analytics(user=Depends(require_user)):
    q = {"status": {"$nin": ["cancelled"]}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    pipeline = [{"$match": q}, {"$group": {
        "_id": None,
        "total_revenue": {"$sum": "$total"},
        "total_orders": {"$sum": 1},
        "ai_orders": {"$sum": {"$cond": [{"$eq": ["$is_ai", True]}, 1, 0]}}
    }}]
    res = await db.orders.aggregate(pipeline).to_list(1)
    stats = res[0] if res else {"total_revenue": 0, "total_orders": 0, "ai_orders": 0}
    recent_orders = await db.orders.find(q).sort("created_at", -1).limit(10).to_list(10)
    total_rev = stats.get("total_revenue") or 0
    total_ords = stats.get("total_orders") or 0
    ai_ords = stats.get("ai_orders") or 0
    
    return {
        "total_revenue": total_rev,
        "total_orders": total_ords,
        "ai_orders": ai_ords,
        "manual_orders": total_ords - ai_ords,
        "recent_orders": recent_orders
    }

@router.get("/api/analytics/dashboard", dependencies=[Depends(require_roles("admin"))])
async def dashboard(user=Depends(require_user)):
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q: Dict[str, Any] = {"created_at": {"$gte": today_start}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    revenue_res = await db.orders.aggregate([
        {"$match": {**q, "status": {"$ne": "cancelled"}}},
        {"$group": {"_id": None, "revenue": {"$sum": "$total"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    rev_data = revenue_res[0] if revenue_res else {"revenue": 0, "count": 0}
    revenue_today = rev_data["revenue"]
    orders_count_today = rev_data["count"]
    avg_ticket = revenue_today / orders_count_today if orders_count_today else 0

    items_res = await db.orders.aggregate([
        {"$match": q},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.item_id",
            "name": {"$first": "$items.name"},
            "qty": {"$sum": "$items.qty"},
            "revenue": {"$sum": {"$multiply": ["$items.qty", "$items.price"]}}
        }},
        {"$sort": {"qty": -1}},
        {"$limit": 5}
    ]).to_list(5)
    top_items = items_res

    status_res = await db.orders.aggregate([
        {"$match": q},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(None)
    status_counts = {s["_id"]: s["count"] for s in status_res}
    
    total_orders = sum(status_counts.values())

    ai_res = await db.orders.aggregate([
        {"$match": {**q, "is_ai": True}},
        {"$count": "count"}
    ]).to_list(1)
    ai_orders_count = ai_res[0]["count"] if ai_res else 0

    low_stock_q: Dict[str, Any] = {"$expr": {"$lte": ["$qty", "$reorder_level"]}}
    if user.get("restaurant_id"):
        low_stock_q["restaurant_id"] = user["restaurant_id"]
    low_stock = await db.inventory.find(low_stock_q, {"_id": 0}).to_list(100)
    rest = await db.restaurants.find_one({"id": user.get("restaurant_id")}) if user.get("restaurant_id") else None
    sandbox_mode = rest.get("sandbox_mode", True) if rest else True
    is_verified = rest.get("is_verified", False) if rest else False

    # Onboarding checks — menu and table counts
    menu_q: Dict[str, Any] = {}
    tables_q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        menu_q["restaurant_id"] = user["restaurant_id"]
        tables_q["restaurant_id"] = user["restaurant_id"]
    menu_count = await db.menu.count_documents(menu_q)
    tables_count = await db.tables.count_documents(tables_q)

    trial_ends_at = rest.get("trial_ends_at") if rest else None
    if trial_ends_at and hasattr(trial_ends_at, "isoformat"):
        trial_ends_at = trial_ends_at.isoformat()

    return {
        "revenue_today": round(revenue_today, 2), "orders_today": total_orders,
        "ai_orders_today": ai_orders_count, "avg_ticket": round(avg_ticket, 2),
        "top_items": top_items, "low_stock_count": len(low_stock),
        "low_stock": low_stock, "status_counts": status_counts,
        "sandbox_mode": sandbox_mode,
        "is_verified": is_verified,
        "menu_count": menu_count,
        "tables_count": tables_count,
        "subscription_status": rest.get("subscription_status") if rest else "trial",
        "plan_tier": rest.get("plan_tier") or rest.get("plan") if rest else "starter",
        "trial_ends_at": trial_ends_at,
    }

@router.get("/api/analytics/revenue", dependencies=[Depends(require_roles("admin"))])
async def revenue_series(days: int = 7, user=Depends(require_user)):
    start = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start_str = start.strftime("%Y-%m-%d")
    q: Dict[str, Any] = {"created_at": {"$gte": start_str}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    pipeline = [
        {"$match": {**q, "status": {"$ne": "cancelled"}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "revenue": {"$sum": "$total"}
        }}
    ]
    res = await db.orders.aggregate(pipeline).to_list(None)
    rev_map = {r["_id"]: r["revenue"] for r in res}
    buckets: Dict[str, float] = {}
    for d in range(days):
        key = (start + timedelta(days=d)).strftime("%Y-%m-%d")
        buckets[key] = rev_map.get(key, 0)
    series = [{"date": k, "revenue": round(v, 2)} for k, v in buckets.items()]
    return {"series": series}

@router.get("/api/analytics/customers", dependencies=[Depends(require_roles("admin"))])
async def customer_analytics(user=Depends(require_user)):
    q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    pipeline = [
        {"$match": q},
        {"$group": {
            "_id": {"$ifNull": ["$customer_name", "Guest"]},
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total"}
        }},
        {"$sort": {"revenue": -1}}
    ]
    customers = await db.orders.aggregate(pipeline).to_list(None)
    top = []
    total_customers = len(customers)
    repeat = 0
    for idx, c in enumerate(customers):
        if c["orders"] > 1:
            repeat += 1
        if idx < 10:
            top.append({"name": c["_id"], "orders": c["orders"], "revenue": round(c["revenue"], 2)})
    return {
        "total_customers": total_customers, "repeat_customers": repeat,
        "repeat_rate": round((repeat / total_customers) * 100, 1) if total_customers else 0,
        "top_customers": top,
    }


@router.get("/api/analytics/insights", dependencies=[Depends(require_roles("admin"))])
async def generate_insights(user=Depends(require_user)):
    rid = user.get("restaurant_id")
    # Cache check
    cache_key = f"insights_{rid or 'all'}"
    import json
    import asyncio
    from cache_service import menu_cache
    cached = await menu_cache.get(cache_key)
    if cached:
        return {"insights": cached}

    # Fetch data for LLM
    q = {"status": {"$nin": ["cancelled"]}}
    if rid: q["restaurant_id"] = rid
    
    # 1. Orders last 7 days
    start = datetime.now(timezone.utc) - timedelta(days=7)
    start_str = start.strftime("%Y-%m-%d")
    q["created_at"] = {"$gte": start_str}
    
    orders = await db.orders.find(q).to_list(100)
    total_rev = sum(o.get("total", 0) for o in orders)
    
    # 2. Low stock
    low_stock_q = {"$expr": {"$lte": ["$qty", "$reorder_level"]}}
    if rid: low_stock_q["restaurant_id"] = rid
    low_stock = await db.inventory.find(low_stock_q, {"name": 1, "_id": 0}).to_list(10)
    
    data_summary = f"""
    Restaurant Data (Last 7 Days):
    - Total Orders: {len(orders)}
    - Total Revenue: INR {total_rev}
    - Low Stock Items: {[i['name'] for i in low_stock]}
    """
    
    from deps import GEMINI_API_KEY
    if not GEMINI_API_KEY:
        default_insights = [
            {"title": "Weekend Promo", "description": "Run a promo this weekend to boost sales.", "type": "sales", "action_text": "Create Campaign", "action_link": "/admin/campaigns"}
        ]
        return {"insights": default_insights}

    prompt = f"""You are an expert restaurant consultant. Analyze the following 7-day data and provide 3 actionable business insights.
    
    {data_summary}
    
    Output strictly valid JSON with this schema:
    {{
        "insights": [
            {{
                "title": "String",
                "description": "String (1-2 sentences)",
                "type": "sales|inventory|menu|customers",
                "action_text": "String (short button text)",
                "action_link": "String (e.g. /admin/campaigns, /admin/inventory)"
            }}
        ]
    }}
    Do not use markdown blocks. Only JSON.
    """
    
    try:
        from google import genai
        from google.genai import types as genai_types
        client_ai = genai.Client(api_key=GEMINI_API_KEY)
        response = await asyncio.to_thread(
            client_ai.models.generate_content,
            model='gemini-2.5-flash',
            contents=prompt,
        )
        text = response.text.strip()
        if text.startswith("```json"): text = text[7:]
        if text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        
        parsed = json.loads(text.strip())
        insights = parsed.get("insights", [])
        
        await menu_cache.set(cache_key, insights, ttl=3600) # Cache for 1 hr
        return {"insights": insights}
    except Exception as e:
        import traceback
        traceback.print_exc()
        default_insights = [
            {"title": "Low Stock Warning", "description": "You have items running low on stock. Please review inventory.", "type": "inventory", "action_text": "View Inventory", "action_link": "/admin/inventory"}
        ]
        return {"insights": default_insights}

@router.get("/api/analytics/impact", dependencies=[Depends(require_roles("admin"))])
async def get_impact_analytics(user=Depends(require_user)):
    """Fetch restaurant-specific AI impact metrics alongside global SmartDine scale stats."""
    q = {"status": {"$nin": ["cancelled", "pending"]}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
        
    pipeline = [
        {"$match": q},
        {"$unwind": "$items"}
    ]
    
    # Calculate AI Upselled Dishes and standard vs AI AOV
    orders = await db.orders.find(q).to_list(None)
    
    total_orders = len(orders)
    total_revenue = sum(o.get("total", 0) for o in orders)
    
    ai_orders = [o for o in orders if o.get("is_ai")]
    manual_orders = [o for o in orders if not o.get("is_ai")]
    
    ai_revenue = sum(o.get("total", 0) for o in ai_orders)
    manual_revenue = sum(o.get("total", 0) for o in manual_orders)
    
    ai_aov = ai_revenue / len(ai_orders) if len(ai_orders) > 0 else 0
    manual_aov = manual_revenue / len(manual_orders) if len(manual_orders) > 0 else 0
    
    overall_aov = total_revenue / total_orders if total_orders > 0 else 0
    
    # Count AI Upsell Dishes
    ai_upsell_dishes = 0
    for o in orders:
        for item in o.get("items", []):
            if item.get("is_ai_upsell"):
                ai_upsell_dishes += item.get("qty", 1)
                
    aov_increase_pct = 0
    if manual_aov > 0 and ai_aov > manual_aov:
        aov_increase_pct = ((ai_aov - manual_aov) / manual_aov) * 100
        
    # Global Metrics Calculation
    global_active_restaurants = await db.restaurants.count_documents({"subscription_status": {"$ne": "deleted"}})
    global_orders_processed = await db.orders.count_documents({"status": {"$ne": "cancelled"}})
    global_ai_conversations = await db.orders.count_documents({"is_ai": True})
    
    global_total_resolved = await db.orders.count_documents({"status": {"$in": ["completed", "cancelled"]}})
    global_completed = await db.orders.count_documents({"status": "completed"})
    global_success_rate = round((global_completed / global_total_resolved * 100), 1) if global_total_resolved > 0 else 100
    
    revenue_pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$total"}}}
    ]
    revenue_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    global_revenue = revenue_result[0]["total"] if revenue_result else 0
        
    return {
        "restaurant_metrics": {
            "total_orders": total_orders,
            "overall_aov": overall_aov,
            "ai_aov": ai_aov,
            "manual_aov": manual_aov,
            "aov_increase_pct": round(aov_increase_pct, 1),
            "ai_orders_count": len(ai_orders),
            "ai_upsell_dishes": ai_upsell_dishes,
            "faster_order_placement": True,
            "reduced_errors": True
        },
        "global_metrics": {
            "active_restaurants": global_active_restaurants,
            "ai_conversations": global_ai_conversations,
            "orders_processed": global_orders_processed,
            "customer_satisfaction": global_success_rate,
            "total_revenue": global_revenue
        }
    }