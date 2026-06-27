"""Tables, QR codes, live sessions, reservations, and customer lookup routes."""
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from deps import (
    db, now_iso, require_user, require_roles,
    TableModel, TableScanReq, CustomerLookupReq, ReservationStatusUpdate,
)

router = APIRouter(tags=["tables"])

TABLE_SESSION_TTL_SECONDS = 10 * 60


# =========================================================
# Customer directory & loyalty
# =========================================================
@router.get("/api/customers", dependencies=[Depends(require_roles("admin"))])
async def list_customers(limit: int = 500, user=Depends(require_user)):
    """Full customer directory with loyalty stats."""
    q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    docs = await db.customers.find(q, {"_id": 0}).sort("last_order_at", -1).limit(limit).to_list(limit)
    return {"customers": docs}


@router.post("/api/customers/lookup")
async def lookup_customer(req: CustomerLookupReq, restaurant_id: Optional[str] = None):
    """Look up an existing customer by phone or name, scoped by restaurant."""
    phone = (req.phone or "").strip() or None
    name = (req.name or "").strip() or None
    q: Optional[Dict[str, Any]] = None
    if phone:
        q = {"phone": phone}
    elif name:
        q = {"name": name, "phone": None}
    if not q:
        return {"customer": None}
    if restaurant_id:
        q["restaurant_id"] = restaurant_id
    doc = await db.customers.find_one(q, {"_id": 0})
    return {"customer": doc}


# =========================================================
# Tables, QR codes & live table sessions (10-min hold)
# =========================================================
@router.get("/api/tables", dependencies=[Depends(require_roles("admin"))])
async def list_tables(user=Depends(require_user)):
    """List tables for the admin's restaurant."""
    q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    docs = await db.tables.find(q, {"_id": 0}).sort("number", 1).to_list(500)
    out: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    for t in docs:
        sess = await db.table_sessions.find_one({"table_id": t["id"], "status": "live"}, {"_id": 0})
        live = None
        if sess:
            exp = datetime.fromisoformat(sess["expires_at"].replace("Z", "+00:00"))
            if exp > now:
                live = {"id": sess["id"], "expires_at": sess["expires_at"], "customer_name": sess.get("customer_name")}
            else:
                await db.table_sessions.update_one({"id": sess["id"]}, {"$set": {"status": "expired"}})
        out.append({**t, "live_session": live})
    return {"tables": out}


@router.post("/api/tables", dependencies=[Depends(require_roles("admin"))])
async def create_table(payload: TableModel, user=Depends(require_user)):
    if payload.number <= 0:
        raise HTTPException(status_code=400, detail="Table number must be positive")
    q: Dict[str, Any] = {"number": payload.number}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    exists = await db.tables.find_one(q)
    if exists:
        raise HTTPException(status_code=400, detail=f"Table {payload.number} already exists")
    doc = payload.model_dump()
    if user.get("restaurant_id"):
        doc["restaurant_id"] = user["restaurant_id"]
    await db.tables.insert_one(doc)
    return doc


@router.delete("/api/tables/{table_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_table(table_id: str, user=Depends(require_user)):
    q: Dict[str, Any] = {"id": table_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.tables.delete_one(q)
    if res.deleted_count > 0:
        await db.table_sessions.delete_many({"table_id": table_id})
    return {"ok": True}


@router.post("/api/tables/{table_id}/regenerate-qr", dependencies=[Depends(require_roles("admin"))])
async def regenerate_table_qr(table_id: str, user=Depends(require_user)):
    new_token = uuid.uuid4().hex[:12]
    q: Dict[str, Any] = {"id": table_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.tables.update_one(q, {"$set": {"qr_token": new_token}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"qr_token": new_token}


@router.post("/api/tables/scan")
async def scan_table(req: TableScanReq):
    """Public: a guest scanned the QR. Returns table info + starts/refreshes a 10-min live session."""
    token = (req.qr_token or "").strip()
    table_num = (req.table_number or "").strip()
    
    if not token and not table_num:
        raise HTTPException(status_code=400, detail="qr_token or table_number required")
        
    table = None
    if token:
        table = await db.tables.find_one({"qr_token": token, "is_active": True}, {"_id": 0})
    elif table_num and req.restaurant_slug:
        # Look up restaurant by slug
        restaurant = await db.restaurants.find_one({"slug": req.restaurant_slug})
        if restaurant:
            try:
                num = int(table_num)
                table = await db.tables.find_one({"number": num, "restaurant_id": restaurant["id"], "is_active": True}, {"_id": 0})
            except ValueError:
                pass

    if not table:
        raise HTTPException(status_code=404, detail="Invalid or inactive table QR")
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(seconds=TABLE_SESSION_TTL_SECONDS)).isoformat()
    existing = await db.table_sessions.find_one({"table_id": table["id"], "status": "live"}, {"_id": 0})
    if existing:
        try:
            old_exp = datetime.fromisoformat(existing["expires_at"].replace("Z", "+00:00"))
        except Exception:
            old_exp = now
        if old_exp > now:
            await db.table_sessions.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "expires_at": expires_at,
                    "customer_name": (req.customer_name or existing.get("customer_name") or "").strip() or None,
                    "customer_phone": (req.customer_phone or existing.get("customer_phone") or "").strip() or None,
                    "last_scan_at": now.isoformat(),
                }},
            )
            existing.update({"expires_at": expires_at})
            if not existing.get("restaurant_id") and table.get("restaurant_id"):
                existing["restaurant_id"] = table["restaurant_id"]
            return {"table": table, "session": existing}
        await db.table_sessions.update_one({"id": existing["id"]}, {"$set": {"status": "expired"}})

    session = {
        "id": str(uuid.uuid4()),
        "table_id": table["id"],
        "table_number": table["number"],
        "restaurant_id": table.get("restaurant_id"),
        "started_at": now.isoformat(),
        "expires_at": expires_at,
        "last_scan_at": now.isoformat(),
        "status": "live",
        "customer_name": (req.customer_name or "").strip() or None,
        "customer_phone": (req.customer_phone or "").strip() or None,
    }
    await db.table_sessions.insert_one(session)
    return {"table": table, "session": session}


