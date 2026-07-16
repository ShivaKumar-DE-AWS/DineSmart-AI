"""SmartDine AI — Unified Restaurant Operations Backend
All routes prefixed with /api (per platform Kubernetes ingress).
"""
from __future__ import annotations
import os
import sys
import json
import uuid
import re
import glob as globmod
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import Response
import time as _time

# ponytail: slowapi with Redis backend for distributed rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import redis.asyncio as redis

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from deps import (
    db, hash_password, now_iso,
    MenuItemModel, InventoryItemModel, SEED_INVENTORY,
)

# =========================================================
# Rate Limiter (Redis-backed, distributed)
# =========================================================
redis_url = os.environ.get("REDIS_URL", "")
redis_client = None
if redis_url:
    try:
        redis_client = redis.from_url(redis_url, encoding="utf-8", decode_responses=True)
        print(f"[init] ✅ Redis client initialized: {redis_url[:50]}...")
    except Exception as e:
        print(f"[init] ⚠️  Redis initialization failed: {e}")
        pass

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=redis_url if redis_url else "memory://",
    default_limits=["1000/hour"],
)

RATE_LIMITS: Dict[str, str] = {
    "/api/auth/login": "5/minute",
    "/api/auth/signup": "5/minute",
    "/api/auth/guest": "20/minute",
    "/api/orders": "30/minute",
    "/api/reservations": "15/minute",
    "/api/payment/checkout/session": "10/minute",
    "/api/restaurants/request": "2/hour",
    "/api/tables": "50/minute",  # ponytail: rate limit cart SSE endpoints
    "/api/ai-waiter/event": "30/minute",  # Prevent Gemini quota abuse
}

# Custom rate limit middleware using slowapi's limiter
class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip('/') or '/'
        limit_str = RATE_LIMITS.get(path, "100/minute") # Global fallback
        
        # Apply rate limit dynamically
        try:
            await limiter._check_request_limit(request, limit_str, None)
        except RateLimitExceeded:
            return Response(
                content=json.dumps({"detail": "Rate limit exceeded. Try again shortly."}),
                status_code=429,
                media_type="application/json",
            )
        except Exception:
            # ponytail: rate limiter unavailable (no Redis) — allow through
            pass
        return await call_next(request)


# =========================================================
# Security Headers Middleware
# =========================================================
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        # ponytail: basic security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'none';"
        return response


# =========================================================
# Request Size Limit Middleware (1MB)
# =========================================================
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    MAX_SIZE = 1024 * 1024  # 1MB
    
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.MAX_SIZE:
            return Response(
                content=json.dumps({"detail": "Request too large. Maximum 1MB."}),
                status_code=413,
                media_type="application/json",
            )
        return await call_next(request)


# =========================================================
# App setup
# =========================================================
app = FastAPI(title="SmartDine AI API", version="2.0.0")


# =========================================================
# DB Availability Check
# =========================================================
DB_AVAILABLE = True

@app.on_event("startup")
async def check_db_connection():
    global DB_AVAILABLE
    try:
        # Fast 5-second timeout ping to check if DB is reachable
        # If this fails, we skip all heavy startup tasks to prevent Render timeout
        from motor.motor_asyncio import AsyncIOMotorClient
        import os
        url = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017/dinesmart_test"
        
        # Test client with 5s timeout
        test_client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
        await test_client.admin.command('ping')
        print("[startup] MongoDB connection successful.")
    except Exception as e:
        DB_AVAILABLE = False
        print(f"[startup] CRITICAL ERROR: MongoDB connection failed: {e}")
        print("[startup] Skipping all DB seed/index tasks to allow app to start.")

    # Connect cache service singletons to Redis (non-fatal if Redis is unavailable)
    try:
        from cache_service import menu_cache, config_cache
        await menu_cache.connect()
        await config_cache.connect()
        print("[startup] [OK] CacheService connected (menu_cache, config_cache)")
    except Exception as e:
        print(f"[startup] [WARN] CacheService Redis connect failed (non-fatal): {e}")

@app.get("/api/health")
async def public_health():
    return {"status": "ok", "service": "smartdine-ai", "time": now_iso()}

# ponytail: public restaurant config endpoint — reads JSON files directly for speed, no DB dependency
import glob as _glob, json as _json
_CONFIG_CACHE = {}
_CONFIG_DIR = os.path.join(os.path.dirname(__file__), "data", "restaurants")
for _cf in sorted(_glob.glob(os.path.join(_CONFIG_DIR, "*.json"))):
    if not os.path.basename(_cf).startswith("_"):
        with open(_cf, "r", encoding="utf-8") as _f:
            _data = _json.load(_f)
        if _data.get("slug"):
            _CONFIG_CACHE[_data["slug"]] = _data

