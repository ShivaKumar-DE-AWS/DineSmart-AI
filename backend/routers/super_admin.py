"""Super Admin routes: platform-wide stats and restaurant management."""
from fastapi import APIRouter, Depends, HTTPException
from deps import db, require_user, require_superadmin, RestaurantUpdateReq
from datetime import datetime, timezone, timedelta
import asyncio

router = APIRouter(prefix="/api/super-admin", tags=["super-admin"])


@router.get("/stats")
async def get_platform_stats(user=Depends(require_superadmin)):
    """Global platform stats: total restaurants, orders, GMV, and trends."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)

    total_restaurants = await db.restaurants.count_documents({"subscription_status": {"$ne": "deleted"}})
    total_orders = await db.orders.count_documents({})

    # 1. Active today (restaurants with orders today)
    active_today_list = await db.orders.distinct("restaurant_id", {"created_at": {"$gte": today_start.isoformat()}})
    active_today = len(active_today_list)

    # 2. New this week
    new_this_week = await db.restaurants.count_documents({"created_at": {"$gte": week_start.isoformat()}})

    # 3. Sum GMV from all orders + 7-day trend + top restaurants
    # Fetch all orders to compute stats in memory (simplified for now, ideally aggregation pipeline)
    pipeline = [
        {"$group": {
            "_id": "$restaurant_id",
            "total_revenue": {"$sum": "$total"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"total_revenue": -1}}
    ]
    rest_stats = await db.orders.aggregate(pipeline).to_list(None)
    
    total_gmv = sum(r["total_revenue"] for r in rest_stats) if rest_stats else 0
    top_restaurants_ids = [r["_id"] for r in rest_stats[:5]]
    top_restaurants_info = await db.restaurants.find({"id": {"$in": top_restaurants_ids}}, {"_id": 0, "id": 1, "name": 1, "slug": 1}).to_list(5)
    
    # Map info back to stats
    top_restaurants = []
    info_map = {r["id"]: r for r in top_restaurants_info}
    for r in rest_stats[:5]:
        if r["_id"] in info_map:
            top_restaurants.append({
                "id": r["_id"],
                "name": info_map[r["_id"]]["name"],
                "slug": info_map[r["_id"]]["slug"],
                "revenue": round(r["total_revenue"], 2),
                "orders": r["order_count"]
            })

    # 7-day GMV trend (group orders from last 7 days by day)
    trend_pipeline = [
        {"$match": {"created_at": {"$gte": week_start.isoformat()}}},
        {"$project": {
            "date": {"$substr": ["$created_at", 0, 10]},
            "total": 1
        }},
        {"$group": {
            "_id": "$date",
            "daily_revenue": {"$sum": "$total"}
        }},
        {"$sort": {"_id": 1}}
    ]
    trend_data = await db.orders.aggregate(trend_pipeline).to_list(None)
    
    # Fill missing days
    gmv_7d = []
    for i in range(7):
        d = (week_start + timedelta(days=i)).strftime("%Y-%m-%d")
        matched = next((t for t in trend_data if t["_id"] == d), None)
        gmv_7d.append({
            "date": d,
            "revenue": round(matched["daily_revenue"], 2) if matched else 0
        })

    return {
        "total_restaurants": total_restaurants,
        "total_orders": total_orders,
        "total_gmv": round(total_gmv, 2),
        "active_today": active_today,
        "new_this_week": new_this_week,
        "gmv_7d": gmv_7d,
        "top_restaurants": top_restaurants
    }


@router.get("/restaurants")
async def list_restaurants(user=Depends(require_superadmin)):
    """List all restaurants with basic stats."""
    restaurants = await db.restaurants.find(
        {"subscription_status": {"$ne": "deleted"}}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "owner_email": 1,
             "subscription_status": 1, "trial_ends_at": 1, "created_at": 1, "plan_tier": 1}
    ).to_list(500)

    # Use $group aggregation for order counts (fixes N+1 query issue)
    order_counts_cursor = db.orders.aggregate([
        {"$group": {"_id": "$restaurant_id", "count": {"$sum": 1}}}
    ])
    order_counts = {doc["_id"]: doc["count"] for doc in await order_counts_cursor.to_list(None)}

    for r in restaurants:
        r["order_count"] = order_counts.get(r.get("id"), 0)

    return {"restaurants": restaurants}

@router.get("/restaurants/{restaurant_id}")
async def get_restaurant(restaurant_id: str, user=Depends(require_superadmin)):
    """Get full profile of a specific restaurant."""
    restaurant = await db.restaurants.find_one({"id": restaurant_id}, {"_id": 0})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    # Get computed stats
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Orders today + revenue today
    today_orders = await db.orders.find({"restaurant_id": restaurant_id, "created_at": {"$gte": today_start.isoformat()}}).to_list(None)
    orders_today = len(today_orders)
    revenue_today = sum(o.get("total", 0) for o in today_orders)
    
    # Overall stats
    pipeline = [{"$match": {"restaurant_id": restaurant_id}}, {"$group": {"_id": None, "total": {"$sum": "$total"}, "count": {"$sum": 1}}}]
    stats = await db.orders.aggregate(pipeline).to_list(1)
    total_orders = stats[0]["count"] if stats else 0
    total_gmv = stats[0]["total"] if stats else 0
    avg_order_value = total_gmv / total_orders if total_orders > 0 else 0
    
    # Other counts
    menu_items = await db.menu.count_documents({"restaurant_id": restaurant_id})
    tables = await db.tables.count_documents({"restaurant_id": restaurant_id})
    
    # Last seen
    last_order = await db.orders.find_one({"restaurant_id": restaurant_id}, sort=[("created_at", -1)])
    last_seen = last_order.get("created_at") if last_order else restaurant.get("created_at")
    
    # Recent orders
    recent_orders = await db.orders.find(
        {"restaurant_id": restaurant_id}, 
        {"_id": 0, "id": 1, "token": 1, "status": 1, "total": 1, "created_at": 1}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    return {
        "restaurant": restaurant,
        "stats": {
            "total_orders": total_orders,
            "total_gmv": round(total_gmv, 2),
            "avg_order_value": round(avg_order_value, 2),
            "menu_items": menu_items,
            "tables": tables,
            "orders_today": orders_today,
            "revenue_today": round(revenue_today, 2),
            "last_seen": last_seen
        },
        "recent_orders": recent_orders
    }

@router.patch("/restaurants/{restaurant_id}")
async def update_restaurant(restaurant_id: str, req: RestaurantUpdateReq, user=Depends(require_superadmin)):
    """Update contact info and admin notes for a restaurant."""
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    update_data = req.model_dump(exclude_unset=True)
    if update_data:
        await db.restaurants.update_one({"id": restaurant_id}, {"$set": update_data})
        
        from routers.audit import log_audit_event
        await log_audit_event(
            user_id=user["sub"],
            user_email=user["email"],
            action="restaurant_updated",
            target=restaurant_id,
            details={"restaurant_name": restaurant.get("name"), "updated_fields": list(update_data.keys())}
        )
        
    return {"message": "Restaurant updated successfully"}


@router.post("/restaurants/{restaurant_id}/suspend")
async def toggle_suspend_restaurant(restaurant_id: str, user=Depends(require_superadmin)):
    """Toggle a restaurant's subscription status between active and suspended."""
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    current_status = restaurant.get("subscription_status")
    if current_status != "suspended":
        new_status = "suspended"
        # Store previous status so we can restore it properly (e.g. trial -> suspended -> trial)
        await db.restaurants.update_one({"id": restaurant_id}, {"$set": {"subscription_status": new_status, "pre_suspend_status": current_status}})
    else:
        new_status = restaurant.get("pre_suspend_status", "active")
        await db.restaurants.update_one({"id": restaurant_id}, {"$set": {"subscription_status": new_status}, "$unset": {"pre_suspend_status": ""}})

    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user["sub"],
        user_email=user["email"],
        action=f"restaurant_{new_status}",
        target=restaurant_id,
        details={"restaurant_name": restaurant.get("name")}
    )

    return {"message": f"Restaurant status changed to {new_status}", "new_status": new_status}


