"""System Health and AI Usage endpoints for Super Admin."""
from fastapi import APIRouter, Depends, HTTPException
from deps import db, require_user, GEMINI_API_KEY

router = APIRouter(prefix="/api/super-admin", tags=["health"])

async def require_superadmin(user=Depends(require_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user


@router.get("/health")
async def get_system_health(user=Depends(require_superadmin)):
    """Check connections and configuration status."""
    
    # Check MongoDB
    mongo_status = "offline"
    try:
        await db.command("ping")
        mongo_status = "online"
    except Exception:
        pass

    return {
        "services": {
            "database": {
                "name": "MongoDB",
                "status": mongo_status,
            },
            "ai": {
                "name": "Gemini API",
                "status": "configured" if GEMINI_API_KEY else "missing_key",
            },
            "billing": {
                "name": "Stripe Billing",
                "status": "mock"  # ponytail: mock status, replace with real check when STRIPE_API_KEY is set
            }
        }
    }


@router.get("/ai-usage")
async def get_ai_usage(user=Depends(require_superadmin)):
    """Aggregate AI usage logs per restaurant."""
    
    # We want to group by restaurant_id and sum the count
    pipeline = [
        {"$group": {
            "_id": "$restaurant_id",
            "total_requests": {"$sum": 1},
            "last_used": {"$max": "$timestamp"}
        }},
        {"$sort": {"total_requests": -1}}
    ]
    
    usage_stats = await db.ai_usage_logs.aggregate(pipeline).to_list(100)
    
    # We need to fetch restaurant names and slugs
    restaurant_ids = [stat["_id"] for stat in usage_stats if stat["_id"]]
    restaurants = await db.restaurants.find(
        {"id": {"$in": restaurant_ids}},
        {"_id": 0, "id": 1, "name": 1, "slug": 1}
    ).to_list(len(restaurant_ids))
    
    r_map = {r["id"]: r for r in restaurants}
    
    enriched_stats = []
    for stat in usage_stats:
        rid = stat["_id"]
        if rid in r_map:
            enriched_stats.append({
                "restaurant_id": rid,
                "restaurant_name": r_map[rid].get("name", "Unknown"),
                "restaurant_slug": r_map[rid].get("slug", "unknown"),
                "total_requests": stat["total_requests"],
                "last_used": stat["last_used"]
            })
            
    return {"usage": enriched_stats}
