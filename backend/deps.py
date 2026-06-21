"""Shared dependencies, database connection, auth helpers, and Pydantic models."""
from __future__ import annotations
import os
import asyncio
import json
import uuid
import hmac
import hashlib
import base64
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "smartdine-dev-secret-change-me")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
STRIPE_ENABLED = os.environ.get("STRIPE_ENABLED", "false").lower() == "true" and bool(STRIPE_API_KEY)

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# MongoDB
kwargs = {}
if "localhost" not in MONGO_URL and "127.0.0.1" not in MONGO_URL:
    kwargs["tls"] = True
    kwargs["tlsCAFile"] = certifi.where()

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=30000, **kwargs)
db = client[DB_NAME]

# =========================================================
# Time helpers
# =========================================================
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

TAX_RATE = 0.05

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

# =========================================================
# Password helpers
# =========================================================
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

# =========================================================
# Auth dependencies
# =========================================================
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
# Pydantic Models
# =========================================================
class RestaurantModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    owner_email: str
    stripe_customer_id: Optional[str] = None
    subscription_status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeIngredient(BaseModel):
    ingredient_id: str
    qty_required: float

class MenuItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: Optional[str] = None
    name: str
    description: str
    price: float
    category: str
    image_url: str
    available: bool = True
    prep_time_min: int = 10
    tags: List[str] = []
    recipe: List[RecipeIngredient] = []

class CartItemModel(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int
    notes: Optional[str] = None

class OrderCreateReq(BaseModel):
    restaurant_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    items: List[CartItemModel]
    payment_method: str = "mock_card"
    notes: Optional[str] = None
    table_number: Optional[int] = None
    table_session_id: Optional[str] = None
    is_ai: bool = False

class OrderStatusUpdate(BaseModel):
    status: str

class InventoryItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: Optional[str] = None
    name: str
    unit: str
    qty: float
    reorder_level: float

class ChatReq(BaseModel):
    session_id: str
    message: str
    restaurant_id: Optional[str] = None
    language: Optional[str] = "auto"
    tone: Optional[str] = "friendly"

class SignupReq(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "customer"
    restaurant_name: Optional[str] = None

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ReservationStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

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

class CustomerLookupReq(BaseModel):
    phone: Optional[str] = None
    name: Optional[str] = None

class SettingsUpdateReq(BaseModel):
    name: Optional[str] = None
    tagline: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    logo_url: Optional[str] = None

class StaffUpdateReq(BaseModel):
    id: Optional[str] = None
    role: str
    name: str
    password: Optional[str] = None

class PaymentReq(BaseModel):
    amount: float
    method: str = "mock_card"
    card_last4: Optional[str] = None

class CheckoutSessionReq(BaseModel):
    order_draft: OrderCreateReq
    origin_url: str

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]
    order_id: Optional[str] = None

class RestaurantRequestReq(BaseModel):
    name: str
    email: str
    phone: str
    tables_count: int = 10
    cuisine: str = ""
    notes: str = ""

class GuestReq(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class TTSReq(BaseModel):
    text: str
    voice: str = "nova"

# =========================================================
# Token generation (scoped per restaurant per day)
# =========================================================
async def next_token(restaurant_id: str = "") -> str:
    """Generate sequential daily token like A-001, A-002... scoped by restaurant."""
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    counter_key = f"token-{today}"
    if restaurant_id:
        counter_key = f"token-{restaurant_id}-{today}"
    counter = await db.counters.find_one_and_update(
        {"_id": counter_key},
        {"$inc": {"seq": 1}},
        upsert=True, return_document=True
    )
    seq = counter.get("seq", 1) if counter else 1
    return f"A-{seq:03d}"

def clean(doc: Dict[str, Any]) -> Dict[str, Any]:
    if doc and "_id" in doc:
        doc.pop("_id", None)
    return doc

# =========================================================
# Seed inventory constant
# =========================================================
SEED_INVENTORY = [
    {"name": "Basmati Rice", "unit": "kg", "qty": 50, "reorder_level": 10},
    {"name": "Chicken", "unit": "kg", "qty": 30, "reorder_level": 8},
    {"name": "Mutton", "unit": "kg", "qty": 20, "reorder_level": 5},
    {"name": "Paneer", "unit": "kg", "qty": 15, "reorder_level": 5},
    {"name": "Onions", "unit": "kg", "qty": 25, "reorder_level": 8},
    {"name": "Tomatoes", "unit": "kg", "qty": 20, "reorder_level": 6},
    {"name": "Cooking Oil", "unit": "L", "qty": 30, "reorder_level": 10},
    {"name": "Spice Mix (Garam Masala)", "unit": "kg", "qty": 5, "reorder_level": 1},
    {"name": "Garlic", "unit": "kg", "qty": 3, "reorder_level": 1},
    {"name": "Ginger", "unit": "kg", "qty": 3, "reorder_level": 1},
    {"name": "Fresh Herbs (Cilantro/Mint)", "unit": "kg", "qty": 4, "reorder_level": 1},
    {"name": "Dairy (Milk/Cream)", "unit": "L", "qty": 20, "reorder_level": 5},
    {"name": "Flour (Maida/Atta)", "unit": "kg", "qty": 25, "reorder_level": 8},
    {"name": "Sugar", "unit": "kg", "qty": 10, "reorder_level": 3},
    {"name": "Salt", "unit": "kg", "qty": 10, "reorder_level": 3},
]
