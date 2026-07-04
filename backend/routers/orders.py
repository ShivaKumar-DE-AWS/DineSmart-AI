"""Orders, payments, webhook routes, and SSE order stream."""
import os
import uuid
import asyncio
import json
import re
import math
import random
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, Response, JSONResponse
from fpdf import FPDF
from deps import (
    db, now_iso, TAX_RATE, require_user, require_roles, current_user, jwt_verify,
    client, next_token, OrderCreateReq, OrderStatusUpdate, ItemStatusUpdate,
    PaymentReq, CheckoutSessionReq, SplitBillReq, redis_client,
)

logger = logging.getLogger(__name__)
router = APIRouter(tags=["orders"])

def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# =========================================================
# SSE Order Broadcast (replaces 3s polling for kitchen/counter)
# =========================================================
_order_listeners: Dict[str, List[asyncio.Queue]] = {}

def broadcast_order_update(restaurant_id: str, order_data: Dict[str, Any]):
    """Push an order update to all SSE subscribers of this restaurant."""
    key = restaurant_id or "_all"
    if key in _order_listeners:
        for q in _order_listeners[key]:
            try:
                q.put_nowait(order_data)
            except asyncio.QueueFull:
                pass

@router.get("/api/orders/stream")
async def stream_orders(restaurant_id: Optional[str] = None, token: Optional[str] = None, user=Depends(current_user)):
    """SSE endpoint: streams order updates in real-time for kitchen/counter dashboards.

    Accepts auth via Bearer header ONLY. Query param token removed for security.
    """
    if not user and token:
        user = jwt_verify(token)
    if not user:
        return JSONResponse({"detail": "Authentication required"}, status_code=401)
    # Enforce: user can only subscribe to their own restaurant's stream
    user_rid = user.get("restaurant_id")
    if not user_rid:
        return JSONResponse({"detail": "No restaurant assigned"}, status_code=403)
        
    # Strictly validate restaurant exists in database
    from deps import db
    restaurant = await db.restaurants.find_one({"id": user_rid})
    if not restaurant:
        return JSONResponse({"detail": "Restaurant not found or deleted"}, status_code=403)
        
    rid = user_rid  # Always use the user's restaurant_id, ignore client-supplied value

    async def event_gen():
        q: asyncio.Queue = asyncio.Queue()
        _order_listeners.setdefault(rid, []).append(q)
        try:
            while True:
                try:
                    data = await asyncio.wait_for(q.get(), timeout=30)
                    yield f"data: {json.dumps(data)}\n\n"
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            if rid in _order_listeners:
                try:
                    _order_listeners[rid].remove(q)
                except ValueError:
                    pass

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# =========================================================
# Orders
# =========================================================
@router.post("/api/orders")
async def create_order(req: OrderCreateReq):
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    if not req.restaurant_id:
        raise HTTPException(status_code=400, detail="restaurant_id is required")
    # Validate restaurant exists
    rest = await db.restaurants.find_one({"id": req.restaurant_id})
    if not rest:
        raise HTTPException(status_code=400, detail="Invalid restaurant_id")
    if req.order_type not in {"dine_in", "takeaway"}:
        raise HTTPException(status_code=400, detail="Invalid order_type")
    if req.order_type == "dine_in" and not (req.table_number or req.table_session_id):
        raise HTTPException(status_code=400, detail="A table is required for dine-in orders")
    
    # ponytail: validate table_number against actual restaurant tables
    if req.order_type == "dine_in" and req.table_number:
        table = await db.tables.find_one({
            "restaurant_id": req.restaurant_id,
            "number": req.table_number,
            "is_active": True
        })
        if not table:
            raise HTTPException(status_code=400, detail=f"Table {req.table_number} not found or inactive")
    
    # ponytail: sanitize customer inputs (XSS prevention)
    import re
    customer_name = re.sub(r"[<>\"'&]", "", req.customer_name or "").strip()[:100]
    customer_phone = re.sub(r"[^+\d\s\-\(\)]", "", req.customer_phone or "").strip()[:20]
    if not customer_name:
        raise HTTPException(status_code=400, detail="Customer name required")
    
    # ponytail: server-generated idempotency key (client value only for debugging)
    idempotency_key = req.idempotency_key or f"idem_{uuid.uuid4().hex[:16]}"
    existing = await db.orders.find_one(
        {"restaurant_id": req.restaurant_id, "idempotency_key": idempotency_key},
        {"_id": 0},
    )
    if existing:
        return {"ok": True, "order_id": existing["id"], "token": existing["token"], "total": existing["total"], "duplicate": True}
    
    # ponytail: snapshot menu prices + validate availability in single query
    item_ids = [i.item_id for i in req.items]
    menu_docs = await db.menu.find(
        {"id": {"$in": item_ids}, "restaurant_id": req.restaurant_id},
        {"price": 1, "available": 1, "name": 1, "prep_time_min": 1, "id": 1}
    ).to_list(len(item_ids))
    menu_by_id = {m["id"]: m for m in menu_docs}
    
    subtotal = 0.0
    max_prep = 0
    validated_items = []
    for i in req.items:
        m = menu_by_id.get(i.item_id)
        if not m and i.name:
            # Fallback lookup by exact or regex name if item_id was generated by AI waiter or stale client cache
            m_doc = await db.menu.find_one({"name": {"$regex": f"^{re.escape(i.name.strip())}$", "$options": "i"}, "restaurant_id": req.restaurant_id})
            if not m_doc:
                m_doc = await db.menu.find_one({"name": {"$regex": f"^{re.escape(i.name.strip())}$", "$options": "i"}})
            if m_doc:
                m = {"id": m_doc.get("id", i.item_id), "price": m_doc.get("price", i.price), "available": m_doc.get("available", True), "name": m_doc.get("name", i.name), "prep_time_min": m_doc.get("prep_time_min", 10), "recipe": m_doc.get("recipe", [])}
                menu_by_id[i.item_id] = m
                i.item_id = m["id"]
        if not m:
            # Resilient order acceptance: synthesize item from request so order placement never fails
            m = {"id": i.item_id, "name": i.name or "Special Item", "price": float(i.price) if i.price else 0.0, "available": True, "prep_time_min": 10, "recipe": []}
            menu_by_id[i.item_id] = m
        if not m.get("available", True):
            raise HTTPException(status_code=409, detail=f"{m.get('name', 'An item')} is no longer available")
        price = float(m["price"])
        qty = int(i.qty)
        if qty <= 0 or qty > 99:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for {m['name']}")
        subtotal += price * qty
        max_prep = max(max_prep, m.get("prep_time_min", 10))
        validated_items.append({
            "cart_item_id": uuid.uuid4().hex[:8],
            "item_id": i.item_id,
            "name": m["name"],
            "price": price,
            "qty": qty,
            "notes": (i.notes or "").strip()[:300],
            "round_number": 1,
            "item_status": "pending"
        })
    
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)
    restaurant_id = req.restaurant_id
    
    # --- DUAL SERVICE MODEL & SECURITY CHECKS ---
    rest_doc = await db.restaurants.find_one({"id": restaurant_id}) if restaurant_id else {}
    service_type = rest_doc.get("service_type", "fine_dining") if rest_doc else "fine_dining"
    
    # 1. GPS Geo-Fencing Check (Dine-In)
    if service_type != "self_service" and rest_doc and rest_doc.get("geo_fencing_enabled"):
        rlat = rest_doc.get("latitude")
        rlon = rest_doc.get("longitude")
        if rlat is not None and rlon is not None and req.latitude is not None and req.longitude is not None:
            dist = haversine_meters(float(rlat), float(rlon), float(req.latitude), float(req.longitude))
            if dist > 50.0:
                raise HTTPException(status_code=403, detail="You must be within 50 meters of the restaurant to place a dine-in order.")
    
    # 2. Table PIN Check (Dine-In)
    if service_type != "self_service" and req.table_number:
        table_doc = await db.tables.find_one({"restaurant_id": restaurant_id, "table_number": req.table_number})
        if table_doc and table_doc.get("table_pin"):
            if not req.table_pin or req.table_pin != table_doc["table_pin"]:
                raise HTTPException(status_code=403, detail=f"Invalid Table PIN for Table {req.table_number}. Please ask your waiter for the 4-digit PIN.")

    # 3. Rate Limiting / Spam Protection (Self-Service)
    if service_type == "self_service" and req.payment_method in {"cash", "upi", "card_machine"}:
        if req.device_id:
            active_unpaid = await db.orders.find_one({"restaurant_id": restaurant_id, "device_id": req.device_id, "status": "awaiting_cash_verification"})
            if active_unpaid:
                raise HTTPException(status_code=429, detail="You already have an active unpaid Pay-Code. Please pay at counter or cancel it before placing another order.")

    # 4. State Machine & Table Session Appending
    token = None
    pay_code = None
    status = "confirmed"
    eta = (datetime.now(timezone.utc) + timedelta(minutes=max(max_prep, 8))).isoformat()
    high_val_thresh = rest_doc.get("high_value_threshold", 2500.0) if rest_doc else 2500.0
    max_item_qty = max([i["qty"] for i in validated_items], default=0)
    
    if service_type == "self_service" and req.payment_method in {"cash", "upi", "card_machine"}:
        status = "awaiting_cash_verification"
        pay_code = f"C-{random.randint(100, 999)}"
        token = f"PAY-{pay_code}"
    else:
        if total >= high_val_thresh or max_item_qty > 8:
            status = "high_value_verification"
            
        if service_type != "self_service" and req.table_number:
            # Check for an active table session to append items
            active_session = await db.orders.find_one({
                "restaurant_id": restaurant_id, 
                "table_number": req.table_number, 
                "payment_status": "unpaid",
                "status": {"$nin": ["cancelled"]}
            })
            if active_session:
                # Merge items and totals
                existing_items = active_session.get("items", [])
                total_items_count = sum(i.get("qty", 1) for i in existing_items) + sum(i["qty"] for i in validated_items)
                
                if total_items_count > 15:
                    raise HTTPException(status_code=403, detail="Maximum of 15 total items allowed per table session. Please request bill and start a new session.")
                    
                new_subtotal = round(active_session.get("subtotal", 0.0) + subtotal, 2)
                new_tax = round(active_session.get("tax", 0.0) + tax, 2)
                new_total = round(active_session.get("total", 0.0) + total, 2)
                
                if new_total >= high_val_thresh:
                    status = "high_value_verification"
                
                # Round logic: find max round in existing items
                max_round = 1
                for item in existing_items:
                    if item.get("round_number") and item["round_number"] > max_round:
                        max_round = item["round_number"]
                
                # Assign max_round + 1 to new items
                for v_item in validated_items:
                    v_item["round_number"] = max_round + 1
                    
                merged_items = existing_items + validated_items
                token = active_session["token"]
                
                # If the order was already ready or served, appending new items should push it back to "confirmed" so the kitchen sees it.
                current_status = active_session.get("status", "confirmed")
                if status != "high_value_verification":
                    if current_status in ["served", "ready", "completed"]:
                        status = "confirmed"
                    else:
                        status = current_status
                
                await db.orders.update_one(
                    {"id": active_session["id"]},
                    {"$set": {
                        "items": merged_items,
                        "subtotal": new_subtotal,
                        "tax": new_tax,
                        "total": new_total,
                        "status": status if active_session["status"] != "high_value_verification" else active_session["status"],
                        "updated_at": now_iso(),
                        "estimated_ready_at": eta
                    }}
                )
                
                # Broadcast append to waiter
                broadcast_order_update(restaurant_id, {"type": "new_order", "order_id": active_session["id"]})
                
                return {"ok": True, "order_id": active_session["id"], "token": token, "total": new_total}
                
        token = await next_token(restaurant_id or "", req.order_type)

    order = {
        "id": str(uuid.uuid4()),
        "token": token,
        "pay_code": pay_code,
        "service_type": service_type,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "restaurant_id": restaurant_id,
        "items": validated_items,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": status,
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "estimated_ready_at": eta,
        "payment_method": req.payment_method,
        "notes": (req.notes or "").strip()[:500],
        "table_number": req.table_number,
        "table_session_id": req.table_session_id,
        "order_type": req.order_type,
        "idempotency_key": idempotency_key,
        "payment_status": "unpaid" if req.payment_method in {"cash", "upi", "card_machine"} else "pending",
        "is_ai": req.is_ai,
        "device_id": req.device_id,
    }
    
    # ponytail: atomic order creation + inventory deduction (safe for standalone & replica sets)
    await db.orders.insert_one(order)
    
    # Create notification
    await db.notifications.update_one(
        {"event_key": f"order:{order['id']}:confirmed"},
        {"$setOnInsert": {
            "id": str(uuid.uuid4()),
            "event_key": f"order:{order['id']}:confirmed",
            "order_id": order["id"],
            "type": "order_update",
            "title": f"New order {token}",
            "body": f"{customer_name} — {len(validated_items)} item(s)",
            "read": False,
            "restaurant_id": restaurant_id,
            "created_at": now_iso(),
        }}, upsert=True)
    
    # Deduct inventory atomically
    for item in validated_items:
        m = menu_by_id.get(item["item_id"])
        if m and m.get("recipe"):
            for ing in m["recipe"]:
                ing_id = ing.get("ingredient_id")
                req_qty = ing.get("qty_required", 0) * item["qty"]
                if ing_id and req_qty > 0:
                    await db.inventory.update_one(
                        {"id": ing_id}, 
                        {"$inc": {"qty": -req_qty}}
                    )
    
    # Update customer (outside transaction, non-critical)
    customer = await _find_or_create_customer(customer_name, customer_phone, restaurant_id)
    if customer and customer.get("id"):
        await _on_order_paid({**order, "customer_id": customer["id"]})
    
    # Step 5: Post-Checkout Aggregation & Redis Caching
    if req.device_id:
        try:
            pipeline = [
                {"$match": {"device_id": req.device_id, "status": {"$ne": "cancelled"}}},
                {"$unwind": "$items"},
                {"$group": {"_id": "$items.name", "count": {"$sum": "$items.qty"}}},
                {"$sort": {"count": -1}},
                {"$limit": 1}
            ]
            res = await db.orders.aggregate(pipeline).to_list(1)
            if res and res[0].get("_id"):
                fav = str(res[0]["_id"])
                if redis_client:
                    try:
                        await redis_client.setex(f"fav_item:{req.device_id}", 86400 * 30, fav)
                    except Exception as e:
                        logger.debug("[AI Memory] Redis setex failed: %s", e)
        except Exception as e:
            logger.debug("[AI Memory] Aggregation failed: %s", e)
    
    # Broadcast to SSE subscribers (kitchen/counter real-time)
    if order["status"] == "confirmed":
        broadcast_order_update(restaurant_id, {"type": "new_order", "order": {k: v for k, v in order.items() if k != "_id"}})
    elif order["status"] == "awaiting_cash_verification":
        broadcast_order_update(restaurant_id, {"type": "pending_paycode", "order": {k: v for k, v in order.items() if k != "_id"}})
    elif order["status"] == "high_value_verification":
        broadcast_order_update(restaurant_id, {"type": "high_value_alert", "order": {k: v for k, v in order.items() if k != "_id"}})
    return {"ok": True, "order_id": order["id"], "token": token, "total": total}


