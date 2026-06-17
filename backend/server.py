"""SmartDine AI - Unified Restaurant Operations Backend
All routes prefixed with /api (per platform Kubernetes ingress).
"""
from __future__ import annotations
import os
import asyncio
import json
import uuid
import hashlib
import hmac
import base64
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, Request, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
import io
import re
import mimetypes
import certifi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "smartdine-dev-secret-change-me")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
STRIPE_ENABLED = os.environ.get("STRIPE_ENABLED", "false").lower() == "true" and bool(STRIPE_API_KEY)

client = AsyncIOMotorClient(
    MONGO_URL,
    tls=True,
    tlsCAFile=certifi.where(),
    serverSelectionTimeoutMS=30000,
)
db = client[DB_NAME]

app = FastAPI(title="SmartDine AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory for menu images (served via /api/uploads/<file>)
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# =========================================================
# JWT helpers (minimal HS256, no external dep)
# =========================================================
def _b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

def _b64u_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)

def jwt_sign(payload: Dict[str, Any], ttl_hours: int = 24 * 7) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {**payload, "exp": int((datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).timestamp())}
    h = _b64u(json.dumps(header, separators=(",", ":")).encode())
    p = _b64u(json.dumps(payload, separators=(",", ":")).encode())
    msg = f"{h}.{p}".encode()
    sig = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64u(sig)}"

def jwt_verify(token: str) -> Dict[str, Any]:
    try:
        h, p, s = token.split(".")
        msg = f"{h}.{p}".encode()
        expected = hmac.new(JWT_SECRET.encode(), msg, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _b64u_decode(s)):
            raise ValueError("bad sig")
        payload = json.loads(_b64u_decode(p))
        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("expired")
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}${dk.hex()}"

def verify_password(password: str, stored: str) -> bool:
    try:
        salt, hexdk = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
        return hmac.compare_digest(dk.hex(), hexdk)
    except Exception:
        return False

bearer = HTTPBearer(auto_error=False)
async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Optional[Dict[str, Any]]:
    if not creds:
        return None
    return jwt_verify(creds.credentials)

async def require_user(user=Depends(current_user)) -> Dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

