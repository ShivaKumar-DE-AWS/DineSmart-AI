"""Orders, payments, webhook routes, and SSE order stream."""
import uuid
import asyncio
import json
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, Response, JSONResponse
from deps import (
    db, now_iso, TAX_RATE, require_user, require_roles, current_user, jwt_verify,
    next_token, OrderCreateReq, OrderStatusUpdate,
    PaymentReq, CheckoutSessionReq,
    STRIPE_API_KEY, STRIPE_ENABLED,
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

    Accepts auth via Bearer header OR ?token= query param (EventSource can't send headers).
    """
    if not user and token:
        user = jwt_verify(token)
    if not user:
        return JSONResponse({"detail": "Authentication required"}, status_code=401)
    rid = restaurant_id or user.get("restaurant_id") or "_all"

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
    subtotal = sum(i.price * i.qty for i in req.items)
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)
    token = await next_token(req.restaurant_id or "")
    max_prep = 0
    for i in req.items:
        m = await db.menu.find_one({"id": i.item_id}, {"prep_time_min": 1})
        if m:
            max_prep = max(max_prep, m.get("prep_time_min", 10))
    eta = (datetime.now(timezone.utc) + timedelta(minutes=max(max_prep, 8))).isoformat()
    restaurant_id = req.restaurant_id
    if not restaurant_id:
        rest = await db.restaurants.find_one({}, {"id": 1})
        if rest:
            restaurant_id = rest["id"]
    order = {
        "id": str(uuid.uuid4()),
        "token": token,
        "customer_name": req.customer_name,
        "restaurant_id": restaurant_id,
        "items": [i.model_dump() for i in req.items],
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "confirmed",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "estimated_ready_at": eta,
        "payment_method": req.payment_method,
        "notes": req.notes,
        "table_number": req.table_number,
        "table_session_id": req.table_session_id,
        "is_ai": req.is_ai,
    }
    await db.orders.insert_one(order)
    # Create notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order["id"],
        "type": "order_update",
        "title": f"New order {token}",
        "body": f"{req.customer_name} — {len(req.items)} item(s)",
        "read": False,
        "restaurant_id": restaurant_id,
        "created_at": now_iso(),
    })
    # Deduct inventory
    await _deduct_inventory(order)
    # Update customer
    customer = await _find_or_create_customer(req.customer_name, req.customer_phone, restaurant_id)
    if customer and customer.get("id"):
        await _on_order_paid({**order, "customer_id": customer["id"]})
    # Broadcast to SSE subscribers (kitchen/counter real-time)
    broadcast_order_update(restaurant_id, {"type": "new_order", "order": {k: v for k, v in order.items() if k != "_id"}})
    return {"ok": True, "order_id": order["id"], "token": token, "total": total}


@router.get("/api/orders", dependencies=[Depends(require_roles("admin", "kitchen", "counter"))])
async def list_orders(
    status_filter: Optional[str] = None,
    table_session_id: Optional[str] = None,
    restaurant_id: Optional[str] = None,
    limit: int = 100,
    user=Depends(require_user),
):
    q: Dict[str, Any] = {}
    if status_filter:
        q["status"] = status_filter
    if table_session_id:
        q["table_session_id"] = table_session_id
    rid = restaurant_id or user.get("restaurant_id")
    if rid:
        q["restaurant_id"] = rid
    docs = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"orders": docs}


@router.get("/api/orders/{order_id}")
async def get_order(order_id: str, user=Depends(require_user)):
    q: Dict[str, Any] = {"id": order_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    o = await db.orders.find_one(q, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o


@router.patch("/api/orders/{order_id}/status")
async def update_status(order_id: str, body: OrderStatusUpdate, user=Depends(require_roles("admin", "kitchen", "counter"))):
    if body.status not in {"pending", "confirmed", "preparing", "ready", "served", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    q: Dict[str, Any] = {"id": order_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.orders.update_one(q, {"$set": {"status": body.status, "updated_at": now_iso()}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    rq: Dict[str, Any] = {"id": order_id}
    if user.get("restaurant_id"):
        rq["restaurant_id"] = user["restaurant_id"]
    order = await db.orders.find_one(rq, {"_id": 0})
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
    # Broadcast status change to SSE subscribers
    broadcast_order_update(order.get("restaurant_id"), {"type": "status_update", "order_id": order_id, "token": order["token"], "status": body.status})
    return {"ok": True, "status": body.status}


# =========================================================
# Payment helpers (shared with orders)
# =========================================================
async def _find_or_create_customer(name: str, phone: Optional[str], restaurant_id: Optional[str] = None) -> Dict[str, Any]:
    import secrets as _secrets
    name_clean = (name or "").strip()
    phone_clean = (phone or "").strip() or None
    query: Optional[Dict[str, Any]] = None
    if phone_clean:
        query = {"phone": phone_clean}
    elif name_clean:
        query = {"name": name_clean, "phone": None}
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
# Payments — Stripe Checkout with mock fallback
# =========================================================
async def _validate_and_price_draft(req_draft: OrderCreateReq) -> Dict[str, Any]:
    if not req_draft.items:
        raise HTTPException(status_code=400, detail="Empty cart")
    trusted_subtotal = 0.0
    trusted_items: List[Dict[str, Any]] = []
    for line in req_draft.items:
        m = await db.menu.find_one({"id": line.item_id}, {"_id": 0})
        if not m:
            raise HTTPException(status_code=400, detail=f"Unknown item {line.item_id}")
        if not m.get("available", True):
            raise HTTPException(status_code=400, detail=f"{m['name']} is not available")
        trusted_subtotal += float(m["price"]) * int(line.qty)
        item_doc = {"item_id": m["id"], "name": m["name"], "price": float(m["price"]), "qty": int(line.qty)}
        if line.notes:
            item_doc["notes"] = line.notes.strip()[:300]
        trusted_items.append(item_doc)
    trusted_tax = round(trusted_subtotal * TAX_RATE, 2)
    trusted_total = round(trusted_subtotal + trusted_tax, 2)
    return {"items": trusted_items, "subtotal": trusted_subtotal, "tax": trusted_tax, "total": trusted_total}


async def _save_order_draft(req_draft: OrderCreateReq, priced: Dict[str, Any]) -> str:
    draft_id = str(uuid.uuid4())
    customer = await _find_or_create_customer(req_draft.customer_name, req_draft.customer_phone, req_draft.restaurant_id)
    await db.order_drafts.insert_one({
        "id": draft_id, "customer_name": req_draft.customer_name,
        "customer_phone": req_draft.customer_phone,
        "customer_id": customer["id"], "customer_code": customer["code"],
        "items": priced["items"], "subtotal": priced["subtotal"],
        "tax": priced["tax"], "total": priced["total"],
        "payment_method": "stripe", "notes": req_draft.notes,
        "table_number": req_draft.table_number,
        "table_session_id": req_draft.table_session_id,
        "restaurant_id": req_draft.restaurant_id,
        "is_ai": getattr(req_draft, "is_ai", False),
        "created_at": now_iso(),
    })
    return draft_id


async def _materialize_order_from_draft(draft_id: str, payment_method: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    existing = await db.orders.find_one({"draft_id": draft_id}, {"_id": 0})
    if existing:
        return existing
    draft = await db.order_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft order not found")
    token = await next_token(draft.get("restaurant_id", ""))
    max_prep = 0
    for i in draft["items"]:
        m = await db.menu.find_one({"id": i["item_id"]}, {"prep_time_min": 1})
        if m:
            max_prep = max(max_prep, m.get("prep_time_min", 10))
    eta = (datetime.now(timezone.utc) + timedelta(minutes=max(max_prep, 8))).isoformat()
    order = {
        "id": str(uuid.uuid4()), "draft_id": draft_id, "token": token,
        "customer_name": draft["customer_name"],
        "customer_phone": draft.get("customer_phone"),
        "customer_id": draft.get("customer_id"),
        "customer_code": draft.get("customer_code"),
        "table_number": draft.get("table_number"),
        "table_session_id": draft.get("table_session_id"),
        "restaurant_id": draft.get("restaurant_id"),
        "items": draft["items"], "subtotal": draft["subtotal"],
        "tax": draft["tax"], "total": draft["total"],
        "status": "confirmed", "created_at": now_iso(), "updated_at": now_iso(),
        "estimated_ready_at": eta, "payment_method": payment_method,
        "stripe_session_id": session_id, "notes": draft.get("notes"),
    }
    await db.orders.insert_one(order)
    await _on_order_paid(order)
    await _deduct_inventory(order)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()), "order_id": order["id"],
        "type": "order_update", "title": f"Order {token} confirmed",
        "body": f"Estimated ready in ~{max(max_prep, 8)} min.",
        "read": False, "created_at": now_iso(),
    })
    broadcast_order_update(order.get("restaurant_id"), {"type": "new_order", "order": {k: v for k, v in order.items() if k != "_id"}})
    return order


@router.post("/api/payment/intent")
async def payment_intent(req: PaymentReq):
    import asyncio
    await asyncio.sleep(0.3)
    return {
        "intent_id": f"pi_mock_{uuid.uuid4().hex[:16]}",
        "status": "succeeded", "amount": req.amount, "method": req.method,
        "card_last4": req.card_last4 or "4242", "captured_at": now_iso(),
    }


@router.get("/api/payment/config")
async def payment_config():
    return {"stripe_enabled": STRIPE_ENABLED, "provider": "stripe" if STRIPE_ENABLED else "mock"}


@router.post("/api/payment/checkout/session")
async def create_checkout_session(req: CheckoutSessionReq, request: Request):
    priced = await _validate_and_price_draft(req.order_draft)
    draft_id = await _save_order_draft(req.order_draft, priced)
    if not STRIPE_ENABLED:
        order = await _materialize_order_from_draft(draft_id, payment_method="mock_card", session_id=f"mock_{uuid.uuid4().hex[:12]}")
        return {"mode": "mock", "session_id": None, "url": None, "order_id": order["id"]}
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
        success_url = f"{req.origin_url}/customer/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{req.origin_url}/customer/cart"
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        checkoutrequest = CheckoutSessionRequest(
            amount=float(priced["total"]), currency="inr",
            success_url=success_url, cancel_url=cancel_url,
            metadata={"draft_id": draft_id, "customer_name": req.order_draft.customer_name},
        )
        session = await stripe_checkout.create_checkout_session(checkoutrequest)
        await db.payment_transactions.insert_one({
            "id": str(uuid.uuid4()), "session_id": session.session_id,
            "draft_id": draft_id, "amount": priced["total"], "currency": "inr",
            "status": "initiated", "payment_status": "pending",
            "metadata": {"customer_name": req.order_draft.customer_name},
            "created_at": now_iso(), "updated_at": now_iso(),
        })
        return {"mode": "stripe", "session_id": session.session_id, "url": session.url, "order_id": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}")


@router.get("/api/payment/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=400, detail="Stripe not enabled")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Unknown session")
    status_obj = None
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        status_obj = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe status error: {e}")
    if status_obj is None:
        raise HTTPException(status_code=500, detail="Stripe status unavailable")
    new_payment_status = status_obj.payment_status
    new_status = status_obj.status
    update = {"payment_status": new_payment_status, "status": new_status, "updated_at": now_iso()}
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})
    order_id = None
    if new_payment_status == "paid" and tx.get("payment_status") != "paid":
        order = await _materialize_order_from_draft(tx["draft_id"], payment_method="stripe", session_id=session_id)
        order_id = order["id"]
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"order_id": order_id}})
    elif tx.get("order_id"):
        order_id = tx["order_id"]
    return {
        "session_id": session_id, "status": new_status,
        "payment_status": new_payment_status,
        "amount_total": status_obj.amount_total,
        "currency": status_obj.currency, "order_id": order_id,
    }


@router.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_ENABLED:
        return {"ok": True, "skipped": "stripe disabled"}
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        body = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        evt = await stripe_checkout.handle_webhook(body, sig)
        if evt.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": evt.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "updated_at": now_iso()}}
                )
                await _materialize_order_from_draft(tx["draft_id"], payment_method="stripe", session_id=evt.session_id)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
