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
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
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
    rest = await db.restaurants.find_one({"id": user.get("restaurant_id")}) if user.get("restaurant_id") else None
    sandbox_mode = rest.get("sandbox_mode", True) if rest else True

    # Onboarding checks — menu and table counts
    menu_q: Dict[str, Any] = {"available": True}
    tables_q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        menu_q["restaurant_id"] = user["restaurant_id"]
        tables_q["restaurant_id"] = user["restaurant_id"]
    menu_count = await db.menu_items.count_documents(menu_q)
    tables_count = await db.tables.count_documents(tables_q)

    return {
        "revenue_today": round(revenue_today, 2), "orders_today": total_orders,
        "ai_orders_today": ai_orders_count, "avg_ticket": round(avg_ticket, 2),
        "top_items": top_items, "low_stock_count": len(low_stock),
        "low_stock": low_stock, "status_counts": status_counts,
        "sandbox_mode": sandbox_mode,
        "menu_count": menu_count,
        "tables_count": tables_count,
    }

@router.get("/api/analytics/revenue", dependencies=[Depends(require_roles("admin"))])
async def revenue_series(days: int = 7, user=Depends(require_user)):
    start = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    q: Dict[str, Any] = {"created_at": {"$gte": start.isoformat()}}
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