def require_roles(*roles: str):
    async def dep(user=Depends(require_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return dep

# =========================================================
# Models
# =========================================================
class SignupReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "customer"

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class MenuItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    category: str
    image_url: str
    available: bool = True
    prep_time_min: int = 10
    tags: List[str] = []

class CartItemModel(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    notes: Optional[str] = None

class OrderCreateReq(BaseModel):
    customer_name: str
    customer_phone: Optional[str] = None
    items: List[CartItemModel]
    payment_method: str = "mock_card"
    notes: Optional[str] = None
    table_number: Optional[int] = None
    table_session_id: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str

class InventoryItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str
    qty: float
    reorder_level: float

class ChatReq(BaseModel):
    session_id: str
    message: str
    language: Optional[str] = "auto"   # auto | en | hi | te | ur | mr | ta
    tone: Optional[str] = "friendly"   # friendly | formal | playful | poetic

class ReservationStatusUpdate(BaseModel):
    status: str  # requested | confirmed | seated | cancelled
    note: Optional[str] = None

# =========================================================
# Token & ID utilities
# =========================================================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

async def next_token() -> str:
    """Generate sequential daily token like A-001, A-002..."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    counter = await db.counters.find_one_and_update(
        {"_id": f"token-{today}"},
        {"$inc": {"seq": 1}},
        upsert=True, return_document=True
    )
    seq = counter.get("seq", 1) if counter else 1
    return f"A-{seq:03d}"

def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc = {**doc}
        doc.pop("_id", None)
    return doc

# =========================================================
# Seed data
# =========================================================
SEED_MENU = [
    # ===== HYDERABADI BIRYANI (Signature) =====
    {"name": "Chicken Dum Biryani", "description": "Slow-cooked basmati layered with kashmiri masala chicken, saffron and mint — Mehfil's signature since 2006.", "price": 280, "category": "Biryani", "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80", "prep_time_min": 18, "tags": ["bestseller", "signature", "non-veg"]},
    {"name": "Mutton Dum Biryani", "description": "Hand-stretched mutton, brown onions, kewra water — sealed and dum cooked.", "price": 360, "category": "Biryani", "image_url": "https://images.unsplash.com/photo-1642821373181-696a54913e93?w=600&q=80", "prep_time_min": 22, "tags": ["spicy", "premium", "non-veg"]},
    {"name": "Family Pack Biryani", "description": "Serves 4 — choose chicken or mutton, comes with mirchi ka salan, raita & qubani.", "price": 1400, "category": "Biryani", "image_url": "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80", "prep_time_min": 28, "tags": ["family", "value", "non-veg"]},
    {"name": "Veg Dum Biryani", "description": "Garden vegetables, basmati, fried onions, ghee — fully vegetarian dum.", "price": 220, "category": "Biryani", "image_url": "https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?w=600&q=80", "prep_time_min": 16, "tags": ["veg"]},

    # ===== STARTERS =====
    {"name": "Chicken 65", "description": "Andhra-style fried chicken bites with curry leaves, green chilli and yogurt marinade.", "price": 190, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1610057099443-fde6c99db9e1?w=600&q=80", "prep_time_min": 10, "tags": ["bestseller", "spicy", "non-veg"]},
    {"name": "Apollo Fish", "description": "Hyderabad's iconic crisp-fried fish in red chilli & coriander glaze.", "price": 200, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80", "prep_time_min": 12, "tags": ["spicy", "non-veg"]},
    {"name": "Chicken Majestic", "description": "Deep-fried chicken strips tossed with chilli, yogurt and royal cumin.", "price": 210, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80", "prep_time_min": 11, "tags": ["popular", "non-veg"]},
    {"name": "Paneer Tikka", "description": "Cottage cheese cubes marinated in hung curd, charred in tandoor.", "price": 180, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80", "prep_time_min": 10, "tags": ["veg"]},

    # ===== TANDOORI =====
    {"name": "Tandoori Chicken (Full)", "description": "Whole chicken marinated overnight in yogurt, garam masala, kashmiri red.", "price": 480, "category": "Tandoori", "image_url": "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600&q=80", "prep_time_min": 18, "tags": ["signature", "non-veg"]},
    {"name": "Chicken Tikka", "description": "Boneless tandoor-charred chicken with smoked yogurt & saffron.", "price": 240, "category": "Tandoori", "image_url": "https://images.unsplash.com/photo-1628294895950-9805252327bc?w=600&q=80", "prep_time_min": 12, "tags": ["popular", "non-veg"]},
    {"name": "Mutton Seekh Kebab", "description": "Minced mutton, ginger, mint, raw papaya — skewered and fired.", "price": 280, "category": "Tandoori", "image_url": "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=600&q=80", "prep_time_min": 14, "tags": ["non-veg"]},

    # ===== CURRIES =====
    {"name": "Hyderabadi Chicken", "description": "House special curry — tomato, kasuri methi, fried onion gravy.", "price": 230, "category": "Curries", "image_url": "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=600&q=80", "prep_time_min": 14, "tags": ["popular", "non-veg"]},
    {"name": "Mutton Rogan Josh", "description": "Kashmiri-inflected mutton in a deep red onion-ratan jot gravy.", "price": 320, "category": "Curries", "image_url": "https://images.unsplash.com/photo-1545247181-516773cae754?w=600&q=80", "prep_time_min": 18, "tags": ["non-veg"]},
    {"name": "Paneer Butter Masala", "description": "Tomato-cashew velouté, fenugreek, paneer cubes.", "price": 220, "category": "Curries", "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&q=80", "prep_time_min": 12, "tags": ["veg"]},
    {"name": "Dal Makhani", "description": "Black urad slow-simmered with cream, butter and smoked tomato.", "price": 180, "category": "Curries", "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80", "prep_time_min": 10, "tags": ["veg"]},

    # ===== BREADS =====
    {"name": "Butter Naan", "description": "Soft tandoor-baked flatbread brushed with cultured butter.", "price": 45, "category": "Breads", "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", "prep_time_min": 4, "tags": ["veg"]},
    {"name": "Garlic Naan", "description": "Naan crusted with roasted garlic & coriander.", "price": 55, "category": "Breads", "image_url": "https://images.unsplash.com/photo-1626776877729-3bd96bf38904?w=600&q=80", "prep_time_min": 4, "tags": ["veg"]},
    {"name": "Tandoori Roti", "description": "Whole-wheat fired in clay tandoor.", "price": 25, "category": "Breads", "image_url": "https://images.unsplash.com/photo-1604882737321-e43453ff5c28?w=600&q=80", "prep_time_min": 3, "tags": ["veg"]},

    # ===== RICE & NOODLES =====
    {"name": "Mehfil Special Fried Rice", "description": "House mix-meat fried rice with crispy garlic & schezwan twist.", "price": 240, "category": "Rice & Noodles", "image_url": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80", "prep_time_min": 10, "tags": ["chef-special", "non-veg"]},
    {"name": "Chicken Schezwan Noodles", "description": "Wok-fired hakka noodles with chilli garlic schezwan.", "price": 180, "category": "Rice & Noodles", "image_url": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80", "prep_time_min": 8, "tags": ["non-veg"]},

    # ===== TRADITIONAL HYDERABADI SWEETS =====
    {"name": "Double Ka Meetha", "description": "Saffron-soaked bread pudding, condensed milk, slivered pistachio — Hyderabad classic.", "price": 120, "category": "Sweets", "image_url": "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80", "prep_time_min": 4, "tags": ["bestseller", "heritage", "veg"]},
    {"name": "Qubani Ka Meetha", "description": "Apricot compote with malai cream — Nizami royal dessert.", "price": 140, "category": "Sweets", "image_url": "https://images.unsplash.com/photo-1587314168485-3236d6710814?w=600&q=80", "prep_time_min": 4, "tags": ["heritage", "veg"]},
    {"name": "Kaddu Ki Kheer", "description": "Sweet pumpkin slow-cooked in cardamom milk with almonds.", "price": 110, "category": "Sweets", "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80", "prep_time_min": 4, "tags": ["veg"]},
    {"name": "Gulab Jamun", "description": "Khoya dumplings in warm rose-cardamom syrup.", "price": 90, "category": "Sweets", "image_url": "https://images.unsplash.com/photo-1666865968793-2ae70f3e0e1c?w=600&q=80", "prep_time_min": 3, "tags": ["veg"]},

    # ===== BEVERAGES =====
    {"name": "Sweet Lassi", "description": "Chilled yogurt blended with rose & cardamom.", "price": 90, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1626790291650-503dfc480593?w=600&q=80", "prep_time_min": 3, "tags": ["refreshing", "veg"]},
    {"name": "Masala Chai", "description": "Black tea boiled with ginger, cardamom, cloves.", "price": 40, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&q=80", "prep_time_min": 3, "tags": ["veg"]},
    {"name": "Fresh Lime Soda", "description": "Lime, salt, sugar, soda — sweet+salt mix.", "price": 60, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1523677011781-c91d1bbe2f9e?w=600&q=80", "prep_time_min": 2, "tags": ["refreshing", "veg"]},
]

SEED_INVENTORY = [
    {"name": "Brisket", "unit": "kg", "qty": 12.5, "reorder_level": 5},
    {"name": "Mushrooms", "unit": "kg", "qty": 6, "reorder_level": 3},
    {"name": "Saffron", "unit": "g", "qty": 80, "reorder_level": 30},
    {"name": "Halloumi", "unit": "kg", "qty": 4, "reorder_level": 2},
    {"name": "Cream Cheese", "unit": "kg", "qty": 8, "reorder_level": 4},
    {"name": "Dark Chocolate 70%", "unit": "kg", "qty": 3.2, "reorder_level": 2},
    {"name": "Espresso Beans", "unit": "kg", "qty": 9, "reorder_level": 4},
    {"name": "Yuzu Juice", "unit": "L", "qty": 2, "reorder_level": 3},
]

SEED_USERS = [
    {"email": "owner@smartdine.ai", "password": "Owner@123", "name": "Restaurant Owner", "role": "admin"},
    {"email": "chef@smartdine.ai", "password": "Chef@123", "name": "Head Chef", "role": "kitchen"},
    {"email": "counter@smartdine.ai", "password": "Counter@123", "name": "Counter Staff", "role": "counter"},
    {"email": "guest@smartdine.ai", "password": "Guest@123", "name": "Demo Customer", "role": "customer"},
]

@app.on_event("startup")
async def seed_db():
    try:
        # menu — upsert by name so image/tag corrections always propagate
        for m in SEED_MENU:
            doc = MenuItemModel(**m).model_dump()
            existing = await db.menu.find_one({"name": doc["name"]})
            if existing:
                await db.menu.update_one({"name": doc["name"]}, {"$set": {
                    "image_url": doc["image_url"], "tags": doc["tags"],
                    "description": doc["description"], "price": doc["price"],
                    "category": doc["category"], "prep_time_min": doc.get("prep_time_min"),
                }})
            else:
                await db.menu.insert_one(doc)
        # inventory
        if await db.inventory.count_documents({}) == 0:
            for i in SEED_INVENTORY:
                doc = InventoryItemModel(**i).model_dump()
                await db.inventory.insert_one(doc)
        # users
        for u in SEED_USERS:
            existing = await db.users.find_one({"email": u["email"]})
            if not existing:
                await db.users.insert_one({
                    "id": str(uuid.uuid4()),
                    "email": u["email"],
                    "name": u["name"],
                    "role": u["role"],
                    "password_hash": hash_password(u["password"]),
                    "created_at": now_iso(),
                })
        print("[startup] Database seeded successfully")
    except Exception as e:
        print(f"[startup] WARNING: Database seed failed: {e}")
        print("[startup] App will continue — DB operations may fail until connection is restored")

# =========================================================
# Health
# =========================================================
@app.get("/")
async def root():
    return {"status": "ok", "service": "smartdine-ai", "docs": "/docs"}

@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "smartdine-ai", "time": now_iso()}

# =========================================================
# Auth
# =========================================================
@app.post("/api/auth/signup")
async def signup(req: SignupReq):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if req.role not in {"customer", "admin", "kitchen", "counter"}:
        raise HTTPException(status_code=400, detail="Invalid role")
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id, "email": req.email, "name": req.name, "role": req.role,
        "password_hash": hash_password(req.password), "created_at": now_iso(),
    })
    token = jwt_sign({"sub": user_id, "email": req.email, "role": req.role, "name": req.name})
    return {"token": token, "user": {"id": user_id, "email": req.email, "name": req.name, "role": req.role}}

@app.post("/api/auth/login")
async def login(req: LoginReq):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = jwt_sign({"sub": user["id"], "email": user["email"], "role": user["role"], "name": user["name"]})
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}}

@app.get("/api/auth/me")
async def me(user=Depends(require_user)):
    return {"user": {"id": user["sub"], "email": user["email"], "name": user["name"], "role": user["role"]}}

class GuestReq(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

@app.post("/api/auth/guest")
async def auth_guest(req: GuestReq):
    """Lightweight guest sign-in for customers. Name & phone are optional."""
    name = (req.name or "").strip() or "Mehfil Guest"
    phone = (req.phone or "").strip() or None
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    payload = {"sub": guest_id, "email": f"{guest_id}@guest.mehfil", "name": name, "role": "customer", "phone": phone}
    token = jwt_sign(payload, ttl_hours=24 * 30)
    await db.guests.insert_one({
        "id": guest_id, "name": name, "phone": phone, "created_at": now_iso(),
    })
    return {"token": token, "user": {"id": guest_id, "email": payload["email"], "name": name, "role": "customer", "phone": phone}}

# =========================================================
# Menu
# =========================================================
@app.get("/api/menu")
async def list_menu():
    items = await db.menu.find({}, {"_id": 0}).to_list(500)
    return {"items": items}

@app.post("/api/menu", dependencies=[Depends(require_roles("admin"))])
async def create_menu_item(item: MenuItemModel):
    await db.menu.insert_one(item.model_dump())
    return item

@app.patch("/api/menu/{item_id}", dependencies=[Depends(require_roles("admin"))])
async def update_menu_item(item_id: str, patch: Dict[str, Any]):
    patch.pop("id", None); patch.pop("_id", None)
    res = await db.menu.update_one({"id": item_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}

@app.delete("/api/menu/{item_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_menu_item(item_id: str):
    await db.menu.delete_one({"id": item_id})
    return {"ok": True}

# =========================================================
# Orders
# =========================================================
TAX_RATE = 0.05

@app.post("/api/orders")
async def create_order(req: OrderCreateReq):
    if not req.items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    subtotal = sum(i.price * i.qty for i in req.items)
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + tax, 2)
    token = await next_token()
    max_prep = 0
    for i in req.items:
        m = await db.menu.find_one({"id": i.item_id}, {"prep_time_min": 1})
        if m: max_prep = max(max_prep, m.get("prep_time_min", 10))
    eta = (datetime.now(timezone.utc) + timedelta(minutes=max(max_prep, 8))).isoformat()
    order = {
        "id": str(uuid.uuid4()),
        "token": token,
        "customer_name": req.customer_name,
        "items": [i.model_dump() for i in req.items],
        "subtotal": subtotal,
        "tax": tax,
        "total": total,
        "status": "confirmed",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "estimated_ready_at": eta,
        "payment_method": req.payment_method,
        "notes": req.notes,
    }
    await db.orders.insert_one(order)
    # notification
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order["id"],
        "type": "order_update",
        "title": f"Order {token} confirmed",
        "body": f"Estimated ready in ~{max(max_prep, 8)} min.",
        "read": False,
        "created_at": now_iso(),
    })
    return clean(order)

@app.get("/api/orders")
async def list_orders(status_filter: Optional[str] = None, limit: int = 100):
    q: Dict[str, Any] = {}
    if status_filter:
        q["status"] = status_filter
    docs = await db.orders.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"orders": docs}

@app.get("/api/orders/{order_id}")
async def get_order(order_id: str):
    o = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not o:
        raise HTTPException(status_code=404, detail="Order not found")
    return o

@app.patch("/api/orders/{order_id}/status")
async def update_status(order_id: str, body: OrderStatusUpdate, user=Depends(require_roles("admin", "kitchen", "counter"))):
    if body.status not in {"pending", "confirmed", "preparing", "ready", "served", "cancelled"}:
        raise HTTPException(status_code=400, detail="Invalid status")
    res = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": body.status, "updated_at": now_iso()}}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    # notification (in-app log)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "type": "order_update",
        "title": f"Order {order['token']} → {body.status}",
        "body": f"Your order status changed to {body.status}.",
        "read": False,
        "created_at": now_iso(),
    })
    # Web Push to subscribers — friendly messages per stage
    stage_messages = {
        "confirmed": ("Your order is confirmed", "Our khansama is gathering the spices."),
        "preparing": ("Your dum is on the fire", "The biryani begins its slow journey."),
        "ready": (f"Token {order['token']} is ready", "Collect from the counter — bring your appetite."),
        "served": ("Enjoy your mehfil", "Tag us with #MehfilMoments — bon appétit."),
        "cancelled": ("Order cancelled", "We&apos;re sorry — please reach the counter for help."),
    }
    title, push_body = stage_messages.get(body.status, (f"Order {order['token']}", f"Status: {body.status}"))
    try:
        await send_push_to_order(order_id, title, push_body, {"status": body.status, "token": order["token"]})
    except Exception:
        pass  # never let push errors break status update
    return order

# =========================================================
# Inventory
# =========================================================
@app.get("/api/inventory", dependencies=[Depends(require_roles("admin", "kitchen"))])
async def list_inventory():
    items = await db.inventory.find({}, {"_id": 0}).to_list(500)
    return {"items": items}

@app.post("/api/inventory", dependencies=[Depends(require_roles("admin"))])
async def create_inventory_item(item: InventoryItemModel):
    await db.inventory.insert_one(item.model_dump())
    return item

@app.patch("/api/inventory/{item_id}", dependencies=[Depends(require_roles("admin", "kitchen"))])
async def update_inventory(item_id: str, patch: Dict[str, Any]):
    patch.pop("id", None); patch.pop("_id", None)
    res = await db.inventory.update_one({"id": item_id}, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"ok": True}

@app.delete("/api/inventory/{item_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_inventory(item_id: str):
    await db.inventory.delete_one({"id": item_id})
    return {"ok": True}

# =========================================================
# Image Upload (admin)
# =========================================================
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB

@app.post("/api/upload/image", dependencies=[Depends(require_roles("admin"))])
async def upload_image(file: UploadFile = File(...)):
    """Save an uploaded image to disk and return its public URL."""
    ext = Path(file.filename or "").suffix.lower() or ".jpg"
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type {ext}")
    raw = await file.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    fname = f"{uuid.uuid4().hex}{ext}"
    out_path = UPLOAD_DIR / fname
    with open(out_path, "wb") as f:
        f.write(raw)
    return {"url": f"/api/uploads/{fname}", "filename": fname, "size": len(raw)}

# =========================================================
# Analytics
# =========================================================
@app.get("/api/analytics/dashboard", dependencies=[Depends(require_roles("admin"))])
async def dashboard():
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    orders_today = await db.orders.find({"created_at": {"$gte": today_start}}, {"_id": 0}).to_list(2000)
    revenue_today = sum(o["total"] for o in orders_today if o["status"] != "cancelled")
    avg_ticket = revenue_today / len(orders_today) if orders_today else 0
    # top items
    item_counts: Dict[str, Dict[str, Any]] = {}
    for o in orders_today:
        for i in o.get("items", []):
            entry = item_counts.setdefault(i["item_id"], {"name": i["name"], "qty": 0, "revenue": 0})
            entry["qty"] += i["qty"]
            entry["revenue"] += i["qty"] * i["price"]
    top_items = sorted(item_counts.values(), key=lambda x: x["qty"], reverse=True)[:5]
    # low stock
    low_stock = await db.inventory.find({"$expr": {"$lte": ["$qty", "$reorder_level"]}}, {"_id": 0}).to_list(50)
    # status breakdown
    status_counts: Dict[str, int] = {}
    for o in orders_today:
        status_counts[o["status"]] = status_counts.get(o["status"], 0) + 1
    return {
        "revenue_today": round(revenue_today, 2),
        "orders_today": len(orders_today),
        "avg_ticket": round(avg_ticket, 2),
        "top_items": top_items,
        "low_stock_count": len(low_stock),
        "low_stock": low_stock,
        "status_counts": status_counts,
    }

@app.get("/api/analytics/revenue", dependencies=[Depends(require_roles("admin"))])
async def revenue_series(days: int = 7):
    start = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)
    orders = await db.orders.find({"created_at": {"$gte": start.isoformat()}}, {"_id": 0}).to_list(5000)
    buckets: Dict[str, float] = {}
    for d in range(days):
        key = (start + timedelta(days=d)).strftime("%Y-%m-%d")
        buckets[key] = 0
    for o in orders:
        if o["status"] == "cancelled": continue
        day_key = o["created_at"][:10]
        if day_key in buckets:
            buckets[day_key] += o["total"]
    series = [{"date": k, "revenue": round(v, 2)} for k, v in buckets.items()]
    return {"series": series}

@app.get("/api/analytics/customers", dependencies=[Depends(require_roles("admin"))])
async def customer_analytics():
    orders = await db.orders.find({}, {"_id": 0}).to_list(5000)
    by_customer: Dict[str, Dict[str, Any]] = {}
    for o in orders:
        name = o.get("customer_name", "Guest")
        e = by_customer.setdefault(name, {"name": name, "orders": 0, "revenue": 0})
        e["orders"] += 1
        e["revenue"] += o["total"]
    top = sorted(by_customer.values(), key=lambda x: x["revenue"], reverse=True)[:10]
    total_customers = len(by_customer)
    repeat = sum(1 for v in by_customer.values() if v["orders"] > 1)
    return {
        "total_customers": total_customers,
        "repeat_customers": repeat,
        "repeat_rate": round((repeat / total_customers) * 100, 1) if total_customers else 0,
        "top_customers": top,
    }

# =========================================================
# Notifications
# =========================================================
@app.get("/api/notifications")
async def list_notifications(order_id: Optional[str] = None, limit: int = 50):
    q: Dict[str, Any] = {}
    if order_id: q["order_id"] = order_id
    docs = await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"notifications": docs}

# =========================================================
# Payment — Stripe Checkout (real) with mock fallback toggle
# =========================================================
class PaymentReq(BaseModel):
    amount: float
    method: str = "mock_card"
    card_last4: Optional[str] = None

class CheckoutSessionReq(BaseModel):
    order_draft: OrderCreateReq          # what user wants to order
    origin_url: str                      # frontend window.location.origin

@app.post("/api/payment/intent")
async def payment_intent(req: PaymentReq):
    """Legacy mock payment kept for tests / fallback."""
    await asyncio.sleep(0.3)
    return {
        "intent_id": f"pi_mock_{uuid.uuid4().hex[:16]}",
        "status": "succeeded",
        "amount": req.amount,
        "method": req.method,
        "card_last4": req.card_last4 or "4242",
        "captured_at": now_iso(),
    }

@app.get("/api/payment/config")
async def payment_config():
    return {"stripe_enabled": STRIPE_ENABLED, "provider": "stripe" if STRIPE_ENABLED else "mock"}

async def _validate_and_price_draft(req_draft: OrderCreateReq) -> Dict[str, Any]:
    """Validate items against current menu and recompute trusted totals server-side."""
    if not req_draft.items:
        raise HTTPException(status_code=400, detail="Empty cart")
    trusted_subtotal = 0.0
    trusted_items: List[Dict[str, Any]] = []
    for line in req_draft.items:
        m = await db.menu.find_one({"id": line.item_id}, {"_id": 0})
        if not m:
            raise HTTPException(status_code=400, detail=f"Unknown item {line.item_id}")
        if not m.get("available", True):
            raise HTTPException(status_code=400, detail=f"{m['name']} is not available")
        trusted_subtotal += float(m["price"]) * int(line.qty)
        item_doc = {"item_id": m["id"], "name": m["name"], "price": float(m["price"]), "qty": int(line.qty)}
        if line.notes:
            item_doc["notes"] = line.notes.strip()[:300]
        trusted_items.append(item_doc)
    trusted_tax = round(trusted_subtotal * TAX_RATE, 2)
    trusted_total = round(trusted_subtotal + trusted_tax, 2)
    return {"items": trusted_items, "subtotal": trusted_subtotal, "tax": trusted_tax, "total": trusted_total}

async def _save_order_draft(req_draft: OrderCreateReq, priced: Dict[str, Any]) -> str:
    """Persist a pending-payment draft and return its id."""
    draft_id = str(uuid.uuid4())
    customer = await _find_or_create_customer(req_draft.customer_name, req_draft.customer_phone)
    await db.order_drafts.insert_one({
        "id": draft_id,
        "customer_name": req_draft.customer_name,
        "customer_phone": req_draft.customer_phone,
        "customer_id": customer["id"],
        "customer_code": customer["code"],
        "items": priced["items"],
        "subtotal": priced["subtotal"],
        "tax": priced["tax"],
        "total": priced["total"],
        "payment_method": "stripe",
        "notes": req_draft.notes,
        "table_number": req_draft.table_number,
        "table_session_id": req_draft.table_session_id,
        "created_at": now_iso(),
    })
    return draft_id

async def _create_stripe_session(draft_id: str, total: float, customer_name: str, origin_url: str, base_url: str):
    """Create a real Stripe Checkout session and record the initial payment transaction."""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    success_url = f"{origin_url}/customer/payment-return?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/customer/cart"
    webhook_url = f"{base_url.rstrip('/')}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)

    checkoutrequest = CheckoutSessionRequest(
        amount=float(total),
        currency="inr",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"draft_id": draft_id, "customer_name": customer_name},
    )
    session = await stripe_checkout.create_checkout_session(checkoutrequest)
    await db.payment_transactions.insert_one({
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "draft_id": draft_id,
        "amount": total,
        "currency": "inr",
        "status": "initiated",
        "payment_status": "pending",
        "metadata": {"customer_name": customer_name},
        "created_at": now_iso(),
        "updated_at": now_iso(),
    })
    return session

@app.post("/api/payment/checkout/session")
async def create_checkout_session(req: CheckoutSessionReq, request: Request):
    """Create a Stripe Checkout session. Amount is computed server-side from the menu (prevents tampering)."""
    priced = await _validate_and_price_draft(req.order_draft)
    draft_id = await _save_order_draft(req.order_draft, priced)

    if not STRIPE_ENABLED:
        # MOCK MODE — instantly mark paid and create real order
        order = await _materialize_order_from_draft(draft_id, payment_method="mock_card", session_id=f"mock_{uuid.uuid4().hex[:12]}")
        return {"mode": "mock", "session_id": None, "url": None, "order_id": order["id"]}

    try:
        session = await _create_stripe_session(
            draft_id=draft_id,
            total=priced["total"],
            customer_name=req.order_draft.customer_name,
            origin_url=req.origin_url,
            base_url=str(request.base_url),
        )
        return {"mode": "stripe", "session_id": session.session_id, "url": session.url, "order_id": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe error: {e}")

def _customer_code() -> str:
    """Short, memorable, base-32 customer code: M-AB12CD."""
    import secrets
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusing 0/1/I/O
    return "M-" + "".join(secrets.choice(alphabet) for _ in range(6))

async def _find_or_create_customer(name: str, phone: Optional[str]) -> Dict[str, Any]:
    """Find a customer by phone (preferred) or by name. Create if missing. Returns the customer doc."""
    name_clean = (name or "").strip()
    phone_clean = (phone or "").strip() or None
    query: Optional[Dict[str, Any]] = None
    if phone_clean:
        query = {"phone": phone_clean}
    elif name_clean:
        query = {"name": name_clean, "phone": None}
    if query:
        existing = await db.customers.find_one(query, {"_id": 0})
        if existing:
            return existing
    # Create a new profile
    # Ensure unique code (collision space ~10^9, but defensive loop)
    code = _customer_code()
    while await db.customers.find_one({"code": code}):
        code = _customer_code()
    doc = {
        "id": str(uuid.uuid4()),
        "code": code,
        "name": name_clean or "Mehfil Guest",
        "phone": phone_clean,
        "points": 0,
        "lifetime_spend": 0.0,
        "orders_count": 0,
        "created_at": now_iso(),
        "last_order_at": None,
    }
    await db.customers.insert_one(doc)
    return doc

async def _on_order_paid(order: Dict[str, Any]) -> None:
    """Credit loyalty points + update customer aggregates. Called when an order materializes (i.e. paid)."""
    customer_id = order.get("customer_id")
    if not customer_id:
        return
    points_earned = int(order["total"] // 100)  # 1 point per ₹100 spent
    await db.customers.update_one(
        {"id": customer_id},
        {
            "$inc": {"points": points_earned, "orders_count": 1, "lifetime_spend": float(order["total"])},
            "$set": {"last_order_at": now_iso()},
        },
    )

async def _materialize_order_from_draft(draft_id: str, payment_method: str, session_id: Optional[str] = None) -> Dict[str, Any]:
    """Convert a draft into a real order with token (idempotent on draft_id)."""
    # Idempotent: if order already created for this draft, return existing
    existing = await db.orders.find_one({"draft_id": draft_id}, {"_id": 0})
    if existing:
        return existing
    draft = await db.order_drafts.find_one({"id": draft_id}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft order not found")
    token = await next_token()
    max_prep = 0
    for i in draft["items"]:
        m = await db.menu.find_one({"id": i["item_id"]}, {"prep_time_min": 1})
        if m: max_prep = max(max_prep, m.get("prep_time_min", 10))
    eta = (datetime.now(timezone.utc) + timedelta(minutes=max(max_prep, 8))).isoformat()
    order = {
        "id": str(uuid.uuid4()),
        "draft_id": draft_id,
        "token": token,
        "customer_name": draft["customer_name"],
        "customer_phone": draft.get("customer_phone"),
        "customer_id": draft.get("customer_id"),
        "customer_code": draft.get("customer_code"),
        "table_number": draft.get("table_number"),
        "table_session_id": draft.get("table_session_id"),
        "items": draft["items"],
        "subtotal": draft["subtotal"],
        "tax": draft["tax"],
        "total": draft["total"],
        "status": "confirmed",
        "created_at": now_iso(),
        "updated_at": now_iso(),
        "estimated_ready_at": eta,
        "payment_method": payment_method,
        "stripe_session_id": session_id,
        "notes": draft.get("notes"),
    }
    await db.orders.insert_one(order)
    await _on_order_paid(order)
    await db.notifications.insert_one({
        "id": str(uuid.uuid4()),
        "order_id": order["id"],
        "type": "order_update",
        "title": f"Order {token} confirmed",
        "body": f"Estimated ready in ~{max(max_prep, 8)} min.",
        "read": False,
        "created_at": now_iso(),
    })
    return order

@app.get("/api/payment/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request):
    """Frontend polls this after Stripe redirect. Idempotently materializes the order on first 'paid' read."""
    if not STRIPE_ENABLED:
        raise HTTPException(status_code=400, detail="Stripe not enabled")
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(status_code=404, detail="Unknown session")

    status_obj = None
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        status_obj = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe status error: {e}")
    if status_obj is None:
        raise HTTPException(status_code=500, detail="Stripe status unavailable")

    new_payment_status = status_obj.payment_status
    new_status = status_obj.status
    update = {"payment_status": new_payment_status, "status": new_status, "updated_at": now_iso()}
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    order_id = None
    if new_payment_status == "paid" and tx.get("payment_status") != "paid":
        order = await _materialize_order_from_draft(tx["draft_id"], payment_method="stripe", session_id=session_id)
        order_id = order["id"]
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"order_id": order_id}})
    elif tx.get("order_id"):
        order_id = tx["order_id"]

    return {
        "session_id": session_id,
        "status": new_status,
        "payment_status": new_payment_status,
        "amount_total": status_obj.amount_total,
        "currency": status_obj.currency,
        "order_id": order_id,
    }

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_ENABLED:
        return {"ok": True, "skipped": "stripe disabled"}
    try:
        from emergentintegrations.payments.stripe.checkout import StripeCheckout
        body = await request.body()
        sig = request.headers.get("Stripe-Signature", "")
        webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
        stripe_checkout = StripeCheckout(api_key=STRIPE_API_KEY, webhook_url=webhook_url)
        evt = await stripe_checkout.handle_webhook(body, sig)
        if evt.payment_status == "paid":
            tx = await db.payment_transactions.find_one({"session_id": evt.session_id}, {"_id": 0})
            if tx and tx.get("payment_status") != "paid":
                await db.payment_transactions.update_one(
                    {"session_id": evt.session_id},
                    {"$set": {"payment_status": "paid", "status": "complete", "updated_at": now_iso()}}
                )
                await _materialize_order_from_draft(tx["draft_id"], payment_method="stripe", session_id=evt.session_id)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}

# =========================================================
# AI Waiter — Streaming SSE via emergentintegrations + Claude Sonnet
# =========================================================
async def _build_waiter_system_prompt(language: str = "auto", tone: str = "friendly") -> str:
    """Compose the system prompt with the current live menu inlined."""
    menu_docs = await db.menu.find(
        {"available": True},
        {"_id": 0, "name": 1, "description": 1, "price": 1, "category": 1, "tags": 1},
    ).to_list(60)
    menu_block = "\n".join(
        f"- {m['name']} ({m['category']}) — ₹{int(m['price'])}: {m['description']}"
        + (f" [tags: {', '.join(m.get('tags') or [])}]" if m.get('tags') else "")
        for m in menu_docs
    )

    # Category summary for quick reference
    categories = {}
    for m in menu_docs:
        cat = m['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(f"{m['name']} (₹{int(m['price'])})")
    cat_summary = "\n".join(f"  {cat}: {', '.join(items)}" for cat, items in categories.items())

    lang_map = {
        "auto":  "Detect the guest's language from their message and reply in the SAME language completely. If they mix Hindi/Urdu and English (Hinglish), reply in matching natural Hinglish. If they speak Telugu, Hindi, Urdu, Arabic, or Spanish, respond COMPLETELY in that language. Do not mention that you are switching languages.",
        "en":    "Always reply in warm, slightly poetic English.",
        "hi":    "Always reply in Hindi (हिन्दी, Devanagari script). Use respectful 'aap'. Keep dish names in their original English form so they match the menu.",
        "ur":    "Always reply in Urdu (اردو, Nastaliq script). Use respectful 'aap'. Keep dish names in their original English form.",
        "te":    "Always reply in Telugu (తెలుగు script). Keep dish names in their original English form.",
        "ta":    "Always reply in Tamil (தமிழ் script). Keep dish names in their original English form.",
        "mr":    "Always reply in Marathi (मराठी, Devanagari script). Keep dish names in their original English form.",
    }
    tone_map = {
        "friendly":  "Warm, attentive, like a beloved family waiter who remembers your last visit. Sprinkle one tasteful Hyderabadi word per reply ('aadab', 'shukriya', 'subhanallah', 'wallah').",
        "formal":    "Refined, restrained, like a Taj concierge. Address the guest as 'sir' or 'madam'.",
        "playful":   "Playful, lightly teasing, like a young brother who knows the menu by heart. Use one tasteful pun where it fits.",
        "poetic":    "Speak in lyrical, Urdu-flavoured English — short shayari-style cadences. Compare flavours to memories.",
    }
    lang_rule = lang_map.get(language, lang_map["auto"])
    tone_rule = tone_map.get(tone, tone_map["friendly"])

    return (
        "You are 'SmartDine AI Waiter' — the elite, professional, deeply hospitable live waiter at Mehfil Restaurant, Hyderabad. "
        "Your primary goal is to guide guests through a seamless, delightful conversational dining experience from greeting to payment."
        "\n\n### 1. CORE OPERATIONAL RULES"
        "\n- **Role Consistency:** You are a human-like professional waiter on shift. NEVER break character, refer to yourself as an AI language model, or discuss your underlying technical stack. You are a real person serving guests."
        "\n- **Brevity & Voice-First Design:** Keep responses concise, warm, and highly scannable (1–3 sentences max per turn). Long blocks of text kill the restaurant vibe. Vary your openings — never start two replies the same way."
        "\n- **Multilingual Fluidity:** Seamlessly mirror the user's language. " + lang_rule
        + "\n- **Tone:** " + tone_rule
        + "\n\n### 2. THE CUSTOMER JOURNEY"
        "\n\n**Phase A — Welcome & Discovery:**"
        "\n- Greet the guest warmly: 'Welcome to Mehfil Exclusive!'"
        "\n- If they are undecided, gently ask ONE clarifying question per turn (Veg/Non-Veg, spice tolerance, group size, budget)."
        "\n- Never bombard with multiple questions at once."
        "\n\n**Phase B — Recommendations & Smart Upselling:**"
        "\n- Provide highly contextual recommendations ONLY from the live menu below."
        "\n- When they ask for a category (e.g. 'show me starters'), recommend 2-4 best dishes from that category with prices."
        "\n- Use natural social proof for upselling: 'Our Chicken Dum Biryani pairs beautifully with the Apollo Fish — would you like me to add a half portion?'"
        "\n- RESPECT BUDGETS strictly. If a guest says 'combo under ₹500', ensure your suggestions total less than that."
        "\n- When suggesting dishes, ALWAYS end your message with a hidden recommendation block on its own last line in this EXACT format: "
        "<recommend>Dish Name 1|Dish Name 2</recommend>"
        "\n- Use 1–4 EXACT dish names copied verbatim from the menu (English spelling)."
        "\n- Omit the recommend tag if not recommending (just chit-chat). Never describe or apologise for it — guests don't see it."
        "\n\n**Phase C — Cart Management & Order Placement:**"
        "\n- When a guest decides on a dish ('Give me spicy chicken biryani'), acknowledge warmly and confirm customization (e.g. 'With extra raita?')."
        "\n- Before finalizing, read back a quick summary of everything ordered."
        "\n\n**Phase D — Handoff to Payment & Token:**"
        "\n- When the guest says 'That's all' or 'Bill please,' summarize the final order with total price."
        "\n- Prompt them to choose payment: UPI, PhonePe, Google Pay, Razorpay, Visa/Master, or Pay at Counter."
        "\n- After payment, let them know their digital token and real-time tracker are active."
        "\n\n### 3. GUARDRAILS"
        "\n- FORBIDDEN: Do not invent dishes, prices, calories or allergens not in the menu."
        "\n- FORBIDDEN: Do not break character. Do not say you are an AI or language model."
        "\n- If a guest asks something spicy or vague, offer 2 concrete options (one veg, one non-veg) instead of asking follow-up questions."
        "\n- **Out of Bounds:** If a guest asks non-restaurant questions (weather, coding, etc.), redirect gracefully: 'I wish I could help with that, but my expertise is making sure you have an incredible meal tonight! Can I get you started with an appetizer?'"
        "\n- Use natural waiter fillers: 'of course', 'right away', 'good choice', 'bilkul', 'ji haan'. Mirror the guest's energy."
        "\n- If the guest already has items in their tray and asks for pairings, suggest dishes that complement what they have."
        f"\n\n### 4. LIVE MENU (recommend ONLY from these — always up-to-date)"
        f"\n\nCATEGORY OVERVIEW:\n{cat_summary}"
        f"\n\nFULL MENU DETAILS:\n{menu_block}"
    )

def _make_waiter_stream(session_id: str, message: str, system_prompt: str):
    """Return an async generator that yields SSE 'data:' lines for the chat reply."""
    async def event_gen():
        try:
            import google.generativeai as genai
            import asyncio
            import queue
            import threading

            genai.configure(api_key=GEMINI_API_KEY)
            
            # Fetch history to maintain context
            history_docs = await db.chat_messages.find({"session_id": session_id}).sort("created_at", 1).to_list(50)
            history = []
            for doc in history_docs:
                role = "user" if doc["role"] == "user" else "model"
                history.append({"role": role, "parts": [doc["content"]]})
                
            model = genai.GenerativeModel(
                model_name="gemini-2.0-flash", 
                system_instruction=system_prompt
            )
            chat = model.start_chat(history=history)
            
            # Use a queue to bridge sync streaming → async generator
            q: queue.Queue = queue.Queue()
            SENTINEL = object()

            def _stream_in_thread():
                try:
                    response = chat.send_message(message, stream=True)
                    for chunk in response:
                        if chunk.text:
                            q.put(chunk.text)
                except Exception as e:
                    q.put(e)
                finally:
                    q.put(SENTINEL)

            thread = threading.Thread(target=_stream_in_thread, daemon=True)
            thread.start()

            full = ""
            while True:
                # Non-blocking poll so we don't freeze the event loop
                try:
                    item = await asyncio.to_thread(q.get, timeout=30)
                except Exception:
                    break
                if item is SENTINEL:
                    break
                if isinstance(item, Exception):
                    yield f"data: {json.dumps({'error': str(item)})}\n\n"
                    return
                full += item
                yield f"data: {json.dumps({'delta': item})}\n\n"
                    
            await db.chat_messages.insert_one({
                "session_id": session_id, "role": "assistant", "content": full, "created_at": now_iso(),
            })
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    return event_gen

@app.post("/api/ai-waiter/chat")
async def ai_waiter(req: ChatReq):
    """Streams Gemini's response as SSE. Session-scoped chat history maintained server-side."""
    if not GEMINI_API_KEY:
        async def mock_event_gen():
            mock_text = "I'm currently operating in offline demo mode since my Gemini brain is disconnected. I can still take your order manually from the menu!"
            yield f"data: {json.dumps({'delta': mock_text})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        return StreamingResponse(
            mock_event_gen(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
        )

    system_prompt = await _build_waiter_system_prompt(language=req.language or "auto", tone=req.tone or "friendly")
    await db.chat_messages.insert_one({
        "session_id": req.session_id, "role": "user", "content": req.message, "created_at": now_iso(),
    })

    event_gen = _make_waiter_stream(req.session_id, req.message, system_prompt)
    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )

@app.get("/api/ai-waiter/history")
async def ai_history(session_id: str):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"messages": msgs}

# ---------- Speech-to-Text (Whisper) ----------
@app.post("/api/ai-waiter/transcribe")
async def ai_transcribe(file: UploadFile = File(...), language: str = Form("")):
    """Transcribe a user's spoken audio (webm/wav/mp3) to text via Gemini 1.5 Flash."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY missing")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio")
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio too large (max 20MB)")
    try:
        import google.generativeai as genai
        import asyncio
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = "You are an expert transcriber. Transcribe the following audio exactly as spoken. Do not add any extra text, translation, or commentary."
        if language and language.strip() and language.strip() != "auto":
            prompt += f" The expected language might be {language}."
            
        response = await asyncio.to_thread(
            model.generate_content,
            [prompt, {"mime_type": file.content_type or "audio/webm", "data": raw}]
        )
        text = response.text.strip() if response and response.text else ""
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")

# ---------- Text-to-Speech (TTS) ----------
class TTSReq(BaseModel):
    text: str
    voice: str = "nova"

@app.post("/api/ai-waiter/speak")
async def ai_speak(req: TTSReq):
    """Convert MehfilAI text to mp3 audio via edge-tts."""
    clean_text = req.text.strip()[:4000]
    if not clean_text:
        raise HTTPException(status_code=400, detail="Empty text")
    try:
        import edge_tts
        # Neerja is a warm Indian female English voice that handles Hinglish well.
        voice = "en-IN-NeerjaNeural" 
        communicate = edge_tts.Communicate(clean_text, voice)
        
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
                
        return Response(content=bytes(audio_data), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")

# =========================================================
# Reservations
# =========================================================
class ReservationReq(BaseModel):
    name: str
    phone: str
    date: str   # YYYY-MM-DD
    time: str   # HH:MM
    guests: int
    notes: Optional[str] = None

@app.post("/api/reservations")
async def create_reservation(req: ReservationReq):
    if req.guests < 1 or req.guests > 30:
        raise HTTPException(status_code=400, detail="Guests must be between 1 and 30")
    doc = {
        "id": str(uuid.uuid4()),
        "name": req.name.strip(),
        "phone": req.phone.strip(),
        "date": req.date,
        "time": req.time,
        "guests": req.guests,
        "notes": (req.notes or "").strip() or None,
        "status": "requested",
        "created_at": now_iso(),
    }
    await db.reservations.insert_one(doc)
    return {"ok": True, "reservation_id": doc["id"], "status": "requested"}

@app.get("/api/reservations", dependencies=[Depends(require_roles("admin"))])
async def list_reservations(limit: int = 100):
    docs = await db.reservations.find({}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    return {"reservations": docs}

@app.get("/api/reservations/today")
async def reservations_today():
    """Today's reservations (kitchen + counter can read without admin token)."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    docs = await db.reservations.find(
        {"date": today, "status": {"$ne": "cancelled"}},
        {"_id": 0},
    ).sort("time", 1).to_list(200)
    return {"reservations": docs}