@router.post("/restaurants/{restaurant_id}/impersonate")
async def impersonate_restaurant(restaurant_id: str, user=Depends(require_superadmin)):
    """Generate a temporary JWT to act as an admin for a specific restaurant."""
    from deps import jwt_sign
    
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    # Generate token masquerading as the restaurant admin (30 min TTL)
    token = jwt_sign({
        "sub": user.get("sub"),
        "email": user["email"],
        "role": "admin",
        "name": f"SmartDine HQ ({user['name']})",
        "restaurant_id": restaurant_id,
        "restaurant_slug": restaurant.get("slug"),
    }, ttl_hours=0.5)

    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="impersonate_tenant",
        target=restaurant_id,
        details={"restaurant_name": restaurant.get("name")}
    )

    return {
        "token": token,
        "user": {
            "id": user.get("sub"),
            "email": user["email"],
            "name": f"SmartDine HQ ({user['name']})",
            "role": "admin",
            "restaurant_id": restaurant_id,
            "restaurant_slug": restaurant.get("slug"),
        }
    }

from pydantic import BaseModel
from deps import RestaurantModel

class CreateRestaurantReq(BaseModel):
    name: str
    slug: str
    owner_email: str

@router.post("/restaurants")
async def create_restaurant(req: CreateRestaurantReq, user=Depends(require_superadmin)):
    restaurant = RestaurantModel(
        name=req.name,
        slug=req.slug,
        owner_email=req.owner_email
    )
    await db.restaurants.insert_one(restaurant.model_dump())
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="restaurant_created",
        target=restaurant.id,
        details={"restaurant_name": restaurant.name}
    )
    return {"message": "Restaurant created", "restaurant": restaurant.model_dump()}

