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

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI") or "mongodb://localhost:27017/dinesmart_test"
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

def get_gemini_models(client) -> list[str]:
    """Dynamically discover available Gemini models via client.models.list(),
    falling back to standard flash and pro models if discovery fails."""
    discovered = []
    try:
        for m in client.models.list():
            actions = getattr(m, "supported_actions", []) or getattr(m, "supported_generation_methods", [])
            if not actions or any("generate" in str(a).lower() for a in actions):
                name = getattr(m, "name", "")
                if name:
                    clean = name.replace("models/", "")
                    if "gemini" in clean.lower() and not any(x in clean.lower() for x in ["vision", "embedding", "aqa", "imagen", "tts", "learn"]):
                        if clean not in discovered:
                            discovered.append(clean)
    except Exception as e:
        print(f"[Gemini] Dynamic model listing failed: {e}")

    fallbacks = [
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-3-flash",
        "gemini-3.1-flash",
        "gemini-2.0-flash",
        "gemini-2.0-flash-001",
        "gemini-2.0-flash-lite",
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-flash-002",
        "gemini-1.5-flash-8b",
        "gemini-1.5-pro",
        "gemini-1.5-pro-latest",
        "gemini-1.5-pro-001",
        "gemini-1.5-pro-002",
    ]
    # Prioritize preferred high-capacity models with 1M+ context windows for multi-page document OCR
    result = []
    for f in fallbacks:
        result.append(f)
    for d in discovered:
        if d not in result:
            result.append(d)
    return result


# MongoDB
kwargs = {}
if "localhost" not in MONGO_URL and "127.0.0.1" not in MONGO_URL:
    kwargs["tls"] = True
    kwargs["tlsCAFile"] = certifi.where()

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=30000, **kwargs)
db = client[DB_NAME]

# Redis
import redis.asyncio as redis
REDIS_URL = os.environ.get("REDIS_URL", "")
redis_client: Optional[redis.Redis] = None
if REDIS_URL:
    try:
        redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
    except Exception as e:
        print(f"[deps] Redis init failed: {e}")

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
        
    role = user.get("role")
    rid = user.get("restaurant_id")
    
    if role != "superadmin" and rid:
        from deps import db
        restaurant = await db.restaurants.find_one({"id": rid}, {"subscription_status": 1, "trial_ends_at": 1})
        if not restaurant:
            raise HTTPException(status_code=403, detail="Restaurant not found or deleted")
            
        status = restaurant.get("subscription_status")
        if status == "suspended":
            raise HTTPException(status_code=403, detail="Restaurant is suspended")
            
        if status == "trial":
            trial_ends_at = restaurant.get("trial_ends_at")
            if trial_ends_at:
                if isinstance(trial_ends_at, str):
                    try:
                        trial_ends_at = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
                    except ValueError:
                        pass
                
                if isinstance(trial_ends_at, datetime):
                    if trial_ends_at.tzinfo is None:
                        trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
                    if datetime.now(timezone.utc) > trial_ends_at:
                        raise HTTPException(status_code=403, detail="Trial period has expired. Please upgrade your plan.")
                        
    return user

def require_roles(*roles: str):
    async def dep(user=Depends(require_user)):
        role = user.get("role")
        # Superadmin bypasses all role/restaurant checks
        if role == "superadmin":
            return user
        if role not in roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        
        rid = user.get("restaurant_id")
        if not rid:
            raise HTTPException(status_code=403, detail="No restaurant assigned to this account")
            
        # Restaurant validation is now handled in require_user
        
        return user
    return dep

def require_restaurant_id(user=Depends(require_user)) -> str:
    """Extract mandatory restaurant_id from user token. Raises 403 if missing."""
    rid = user.get("restaurant_id")
    if not rid:
        raise HTTPException(status_code=403, detail="No restaurant assigned to this account")
    return rid

async def require_superadmin(user=Depends(require_user)):
    """Dependency that ensures the caller has the superadmin role."""
    if user.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Superadmin access required")
    return user

# =========================================================
# Pydantic Models
# =========================================================
class RestaurantUpdateReq(BaseModel):
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    admin_notes: Optional[str] = None

class RestaurantModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str
    owner_email: str
    owner_name: Optional[str] = None
    owner_phone: Optional[str] = None
    owner_whatsapp: Optional[str] = None
    admin_notes: Optional[str] = None
    subscription_status: str = "trial"
    plan_tier: str = "starter"
    trial_ends_at: Optional[datetime] = Field(default_factory=lambda: datetime.now(timezone.utc) + timedelta(days=14))
    is_verified: bool = False
    sandbox_mode: bool = True
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    service_type: str = "fine_dining"
    session_duration_minutes: int = 20
    high_value_threshold: float = 2500.0
    geo_fencing_enabled: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def check_pro_access(restaurant: dict) -> bool:
    """Check if a restaurant has access to Pro features."""
    if not restaurant:
        return False
        
    plan_tier = restaurant.get("plan_tier", "starter")
    if plan_tier in ["pro", "enterprise"]:
        return True
        
    sub_status = restaurant.get("subscription_status")
    if sub_status == "trial":
        trial_ends_at = restaurant.get("trial_ends_at")
        if trial_ends_at:
            if isinstance(trial_ends_at, str):
                try:
                    trial_ends_at = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
                except ValueError:
                    return False
            # Ensure aware datetime
            if trial_ends_at.tzinfo is None:
                trial_ends_at = trial_ends_at.replace(tzinfo=timezone.utc)
            if trial_ends_at > datetime.now(timezone.utc):
                return True
    return False

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
    round_number: Optional[int] = None
    item_status: Optional[str] = None
    is_ai_upsell: Optional[bool] = False

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
    device_id: Optional[str] = None
    table_pin: Optional[str] = None
    pay_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class OrderStatusUpdate(BaseModel):
    status: Optional[str] = None
    payment_status: Optional[str] = None
    bill_requested: Optional[bool] = None

class ItemStatusUpdate(BaseModel):
    item_status: str
    pay_code: Optional[str] = None
    override_reason: Optional[str] = None
    utr_number: Optional[str] = None

class InventoryItemModel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    restaurant_id: Optional[str] = None
    name: str
    category: Optional[str] = None
    supplier: Optional[str] = None
    unit: str
    qty: float
    reorder_level: float

class InventoryItemUpdateModel(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    supplier: Optional[str] = None
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
    service_type: Optional[str] = "fine_dining"
    
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
    service_type: Optional[str] = None
    session_duration_minutes: Optional[int] = None
    high_value_threshold: Optional[float] = None
    geo_fencing_enabled: Optional[bool] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

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
    restaurant_id: Optional[str] = None
    device_id: Optional[str] = None

class EventRequest(BaseModel):
    event: str
    device_id: str
    current_cart: Optional[List[Dict[str, Any]]] = []
    restaurant_id: Optional[str] = None
    session_id: Optional[str] = None

class PushBroadcastReq(BaseModel):
    title: Optional[str] = "Mahika's Multi Cuisine"
    body: str
    url: Optional[str] = "/"
    restaurant_id: Optional[str] = None

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

class SplitPerson(BaseModel):
    name: str
    amount: float
    method: str  # cash / upi / card

class SplitBillReq(BaseModel):
    splits: List[SplitPerson]

class FeedbackSubmitReq(BaseModel):
    rating: int
    food_quality: Optional[int] = None
    service: Optional[int] = None
    ambience: Optional[int] = None
    suggestions: Optional[str] = None

# =========================================================
# Token generation (daily per-restaurant sequential token)
# =========================================================
async def next_token(restaurant_id: str = "", order_type: str = "dine_in") -> str:
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    prefix = "T" if order_type == "takeaway" else "D"
    counter_id = f"{restaurant_id or 'default'}_{prefix}_{today_str}"
    
    try:
        from pymongo import ReturnDocument
        res = await db.token_counters.find_one_and_update(
            {"_id": counter_id},
            {"$inc": {"seq": 1}},
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        seq_num = (res["seq"] if res and "seq" in res else 1) + 100
        return f"{prefix}-{seq_num}"
    except Exception as e:
        print(f"⚠️ Sequential token generation fallback: {e}", flush=True)
        suffix = uuid.uuid4().hex[:4].upper()
        return f"{prefix}-{suffix}"

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
