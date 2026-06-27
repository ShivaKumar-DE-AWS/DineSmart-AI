"""Notifications routes: list, mark read."""
from typing import Dict, Any
from fastapi import APIRouter, Depends
from deps import db, now_iso, require_user

router = APIRouter(tags=["notifications"])

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