@app.get("/api/config/list")
async def list_restaurant_configs():
    items = []
    
    # Only return configs for restaurants that exist and are not deleted
    try:
        if DB_AVAILABLE:
            valid_rests = await db.restaurants.find({"subscription_status": {"$ne": "deleted"}}).to_list(1000)
            valid_slugs = {r.get("slug") for r in valid_rests if r.get("slug")}
        else:
            valid_slugs = set(_CONFIG_CACHE.keys())
    except Exception:
        valid_slugs = set(_CONFIG_CACHE.keys())
        
    for s, c in _CONFIG_CACHE.items():
        if s not in valid_slugs:
            continue
        try:
            admin_email = ""
            for u in c.get("users", []):
                if u.get("role") == "admin":
                    admin_email = u.get("email", "")
                    break
            items.append({"slug": s, "name": c.get("name", ""), "email": admin_email})
        except Exception:
            items.append({"slug": s, "name": "", "email": ""})
            
    # Include dynamic configs from DB
    if DB_AVAILABLE:
        try:
            db_configs = await db.restaurant_configs.find({}).to_list(1000)
            for dc in db_configs:
                if dc.get("slug") not in _CONFIG_CACHE and dc.get("slug") in valid_slugs:
                    items.append({"slug": dc.get("slug"), "name": dc.get("config", {}).get("name", ""), "email": ""})
        except Exception:
            pass
            
    return {"configs": items}

_CONFIG_RESPONSE_CACHE = {}
_CONFIG_RESPONSE_CACHE_TTL = 60 # seconds

@app.get("/api/config/{slug}")
async def get_restaurant_config(slug: str):
    import time
    import copy
    
    # Check short-lived cache first
    cached = _CONFIG_RESPONSE_CACHE.get(slug)
    if cached and time.time() - cached["time"] < _CONFIG_RESPONSE_CACHE_TTL:
        return cached["resp"]

    config = _CONFIG_CACHE.get(slug)
    
    if not config:
        # Check database for dynamic configs
        db_config = await db.restaurant_configs.find_one({"slug": slug})
        if db_config and "config" in db_config:
            config = db_config["config"]
            
    if not config:
        raise HTTPException(status_code=404, detail="Not Found")
        
    # Check if restaurant exists and get sandbox mode
    rest = await db.restaurants.find_one({"slug": slug})
    if not rest:
        raise HTTPException(status_code=404, detail="Restaurant not found")
        
    if rest.get("subscription_status") == "suspended":
        raise HTTPException(status_code=403, detail="Restaurant is temporarily suspended.")
        
    config["sandbox_mode"] = rest.get("sandbox_mode", True)
    
    # ponytail: mask passwords — config is public, passwords should never leak
    resp = copy.deepcopy(config)
    for u in resp.get("users", []):
        if "password" in u:
            u["password"] = "***"
            
    # Cache the response
    _CONFIG_RESPONSE_CACHE[slug] = {"time": time.time(), "resp": resp}
    
    return resp

@app.get("/api/admin/demo-creds")
async def admin_demo_creds(slug: str | None = None):
    config = _CONFIG_CACHE.get(slug) if slug else None
    if not config:
        return {"users": []}
    return {"users": [{"email": u["email"], "password": u["password"], "name": u["name"], "role": u["role"]} for u in config.get("users", [])]}

@app.get("/api/super-admin/demo-creds")
async def super_admin_demo_creds():
    return {"users": []}

# ponytail: middleware order matters - rate limit first, then security headers, then size limit
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware)
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "https://dine-smart-ai.vercel.app,https://smartdineai.co.in,https://api.smartdineai.co.in,http://localhost:3000,http://localhost:3001").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(.*\.smartdineai\.co\.in|dine-smart-ai.*\.vercel\.app)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# =========================================================
# Include routers
# =========================================================
from routers.auth import router as auth_router
from routers.menu import router as menu_router
from routers.orders import router as orders_router
from routers.tables import router as tables_router
from routers.super_admin import router as super_admin_router
from routers.audit import router as audit_router
from routers.announcements import router as announcements_router
from routers.tickets import router as tickets_router
from routers.health import router as health_router
from routers.analytics import router as analytics_router
from routers.billing import router as billing_router
from routers.notifications import router as notifications_router
from routers.push import router as push_router
from routers.onboarding import router as onboarding_router
from routers.settings import router as settings_router
from routers.cart import router as cart_router
from routers.campaigns import router as campaigns_router
from routers.pricing import router as pricing_router
from routers.otp import router as otp_router
from routers.ai_waiter_event import router as ai_waiter_router
from routers.voice_agent import router as voice_agent_router
from routers.cashier import router as cashier_router