@app.patch("/api/reservations/{res_id}/status", dependencies=[Depends(require_roles("admin"))])
async def update_reservation_status(res_id: str, body: ReservationStatusUpdate):
    allowed = {"requested", "confirmed", "seated", "cancelled"}
    if body.status not in allowed:
        raise HTTPException(status_code=400, detail=f"status must be one of {sorted(allowed)}")
    update_doc: Dict[str, Any] = {"status": body.status, "updated_at": now_iso()}
    if body.note is not None:
        update_doc["admin_note"] = body.note.strip()
    res = await db.reservations.update_one({"id": res_id}, {"$set": update_doc})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    doc = await db.reservations.find_one({"id": res_id}, {"_id": 0})
    return {"ok": True, "reservation": doc}

# =========================================================
# Customer directory & loyalty
# =========================================================
@app.get("/api/customers", dependencies=[Depends(require_roles("admin"))])
async def list_customers(limit: int = 500):
    """Full customer directory with loyalty stats."""
    docs = await db.customers.find({}, {"_id": 0}).sort("last_order_at", -1).limit(limit).to_list(limit)
    return {"customers": docs}

class CustomerLookupReq(BaseModel):
    phone: Optional[str] = None
    name: Optional[str] = None

class TableModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int
    capacity: int = 4
    qr_token: str = Field(default_factory=lambda: uuid.uuid4().hex[:12])
    is_active: bool = True
    created_at: str = Field(default_factory=now_iso)

