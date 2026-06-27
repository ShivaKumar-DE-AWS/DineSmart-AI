"""Shared dependencies, database connection, auth helpers, and Pydantic models."""
from __future__ import annotations
import os
import asyncio
import json
import uuid
import secrets
import re
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from pathlib import Path

from dotenv import load_dotenv
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field, EmailStr, field_validator
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
import jwt  # pyjwt
from passlib.hash import pbkdf2_sha256

# ponytail: password strength checking
try:
    from zxcvbn import zxcvbn
    HAS_ZXCVBN = True
except ImportError:
    HAS_ZXCVBN = False
    def zxcvbn(password: str, user_inputs=None) -> dict:
        return {"score": 3}  # permissive fallback

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
DB_NAME = os.environ.get("DB_NAME") or os.environ.get("MONGODB_DB_NAME") or "smartdine"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "")
if not JWT_SECRET:
    env = os.environ.get("ENVIRONMENT", "development").lower()
    if env in ("production", "prod", "staging", "stage"):
        raise RuntimeError(f"FATAL: JWT_SECRET environment variable is missing in {env}. Shutting down.")
    import warnings
    warnings.warn("JWT_SECRET env var not set — using insecure dev fallback. NEVER deploy without setting this.")
    JWT_SECRET = "smartdine-dev-secret-change-me"

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
# JWT helpers (using pyjwt)
# =========================================================
def jwt_sign(payload: Dict[str, Any], ttl_hours: int = 24 * 7) -> str:
    payload = {**payload, "exp": int((datetime.now(timezone.utc) + timedelta(hours=ttl_hours)).timestamp())}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def jwt_verify(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

# =========================================================
# Password helpers (using passlib)
# =========================================================
def hash_password(password: str, salt: Optional[str] = None) -> str:
    # ponytail: passlib handles salt generation and storage internally
    return pbkdf2_sha256.hash(password)

def verify_password(password: str, stored: str) -> bool:
    try:
        return pbkdf2_sha256.verify(password, stored)
    except Exception:
        return False

# =========================================================
# Auth dependencies
# =========================================================
bearer = HTTPBearer(auto_error=False)

async def current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer)) -> Optional[Dict[str, Any]]:
    if not creds:
        return None
    try:
        return jwt_verify(creds.credentials)
    except HTTPException:
        return None

async def require_user(user=Depends(current_user)) -> Dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

def require_roles(*roles: str):
    async def dep(user=Depends(require_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        if not user.get("restaurant_id"):
            raise HTTPException(status_code=403, detail="No restaurant assigned to this account")
        return user
    return dep

def require_restaurant_id(user=Depends(require_user)) -> str:
    """Extract mandatory restaurant_id from user token. Raises 403 if missing."""
    rid = user.get("restaurant_id")
    if not rid:
        raise HTTPException(status_code=403, detail="No restaurant assigned to this account")
    return rid

# =========================================================
# Pydantic Models
# =========================================================
class RestaurantModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    owner_email: str
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

    @field_validator("name", "description", "category")
    @classmethod
    def limit_length(cls, v: str) -> str:
        if len(v) > 500:
            raise ValueError(f"Field exceeds 500 character limit ({len(v)} chars)")
        return v

class MenuItemUpdateModel(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    available: Optional[bool] = None
    prep_time_min: Optional[int] = None
    tags: Optional[List[str]] = None
    recipe: Optional[List[RecipeIngredient]] = None

class CartItemModel(BaseModel):
    item_id: str
    name: str
    price: float
    qty: int = Field(ge=1, le=99)
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
    order_type: str = "dine_in"
    idempotency_key: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None

class InventoryItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: Optional[str] = None
    name: str
    unit: str
    qty: float
    reorder_level: float

class InventoryItemUpdateModel(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    qty: Optional[float] = None
    reorder_level: Optional[float] = None

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
    
    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        result = zxcvbn(v)
        if result["score"] < 3:
            raise ValueError("Password too weak. Use a mix of upper/lower case, numbers, and symbols.")
        return v

class LoginReq(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordReq(BaseModel):
    email: EmailStr

class ResetPasswordReq(BaseModel):
    token: str
    new_password: str
    
    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        result = zxcvbn(v)
        if result["score"] < 3:
            raise ValueError("Password too weak. Use a mix of upper/lower case, numbers, and symbols.")
        return v

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
    qr_token: Optional[str] = None
    table_number: Optional[str] = None
    restaurant_slug: Optional[str] = None
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
    upi_id: Optional[str] = None
    payment_qr_url: Optional[str] = None

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
# Token generation (daily per-restaurant sequential token)
# =========================================================
async def next_token(restaurant_id: str = "") -> str:
    # ponytail: UUID-based short token, no counter collection
    suffix = uuid.uuid4().hex[:4].upper()
    return f"A-{suffix}"

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