app.include_router(auth_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(tables_router)
app.include_router(super_admin_router)
app.include_router(audit_router)
app.include_router(announcements_router)
app.include_router(tickets_router)
app.include_router(health_router)
app.include_router(analytics_router)
app.include_router(billing_router)
app.include_router(notifications_router)
app.include_router(push_router)
app.include_router(onboarding_router)
app.include_router(settings_router)
app.include_router(cart_router)
app.include_router(campaigns_router)
app.include_router(pricing_router)
app.include_router(otp_router)
app.include_router(ai_waiter_router)
app.include_router(voice_agent_router)
app.include_router(cashier_router)


# =========================================================
# Startup: seed restaurants + create indexes
# =========================================================
@app.on_event("startup")
async def seed_db():
    if not DB_AVAILABLE:
        return

    try:
        config_dir = os.path.join(os.path.dirname(__file__), "data", "restaurants")
        config_files = globmod.glob(os.path.join(config_dir, "*.json"))

        for config_path in sorted(config_files):
            filename = os.path.basename(config_path)
            if filename.startswith("_"):
                continue

            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)

            rest_id = config.get("id", "")
            rest_name = config.get("name", "")
            rest_slug = config.get("slug", "")
            rest_plan = config.get("plan", "trial")

            if not rest_id or not rest_slug:
                print(f"[startup] Skipping {filename}: missing id or slug")
                continue

            existing_rest = await db.restaurants.find_one({"slug": rest_slug})
            if not existing_rest:
                await db.restaurants.insert_one({
                    "id": rest_id, "name": rest_name, "slug": rest_slug,
                    "plan": rest_plan, "created_at": now_iso(),
                })
                print(f"[startup] Created restaurant: {rest_name} ({rest_slug})")

            for m in config.get("menu", []):
                doc = MenuItemModel(**m, restaurant_id=rest_id).model_dump()
                existing = await db.menu.find_one({"name": doc["name"], "restaurant_id": rest_id})
                if existing:
                    await db.menu.update_one(
                        {"name": doc["name"], "restaurant_id": rest_id},
                        {"$set": {
                            "image_url": doc["image_url"], "tags": doc["tags"],
                            "description": doc["description"], "price": doc["price"],
                            "category": doc["category"], "prep_time_min": doc.get("prep_time_min"),
                        }},
                    )
                else:
                    await db.menu.insert_one(doc)

            for u in config.get("users", []):
                existing_user = await db.users.find_one({"email": u["email"]})
                if not existing_user:
                    await db.users.insert_one({
                        "id": str(uuid.uuid4()), "restaurant_id": rest_id,
                        "restaurant_slug": rest_slug, "email": u["email"],
                        "name": u["name"], "role": u["role"],
                        "password_hash": hash_password(u["password"]),
                        "created_at": now_iso(),
                    })
                else:
                    updates = {}
                    if not existing_user.get("restaurant_id"):
                        updates["restaurant_id"] = rest_id
                    if not existing_user.get("restaurant_slug"):
                        updates["restaurant_slug"] = rest_slug
                    
                    # Force update password hash for demo users to fix login issues on live DB
                    updates["password_hash"] = hash_password(u["password"])
                    
                    if updates:
                        await db.users.update_one(
                            {"email": u["email"]},
                            {"$set": updates}
                        )

        if await db.inventory.count_documents({}) == 0:
            for i in SEED_INVENTORY:
                doc = InventoryItemModel(**i).model_dump()
                await db.inventory.insert_one(doc)

        # Create Database Indexes for Performance & Reliability
        import pymongo
        await db.orders.create_index([("restaurant_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)])
        await db.menu.create_index([("restaurant_id", pymongo.ASCENDING)])
        await db.users.create_index([("email", pymongo.ASCENDING)], unique=True)

        print("[startup] Database seeded and indexed successfully")
    except Exception as e:
        print(f"[startup] WARNING: Database seed failed: {e}")
        print("[startup] App will continue — DB operations may fail until connection is restored")


@app.on_event("startup")
async def backfill_restaurant_ids():
    """Migration: backfill restaurant_id on users/orders missing it."""
    try:
        restaurants = await db.restaurants.find({}, {"id": 1, "slug": 1}).to_list(100)
        slug_to_id = {r["slug"]: r["id"] for r in restaurants if r.get("id") and r.get("slug")}

        updated_users = 0
        async for user in db.users.find({"$or": [
            {"restaurant_id": {"$exists": False}},
            {"restaurant_id": None},
            {"restaurant_id": ""},
        ]}):
            email = user.get("email", "")
            inferred_rest_id = None
            inferred_slug = None
            for slug, rid in slug_to_id.items():
                if slug in email or email.endswith(f"@{slug}.smartdine"):
                    inferred_rest_id = rid
                    inferred_slug = slug
                    break
            if not inferred_rest_id:
                for slug, rid in slug_to_id.items():
                    prefix = slug.split("-")[0] if "-" in slug else slug
                    if prefix in email:
                        inferred_rest_id = rid
                        inferred_slug = slug
                        break
            if inferred_rest_id:
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"restaurant_id": inferred_rest_id, "restaurant_slug": inferred_slug or ""}},
                )
                updated_users += 1

        updated_orders = 0
        async for order in db.orders.find({"$or": [
            {"restaurant_id": {"$exists": False}},
            {"restaurant_id": None},
            {"restaurant_id": ""},
        ]}):
            token = order.get("token", "")
            customer = order.get("customer_name", "")
            best_match = None
            for slug, rid in slug_to_id.items():
                slug_clean = slug.replace("-", "")
                customer_lower = customer.lower().replace("-", "").replace(" ", "")
                if slug_clean in customer_lower or slug.split("-")[0] in customer.lower():
                    best_match = rid
                    break
            if not best_match and slug_to_id:
                best_match = list(slug_to_id.values())[0]
            if best_match:
                await db.orders.update_one(
                    {"_id": order["_id"]},
                    {"$set": {"restaurant_id": best_match}},
                )
                updated_orders += 1

        if updated_users or updated_orders:
            print(f"[startup] Backfill: {updated_users} users, {updated_orders} orders updated")
        else:
            print("[startup] No backfill needed — all records have restaurant_id")

        # Normalize password field: old users may have 'password' instead of 'password_hash'
        async for user in db.users.find({"$or": [
            {"password_hash": {"$exists": False}},
            {"password_hash": None},
            {"password_hash": ""},
        ]}):
            old_pw = user.get("password", "")
            if old_pw:
                await db.users.update_one(
                    {"_id": user["_id"]},
                    {"$set": {"password_hash": old_pw}},
                )
                print(f"[startup] Normalized password field for {user.get('email')}")
    except Exception as e:
        print(f"[startup] WARNING: Backfill failed: {e}")


