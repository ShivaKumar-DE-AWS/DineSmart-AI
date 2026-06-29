"""Push notifications (VAPID) routes."""
import uuid
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from deps import db, now_iso, require_user
import os

router = APIRouter(tags=["push"])

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:hello@smartdine.ai")

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    order_id: Optional[str] = None
    restaurant_id: Optional[str] = None  # ponytail: shared collection, optional field

@router.get("/api/push/vapid-public-key")
async def push_vapid_public_key():
    return {"key": VAPID_PUBLIC_KEY}

@router.post("/api/push/subscribe")
async def push_subscribe(sub: PushSubscription):
    if not sub.endpoint or "auth" not in sub.keys or "p256dh" not in sub.keys:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    doc = {"id": str(uuid.uuid4()), "endpoint": sub.endpoint, "keys": sub.keys, "order_id": sub.order_id, "restaurant_id": sub.restaurant_id, "created_at": now_iso()}
    match: Dict[str, Any] = {"endpoint": sub.endpoint}
    if sub.order_id:
        match["order_id"] = sub.order_id
    elif sub.restaurant_id:
        match["restaurant_id"] = sub.restaurant_id
    await db.push_subscriptions.update_one(match, {"$set": doc}, upsert=True)
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
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CONTACT}
            )
            sent += 1
        except Exception as e:
            code = getattr(getattr(e, "response", None), "status_code", 0) if hasattr(e, "response") else 0
            if code in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
                removed += 1
    return {"sent": sent, "removed": removed}