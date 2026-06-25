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
        {}, {"_id": 0, "id": 1, "name": 1, "slug": 1, "owner_email": 1,
             "subscription_status": 1, "created_at": 1}
    ).to_list(500)

    # Enrich with order counts per restaurant
    for r in restaurants:
        rid = r.get("id", "")
        order_count = await db.orders.count_documents({"restaurant_id": rid})
        r["order_count"] = order_count

    return {"restaurants": restaurants}
