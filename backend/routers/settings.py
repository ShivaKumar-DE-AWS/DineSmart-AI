"""Admin settings, branding, and staff management routes."""
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Body, UploadFile, File, BackgroundTasks
from deps import db, now_iso, hash_password, require_user, require_roles, SettingsUpdateReq, StaffUpdateReq
from email_service import send_welcome_email, send_verification_success_email

router = APIRouter(tags=["settings"])

# =========================================================
# Admin Settings & Branding
# =========================================================
@router.get("/api/admin/settings", dependencies=[Depends(require_roles("admin"))])
async def get_admin_settings(user=Depends(require_user)):
    rest = await db.restaurants.find_one({"id": user["restaurant_id"]}, {"_id": 0})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if "sandbox_mode" not in rest:
        rest["sandbox_mode"] = True
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

@router.post("/api/admin/resend-otp", dependencies=[Depends(require_roles("admin"))])
async def resend_otp(background_tasks: BackgroundTasks, user=Depends(require_user)):
    rid = user["restaurant_id"]
    rest = await db.restaurants.find_one({"id": rid})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    if rest.get("is_verified"):
        return {"status": "success", "message": "Already verified"}
        
    import random
    otp = str(random.randint(100000, 999999))
    await db.verifications.insert_one({
        "restaurant_id": rid,
        "otp": otp,
        "created_at": now_iso()
    })
    
    creds = rest.get("initial_creds") or {
        "admin": {"email": rest.get("owner_email", ""), "password": "[Hidden - Set during registration]"},
        "kitchen": {"email": f"kitchen@{rest.get('slug', '')}.com", "password": "[Hidden - Check Staff Settings]"},
        "counter": {"email": f"counter@{rest.get('slug', '')}.com", "password": "[Hidden - Check Staff Settings]"}
    }
    from email_service import send_welcome_email, send_sms_otp
    success, err_msg = await send_welcome_email(rest.get("owner_email"), rest.get("name"), creds, otp)
    if rest.get("phone"):
        background_tasks.add_task(send_sms_otp, rest.get("phone"), otp)
        
    if not success:
        raise HTTPException(status_code=500, detail=f"Email failed: {err_msg}")
        
    return {"status": "success", "message": "OTP resent successfully"}

@router.post("/api/admin/verify", dependencies=[Depends(require_roles("admin"))])
async def verify_restaurant(req: VerifyReq, background_tasks: BackgroundTasks, user=Depends(require_user)):
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
    
    rest = await db.restaurants.find_one({"id": rid})
    if rest:
        creds = rest.get("initial_creds") or {
            "admin": {"email": rest.get("owner_email", ""), "password": "[Hidden - Set during registration]"},
            "kitchen": {"email": f"kitchen@{rest.get('slug', '')}.com", "password": "[Hidden - Check Staff Settings]"},
            "counter": {"email": f"counter@{rest.get('slug', '')}.com", "password": "[Hidden - Check Staff Settings]"}
        }
        background_tasks.add_task(send_verification_success_email, rest.get("owner_email"), rest.get("name"), creds)
    
    return {"status": "success", "message": "Restaurant successfully verified. Sandbox mode lifted."}

@router.get("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def get_admin_staff(user=Depends(require_user)):
    # ponytail: returns ALL kitchen/counter — shifts need multiple per role
    staff = await db.users.find(
        {"restaurant_id": user["restaurant_id"], "role": {"$in": ["kitchen", "counter", "cashier"]}},
        {"_id": 0, "password_hash": 0}
    ).to_list(100)
    return {"staff": staff}

@router.post("/api/admin/staff", dependencies=[Depends(require_roles("admin"))])
async def update_admin_staff(req: StaffUpdateReq, user=Depends(require_user)):
    import uuid
    if req.role not in {"kitchen", "counter", "cashier"}:
        raise HTTPException(status_code=400, detail="Invalid role")

    if req.id:
        update_data = {"name": req.name}
        if req.password:
            update_data["password_hash"] = hash_password(req.password)
            update_data["plain_password"] = req.password
        await db.users.update_one(
            {"id": req.id, "restaurant_id": user["restaurant_id"]},
            {"$set": update_data}
        )
    else:
        # Create new staff user
        slug = user.get("restaurant_slug", "restaurant")
        email = f"{slug}-{req.role}-{uuid.uuid4().hex[:4]}@smartdine.ai"
        password = req.password or f"{req.role.capitalize()}@123"
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "name": req.name,
            "role": req.role,
            "restaurant_id": user["restaurant_id"],
            "restaurant_slug": slug,
            "password_hash": hash_password(password),
            "plain_password": password,
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

class GenerateLogoReq(BaseModel):
    restaurant_name: str
    theme: str
    tagline: str

@router.post("/api/admin/marketing/generate-logo", dependencies=[Depends(require_roles("admin"))])
async def generate_marketing_logo(req: GenerateLogoReq, user=Depends(require_user)):
    import os
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key missing")
        
    try:
        from google import genai
        client_ai = genai.Client(api_key=GEMINI_API_KEY)
        
        prompt = f"""
You are an expert brand identity designer. Generate a beautiful, premium, minimalist SVG logo for a restaurant.
Restaurant Name: {req.restaurant_name}
Theme: {req.theme}
Tagline: {req.tagline}

Requirements:
- Output ONLY the raw SVG code.
- No markdown wrapping, no HTML, no explanation.
- Must be a scalable vector graphic (viewBox="0 0 500 500").
- Use clean paths, modern typography style (using paths or standard fonts).
- Use premium colors matching the theme (e.g. gold #B58A43 and dark/white elements if Luxury).
- Keep it professional and centered.
"""
        response = client_ai.models.generate_content(
            model="gemini-2.5-pro",
            contents=prompt,
        )
        svg_content = response.text.strip()
        if svg_content.startswith("```xml"):
            svg_content = svg_content[6:]
        if svg_content.startswith("```svg"):
            svg_content = svg_content[6:]
        if svg_content.startswith("```"):
            svg_content = svg_content[3:]
        if svg_content.endswith("```"):
            svg_content = svg_content[:-3]
        svg_content = svg_content.strip()
        
        if not svg_content.startswith("<svg"):
            raise Exception("AI did not return a valid SVG")
            
        return {"status": "success", "svg": svg_content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))