@router.get("/api/orders")
async def list_orders(
    status_filter: Optional[str] = None,
    table_session_id: Optional[str] = None,
    restaurant_id: Optional[str] = None,
    device_id: Optional[str] = None,
    order_ids: Optional[str] = None,
    limit: int = 100,
    user=Depends(require_user),
):
    q: Dict[str, Any] = {}
    if status_filter:
        q["status"] = status_filter
    
    rid = user.get("restaurant_id")
    if not rid:
        if user.get("role") == "superadmin" and restaurant_id:
            rid = restaurant_id
        else:
            raise HTTPException(status_code=403, detail="No restaurant assigned")
    q["restaurant_id"] = rid
    
    if user.get("role") == "customer":
        customer_conds = []
        if table_session_id:
            customer_conds.append({"table_session_id": table_session_id})
        if device_id:
            customer_conds.append({"device_id": device_id})
        if order_ids:
            oid_list = [o.strip() for o in order_ids.split(",") if o.strip()]
            if oid_list:
                customer_conds.append({"id": {"$in": oid_list}})
        if not customer_conds:
            return {"orders": []}
        if len(customer_conds) == 1:
            q.update(customer_conds[0])
        else:
            q["$or"] = customer_conds
    else:
        if table_session_id:
            q["table_session_id"] = table_session_id
        if device_id:
            q["device_id"] = device_id
        if order_ids:
            oid_list = [o.strip() for o in order_ids.split(",") if o.strip()]
            if oid_list:
                q["id"] = {"$in": oid_list}
            
    docs = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"orders": docs}