@router.get("/api/tables/session/{session_id}")
async def get_table_session(session_id: str):
    """Public: query a session's status."""
    sess = await db.table_sessions.find_one({"id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    now = datetime.now(timezone.utc)
    try:
        exp = datetime.fromisoformat(sess["expires_at"].replace("Z", "+00:00"))
    except Exception:
        exp = now
    if sess["status"] == "live" and exp <= now:
        await db.table_sessions.update_one({"id": session_id}, {"$set": {"status": "expired"}})
        sess["status"] = "expired"
    return {"session": sess}


@router.post("/api/tables/{session_id}/call-staff")
async def call_staff(session_id: str):
    session = await db.table_sessions.find_one({"id": session_id})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    table = await db.tables.find_one({"id": session.get("table_id")}, {"_id": 0})
    restaurant_id = table.get("restaurant_id") if table else None
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": None,
        "type": "staff_call",
        "title": f"Table {session['table_number']} needs assistance",
        "body": "Customer requested staff",
        "read": False,
        "restaurant_id": restaurant_id,
        "created_at": now_iso(),
    })
    return {"ok": True}


# =========================================================
# Reservations
# =========================================================
@router.post("/api/reservations")
async def create_reservation(
    name: str, phone: str, date: str, time: str,
    guests: int, restaurant_id: str,
    notes: Optional[str] = None,
):
    if guests < 1 or guests > 30:
        raise HTTPException(status_code=400, detail="Guests must be between 1 and 30")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name.strip(),
        "phone": phone.strip(),
        "date": date,
        "time": time,
        "guests": guests,
        "notes": (notes or "").strip() or None,
        "restaurant_id": restaurant_id,
        "status": "requested",
        "created_at": now_iso(),
    }
    await db.reservations.insert_one(doc)
    return {"ok": True, "reservation_id": doc["id"], "status": "requested"}


@router.get("/api/reservations", dependencies=[Depends(require_roles("admin"))])
async def list_reservations(limit: int = 100, user=Depends(require_user)):
    q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    docs = await db.reservations.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"reservations": docs}


@router.get("/api/reservations/today")
async def reservations_today(user=Depends(require_user)):
    """Today's reservations filtered by restaurant."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    q: Dict[str, Any] = {"date": today, "status": {"$ne": "cancelled"}}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    docs = await db.reservations.find(q, {"_id": 0}).sort("time", 1).to_list(200)
    return {"reservations": docs}


@router.patch("/api/reservations/{res_id}/status", dependencies=[Depends(require_roles("admin"))])
async def update_reservation_status(res_id: str, body: ReservationStatusUpdate, user=Depends(require_user)):
    allowed = {"requested", "confirmed", "seated", "cancelled"}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(allowed)}")
    rq: Dict[str, Any] = {"id": res_id}
    if user.get("restaurant_id"):
        rq["restaurant_id"] = user["restaurant_id"]
    update_doc: Dict[str, Any] = {"status": body.status, "updated_at": now_iso()}
    if body.note is not None:
        update_doc["admin_note"] = body.note.strip()
    res = await db.reservations.update_one(rq, {"$set": update_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    doc = await db.reservations.find_one({"id": res_id}, {"_id": 0})
    return {"ok": True, "reservation": doc}
