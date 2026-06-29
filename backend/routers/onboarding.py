"""Restaurant onboarding, sample menus, and config generation."""
import uuid
import random
import string
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, HTTPException, UploadFile, File
from deps import db, now_iso, require_user, require_roles, GEMINI_API_KEY, hash_password
from email_service import send_welcome_email

router = APIRouter(tags=["onboarding"])

# ponytail: sample menus moved here from admin.py to keep admin lean
SAMPLE_MENU_GENERIC = [
    {"name": "House Special Salad", "description": "Fresh garden salad with house dressing.", "price": 180, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian", "healthy"]},
    {"name": "Crispy Chicken Wings", "description": "Golden fried chicken wings with spicy dip.", "price": 280, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1608039829572-9b1e6a8ad40e?w=600&q=80", "prep_time_min": 12, "tags": ["bestseller"]},
    {"name": "Grilled Fish", "description": "Herb-crusted fish fillet with lemon butter sauce.", "price": 380, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1599084993091-1cb5c49e3b0b?w=600&q=80", "prep_time_min": 18, "tags": ["signature", "gluten-free"]},
    {"name": "Pasta Primavera", "description": "Seasonal vegetables in creamy garlic sauce.", "price": 320, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=600&q=80", "prep_time_min": 14, "tags": ["vegetarian"]},
    {"name": "Grilled Chicken Steak", "description": "Tender chicken breast with mushroom sauce.", "price": 340, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1432139549614-0e64e0a5c6c7?w=600&q=80", "prep_time_min": 16, "tags": ["bestseller"]},
    {"name": "Chocolate Lava Cake", "description": "Warm chocolate cake with molten center.", "price": 220, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=600&q=80", "prep_time_min": 12, "tags": ["signature"]},
    {"name": "Fresh Juice", "description": "Seasonal fresh fruit juice.", "price": 120, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&q=80", "prep_time_min": 5, "tags": ["refreshing"]},
    {"name": "Signature Dessert Platter", "description": "Assortment of house-made desserts.", "price": 280, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80", "prep_time_min": 10, "tags": ["bestseller", "sharing"]},
]

SAMPLE_MENU_INDIAN = [
    {"name": "Paneer Tikka", "description": "Chargrilled cottage cheese with bell peppers.", "price": 260, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80", "prep_time_min": 14, "tags": ["vegetarian", "bestseller"]},
    {"name": "Chicken Curry", "description": "Traditional spiced chicken curry.", "price": 320, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", "prep_time_min": 22, "tags": ["classic"]},
    {"name": "Dal Tadka", "description": "Yellow lentils tempered with cumin and garlic.", "price": 200, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80", "prep_time_min": 18, "tags": ["vegetarian", "comfort"]},
    {"name": "Biryani", "description": "Fragrant rice layered with spiced meat and saffron.", "price": 350, "category": "Rice & Biryani", "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&q=80", "prep_time_min": 25, "tags": ["signature", "bestseller"]},
    {"name": "Garlic Naan", "description": "Tandoor-baked leavened bread with garlic butter.", "price": 60, "category": "Breads", "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian"]},
    {"name": "Gulab Jamun", "description": "Milk dumplings in rose syrup.", "price": 150, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1666190466521-0e4a38f7e2be?w=600&q=80", "prep_time_min": 10, "tags": ["must-try"]},
]

SAMPLE_MENU_ITALIAN = [
    {"name": "Bruschetta", "description": "Toasted bread with tomato, basil, and olive oil.", "price": 220, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian"]},
    {"name": "Margherita Pizza", "description": "Classic tomato, mozzarella, and basil pizza.", "price": 380, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80", "prep_time_min": 16, "tags": ["bestseller", "vegetarian"]},
    {"name": "Spaghetti Carbonara", "description": "Creamy egg-based pasta with pancetta.", "price": 340, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=600&q=80", "prep_time_min": 14, "tags": ["classic"]},
    {"name": "Tiramisu", "description": "Coffee-soaked ladyfingers with mascarpone cream.", "price": 250, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80", "prep_time_min": 5, "tags": ["signature"]},
]

SAMPLE_MENU_CAFE = [
    {"name": "Avocado Toast", "description": "Smashed avocado on sourdough with poached egg.", "price": 280, "category": "Breakfast", "image_url": "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=600&q=80", "prep_time_min": 10, "tags": ["bestseller", "healthy"]},
    {"name": "Cappuccino", "description": "Espresso with steamed milk and foam.", "price": 180, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=600&q=80", "prep_time_min": 5, "tags": ["classic"]},
    {"name": "Club Sandwich", "description": "Triple-layer sandwich with chicken and veggies.", "price": 260, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=600&q=80", "prep_time_min": 12, "tags": ["bestseller"]},
    {"name": "Blueberry Pancakes", "description": "Fluffy pancakes with fresh blueberries and maple syrup.", "price": 300, "category": "Breakfast", "image_url": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80", "prep_time_min": 14, "tags": ["signature"]},
    {"name": "Cold Brew", "description": "Slow-steeped cold brew coffee.", "price": 200, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=600&q=80", "prep_time_min": 3, "tags": ["refreshing"]},
]

SAMPLE_MENUS = {
    "generic": SAMPLE_MENU_GENERIC,
    "indian": SAMPLE_MENU_INDIAN,
    "italian": SAMPLE_MENU_ITALIAN,
    "cafe": SAMPLE_MENU_CAFE,
}

def generate_frontend_config(name: str, slug: str, rest_id: str, phone: str, email: str, cuisine: str) -> dict:
    short_slug = slug.split('-')[0]
    return {
        "id": rest_id, "name": name, "slug": slug,
        "tagline": f"Welcome to {name}",
        "description": f"A wonderful dining experience at {name}. Serving delicious {cuisine} cuisine with love and passion.",
        "logo_url": "", "primary_color": "#8A1A2A", "secondary_color": "#C9A348", "accent_color": "#E8A317",
        "hero_images": [
            "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80",
            "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=1600&q=80"
        ],
        "hero_quote": f"Every meal tells a story at {name}.",
        "why_us": [
            {"icon": "Crown", "title": "Quality Food", "description": "Fresh ingredients daily."},
            {"icon": "Heart", "title": "Made with Love", "description": "Crafted with passion."},
            {"icon": "Sparkles", "title": "AI Powered", "description": "Smart ordering experience."}
        ],
        "contact": {"phone": phone, "email": email, "address": ""},
        "hours": {"lunch": "12:00 PM to 3:00 PM", "dinner": "6:00 PM to 11:00 PM", "open_days": "Open all 7 days"},
        "ai_waiter": {"name": f"{name} AI", "personality": "Warm and knowledgeable", "greeting": f"Welcome to {name}!", "languages": ["en"], "tones": ["friendly"]},
    }

@router.post("/api/restaurants/onboard-menu", dependencies=[Depends(require_roles("admin"))])
async def onboard_menu(file: UploadFile = File(...), user=Depends(require_user)):
    """Extracts menu items from an uploaded image or PDF using Gemini."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY missing")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(raw) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 10MB)")
    mime = file.content_type or "image/jpeg"
    try:
        from google import genai
        from google.genai import types as genai_types
        import asyncio
        client_ai = genai.Client(api_key=GEMINI_API_KEY)
        prompt = """
        You are an expert menu data extractor. I have provided an image or document of a restaurant menu.
        Extract all the food items, their descriptions, prices, and categories into a structured JSON list.
        Ensure prices are numbers (remove currency symbols).
        Use this exact JSON schema:
        [
          {
            "name": "string",
            "description": "string",
            "price": number,
            "category": "string",
            "image_prompt": "A highly detailed midjourney style prompt to generate an appetizing image of this food. Max 2 sentences."
          }
        ]
        Return ONLY valid JSON, nothing else. No markdown formatting like ```json.
        """
        response = await asyncio.to_thread(
            client_ai.models.generate_content,
            model="gemini-2.5-flash",
            contents=[prompt, genai_types.Part.from_bytes(data=raw, mime_type=mime)],
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        import json
        items = json.loads(text)

        async def generate_food_image(prompt: str, item_name: str) -> str:
            try:
                import uuid as _uuid
                from deps import UPLOAD_DIR
                result = await asyncio.to_thread(
                    client_ai.models.generate_images,
                    model='imagen-3.0-generate-002',
                    prompt=f"A professional, mouth-watering food photography shot STRICTLY representing the dish: '{item_name}'. {prompt}. High quality, cinematic lighting, restaurant plating. The image MUST clearly depict {item_name}.",
                    config=genai_types.GenerateImagesConfig(
                        number_of_images=1,
                        output_mime_type="image/jpeg",
                        aspect_ratio="16:9"
                    )
                )
                if result.generated_images:
                    image_bytes = result.generated_images[0].image.image_bytes
                    file_name = f"{_uuid.uuid4().hex}.jpg"
                    file_path = UPLOAD_DIR / file_name
                    with open(file_path, "wb") as f:
                        f.write(image_bytes)
                    return f"/api/uploads/{file_name}"
            except Exception as e:
                print(f"Image generation failed for {prompt}: {e}")
            return ""

        async def process_item(item):
            prompt = item.get("image_prompt", item["name"] + " " + item.get("description", ""))
            img_url = await generate_food_image(prompt, item.get("name", ""))
            item["image_url"] = img_url
            return item

        items = await asyncio.gather(*(process_item(item) for item in items))
        return {"items": items}
    except Exception as e:
        print(f"Exception details: {e}")
        raise HTTPException(status_code=500, detail=f"Menu extraction failed: {e}")

class RestaurantRequest(BaseModel):
    name: str
    email: str
    phone: str
    tables_count: int = 15
    cuisine: str = ""
    notes: str = ""

@router.post("/api/restaurants/request")
async def request_restaurant_access(req: RestaurantRequest, background_tasks: BackgroundTasks):
    """Public endpoint for self-serve onboarding. Grants a 14-day Pro trial instantly."""
    existing_user = await db.users.find_one({"email": req.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="This email is already registered. Please login or use a different email.")

    slug = req.name.lower().replace(" ", "-").replace("'", "")
    
    # check slug unique
    existing = await db.restaurants.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
        
    rest_id = f"rest_{slug.replace('-', '_')}_{uuid.uuid4().hex[:4]}"
    
    # 1. Create restaurant with 14-day trial of Pro plan
    trial_ends = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    await db.restaurants.insert_one({
        "id": rest_id, 
        "name": req.name, 
        "slug": slug, 
        "owner_email": req.email,
        "plan_tier": "pro", 
        "subscription_status": "trial", 
        "trial_ends_at": trial_ends,
        "is_verified": False,
        "sandbox_mode": True,
        "created_at": now_iso(),
    })
    
    # 2. Create frontend config
    config = generate_frontend_config(req.name, slug, rest_id, req.phone, req.email, req.cuisine or "global")
    await db.restaurant_configs.insert_one({
        "slug": slug, "config": config, "created_at": now_iso()
    })
    
    # 3. Seed sample menu based on cuisine
    menu_key = req.cuisine.lower() if req.cuisine.lower() in SAMPLE_MENUS else "generic"
    sample_menu = SAMPLE_MENUS[menu_key]
    for item in sample_menu:
        item_doc = item.copy()
        item_doc["restaurant_id"] = rest_id
        item_doc["id"] = str(uuid.uuid4())
        item_doc["available"] = True
        item_doc["tags"] = item_doc.get("tags", [])
        await db.menu.insert_one(item_doc)
        
    # 4. Create tables
    for i in range(1, req.tables_count + 1):
        await db.tables.insert_one({
            "id": str(uuid.uuid4()), "number": i, "capacity": 4,
            "qr_token": uuid.uuid4().hex[:12], "is_active": True,
            "restaurant_id": rest_id, "created_at": now_iso()
        })
        
    # 5. Generate credentials
    def gen_pw(): return "".join(random.choices(string.ascii_letters + string.digits, k=8))
    
    roles = ["admin", "kitchen", "counter"]
    creds = {}
    
    for r in roles:
        pw = gen_pw()
        email = f"{r}@{slug}.com"
        # Only use req.email for the admin account if we want, but let's keep it isolated.
        if r == "admin": email = req.email
        
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": email,
            "password_hash": hash_password(pw),
            "name": f"{req.name} {r.capitalize()}",
            "role": r,
            "restaurant_id": rest_id,
            "restaurant_slug": slug,
            "created_at": now_iso()
        })
        creds[r] = {"email": email, "password": pw}
        
    # 6. Generate Verification OTP and Send Email
    otp = str(random.randint(100000, 999999))
    await db.verifications.insert_one({
        "restaurant_id": rest_id,
        "otp": otp,
        "created_at": now_iso()
    })
    
    background_tasks.add_task(send_welcome_email, req.email, req.name, creds, otp)
        
    return {
        "ok": True,
        "url": f"/r/{slug}",
        "credentials": creds,
        "message": "Restaurant created with 14-day Pro trial!"
    }

@router.post("/api/restaurants/onboard", dependencies=[Depends(require_roles("admin"))])
async def onboard_restaurant(name: str, email: str, phone: str, tables_count: int = 10, cuisine: str = "", notes: str = "", user=Depends(require_user)):
    """Onboard a new restaurant: create restaurant, config, sample menu, tables."""
    if not user.get("restaurant_id"):
        raise HTTPException(status_code=403, detail="No restaurant assigned to this account")
    slug = name.lower().replace(" ", "-").replace("'", "")
    # check slug unique
    existing = await db.restaurants.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    rest_id = str(uuid.uuid4())
    # 1. Create restaurant
    await db.restaurants.insert_one({
        "id": rest_id, "name": name, "slug": slug, "owner_email": email,
        "plan": "trial", "subscription_status": "active", "created_at": now_iso(),
    })
    # 2. Create frontend config
    config = generate_frontend_config(name, slug, rest_id, phone, email, cuisine or "global")
    await db.restaurant_configs.insert_one({
        "slug": slug, "config": config, "created_at": now_iso()
    })
    # 3. Seed sample menu based on cuisine
    menu_key = cuisine.lower() if cuisine.lower() in SAMPLE_MENUS else "generic"
    sample_menu = SAMPLE_MENUS[menu_key]
    for item in sample_menu:
        item_doc = item.copy()
        item_doc["restaurant_id"] = rest_id
        item_doc["id"] = str(uuid.uuid4())
        item_doc["available"] = True
        item_doc["tags"] = item_doc.get("tags", [])
        await db.menu.insert_one(item_doc)
    # 4. Create tables
    for i in range(1, tables_count + 1):
        await db.tables.insert_one({
            "id": str(uuid.uuid4()), "number": i, "capacity": 4,
            "qr_token": uuid.uuid4().hex[:12], "is_active": True,
            "restaurant_id": rest_id, "created_at": now_iso()
        })
    return {"ok": True, "restaurant_id": rest_id, "slug": slug, "menu_items": len(sample_menu)}