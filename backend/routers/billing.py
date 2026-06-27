"""Billing routes: plan status, subscription."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from deps import db, require_user, require_roles

router = APIRouter(tags=["billing"])

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