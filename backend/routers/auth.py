"""Authentication routes: signup, login, me, guest."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from deps import (
    db, now_iso, hash_password, verify_password, jwt_sign,
    require_user, SignupReq, LoginReq, GuestReq,
    ForgotPasswordReq, ResetPasswordReq
)
import uuid
import os
from datetime import datetime, timezone, timedelta
from email_service import send_password_reset_email
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
async def signup(req: SignupReq):
    clean_email = req.email.strip()
    if await db.users.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.role not in {"customer", "admin"}:
        raise HTTPException(status_code=400, detail="Invalid role. Use settings portal to add staff.")

    import uuid, re
    user_id = str(uuid.uuid4())
    restaurant_id = None

    if req.role == "admin":
        if not req.restaurant_name:
            raise HTTPException(status_code=400, detail="Restaurant name required for admin signup")
        restaurant_id = str(uuid.uuid4())
        slug = re.sub(r'[^a-z0-9]+', '-', req.restaurant_name.lower()).strip('-')
        existing_slug = await db.restaurants.find_one({"slug": slug})
        if existing_slug:
            slug = f"{slug}-{str(uuid.uuid4())[:4]}"
        from datetime import datetime, timezone, timedelta
        await db.restaurants.insert_one({
            "id": restaurant_id,
            "name": req.restaurant_name,
            "slug": slug,
            "owner_email": req.email,
            "service_type": req.service_type or "fine_dining",
            "plan": "trial",
            "subscription_status": "active",
            "sandbox_mode": True,
            "created_at": now_iso(),
        })

        frontend_config = {
            "id": restaurant_id, "name": req.restaurant_name, "slug": slug,
            "service_type": req.service_type or "fine_dining",
            "tagline": f"Welcome to {req.restaurant_name}",
            "description": f"A wonderful dining experience at {req.restaurant_name}.",
            "primary_color": "#8A1A2A", "secondary_color": "#C9A348", "accent_color": "#E8A317",
            "hero_images": ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80"],
            "why_us": [
                {"icon": "Crown", "title": "Quality Food", "description": "Fresh ingredients daily."},
                {"icon": "Heart", "title": "Made with Love", "description": "Crafted with passion."},
                {"icon": "Sparkles", "title": "AI Powered", "description": "Smart ordering experience."}
            ],
            "contact": {"phone": "", "email": req.email, "address": ""},
            "hours": {"lunch": "12:00 PM to 3:00 PM", "dinner": "6:00 PM to 11:00 PM", "open_days": "Open all 7 days"},
        }
        await db.restaurant_configs.insert_one({
            "slug": slug,
            "config": frontend_config,
            "created_at": now_iso()
        })

    await db.users.insert_one({
        "id": user_id,
        "email": req.email,
        "name": req.name,
        "role": req.role,
        "restaurant_id": restaurant_id,
        "password_hash": hash_password(req.password),
        "created_at": now_iso(),
    })
    token = jwt_sign({"sub": user_id, "email": req.email, "role": req.role, "name": req.name, "restaurant_id": restaurant_id})
    return {"token": token, "user": {"id": user_id, "email": req.email, "name": req.name, "role": req.role, "restaurant_id": restaurant_id}}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordReq, background_tasks: BackgroundTasks):
    clean_email = req.email.strip()
    # Case insensitive search with regex escaping
    user = await db.users.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
    if not user:
        # Prevent email enumeration by returning success even if not found
        print(f"⚠️ Forgot Password requested for {req.email}, but no account found!", flush=True)
        return {"message": "If an account with that email exists, a reset link has been sent."}

    role = user.get("role")
    
    # 1. Reject kitchen and counter accounts explicitly
    if role in ("kitchen", "counter", "cashier") or role not in ("superadmin", "admin"):
        raise HTTPException(
            status_code=403,
            detail="Kitchen, Counter, and Cashier account passwords cannot be reset via email. Please ask your Restaurant Admin to reset your password from the dashboard settings."
        )

    # 2. Verify registered email for superadmin
    if role == "superadmin":
        superadmin_email = os.environ.get("SUPERADMIN_EMAIL", "admin@smartdineai.co.in")
        if clean_email.lower() != superadmin_email.lower() and clean_email.lower() != "admin@smartdineai.co.in" and clean_email.lower() != "admin@smartdine.ai" and clean_email.lower() != str(user.get("email", "")).lower():
            raise HTTPException(
                status_code=403,
                detail="Verification mail can only be sent to the official registered superadmin email address."
            )

    # 3. Verify registered email for restaurant admin
    if role == "admin":
        rest_id = user.get("restaurant_id")
        rest_slug = user.get("restaurant_slug")
        query = []
        if rest_id:
            query.append({"id": rest_id})
        if rest_slug:
            query.append({"slug": rest_slug})
        
        rest = await db.restaurants.find_one({"$or": query}) if query else None
        if not rest:
            print(f"⚠️ Forgot Password: No associated restaurant found for admin user {clean_email}", flush=True)
            return {"message": "If an account with that email exists, a reset link has been sent."}
            
        registered_email = rest.get("owner_email") or rest.get("email") or rest.get("initial_creds", {}).get("admin", {}).get("email")
        if not registered_email or clean_email.lower() != str(registered_email).lower():
            raise HTTPException(
                status_code=403,
                detail="Verification mail can only be sent to the email address registered with this restaurant."
            )

    reset_token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry}}
    )

    frontend_url = os.environ.get("FRONTEND_URL", "https://smartdineai.co.in").rstrip("/")
    target_email = user.get("email")
    if role == "superadmin":
        target_email = os.environ.get("SUPERADMIN_EMAIL", "admin@smartdineai.co.in")
    elif role == "admin" and "registered_email" in locals() and registered_email:
        target_email = str(registered_email)

    background_tasks.add_task(send_password_reset_email, target_email, reset_token, frontend_url)
    return {"message": "If an account with that email exists, a reset link has been sent."}



@router.post("/reset-password")
async def reset_password(req: ResetPasswordReq):
    user = await db.users.find_one({
        "reset_token": req.token,
        "reset_token_expiry": {"$gt": datetime.now(timezone.utc)}
    })

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    new_hash = hash_password(req.new_password)
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": new_hash, "password": req.new_password},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )
    rest_id = user.get("restaurant_id")
    if rest_id and user.get("role") in ("admin", "kitchen", "counter", "cashier"):
        role = user.get("role")
        await db.restaurants.update_one(
            {"id": rest_id},
            {"$set": {f"initial_creds.{role}.password": req.new_password}}
        )
    return {"message": "Password successfully reset", "role": user.get("role", "admin")}


@router.post("/login")
async def login(req: LoginReq):
    clean_email = req.email.strip()
    user = await db.users.find_one({"email": {"$regex": f"^{re.escape(clean_email)}$", "$options": "i"}})
    stored_hash = None
    if user:
        stored_hash = user.get("password_hash") or user.get("password")
    if not user or not verify_password(req.password, stored_hash or ""):
        from routers.audit import log_audit_event
        await log_audit_event(
            user_id=user.get("id") if user else None,
            user_email=req.email,
            action="login_failed",
            target="system",
            details={"reason": "Invalid email or password"}
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    restaurant_id = user.get("restaurant_id")
    restaurant_slug = user.get("restaurant_slug")
    
    if restaurant_id and not restaurant_slug:
        rest = await db.restaurants.find_one({"id": restaurant_id}, {"slug": 1})
        if rest and rest.get("slug"):
            restaurant_slug = rest["slug"]

    # Superadmins are platform-level users — no restaurant_id needed
    if user.get("role") == "superadmin":
        token = jwt_sign({
            "sub": user["id"], "email": user["email"], "role": "superadmin",
            "name": user["name"], "restaurant_id": None,
            "restaurant_slug": None,
        })
        from routers.audit import log_audit_event
        await log_audit_event(
            user_id=user["id"],
            user_email=user["email"],
            action="login_success",
            target="system",
            details={"role": "superadmin"}
        )

        return {
            "token": token,
            "user": {
                "id": user["id"], "email": user["email"], "name": user["name"],
                "role": "superadmin", "restaurant_id": None,
                "restaurant_slug": None,
            },
        }

    if not restaurant_id:
        email = user.get("email", "")
        restaurants = await db.restaurants.find({}, {"id": 1, "slug": 1}).to_list(100)
        for r in restaurants:
            slug = r.get("slug", "")
            rid = r.get("id", "")
            if slug in email:
                restaurant_id = rid
                restaurant_slug = slug
                break
        if restaurant_id:
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"restaurant_id": restaurant_id, "restaurant_slug": restaurant_slug or ""}},
            )
        else:
            raise HTTPException(status_code=400, detail="Could not determine restaurant for this account. Contact support.")
    elif not restaurant_slug or True:
        # We need to fetch the restaurant anyway to check if it's suspended
        rest = await db.restaurants.find_one({"id": restaurant_id})
        if rest:
            if rest.get("subscription_status") == "suspended":
                raise HTTPException(status_code=403, detail="Your restaurant account has been suspended. Please contact support.")
            restaurant_slug = rest.get("slug", "")
            await db.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"restaurant_slug": restaurant_slug}},
            )

    token = jwt_sign({
        "sub": user["id"], "email": user["email"], "role": user["role"],
        "name": user["name"], "restaurant_id": restaurant_id,
        "restaurant_slug": restaurant_slug,
    })

    from routers.audit import log_audit_event
    await log_audit_event(
        user_id=user["id"],
        user_email=user["email"],
        action="login_success",
        target="system",
        details={"role": user["role"], "restaurant_id": restaurant_id}
    )

    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "restaurant_id": restaurant_id,
            "restaurant_slug": restaurant_slug,
        },
    }


@router.get("/me")
async def me(user=Depends(require_user)):
    return {"user": {
        "id": user["sub"], "email": user["email"], "name": user["name"],
        "role": user["role"], "restaurant_id": user.get("restaurant_id"),
        "restaurant_slug": user.get("restaurant_slug"),
    }}


@router.post("/guest")
async def auth_guest(req: GuestReq, restaurant_id: Optional[str] = None, slug: Optional[str] = None):
    """Lightweight guest sign-in for customers. Requires valid restaurant_id or slug."""
    import uuid
    rid = restaurant_id
    if not rid and slug:
        rest = await db.restaurants.find_one({"slug": slug}, {"id": 1})
        if rest:
            rid = rest["id"]
    if not rid:
        raise HTTPException(status_code=400, detail="restaurant_id is required for guest login")
    # Validate restaurant exists
    restaurant = await db.restaurants.find_one({"id": rid})
    if not restaurant:
        raise HTTPException(status_code=400, detail="Invalid restaurant_id")
    name = (req.name or "").strip() or "Guest"
    guest_id = f"guest_{str(uuid.uuid4())[:8]}"
    phone = (req.phone or "").strip()
    payload = {
        "sub": guest_id, "email": f"{guest_id}@guest.smartdine",
        "name": name, "role": "customer", "phone": phone,
        "restaurant_id": rid,
        "restaurant_slug": slug or restaurant.get("slug", ""),
    }
    token = jwt_sign(payload, ttl_hours=24 * 30)
    await db.guests.insert_one({"id": guest_id, "name": name, "phone": phone, "restaurant_id": rid, "created_at": now_iso()})
    return {"token": token, "user": {"id": guest_id, "email": payload["email"], "name": name, "role": "customer", "phone": phone, "restaurant_id": rid}}