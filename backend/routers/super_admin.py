"""Super Admin routes: platform-wide stats and restaurant management."""
from fastapi import APIRouter, Depends, HTTPException
from deps import db, require_user

router = APIRouter(prefix="/api/super-admin", tags=["super-admin"])


async def require_superadmin(user=Depends(require_user)):
    """Dependency that ensures the caller has the superadmin role."""
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user


@router.get("/stats")
async def get_platform_stats(user=Depends(require_superadmin)):
    """Global platform stats: total restaurants, orders, GMV."""
    total_restaurants = await db.restaurants.count_documents({})
    total_orders = await db.orders.count_documents({})

    # Sum GMV from all orders
    pipeline = [{"$group": {"_id": None, "total": {"$sum": "$total"}}}]
    gmv_result = await db.orders.aggregate(pipeline).to_list(1)
    total_gmv = gmv_result[0]["total"] if gmv_result else 0

    return {
        "total_restaurants": total_restaurants,
        "total_orders": total_orders,
        "total_gmv": round(total_gmv, 2),
    }


@router.get("/restaurants")
async def list_restaurants(user=Depends(require_superadmin)):
    """List all restaurants with basic stats."""
    restaurants = await db.restaurants.find(
        {"subscription_status": {"$ne": "deleted"}}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "owner_email": 1,
             "subscription_status": 1, "trial_ends_at": 1, "created_at": 1, "plan_tier": 1}
    ).to_list(500)

    # Enrich with order counts per restaurant
    for r in restaurants:
        rid = r.get("id", "")
        order_count = await db.orders.count_documents({"restaurant_id": rid})
        r["order_count"] = order_count

    return {"restaurants": restaurants}


@router.post("/restaurants/{restaurant_id}/suspend")
async def toggle_suspend_restaurant(restaurant_id: str, user=Depends(require_superadmin)):
    """Toggle a restaurant's subscription status between active and suspended."""
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    new_status = "suspended" if restaurant.get("subscription_status") != "suspended" else "active"
    await db.restaurants.update_one({"id": restaurant_id}, {"$set": {"subscription_status": new_status}})

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

    # Generate token masquerading as the restaurant admin
    token = jwt_sign({
        "sub": user.get("sub"),
        "email": user["email"],
        "role": "admin",
        "name": f"SmartDine HQ ({user['name']})",
        "restaurant_id": restaurant_id,
        "restaurant_slug": restaurant.get("slug"),
    })

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
        
    await db.users.delete_many({"restaurant_id": restaurant_id})
    await db.menu.delete_many({"restaurant_id": restaurant_id})
    await db.inventory.delete_many({"restaurant_id": restaurant_id})
    await db.tables.delete_many({"restaurant_id": restaurant_id})
    await db.table_sessions.delete_many({"restaurant_id": restaurant_id})
    await db.orders.delete_many({"restaurant_id": restaurant_id})
    await db.customers.delete_many({"restaurant_id": restaurant_id})
    await db.reservations.delete_many({"restaurant_id": restaurant_id})
    await db.notifications.delete_many({"restaurant_id": restaurant_id})
    await db.support_tickets.delete_many({"restaurant_id": restaurant_id})
    await db.verifications.delete_many({"restaurant_id": restaurant_id})
    
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
        details={}
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
    mi = await db.menu_items.delete_many({
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
