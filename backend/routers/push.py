"""Push notifications (VAPID) routes."""
import uuid
import json
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from deps import db, now_iso, require_user, PushSubscription, PushBroadcastReq
import os

router = APIRouter(tags=["push"])

VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:hello@smartdine.ai")

@router.get("/api/push/vapid-public-key")
async def push_vapid_public_key():
    return {"key": VAPID_PUBLIC_KEY}

@router.post("/api/push/subscribe")
@router.post("/api/notifications/subscribe")
async def push_subscribe(sub: PushSubscription):
    if not sub.endpoint or "auth" not in sub.keys or "p256dh" not in sub.keys:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    
    rid = sub.restaurant_id
    if not rid and sub.order_id:
        order = await db.orders.find_one({"id": sub.order_id}, {"restaurant_id": 1})
        if order and order.get("restaurant_id"):
            rid = order["restaurant_id"]

    update_fields: Dict[str, Any] = {
        "endpoint": sub.endpoint,
        "keys": sub.keys,
        "updated_at": now_iso()
    }
    if sub.order_id:
        update_fields["order_id"] = sub.order_id
    if rid:
        update_fields["restaurant_id"] = rid
    if sub.device_id:
        update_fields["device_id"] = sub.device_id

    match: Dict[str, Any] = {"endpoint": sub.endpoint}
    existing = await db.push_subscriptions.find_one(match, {"id": 1, "created_at": 1})
    if not existing:
        update_fields["id"] = str(uuid.uuid4())
        update_fields["created_at"] = now_iso()

    await db.push_subscriptions.update_one(match, {"$set": update_fields}, upsert=True)
    return {"ok": True}

@router.post("/api/push/broadcast")
@router.post("/api/notifications/broadcast")
async def push_broadcast(req: PushBroadcastReq, user=Depends(require_user)):
    if not VAPID_PRIVATE_KEY:
        raise HTTPException(status_code=400, detail="VAPID_PRIVATE_KEY not configured on server")
    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        raise HTTPException(status_code=500, detail="pywebpush library not installed")
    
    rid = req.restaurant_id or user.get("restaurant_id")
    query: Dict[str, Any] = {}
    if rid and user.get("role") != "superadmin":
        query["restaurant_id"] = rid
    elif rid:
        query["restaurant_id"] = rid

    subs = await db.push_subscriptions.find(query, {"_id": 0}).to_list(1000)
    payload = json.dumps({
        "title": req.title or "Mahika's Multi Cuisine",
        "body": req.body,
        "url": req.url or "/",
        "icon": "/assets/restaurant-icon.png",
        "badge": "/assets/badge-icon.png"
    })
    
    sent = 0
    removed = 0
    failed = 0
    for s in subs:
        if not s.get("endpoint") or not s.get("keys"):
            continue
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
            else:
                failed += 1
    return {"ok": True, "sent": sent, "removed": removed, "failed": failed}

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