"""Global announcements for tenant dashboards."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from deps import db, require_user, now_iso, require_superadmin
import uuid
from datetime import datetime, timezone

router = APIRouter(tags=["announcements"])

class AnnouncementReq(BaseModel):
    title: str
    message: str
    type: str = "info"  # "info", "warning", "success", "error", "feature"
    is_active: bool = True
    expires_at: Optional[str] = None # ISO format datetime

@router.get("/api/announcements")
async def get_active_announcement(user=Depends(require_user)):
    """Fetch the currently active announcement (if any) for any logged-in user."""
    # We fetch the most recent active announcement that hasn't expired
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "is_active": True,
        "$or": [
            {"expires_at": None},
            {"expires_at": {"$gt": now}}
        ]
    }
    
    announcement = await db.announcements.find_one(
        query,
        sort=[("created_at", -1)],
        projection={"_id": 0}
    )
    return {"announcement": announcement}

@router.get("/api/super-admin/announcements")
async def get_all_announcements(user=Depends(require_superadmin)):
    """Fetch all announcements (history) for super admins."""
    announcements = await db.announcements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"announcements": announcements}

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
        "expires_at": req.expires_at,
        "created_at": now_iso(),
        "created_by": user.get("email")
    }
    
    await db.announcements.insert_one(doc)
    
    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user.get("sub"),
        user_email=user.get("email"),
        action="post_announcement",
        target="global",
        details={"title": req.title, "type": req.type}
    )
    
    return {"message": "Announcement posted", "announcement": doc}

@router.patch("/api/super-admin/announcements/{id}/deactivate")
async def deactivate_announcement(id: str, user=Depends(require_superadmin)):
    """Deactivate a specific announcement."""
    res = await db.announcements.update_one(
        {"id": id}, 
        {"$set": {"is_active": False}}
    )
    if res.modified_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    return {"message": "Announcement deactivated"}

@router.delete("/api/super-admin/announcements/{id}")
async def delete_announcement(id: str, user=Depends(require_superadmin)):
    """Delete an announcement permanently."""
    res = await db.announcements.delete_one({"id": id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")
        
    return {"message": "Announcement deleted"}
