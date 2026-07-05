"""Audit log tracking for platform actions."""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any
from deps import db, require_user, now_iso, require_superadmin
import uuid

router = APIRouter(prefix="/api/super-admin/audit", tags=["audit"])


async def log_audit_event(
    user_id: Optional[str],
    user_email: Optional[str],
    action: str,
    target: str,
    details: Dict[str, Any] = None
):
    """Helper to log security and platform events."""
    doc = {
        "id": str(uuid.uuid4()),
        "timestamp": now_iso(),
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "target": target,
        "details": details or {}
    }
    await db.audit_logs.insert_one(doc)


@router.get("")
async def get_audit_logs(
    action: Optional[str] = None,
    target: Optional[str] = None,
    limit: int = Query(100, le=1000),
    user=Depends(require_superadmin)
):
    """Fetch recent audit logs."""
    query = {}
    if action:
        query["action"] = action
    if target:
        query["target"] = target
        
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return {"logs": logs}
