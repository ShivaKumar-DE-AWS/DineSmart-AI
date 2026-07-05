"""Support ticketing system for restaurants to contact SmartDine HQ."""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from deps import db, require_user, require_restaurant_id, now_iso, require_superadmin
import uuid

router = APIRouter(tags=["tickets"])


class TicketCreateReq(BaseModel):
    title: str
    description: str
    priority: str = "normal"  # low, normal, high, critical

class TicketReplyReq(BaseModel):
    message: str


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
        "resolved_by": None,
        "replies": []
    }
    
    await db.support_tickets.insert_one(doc)
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
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


@router.delete("/api/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, user=Depends(require_user)):
    """Tenant endpoint to delete a support ticket."""
    restaurant_id = user.get("restaurant_id")
    if not restaurant_id:
        raise HTTPException(status_code=400, detail="User is not associated with a restaurant")

    ticket = await db.support_tickets.find_one({"id": ticket_id, "restaurant_id": restaurant_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found or unauthorized")

    await db.support_tickets.delete_one({"id": ticket_id, "restaurant_id": restaurant_id})
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="ticket_deleted",
        target=ticket_id,
        details={"restaurant_id": restaurant_id, "title": ticket.get("title")}
    )
    
    return {"message": "Ticket deleted successfully"}


@router.get("/api/super-admin/tickets")
async def get_all_tickets(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    user=Depends(require_superadmin)
):
    """HQ endpoint to view all tickets across the platform."""
    query = {}
    if status:
        query["status"] = status
    if priority:
        query["priority"] = priority
        
    tickets = await db.support_tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
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
        user_id=user.get("sub"),
        user_email=user["email"],
        action="ticket_resolved",
        target=ticket_id,
        details={"restaurant_id": ticket.get("restaurant_id")}
    )
    
    return {"message": "Ticket resolved"}


@router.post("/api/super-admin/tickets/{ticket_id}/reopen")
async def reopen_ticket(ticket_id: str, user=Depends(require_superadmin)):
    """HQ endpoint to re-open a resolved ticket."""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": {
            "status": "open",
        }, "$unset": {
            "resolved_at": "",
            "resolved_by": ""
        }}
    )
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="ticket_reopened",
        target=ticket_id,
        details={"restaurant_id": ticket.get("restaurant_id")}
    )
    
    return {"message": "Ticket reopened"}


@router.post("/api/super-admin/tickets/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, req: TicketReplyReq, user=Depends(require_superadmin)):
    """HQ endpoint to add a reply to a ticket."""
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    reply = {
        "id": str(uuid.uuid4()),
        "message": req.message,
        "created_by": user.get("email"),
        "created_at": now_iso(),
        "is_hq": True
    }
        
    await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$push": {"replies": reply}}
    )
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="ticket_reply_added",
        target=ticket_id,
        details={"restaurant_id": ticket.get("restaurant_id")}
    )
    
    return {"message": "Reply added", "reply": reply}
