"""Admin settings, branding, and staff management routes."""
from typing import Optional, Dict, Any
from pydantic import BaseModel
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

class VerifyReq(BaseModel):
    otp: str
    google_maps_url: Optional[str] = None

@router.post("/api/admin/verify", dependencies=[Depends(require_roles("admin"))])
async def verify_restaurant(req: VerifyReq, user=Depends(require_user)):
    rid = user["restaurant_id"]
    
    # Find OTP
    verification = await db.verifications.find_one({
        "restaurant_id": rid,
        "otp": req.otp
    }, sort=[("created_at", -1)])
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code.")
        
    # Update restaurant
    update_fields = {
        "is_verified": True,
        "sandbox_mode": False
    }
    
    if req.google_maps_url:
        update_fields["google_maps_url"] = req.google_maps_url
        
    await db.restaurants.update_one(
        {"id": rid}, 
        {"$set": update_fields}
    )
    
    return {"status": "success", "message": "Restaurant successfully verified. Sandbox mode lifted."}

@router.get("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def get_admin_staff(user=Depends(require_user)):
    # ponytail: returns ALL kitchen/counter — shifts need multiple per role
    staff = await db.users.find(
        {"restaurant_id": user["restaurant_id"], "role": {"$in": ["kitchen", "counter"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return {"staff": staff}

@router.post("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def update_admin_staff(req: StaffUpdateReq, user=Depends(require_user)):
    import uuid
    if req.role not in {"kitchen", "counter"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    if req.id:
        update_data = {"name": req.name}
        if req.password:
            update_data["password_hash"] = hash_password(req.password)
        await db.users.update_one(
            {"id": req.id, "restaurant_id": user["restaurant_id"]},
            {"$set": update_data}
        )
    else:
        # Create new staff user
        slug = user.get("restaurant_slug", "restaurant")
        email = f"{slug}-{req.role}-{uuid.uuid4().hex[:4]}@smartdine.ai"
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": req.name,
            "role": req.role,
            "restaurant_id": user["restaurant_id"],
            "restaurant_slug": slug,
            "password_hash": hash_password(req.password or f"{req.role.capitalize()}@123"),
            "created_at": now_iso(),
        })
    return {"status": "success"}


@router.delete("/api/admin/staff/{staff_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_admin_staff(staff_id: str, user=Depends(require_user)):
    result = await db.users.delete_one(
        {"id": staff_id, "restaurant_id": user["restaurant_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"status": "success"}