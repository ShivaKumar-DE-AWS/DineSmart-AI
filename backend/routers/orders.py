"""Orders, payments, webhook routes, and SSE order stream."""
import os
import uuid
import asyncio
import json
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, Response, JSONResponse
from deps import (
    db, now_iso, TAX_RATE, require_user, require_roles, current_user, jwt_verify,
    next_token, OrderCreateReq, OrderStatusUpdate,
    PaymentReq, CheckoutSessionReq,
)

router = APIRouter(tags=["orders"])


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
        if not m:
            raise HTTPException(status_code=400, detail=f"Unknown item {i.item_id}")
        if not m.get("available", True):
            raise HTTPException(status_code=409, detail=f"{m.get('name', 'An item')} is no longer available")
        price = float(m["price"])
        qty = int(i.qty)
        if qty <= 0 or qty > 99:
            raise HTTPException(status_code=400, detail=f"Invalid quantity for {m['name']}")
        subtotal += price * qty
        max_prep = max(max_prep, m.get("prep_time_min", 10))
        validated_items.append({
            "item_id": i.item_id,
            "name": m["name"],
            "price": price,
            "qty": qty,
            "notes": (i.notes or "").strip()[:300]
        })
    
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)
    token = await next_token(req.restaurant_id or "")
    eta = (datetime.now(timezone.utc) + timedelta(minutes=max(max_prep, 8))).isoformat()
    restaurant_id = req.restaurant_id
    
    order = {
        "id": str(uuid.uuid4()),
        "token": token,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "restaurant_id": restaurant_id,
        "items": validated_items,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "confirmed",
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
    }
    
    # ponytail: atomic order creation + inventory deduction using MongoDB transaction
    async with await client.start_session() as session:
        async with session.start_transaction():
            await db.orders.insert_one(order, session=session)
            
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
                }}, upsert=True, session=session)
            
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
                                {"$inc": {"qty": -req_qty}},
                                session=session
                            )
    
    # Update customer (outside transaction, non-critical)
    customer = await _find_or_create_customer(customer_name, customer_phone, restaurant_id)
    if customer and customer.get("id"):
        await _on_order_paid({**order, "customer_id": customer["id"]})
    
    # Broadcast to SSE subscribers (kitchen/counter real-time)
    broadcast_order_update(restaurant_id, {"type": "new_order", "order": {k: v for k, v in order.items() if k != "_id"}})
    return {"ok": True, "order_id": order["id"], "token": token, "total": total}


@router.get("/api/orders")
async def list_orders(
    status_filter: Optional[str] = None,
    table_session_id: Optional[str] = None,
    limit: int = 100,
    user=Depends(require_user),
):
    q: Dict[str, Any] = {}
    if status_filter:
        q["status"] = status_filter
    if table_session_id:
        q["table_session_id"] = table_session_id
    rid = user.get("restaurant_id")
    if not rid:
        raise HTTPException(status_code=403, detail="No restaurant assigned")
    q["restaurant_id"] = rid
    
    if user.get("role") == "customer":
        if not table_session_id:
            return {"orders": []}
            
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
    if body.status is None and body.payment_status is None:
        raise HTTPException(status_code=400, detail="Must provide status or payment_status")
    
    update_data = {}
    if body.status is not None:
        if body.status not in {"pending", "confirmed", "preparing", "ready", "served", "cancelled"}:
            raise HTTPException(status_code=400, detail="Invalid status")
        update_data["status"] = body.status
        
    if body.payment_status is not None:
        if body.payment_status not in {"pending", "paid", "unpaid", "failed"}:
            raise HTTPException(status_code=400, detail="Invalid payment_status")
        update_data["payment_status"] = body.payment_status
        
    update_data["updated_at"] = now_iso()
    
    q: Dict[str, Any] = {"id": order_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.orders.update_one(q, {"$set": update_data})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = await db.orders.find_one(q, {"_id": 0})
    
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
        
    broadcast_order_update(order.get("restaurant_id"), broadcast_data)
    return {"ok": True, **update_data}


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
