"""Admin settings, branding, and staff management routes."""
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File
from deps import db, now_iso, hash_password, require_user, require_roles, SettingsUpdateReq, StaffUpdateReq

router = APIRouter(tags=["settings"])

# =========================================================
# Admin Settings & Branding
# =========================================================
@router.get("/api/admin/settings", dependencies=[Depends(require_roles("admin"))])
async def get_admin_settings(user=Depends(require_user)):
    rest = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return rest

@router.put("/api/admin/settings", dependencies=[Depends(require_roles("admin"))])
async def update_admin_settings(req: SettingsUpdateReq, user=Depends(require_user)):
    update_data = req.model_dump(exclude_unset=True)
    if not update_data:
        return {"status": "success", "message": "No changes"}
    # 1. Update basic fields in restaurants collection
    await db.restaurants.update_one({"id": user["restaurant_id"]}, {"$set": update_data})
    # 2. Update config fields in restaurant_configs collection
    rest = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0, "slug": 1})
    if rest and rest.get("slug"):
        slug = rest["slug"]
        set_payload = {}
        for k, v in update_data.items():
            set_payload[f"config.{k}"] = v
        if set_payload:
            await db.restaurant_configs.update_many({"slug": slug}, {"$set": set_payload})
    return {"status": "success"}

@router.get("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def get_admin_staff(user=Depends(require_user)):
    staff = await db.users.find(
        {"restaurant_id": user["restaurant_id"], "role": {"$in": ["kitchen", "counter"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return {"staff": staff}

@router.post("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def update_admin_staff(req: StaffUpdateReq, user=Depends(require_user)):
    if req.role not in {"kitchen", "counter"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    update_data = {"name": req.name}
    if req.password:
        update_data["password_hash"] = hash_password(req.password)
    if req.id:
        await db.users.update_one(
            {"id": req.id, "restaurant_id": user["restaurant_id"]},
            {"$set": update_data}
        )
    else:
        raise HTTPException(status_code=400, detail="ID required")
    return {"status": "success"}