"""SmartDine AI — Unified Restaurant Operations Backend
All routes prefixed with /api (per platform Kubernetes ingress).
"""
from __future__ import annotations
import os
import json
import uuid
import re
import glob as globmod
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

from dotenv import load_dotenv
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import Response
from collections import defaultdict
import time as _time

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from deps import (
    db, hash_password, now_iso,
    MenuItemModel, InventoryItemModel, SEED_INVENTORY,
)

# =========================================================
# Rate Limiter (in-memory, per-IP sliding window)
# =========================================================
class RateLimiter:
    def __init__(self):
        self._hits: Dict[str, list] = defaultdict(list)
    def is_limited(self, key: str, limit: int, window: int) -> bool:
        now = _time.time()
        self._hits[key] = [t for t in self._hits[key] if now - t < window]
        if len(self._hits[key]) >= limit:
            return True
        self._hits[key].append(now)
        return False

_rate_limiter = RateLimiter()

RATE_LIMITS: Dict[str, tuple] = {
    "/api/auth/login": (10, 60),
    "/api/auth/signup": (5, 60),
    "/api/auth/guest": (20, 60),
    "/api/orders": (30, 60),
    "/api/ai-waiter/chat": (30, 60),
    "/api/ai-waiter/transcribe": (10, 60),
    "/api/ai-waiter/speak": (10, 60),
    "/api/reservations": (15, 60),
}

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        rule = RATE_LIMITS.get(path)
        if rule:
            limit, window = rule
            ip = request.client.host if request.client else "unknown"
            key = f"{path}:{ip}"
            if _rate_limiter.is_limited(key, limit, window):
                return Response(
                    content=json.dumps({"detail": "Rate limit exceeded. Try again shortly."}),
                    status_code=429,
                    media_type="application/json",
                )
        return await call_next(request)


# =========================================================
# App setup
# =========================================================
app = FastAPI(title="SmartDine AI API", version="2.0.0")
app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
from routers.ai_waiter import router as ai_router
from routers.admin import router as admin_router

app.include_router(auth_router)
app.include_router(menu_router)
app.include_router(orders_router)
app.include_router(tables_router)
app.include_router(ai_router)
app.include_router(admin_router)


# =========================================================
# Startup: seed restaurants + create indexes
# =========================================================
@app.on_event("startup")
async def seed_db():
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
                elif not existing_user.get("restaurant_slug"):
                    await db.users.update_one(
                        {"email": u["email"]},
                        {"$set": {"restaurant_slug": rest_slug}}
                    )

        if await db.inventory.count_documents({}) == 0:
            for i in SEED_INVENTORY:
                doc = InventoryItemModel(**i).model_dump()
                await db.inventory.insert_one(doc)

        print("[startup] Database seeded successfully")
    except Exception as e:
        print(f"[startup] WARNING: Database seed failed: {e}")
        print("[startup] App will continue — DB operations may fail until connection is restored")


@app.on_event("startup")
async def create_indexes():
    """Create compound indexes for multi-tenant query performance."""
    try:
        from pymongo import ASCENDING
        await db.orders.create_index(
            [("restaurant_id", ASCENDING), ("status", ASCENDING), ("created_at", ASCENDING)],
            background=True, name="idx_orders_rest_status_time"
        )
        await db.orders.create_index(
            [("restaurant_id", ASCENDING), ("created_at", ASCENDING)],
            background=True, name="idx_orders_rest_time"
        )
        await db.menu.create_index(
            [("restaurant_id", ASCENDING), ("category", ASCENDING)],
            background=True, name="idx_menu_rest_category"
        )
        await db.menu.create_index(
            [("restaurant_id", ASCENDING), ("name", ASCENDING)],
            background=True, name="idx_menu_rest_name"
        )
        await db.users.create_index(
            [("email", ASCENDING)], unique=True, name="idx_users_email"
        )
        await db.users.create_index(
            [("restaurant_id", ASCENDING), ("role", ASCENDING)],
            background=True, name="idx_users_rest_role"
        )
        await db.users.create_index(
            [("restaurant_slug", ASCENDING)],
            background=True, sparse=True, name="idx_users_slug"
        )
        await db.inventory.create_index(
            [("restaurant_id", ASCENDING)],
            background=True, name="idx_inventory_rest"
        )
        await db.tables.create_index(
            [("restaurant_id", ASCENDING), ("number", ASCENDING)],
            background=True, name="idx_tables_rest_number"
        )
        await db.tables.create_index(
            [("qr_token", ASCENDING)],
            background=True, sparse=True, name="idx_tables_qr"
        )
        await db.table_sessions.create_index(
            [("table_id", ASCENDING), ("status", ASCENDING)],
            background=True, name="idx_sessions_table_status"
        )
        await db.reservations.create_index(
            [("restaurant_id", ASCENDING), ("date", ASCENDING), ("status", ASCENDING)],
            background=True, name="idx_reservations_rest_date_status"
        )
        await db.notifications.create_index(
            [("restaurant_id", ASCENDING), ("read", ASCENDING)],
            background=True, name="idx_notifs_rest_read"
        )
        await db.customers.create_index(
            [("restaurant_id", ASCENDING), ("last_order_at", ASCENDING)],
            background=True, name="idx_customers_rest_time"
        )
        await db.counters.create_index(
            [("_id", ASCENDING)],
            name="idx_counters_pk"
        )
        print("[startup] MongoDB indexes created successfully")
    except Exception as e:
        print(f"[startup] WARNING: Index creation failed: {e}")



