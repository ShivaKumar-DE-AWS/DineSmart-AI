"""Marketing push campaign routes."""
import uuid
import json
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from deps import db, now_iso, require_roles
import os

router = APIRouter(tags=["campaigns"])

VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:hello@smartdine.ai")


class CreateCampaignReq(BaseModel):
    title: str
    body: str
    restaurant_id: Optional[str] = None


@router.post("/api/campaigns")
async def create_campaign(req: CreateCampaignReq, user=Depends(require_roles("admin"))):
    if not VAPID_PRIVATE_KEY:
        return {"ok": False, "error": "VAPID not configured"}
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return {"ok": False, "error": "pywebpush not installed"}

    rid = req.restaurant_id or user.get("restaurant_id")
    subs = []
    if rid:
        # Find orders for this restaurant, then their push subscriptions
        order_cursor = db.orders.find({"restaurant_id": rid}, {"id": 1}).limit(500)
        order_ids = [o["id"] async for o in order_cursor]
        subs = await db.push_subscriptions.find(
            {"$or": [
                {"order_id": {"$in": order_ids}},
                {"restaurant_id": rid},
            ]}, {"_id": 0}
        ).to_list(500)

    payload = json.dumps({"title": req.title, "body": req.body, "data": {"campaign": True}})
    sent = 0
    removed = 0

    for s in subs:
        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CONTACT},
            )
            sent += 1
        except Exception as e:
            code = getattr(getattr(e, "response", None), "status_code", 0) if hasattr(e, "response") else 0
            if code in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
                removed += 1

    campaign_id = str(uuid.uuid4())
    doc = {
        "id": campaign_id,
        "title": req.title,
        "body": req.body,
        "restaurant_id": rid,
        "sent_count": sent,
        "removed_count": removed,
        "created_at": now_iso(),
    }
    await db.campaigns.insert_one(doc)

    return {"ok": True, "campaign_id": campaign_id, "sent_count": sent, "removed_count": removed}


@router.get("/api/campaigns")
async def list_campaigns(user=Depends(require_roles("admin"))):
    rid = user.get("restaurant_id")
    cursor = db.campaigns.find({"restaurant_id": rid}, {"_id": 0}).sort("created_at", -1)
    items = await cursor.to_list(100)
    return {"campaigns": items}