class TableScanReq(BaseModel):
    qr_token: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None

@app.post("/api/customers/lookup")
async def lookup_customer(req: CustomerLookupReq):
    """Public: look up an existing customer by phone or name (used by checkout to surface loyalty)."""
    phone = (req.phone or "").strip() or None
    name = (req.name or "").strip() or None
    q: Optional[Dict[str, Any]] = None
    if phone:
        q = {"phone": phone}
    elif name:
        q = {"name": name}
    if not q:
        return {"customer": None}
    doc = await db.customers.find_one(q, {"_id": 0})
    return {"customer": doc}

# =========================================================
# Tables, QR codes & live table sessions (10-min hold)
# =========================================================
TABLE_SESSION_TTL_SECONDS = 10 * 60

@app.get("/api/tables", dependencies=[Depends(require_roles("admin"))])
async def list_tables():
    """List all tables (admin)."""
    docs = await db.tables.find({}, {"_id": 0}).sort("number", 1).to_list(500)
    # Attach current live session info if any
    out: List[Dict[str, Any]] = []
    now = datetime.now(timezone.utc)
    for t in docs:
        sess = await db.table_sessions.find_one({"table_id": t["id"], "status": "live"}, {"_id": 0})
        live = None
        if sess:
            exp = datetime.fromisoformat(sess["expires_at"].replace("Z", "+00:00"))
            if exp > now:
                live = {"id": sess["id"], "expires_at": sess["expires_at"], "customer_name": sess.get("customer_name")}
            else:
                # Auto-expire stale session
                await db.table_sessions.update_one({"id": sess["id"]}, {"$set": {"status": "expired"}})
        out.append({**t, "live_session": live})
    return {"tables": out}