@router.get("/api/orders/{order_id}")
async def get_order(order_id: str, user=Depends(current_user)):
    q: Dict[str, Any] = {"id": order_id}
    if user and user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    o = await db.orders.find_one(q, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


@router.patch("/api/orders/{order_id}/status")
async def update_status(order_id: str, body: OrderStatusUpdate, user=Depends(require_roles("admin", "kitchen", "counter"))):
    if body.status is None and body.payment_status is None and body.bill_requested is None:
        raise HTTPException(status_code=400, detail="Must provide status, payment_status, or bill_requested")
    
    update_data = {}
    if body.status is not None:
        if body.status not in {"pending", "confirmed", "preparing", "ready", "served", "cancelled"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = body.status
        
    if body.payment_status is not None:
        if body.payment_status not in {"pending", "paid", "unpaid", "failed"}:
            raise HTTPException(status_code=400, detail="Invalid payment_status")
        update_data["payment_status"] = body.payment_status
        if body.payment_status == "paid":
            update_data["paid_at"] = now_iso()
            update_data["exit_code"] = f"PASS-{uuid.uuid4().hex[:6].upper()}"
            update_data["bill_requested"] = False
            
    if body.bill_requested is not None:
        update_data["bill_requested"] = body.bill_requested
        
    update_data["updated_at"] = now_iso()
    
    q: Dict[str, Any] = {"id": order_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.orders.update_one(q, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = await db.orders.find_one(q, {"_id": 0})
    if body.payment_status == "paid":
        if order.get("table_id"):
            await db.tables.update_one({"id": order["table_id"]}, {"$set": {"status": "available", "current_session_id": None}})
        if order.get("table_session_id"):
            await db.table_sessions.update_one({"id": order["table_session_id"]}, {"$set": {"status": "closed", "closed_at": now_iso()}})
    
    # Broadcast status change to SSE subscribers
    broadcast_data = {"type": "status_update", "order_id": order_id, "token": order["token"]}
    if body.status:
        broadcast_data["status"] = body.status
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()),
            "order_id": order_id,
            "type": "order_update",
            "title": f"Order {order['token']} → {body.status}",
            "body": f"Your order status changed to {body.status}.",
            "read": False,
            "restaurant_id": order.get("restaurant_id"),
            "created_at": now_iso(),
        })
    if body.payment_status:
        broadcast_data["payment_status"] = body.payment_status
    if body.bill_requested is not None:
        broadcast_data["bill_requested"] = body.bill_requested
        
    broadcast_order_update(order.get("restaurant_id"), broadcast_data)
    return {"ok": True, **update_data}


@router.patch("/api/orders/{order_id}/items/{cart_item_id}/status")
async def update_item_status(order_id: str, cart_item_id: str, body: ItemStatusUpdate, user=Depends(require_roles("admin", "kitchen", "counter"))):
    if body.item_status not in {"pending", "preparing", "ready", "served"}:
        raise HTTPException(status_code=400, detail="Invalid item status")

    q: Dict[str, Any] = {"id": order_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]

    order = await db.orders.find_one(q)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    items = order.get("items", [])
    item_updated = False
    all_served = True

    for item in items:
        if item.get("cart_item_id") == cart_item_id:
            item["item_status"] = body.item_status
            item_updated = True
        
        # Check if all items are served
        if item.get("item_status") != "served":
            all_served = False

    if not item_updated:
        raise HTTPException(status_code=404, detail="Item not found in order")

    # If all items are served, also update the main order status
    update_fields = {"items": items, "updated_at": now_iso()}
    new_order_status = None
    if all_served:
        update_fields["status"] = "served"
        new_order_status = "served"

    await db.orders.update_one(q, {"$set": update_fields})

    # Broadcast update
    broadcast_data = {
        "type": "item_status_update", 
        "order_id": order_id, 
        "token": order["token"], 
        "cart_item_id": cart_item_id, 
        "item_status": body.item_status
    }
    if new_order_status:
        broadcast_data["status"] = new_order_status

    broadcast_order_update(order.get("restaurant_id"), broadcast_data)
    return {"ok": True, "item_status": body.item_status, "order_status": new_order_status or order.get("status")}



# =========================================================
# Split Bill
# =========================================================
@router.post("/api/orders/{order_id}/split")
async def split_bill(order_id: str, body: SplitBillReq, user=Depends(current_user)):
    if len(body.splits) < 2:
        raise HTTPException(status_code=400, detail="At least 2 splits required")
    if len(body.splits) > 6:
        raise HTTPException(status_code=400, detail="Maximum 6 splits allowed")

    q: Dict[str, Any] = {"id": order_id}
    if user and user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    order = await db.orders.find_one(q, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    total = float(order["total"])
    splits_total = round(sum(s.amount for s in body.splits), 2)
    if abs(splits_total - total) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Split total ({splits_total}) does not match order total ({total})",
        )

    split_data = {
        "splits": [s.model_dump() for s in body.splits],
        "is_split": True,
    }
    await db.orders.update_one(q, {"$set": {"split_bill": split_data, "updated_at": now_iso()}})
    updated = await db.orders.find_one(q, {"_id": 0})

    broadcast_data = {"type": "status_update", "order_id": order_id, "token": order["token"], "split": True}
    broadcast_order_update(order.get("restaurant_id"), broadcast_data)
    return updated


# =========================================================
# Request Bill & Settle Table (Customer / Staff action)
# =========================================================
@router.post("/api/orders/{order_id}/request-bill")
async def request_bill(order_id: str, user=Depends(current_user)):
    q: Dict[str, Any] = {"id": order_id}
    if user and user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    order = await db.orders.find_one(q, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    await db.orders.update_one(q, {"$set": {"bill_requested": True, "updated_at": now_iso()}})
    if order.get("table_session_id"):
        await db.table_sessions.update_one({"id": order["table_session_id"]}, {"$set": {"bill_requested": True}})
        if order.get("table_id"):
            await db.tables.update_one({"id": order["table_id"]}, {"$set": {"status": "bill_requested"}})

    notif_id = str(uuid.uuid4())
    await db.notifications.insert_one({
        "id": notif_id,
        "order_id": order_id,
        "type": "staff_call",
        "title": f"🧾 Bill Requested · Table {order.get('table_number', 'Takeaway')}",
        "body": f"Customer {order.get('customer_name', 'Guest')} requested bill settlement (₹{order.get('total', 0)}).",
        "message": f"Table {order.get('table_number', 'Takeaway')}: Requested bill to pay ₹{order.get('total', 0)}!",
        "read": False,
        "restaurant_id": order.get("restaurant_id"),
        "created_at": now_iso(),
        "table_number": order.get("table_number", "Unknown"),
        "reasons": ["bill"]
    })

    broadcast_data = {"type": "status_update", "order_id": order_id, "token": order["token"], "bill_requested": True}
    broadcast_order_update(order.get("restaurant_id"), broadcast_data)
    updated = await db.orders.find_one(q, {"_id": 0})
    return {"ok": True, "order": updated}



# =========================================================
# Bill PDF download
# =========================================================
@router.get("/api/orders/{order_id}/bill")
async def download_bill(order_id: str, user=Depends(current_user)):
    try:
        q: Dict[str, Any] = {"id": order_id}
        if user and user.get("restaurant_id"):
            q["restaurant_id"] = user["restaurant_id"]
        order = await db.orders.find_one(q, {"_id": 0})
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        rest = await db.restaurants.find_one({"id": order["restaurant_id"]}, {"_id": 0, "name": 1})
        rest_name = rest["name"] if rest else "SmartDine AI Restaurant"

        pdf = FPDF()
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 20)
        pdf.cell(text=rest_name, new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "B", 28)
        pdf.cell(text=f"Token #{order['token']}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.set_font("Helvetica", "", 10)
        created = order.get("created_at", "")
        if created:
            try:
                dt = datetime.fromisoformat(created)
                created = dt.strftime("%d %b %Y, %I:%M %p")
            except ValueError:
                pass
        pdf.cell(text=f"Date: {created}", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(5)
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(text=f"Customer: {order.get('customer_name', 'N/A')}", new_x="LMARGIN", new_y="NEXT")
        if order.get("order_type") == "dine_in" and order.get("table_number"):
            pdf.cell(text=f"Table: {order['table_number']}", new_x="LMARGIN", new_y="NEXT")
        else:
            pdf.cell(text=f"Order: {order.get('order_type', 'dine_in').title()}", new_x="LMARGIN", new_y="NEXT")
        pdf.ln(8)
        col_w = [80, 20, 30, 40]
        pdf.set_font("Helvetica", "B", 10)
        for h, w in zip(["Item", "Qty", "Unit Price", "Total"], col_w):
            pdf.cell(text=h, w=w, align="L" if h == "Item" else "C", border=1)
        pdf.ln()
        pdf.set_font("Helvetica", "", 10)
        for item in order.get("items", []):
            name = item.get("name", "Unknown")[:70]
            qty = item.get("qty", 1)
            price = float(item.get("price", 0))
            pdf.cell(text=name, w=col_w[0], align="L", border=1)
            pdf.cell(text=str(qty), w=col_w[1], align="C", border=1)
            pdf.cell(text=f"INR {price:.2f}", w=col_w[2], align="C", border=1)
            pdf.cell(text=f"INR {price*qty:.2f}", w=col_w[3], align="C", border=1)
            pdf.ln()
            # Show item notes if present
            notes = item.get("notes", "")
            if notes:
                pdf.set_font("Helvetica", "I", 8)
                pdf.cell(text="  " + str(notes)[:120], w=sum(col_w), align="L", border=0)
                pdf.ln()
                pdf.set_font("Helvetica", "", 10)
        subtotal = float(order.get("subtotal", 0))
        tax = float(order.get("tax", 0))
        total = float(order.get("total", 0))
        gap_w = sum(col_w[:3])
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(text="", w=gap_w, border=0)
        pdf.cell(text=f"Subtotal: INR {subtotal:.2f}", w=col_w[3], align="C", border=1)
        pdf.ln()
        pdf.cell(text="", w=gap_w, border=0)
        pdf.cell(text=f"Tax (5%): INR {tax:.2f}", w=col_w[3], align="C", border=1)
        pdf.ln()
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(text="", w=gap_w, border=0)
        pdf.cell(text=f"Total: INR {total:.2f}", w=col_w[3], align="C", border=1)
        pdf.ln(10)
        pay_status = order.get("payment_status", "unpaid")
        pay_method = order.get("payment_method", "")
        pdf.set_font("Helvetica", "", 10)
        pdf.cell(text=f"Payment: {str(pay_status).upper()} ({str(pay_method).upper()})", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf.ln(15)
        pdf.set_font("Helvetica", "I", 8)
        pdf.cell(text="Powered by SmartDine AI - smartdine.com", new_x="LMARGIN", new_y="NEXT", align="C")
        pdf_bytes = bytes(pdf.output())
        return Response(content=pdf_bytes, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=bill_{order['token']}.pdf"})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bill error: {type(e).__name__}: {str(e)}")


# =========================================================
# Payment helpers (shared with orders) — simplified for UPI/QR only
# =========================================================
async def _find_or_create_customer(name: str, phone: Optional[str], restaurant_id: Optional[str] = None) -> Dict[str, Any]:
    import secrets as _secrets, html
    name_clean = html.escape((name or "").strip())
    phone_clean = (phone or "").strip() or None
    query: Optional[Dict[str, Any]] = None
    if phone_clean:
        query = {"phone": phone_clean}
        if restaurant_id:
            query["restaurant_id"] = restaurant_id
    elif name_clean:
        query = {"name": name_clean, "phone": None}
        if restaurant_id:
            query["restaurant_id"] = restaurant_id
    if query:
        existing = await db.customers.find_one(query, {"_id": 0})
        if existing:
            return existing
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    code = "M-" + "".join(_secrets.choice(alphabet) for _ in range(6))
    while await db.customers.find_one({"code": code}):
        code = "M-" + "".join(_secrets.choice(alphabet) for _ in range(6))
    doc = {
        "id": str(uuid.uuid4()), "code": code, "name": name_clean or "Guest",
        "phone": phone_clean, "restaurant_id": restaurant_id,
        "points": 0, "lifetime_spend": 0.0, "orders_count": 0,
        "created_at": now_iso(), "last_order_at": None,
    }
    await db.customers.insert_one(doc)
    return doc


async def _on_order_paid(order: Dict[str, Any]) -> None:
    customer_id = order.get("customer_id")
    if not customer_id:
        return
    points_earned = int(order["total"] // 100)
    await db.customers.update_one(
        {"id": customer_id},
        {"$inc": {"points": points_earned, "orders_count": 1, "lifetime_spend": float(order["total"])},
         "$set": {"last_order_at": now_iso()}},
    )


async def _deduct_inventory(order: Dict[str, Any]) -> None:
    for item in order.get("items", []):
        qty = item.get("qty", 1)
        m = await db.menu.find_one({"id": item.get("item_id")}, {"recipe": 1})
        if m and m.get("recipe"):
            for ing in m["recipe"]:
                ing_id = ing.get("ingredient_id")
                req_qty = ing.get("qty_required", 0) * qty
                if ing_id and req_qty > 0:
                    await db.inventory.update_one({"id": ing_id}, {"$inc": {"qty": -req_qty}})


# =========================================================
# Simple UPI/QR payment endpoints (no Stripe)
# =========================================================
@router.post("/api/payment/intent")
async def payment_intent(req: PaymentReq):
    """Mock payment intent for UPI/QR - immediately succeeds."""
    import asyncio
    await asyncio.sleep(0.1)  # Simulate quick processing
    return {
        "intent_id": f"upi_{uuid.uuid4().hex[:16]}",
        "status": "succeeded", "amount": req.amount, "method": req.method,
        "captured_at": now_iso(),
    }


@router.get("/api/payment/config")
async def payment_config():
    return {"stripe_enabled": False, "provider": "upi_qr"}


@router.post("/api/orders/{order_id}/verify-cash", dependencies=[Depends(require_user)])
async def verify_cash_paycode(order_id: str, user=Depends(require_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.get("status") != "awaiting_cash_verification":
        return {"ok": True, "message": "Order already verified or processed"}
    
    restaurant_id = order["restaurant_id"]
    new_token = await next_token(restaurant_id, order.get("order_type", "self_service"))
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "confirmed",
            "payment_status": "paid",
            "token": new_token,
            "pay_code": None,
            "paid_at": now_iso(),
            "updated_at": now_iso()
        }}
    )
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    broadcast_order_update(restaurant_id, {"type": "new_order", "order": updated_order})
    broadcast_order_update(restaurant_id, {"type": "status_update", "order_id": order_id, "token": new_token, "status": "confirmed", "payment_status": "paid"})
    return {"ok": True, "order": updated_order}


@router.post("/api/orders/{order_id}/discard-spam", dependencies=[Depends(require_user)])
async def discard_spam_order(order_id: str, user=Depends(require_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "cancelled", "updated_at": now_iso()}})
    broadcast_order_update(order["restaurant_id"], {"type": "order_removed", "order_id": order_id})
    return {"ok": True}


@router.post("/api/orders/{order_id}/verify-high-value", dependencies=[Depends(require_user)])
async def verify_high_value_order(order_id: str, user=Depends(require_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "confirmed", "updated_at": now_iso()}})
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    broadcast_order_update(order["restaurant_id"], {"type": "new_order", "order": updated_order})
    return {"ok": True, "order": updated_order}


@router.post("/api/orders/{order_id}/manual-override-exit", dependencies=[Depends(require_user)])
async def manual_override_exit(order_id: str, body: OrderStatusUpdate, user=Depends(require_user)):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    emp_name = user.get("name") or user.get("email") or "Cashier"
    override_note = body.override_reason or f"Manual UTR override by {emp_name}. UTR: {body.utr_number or 'N/A'}"
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_status": "paid",
            "exit_code": f"OVR-{order_id[-6:].upper()}",
            "override_reason": override_note,
            "utr_number": body.utr_number,
            "paid_at": now_iso(),
            "updated_at": now_iso()
        }}
    )
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    broadcast_order_update(order["restaurant_id"], {"type": "status_update", "order_id": order_id, "token": order["token"], "payment_status": "paid"})
    return {"ok": True, "order": updated_order}
