"""Global announcements for tenant dashboards."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from deps import db, require_user, now_iso
import uuid

router = APIRouter(tags=["announcements"])

async def require_superadmin(user=Depends(require_user)):
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user

class AnnouncementReq(BaseModel):
    title: str
    message: str
    type: str = "info"  # "info" or "warning"
    is_active: bool = True

@router.get("/api/announcements")
async def get_active_announcement(user=Depends(require_user)):
    """Fetch the currently active announcement (if any) for any logged-in user."""
    # We just fetch the most recent active announcement
    announcement = await db.announcements.find_one(
        {"is_active": True},
        sort=[("created_at", -1)],
        projection={"_id": 0}
    )
    return {"announcement": announcement}

@router.post("/api/super-admin/announcements")
async def create_announcement(req: AnnouncementReq, user=Depends(require_superadmin)):
    """Create a new global announcement or update the active one."""
    
    # If creating a new active one, disable all others
    if req.is_active:
        await db.announcements.update_many({}, {"$set": {"is_active": False}})

    doc = {
        "id": str(uuid.uuid4()),
        "title": req.title,
        "message": req.message,
        "type": req.type,
        "is_active": req.is_active,
        "created_at": now_iso(),
        "created_by": user["email"]
    }
    
    await db.announcements.insert_one(doc)
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user["email"],
        action="post_announcement",
        target="global",
        details={"title": req.title, "type": req.type}
    )
    
    return {"message": "Announcement posted", "announcement": doc}