@app.post("/api/tables", dependencies=[Depends(require_roles("admin"))])
async def create_table(payload: TableModel):
    if payload.number <= 0:
        raise HTTPException(status_code=400, detail="Table number must be positive")
    exists = await db.tables.find_one({"number": payload.number})
    if exists:
        raise HTTPException(status_code=400, detail=f"Table {payload.number} already exists")
    doc = payload.model_dump()
    await db.tables.insert_one(doc)
    return doc

@app.delete("/api/tables/{table_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_table(table_id: str):
    await db.tables.delete_one({"id": table_id})
    await db.table_sessions.delete_many({"table_id": table_id})
    return {"ok": True}

@app.post("/api/tables/{table_id}/regenerate-qr", dependencies=[Depends(require_roles("admin"))])
async def regenerate_table_qr(table_id: str):
    new_token = uuid.uuid4().hex[:12]
    res = await db.tables.update_one({"id": table_id}, {"$set": {"qr_token": new_token}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"qr_token": new_token}

@app.post("/api/tables/scan")
async def scan_table(req: TableScanReq):
    """Public: a guest scanned the QR. Returns table info + starts/refreshes a 10-min live session."""
    token = (req.qr_token or "").strip()
    if not token:
        raise HTTPException(status_code=400, detail="qr_token required")
    table = await db.tables.find_one({"qr_token": token, "is_active": True}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Invalid or inactive table QR")
    now = datetime.now(timezone.utc)
    expires_at = (now + timedelta(seconds=TABLE_SESSION_TTL_SECONDS)).isoformat()
    # Reuse an existing live session if still valid; otherwise create a fresh one
    existing = await db.table_sessions.find_one({"table_id": table["id"], "status": "live"}, {"_id": 0})
    if existing:
        try:
            old_exp = datetime.fromisoformat(existing["expires_at"].replace("Z", "+00:00"))
        except Exception:
            old_exp = now
        if old_exp > now:
            # Refresh the 10-min hold on each scan
            await db.table_sessions.update_one(
                {"id": existing["id"]},
                {"$set": {
                    "expires_at": expires_at,
                    "customer_name": (req.customer_name or existing.get("customer_name") or "").strip() or None,
                    "customer_phone": (req.customer_phone or existing.get("customer_phone") or "").strip() or None,
                    "last_scan_at": now.isoformat(),
                }},
            )
            existing.update({"expires_at": expires_at})
            return {"table": table, "session": existing}
        # else fall through to create new
        await db.table_sessions.update_one({"id": existing["id"]}, {"$set": {"status": "expired"}})

    session = {
        "id": str(uuid.uuid4()),
        "table_id": table["id"],
        "table_number": table["number"],
        "started_at": now.isoformat(),
        "expires_at": expires_at,
        "last_scan_at": now.isoformat(),
        "status": "live",
        "customer_name": (req.customer_name or "").strip() or None,
        "customer_phone": (req.customer_phone or "").strip() or None,
    }
    await db.table_sessions.insert_one(session)
    return {"table": table, "session": session}

@app.get("/api/tables/session/{session_id}")
async def get_table_session(session_id: str):
    """Public: query a session's status — frontend uses this to count down."""
    sess = await db.table_sessions.find_one({"id": session_id}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=404, detail="Session not found")
    now = datetime.now(timezone.utc)
    try:
        exp = datetime.fromisoformat(sess["expires_at"].replace("Z", "+00:00"))
    except Exception:
        exp = now
    if sess["status"] == "live" and exp <= now:
        await db.table_sessions.update_one({"id": session_id}, {"$set": {"status": "expired"}})
        sess["status"] = "expired"
    return {"session": sess}

# =========================================================
# Web Push notifications (VAPID)
# =========================================================
VAPID_PUBLIC_KEY = os.environ.get("VAPID_PUBLIC_KEY", "")
VAPID_PRIVATE_KEY = os.environ.get("VAPID_PRIVATE_KEY", "")
VAPID_CONTACT = os.environ.get("VAPID_CONTACT", "mailto:hello@mehfil.in")

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    order_id: Optional[str] = None  # so we know which order to ping for

@app.get("/api/push/vapid-public-key")
async def push_vapid_public_key():
    return {"key": VAPID_PUBLIC_KEY}

@app.post("/api/push/subscribe")
async def push_subscribe(sub: PushSubscription):
    if not sub.endpoint or "auth" not in sub.keys or "p256dh" not in sub.keys:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    doc = {
        "id": str(uuid.uuid4()),
        "endpoint": sub.endpoint,
        "keys": sub.keys,
        "order_id": sub.order_id,
        "created_at": now_iso(),
    }
    # Upsert by endpoint+order_id so we don't double-send
    await db.push_subscriptions.update_one(
        {"endpoint": sub.endpoint, "order_id": sub.order_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}

async def send_push_to_order(order_id: str, title: str, body: str, data: Optional[Dict[str, Any]] = None) -> Dict[str, int]:
    """Send a Web Push to every subscriber registered for this order. Cleans up expired endpoints."""
    if not VAPID_PRIVATE_KEY:
        return {"sent": 0, "removed": 0, "skipped": True}
    try:
        from pywebpush import webpush, WebPushException  # type: ignore
    except ImportError:
        return {"sent": 0, "removed": 0, "skipped": True}

    subs = await db.push_subscriptions.find({"order_id": order_id}, {"_id": 0}).to_list(500)
    payload = json.dumps({"title": title, "body": body, "data": data or {}, "order_id": order_id})
    sent = 0
    removed = 0
    for s in subs:
        try:
            webpush(
                subscription_info={"endpoint": s["endpoint"], "keys": s["keys"]},
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims={"sub": VAPID_CONTACT},
            )
            sent += 1
        except WebPushException as e:
            # 404/410 — endpoint dead; remove
            code = getattr(getattr(e, "response", None), "status_code", 0)
            if code in (404, 410):
                await db.push_subscriptions.delete_one({"endpoint": s["endpoint"]})
                removed += 1
        except Exception:
            # Network or other transient — leave subscription in place
            pass
    return {"sent": sent, "removed": removed}

@app.post("/api/push/test/{order_id}")
async def push_test(order_id: str):
    """Dev helper: fire a test push to all subscribers of this order."""
    result = await send_push_to_order(order_id, "Mehfil test", "Push is alive and well 🌹", {"test": True})
    return result
