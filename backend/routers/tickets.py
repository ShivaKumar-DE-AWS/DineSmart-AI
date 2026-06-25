"""Support ticketing system for restaurants to contact SmartDine HQ."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from deps import db, require_user, require_restaurant_id, now_iso
import uuid

router = APIRouter(tags=["tickets"])


async def require_superadmin(user=Depends(require_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user


class TicketCreateReq(BaseModel):
    title: str
    description: str
    priority: str = "normal"  # low, normal, high, critical


@router.post("/api/tickets")
async def create_ticket(req: TicketCreateReq, user=Depends(require_user)):
    """Tenant endpoint to submit a support ticket."""
    restaurant_id = user.get("restaurant_id")
    if not restaurant_id:
        raise HTTPException(status_code=400, detail="User is not associated with a restaurant")

    doc = {
        "id": str(uuid.uuid4()),
        "restaurant_id": restaurant_id,
        "restaurant_slug": user.get("restaurant_slug"),
        "created_by_email": user.get("email"),
        "title": req.title,
        "description": req.description,
        "priority": req.priority,
        "status": "open",
        "created_at": now_iso(),
        "resolved_at": None,
        "resolved_by": None
    }
    
    await db.support_tickets.insert_one(doc)
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user["id"],
        user_email=user["email"],
        action="ticket_created",
        target=doc["id"],
        details={"title": req.title, "priority": req.priority}
    )
    
    return {"message": "Ticket submitted successfully", "ticket": doc}


@router.get("/api/tickets")
async def get_tenant_tickets(user=Depends(require_user)):
    """Tenant endpoint to view their own tickets."""
    restaurant_id = user.get("restaurant_id")
    if not restaurant_id:
        raise HTTPException(status_code=400, detail="User is not associated with a restaurant")

    tickets = await db.support_tickets.find(
        {"restaurant_id": restaurant_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"tickets": tickets}


@router.get("/api/super-admin/tickets")
async def get_all_tickets(user=Depends(require_superadmin)):
    """HQ endpoint to view all tickets across the platform."""
    tickets = await db.support_tickets.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"tickets": tickets}


@router.post("/api/super-admin/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: str, user=Depends(require_superadmin)):
    """HQ endpoint to mark a ticket as resolved."""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "status": "resolved",
            "resolved_at": now_iso(),
            "resolved_by": user.get("email")
        }}
    )
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user["id"],
        user_email=user["email"],
        action="ticket_resolved",
        target=ticket_id,
        details={"restaurant_id": ticket.get("restaurant_id")}
    )
    
    return {"message": "Ticket resolved"}