@app.on_event("startup")
async def backfill_restaurant_configs():
    if not DB_AVAILABLE:
        return

    """Migration: backfill missing restaurant_configs for newly signed up restaurants."""
    try:
        async for rest in db.restaurants.find():
            slug = rest.get("slug")
            rid = rest.get("id")
            name = rest.get("name", slug)
            if slug and rid:
                existing = await db.restaurant_configs.find_one({"slug": slug})
                if not existing:
                    print(f"[startup] Backfilling missing config for {slug}")
                    frontend_config = {
                        "id": rid, "name": name, "slug": slug,
                        "tagline": f"Welcome to {name}",
                        "description": f"A wonderful dining experience at {name}.",
                        "primary_color": "#8A1A2A", "secondary_color": "#C9A348", "accent_color": "#E8A317",
                        "hero_images": ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80"],
                        "why_us": [
                            {"icon": "Crown", "title": "Quality Food", "description": "Fresh ingredients daily."},
                            {"icon": "Heart", "title": "Made with Love", "description": "Crafted with passion."},
                            {"icon": "Sparkles", "title": "AI Powered", "description": "Smart ordering experience."}
                        ],
                        "contact": {"phone": "", "email": "", "address": ""},
                        "hours": {"lunch": "12:00 PM to 3:00 PM", "dinner": "6:00 PM to 11:00 PM", "open_days": "Open all 7 days"},
                    }
                    await db.restaurant_configs.insert_one({
                        "slug": slug,
                        "config": frontend_config,
                        "created_at": now_iso()
                    })
    except Exception as e:
        print(f"[startup] WARNING: Config backfill failed: {e}")