@router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(restaurant_id: str, user=Depends(require_superadmin)):
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    slug = restaurant.get("slug")
    
    # Cascade delete all tenant data
    # ponytail: Soft delete the restaurant to prevent demo re-seeding from JSON files on Vercel
    await db.restaurants.update_one({"id": restaurant_id}, {"$set": {"subscription_status": "deleted", "status": "deleted"}})
    if slug:
        await db.restaurant_configs.delete_many({"slug": slug})
        await db.users.delete_many({"restaurant_slug": slug})
        
    await db.users.delete_many({"restaurant_id": restaurant_id})
    if restaurant.get("owner_email"):
        await db.users.delete_many({"email": restaurant.get("owner_email")})
        await db.otps.delete_many({"target": restaurant.get("owner_email")})
    
    # Phase 1: Complete cascade delete of all tenant data collections
    collections = [
        "menu", "inventory", "tables", "table_sessions", "orders", 
        "customers", "reservations", "notifications", "support_tickets", 
        "verifications", "campaigns", "analytics", "ai_usage_logs", "audit_logs"
    ]
    for coll in collections:
        await db[coll].delete_many({"restaurant_id": restaurant_id})
    
    if slug:
        import os
        import sys
        
        # 1. Remove the JSON file
        config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "restaurants", f"{slug}.json")
        if os.path.exists(config_path):
            try:
                os.remove(config_path)
            except Exception:
                pass
                
        # 2. Remove from in-memory cache
        # Try both 'server' and '__main__' in case of different runner environments
        for mod_name in ['server', '__main__']:
            if mod_name in sys.modules:
                if hasattr(sys.modules[mod_name], "_CONFIG_CACHE"):
                    sys.modules[mod_name]._CONFIG_CACHE.pop(slug, None)
                if hasattr(sys.modules[mod_name], "_CONFIG_RESPONSE_CACHE"):
                    sys.modules[mod_name]._CONFIG_RESPONSE_CACHE.pop(slug, None)
                
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="restaurant_deleted",
        target=restaurant_id,
        details={"restaurant_name": restaurant.get("name"), "slug": restaurant.get("slug")}
    )
    return {"message": "Restaurant deleted"}

class ExtendTrialReq(BaseModel):
    days: int = 7

@router.post("/restaurants/{restaurant_id}/extend-trial")
async def extend_trial(restaurant_id: str, req: ExtendTrialReq, user=Depends(require_superadmin)):
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    from datetime import datetime, timezone, timedelta
    current_ends_at = restaurant.get("trial_ends_at")
    
    if current_ends_at:
        if isinstance(current_ends_at, str):
            try:
                # Handle isoformat strings that might end in 'Z'
                current_ends_at = datetime.fromisoformat(current_ends_at.replace('Z', '+00:00'))
            except ValueError:
                current_ends_at = datetime.now(timezone.utc)
        if current_ends_at.tzinfo is None:
            current_ends_at = current_ends_at.replace(tzinfo=timezone.utc)
        # If expired, add from today. If still active, add to existing end date.
        base_date = max(current_ends_at, datetime.now(timezone.utc))
    else:
        base_date = datetime.now(timezone.utc)
    new_ends_at = base_date + timedelta(days=req.days)
    
    await db.restaurants.update_one(
        {"id": restaurant_id}, 
        {"$set": {"trial_ends_at": new_ends_at, "subscription_status": "trial"}}
    )
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="trial_extended",
        target=restaurant_id,
        details={"days_added": req.days, "new_ends_at": new_ends_at.isoformat()}
    )
    return {"message": f"Trial extended by {req.days} days", "trial_ends_at": new_ends_at}


@router.post("/cleanup")
async def cleanup_test_data(user=Depends(require_superadmin)):
    """Remove test/QA artifacts from production DB."""
    result = {}

    # Remove the fake "access denied" ticket created during QA
    td = await db.support_tickets.delete_many({
        "title": {"$regex": "access denied", "$options": "i"}
    })
    result["tickets_deleted"] = td.deleted_count

    # Remove INTRUSION_TEST menu items
    mi = await db.menu.delete_many({
        "name": {"$regex": "INTRUSION_TEST", "$options": "i"}
    })
    result["menu_items_deleted"] = mi.deleted_count

    # Remove customer names over 500 chars (QA artifacts)
    cu = await db.customers.delete_many({
        "$expr": {"$gt": [{"$strLenCP": {"$ifNull": ["$name", ""]}}, 500]}
    })
    result["customers_deleted"] = cu.deleted_count

    # Remove orders associated with INTRUSION_TEST or 2500-char names
    od = await db.orders.delete_many({
        "$or": [
            {"customer_name": {"$regex": "INTRUSION_TEST", "$options": "i"}},
            {"$expr": {"$gt": [{"$strLenCP": {"$ifNull": ["$customer_name", ""]}}, 500]}}
        ]
    })
    result["orders_deleted"] = od.deleted_count

    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="cleanup_test_data",
        target="system",
        details=result
    )

    return {"message": "Cleanup complete", "deleted": result}
