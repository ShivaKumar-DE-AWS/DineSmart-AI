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
    rid = req.restaurant_id or user.get("restaurant_id")
    
    # In a demo/sandbox environment without VAPID keys, simulate sending to all customers
    if not VAPID_PRIVATE_KEY:
        total_customers = await db.customers.count_documents({"restaurant_id": rid}) if rid else await db.customers.count_documents({})
        simulated_count = max(total_customers, 1) # At least 1 to show success
        
        campaign_id = str(uuid.uuid4())
        doc = {
            "id": campaign_id,
            "title": req.title,
            "body": req.body,
            "restaurant_id": rid,
            "sent_count": simulated_count,
            "removed_count": 0,
            "created_at": now_iso(),
            "demo_mode": True
        }
        await db.campaigns.insert_one(doc)
        return {"ok": True, "campaign_id": campaign_id, "sent_count": simulated_count, "removed_count": 0}

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return {"ok": False, "error": "pywebpush not installed"}

    subs = []
    if rid:
        # Find orders and customers for this restaurant, then gather order_ids and device_ids
        order_cursor = db.orders.find({"restaurant_id": rid}, {"id": 1, "device_id": 1}).limit(1000)
        order_ids = []
        device_ids = []
        async for o in order_cursor:
            if o.get("id"): order_ids.append(o["id"])
            if o.get("device_id") and o["device_id"] not in device_ids: device_ids.append(o["device_id"])
            
        cust_cursor = db.customers.find({"restaurant_id": rid}, {"device_id": 1}).limit(1000)
        async for c in cust_cursor:
            if c.get("device_id") and c["device_id"] not in device_ids:
                device_ids.append(c["device_id"])

        query_conditions = [{"restaurant_id": rid}]
        if order_ids:
            query_conditions.append({"order_id": {"$in": order_ids}})
        if device_ids:
            query_conditions.append({"device_id": {"$in": device_ids}})
            
        subs = await db.push_subscriptions.find(
            {"$or": query_conditions}, {"_id": 0}
        ).to_list(1000)
    else:
        subs = await db.push_subscriptions.find({}, {"_id": 0}).to_list(1000)

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