@app.on_event("startup")
async def create_indexes():
    if not DB_AVAILABLE:
        return

    """Create all necessary MongoDB indexes on startup."""
    try:
        from pymongo import ASCENDING
        
        indexes = [
            (db.orders, [("restaurant_id", ASCENDING), ("status", ASCENDING), ("created_at", ASCENDING)], {"background": True, "name": "idx_orders_rest_status_time"}),
            (db.orders, [("restaurant_id", ASCENDING), ("created_at", ASCENDING)], {"background": True, "name": "idx_orders_rest_time"}),
            (db.orders, [("restaurant_id", ASCENDING), ("idempotency_key", ASCENDING)], {"unique": True, "partialFilterExpression": {"idempotency_key": {"$exists": True, "$type": "string"}}, "name": "idx_orders_idem"}),
            (db.restaurants, [("slug", ASCENDING)], {"unique": True, "name": "idx_restaurants_slug"}),
            (db.restaurant_configs, [("slug", ASCENDING)], {"name": "idx_configs_slug"}),
            (db.menu, [("restaurant_id", ASCENDING), ("category", ASCENDING)], {"background": True, "name": "idx_menu_rest_category"}),
            (db.menu, [("restaurant_id", ASCENDING), ("name", ASCENDING)], {"background": True, "name": "idx_menu_rest_name"}),
            (db.users, [("email", ASCENDING)], {"unique": True, "name": "idx_users_email"}),
            (db.users, [("restaurant_id", ASCENDING), ("role", ASCENDING)], {"background": True, "name": "idx_users_rest_role"}),
            (db.users, [("restaurant_slug", ASCENDING)], {"background": True, "sparse": True, "name": "idx_users_slug"}),
            (db.inventory, [("restaurant_id", ASCENDING)], {"background": True, "name": "idx_inventory_rest"}),
            (db.tables, [("restaurant_id", ASCENDING), ("number", ASCENDING)], {"background": True, "name": "idx_tables_rest_number"}),
            (db.tables, [("qr_token", ASCENDING)], {"background": True, "sparse": True, "name": "idx_tables_qr"}),
            (db.table_sessions, [("table_id", ASCENDING), ("status", ASCENDING)], {"background": True, "name": "idx_sessions_table_status"}),
            (db.reservations, [("restaurant_id", ASCENDING), ("date", ASCENDING), ("status", ASCENDING)], {"background": True, "name": "idx_reservations_rest_date_status"}),
            (db.notifications, [("restaurant_id", ASCENDING), ("read", ASCENDING)], {"background": True, "name": "idx_notifs_rest_read"}),
            (db.notifications, [("event_key", ASCENDING)], {"unique": True, "sparse": True, "name": "idx_notifs_event_key"}),
            (db.customers, [("restaurant_id", ASCENDING), ("last_order_at", ASCENDING)], {"background": True, "name": "idx_customers_rest_time"}),
            (db.counters, [("_id", ASCENDING)], {"name": "idx_counters_pk"}),
        ]
        
        for collection, keys, options in indexes:
            try:
                await collection.create_index(keys, **options)
            except Exception as e:
                print(f"[startup] [WARN] Failed to create index {options.get('name')} on {collection.name}: {e}")
                
        print("[startup] MongoDB indexes creation finished")
    except Exception as e:
        print(f"[startup] [WARN] Index setup failed: {e}")


@app.on_event("startup")
async def seed_superadmin():
    if not DB_AVAILABLE:
        return

    """Idempotent superadmin seed hook for Render deploys."""
    from deps import hash_password
    try:
        email = "admin@smartdineai.co.in"
        old_user = await db.users.find_one({"$or": [{"email": "admin@smartdine.ai"}, {"role": "superadmin", "email": {"$ne": email}}]})
        if old_user:
            await db.users.update_one({"_id": old_user["_id"]}, {"$set": {"email": email}})
            print(f"[startup] ✓ Migrated old superadmin email to {email}")

        existing = await db.users.find_one({"email": email})
        if not existing:
            user_id = str(uuid.uuid4())
            await db.users.insert_one({
                "id": user_id, "email": email, "name": "Super Admin",
                "role": "superadmin", "restaurant_id": None,
                "password_hash": hash_password("Admin@123"),
                "created_at": now_iso(),
            })
            print(f"[startup] ✓ Superadmin created: {email} / Admin@123")
    except Exception as e:
        print(f"[startup] WARNING: Superadmin seed failed: {e}")


# =========================================================
# Main Entry Point for Local Development
# =========================================================
if __name__ == "__main__":
    import uvicorn
    
    # Get configuration from environment
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    print(f"\n>>> Starting SmartDine AI Server")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Environment: {os.environ.get('ENV', 'development')}")
    
    uvicorn.run(
        "server:app",
        host=host,
        port=port,
        reload=False,  # Don't reload in production
        log_level="info"
    )
