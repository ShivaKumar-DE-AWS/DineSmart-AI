"""Authentication routes: signup, login, me, guest."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from deps import (
    db, now_iso, hash_password, verify_password, jwt_sign,
    require_user, SignupReq, LoginReq, GuestReq,
    ForgotPasswordReq, ResetPasswordReq
)
import uuid
from datetime import datetime, timezone, timedelta
from email_service import send_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/signup")
async def signup(req: SignupReq):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.role not in {"customer", "admin", "kitchen", "counter"}:
        raise HTTPException(status_code=400, detail="Invalid role")

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
            "plan": "trial",
            "subscription_status": "active",
            "created_at": now_iso(),
        })

        frontend_config = {
            "id": restaurant_id, "name": req.restaurant_name, "slug": slug,
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
            "ai_waiter": {"name": f"{req.restaurant_name} AI", "personality": "Warm and knowledgeable", "greeting": f"Welcome to {req.restaurant_name}! How can I help you today?", "languages": ["en"], "tones": ["friendly"]},
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
async def forgot_password(req: ForgotPasswordReq):
    user = await db.users.find_one({"email": req.email})
    if not user:
        # Prevent email enumeration by returning success even if not found
        return {"message": "If an account with that email exists, a reset link has been sent."}

    reset_token = str(uuid.uuid4())
    expiry = datetime.now(timezone.utc) + timedelta(hours=1)

    await db.users.update_one(
        {"email": req.email},
        {"$set": {"reset_token": reset_token, "reset_token_expiry": expiry}}
    )

    send_password_reset_email(req.email, reset_token)
    return {"message": "If an account with that email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordReq):
    user = await db.users.find_one({
        "reset_token": req.token,
        "reset_token_expiry": {"$gt": datetime.now(timezone.utc)}
    })

    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {"password_hash": hash_password(req.new_password)},
            "$unset": {"reset_token": "", "reset_token_expiry": ""}
        }
    )
    return {"message": "Password successfully reset"}


@router.post("/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email})
    stored_hash = user.get("password_hash") or user.get("password") if user else None
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
async def auth_guest(req: GuestReq, restaurant_id: Optional[str] = None):
    """Lightweight guest sign-in for customers. Requires valid restaurant_id."""
    import uuid
    if not restaurant_id:
        raise HTTPException(status_code=400, detail="restaurant_id is required for guest login")
    # Validate restaurant exists
    restaurant = await db.restaurants.find_one({"id": restaurant_id})
    if not restaurant:
        raise HTTPException(status_code=400, detail="Invalid restaurant_id")
    name = (req.name or "").strip() or "Guest"
    guest_id = f"guest_{str(uuid.uuid4())[:8]}"
    phone = (req.phone or "").strip()
    payload = {
        "sub": guest_id, "email": f"{guest_id}@guest.smartdine",
        "name": name, "role": "customer", "phone": phone,
        "restaurant_id": restaurant_id,
    }
    token = jwt_sign(payload, ttl_hours=24 * 30)
    await db.guests.insert_one({"id": guest_id, "name": name, "phone": phone, "restaurant_id": restaurant_id, "created_at": now_iso()})
    return {"token": token, "user": {"id": guest_id, "email": payload["email"], "name": name, "role": "customer", "phone": phone, "restaurant_id": restaurant_id}}