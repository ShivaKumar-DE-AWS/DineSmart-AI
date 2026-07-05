"""Cashier endpoints for SmartDine AI."""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from deps import db, now_iso, require_user, require_roles, hash_password
from pydantic import BaseModel
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["cashier"])


class ApplyDiscountReq(BaseModel):
    order_id: str
    discount_type: str  # "fixed" or "percent"
    discount_value: float
    reason: str


class RefundReq(BaseModel):
    order_id: str
    amount: float
    reason: str


class ManualOrderItem(BaseModel):
    name: str
    price: float
    qty: int = 1


class ManualOrderReq(BaseModel):
    customer_name: str
    table_number: Optional[str] = None
    items: List[ManualOrderItem]
    payment_method: str = "cash"


class SplitBillReq(BaseModel):
    order_id: str
    split_count: int  # number of equal splits


@router.get("/api/cashier/live-bills")
async def get_live_bills(user=Depends(require_roles("admin", "cashier"))):
    """Get all orders that need payment attention."""
    orders = await db.orders.find(
        {
            "restaurant_id": user["restaurant_id"],
            "status": {"$in": ["confirmed", "preparing", "ready", "served", "awaiting_cash_verification", "awaiting_exit"]},
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)
    return {"orders": orders}


@router.post("/api/cashier/apply-discount")
async def apply_discount(req: ApplyDiscountReq, user=Depends(require_roles("admin", "cashier"))):
    """Apply a manual discount to an order."""
    order = await db.orders.find_one({"id": req.order_id, "restaurant_id": user["restaurant_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    subtotal = float(order.get("subtotal", 0))
    if req.discount_type == "percent":
        discount_amt = round(subtotal * (req.discount_value / 100), 2)
    else:
        discount_amt = round(min(req.discount_value, subtotal), 2)

    new_subtotal = round(subtotal - discount_amt, 2)
    tax = round(new_subtotal * 0.05, 2)
    new_total = round(new_subtotal + tax, 2)

    await db.orders.update_one(
        {"id": req.order_id},
        {"$set": {
            "subtotal": new_subtotal,
            "tax": tax,
            "total": new_total,
            "discount_amount": discount_amt,
            "discount_type": req.discount_type,
            "discount_value": req.discount_value,
            "discount_reason": req.reason,
            "discounted_by": user.get("name", user.get("email")),
            "updated_at": now_iso(),
        }}
    )
    return {"ok": True, "discount_applied": discount_amt, "new_total": new_total}


@router.post("/api/cashier/refund")
async def process_refund(req: RefundReq, user=Depends(require_roles("admin", "cashier"))):
    """Initiate a refund for an order."""
    order = await db.orders.find_one({"id": req.order_id, "restaurant_id": user["restaurant_id"]})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    refund_id = str(uuid.uuid4())
    await db.refunds.insert_one({
        "id": refund_id,
        "order_id": req.order_id,
        "restaurant_id": user["restaurant_id"],
        "amount": req.amount,
        "reason": req.reason,
        "refunded_by": user.get("name", user.get("email")),
        "refunded_by_id": user.get("sub"),
        "created_at": now_iso(),
        "status": "processed",
    })
    await db.orders.update_one(
        {"id": req.order_id},
        {"$set": {"refund_id": refund_id, "refund_amount": req.amount, "refund_reason": req.reason, "updated_at": now_iso()}}
    )
    return {"ok": True, "refund_id": refund_id}


@router.get("/api/cashier/shift-summary")
async def get_shift_summary(user=Depends(require_roles("admin", "cashier"))):
    """Get today's shift summary totals."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    orders = await db.orders.find(
        {
            "restaurant_id": user["restaurant_id"],
            "payment_status": "paid",
            "created_at": {"$gte": today},
        },
        {"_id": 0, "total": 1, "payment_method": 1, "discount_amount": 1}
    ).to_list(500)

    cash_total = sum(float(o.get("total", 0)) for o in orders if o.get("payment_method") == "cash")
    upi_total = sum(float(o.get("total", 0)) for o in orders if o.get("payment_method") in ("upi", "qr"))
    card_total = sum(float(o.get("total", 0)) for o in orders if o.get("payment_method") == "card")
    discount_total = sum(float(o.get("discount_amount", 0)) for o in orders)
    net = cash_total + upi_total + card_total

    refunds = await db.refunds.find(
        {"restaurant_id": user["restaurant_id"], "created_at": {"$gte": today}},
        {"_id": 0, "amount": 1}
    ).to_list(100)
    refund_total = sum(float(r.get("amount", 0)) for r in refunds)

    return {
        "cash_collected": round(cash_total, 2),
        "upi_collected": round(upi_total, 2),
        "card_collected": round(card_total, 2),
        "discounts_given": round(discount_total, 2),
        "refunds_processed": round(refund_total, 2),
        "net_collected": round(net - refund_total, 2),
        "orders_billed": len(orders),
    }


@router.get("/api/cashier/bill-history")
async def get_bill_history(user=Depends(require_roles("admin", "cashier"))):
    """Get paginated bill history."""
    orders = await db.orders.find(
        {"restaurant_id": user["restaurant_id"], "payment_status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"orders": orders}


@router.get("/api/cashier/refunds")
async def list_refunds(user=Depends(require_roles("admin", "cashier"))):
    """List all refunds processed."""
    refunds = await db.refunds.find(
        {"restaurant_id": user["restaurant_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"refunds": refunds}


@router.post("/api/cashier/manual-order")
async def create_manual_order(req: ManualOrderReq, user=Depends(require_roles("admin", "cashier"))):
    """Create a manual order at the counter (e.g., when kiosk is down)."""
    order_id = str(uuid.uuid4())
    items = [{"name": i.name, "price": i.price, "qty": i.qty, "item_id": str(uuid.uuid4())} for i in req.items]
    subtotal = round(sum(i.price * i.qty for i in req.items), 2)
    tax = round(subtotal * 0.05, 2)
    total = round(subtotal + tax, 2)

    order_doc = {
        "id": order_id,
        "restaurant_id": user["restaurant_id"],
        "customer_name": req.customer_name,
        "table_number": req.table_number or "Counter",
        "items": items,
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "confirmed",
        "payment_status": "paid",
        "payment_method": req.payment_method,
        "order_type": "manual",
        "created_by": user.get("name", "Cashier"),
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "token": f"M{order_id[:4].upper()}",
    }
    await db.orders.insert_one(order_doc)
    order_doc.pop("_id", None)
    return {"ok": True, "order": order_doc}
