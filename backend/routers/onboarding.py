"""Restaurant onboarding, sample menus, and config generation."""
import uuid
import random
import string
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Form, UploadFile, File
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
            model="gemini-1.5-flash",
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

        processed_items = []
        for item in items:
            processed = await process_item(item)
            processed_items.append(processed)
            # Add a tiny delay between requests to help with free-tier rate limits
            await asyncio.sleep(2)
            
        return {"items": processed_items}
    except Exception as e:
        print(f"Exception details: {e}")
        raise HTTPException(status_code=500, detail=f"Menu extraction failed: {e}")

async def _extract_and_save_menu_bg(rest_id: str, file_path: str, mime_type: str = "image/jpeg"):
    """Background helper to extract menu items from uploaded image/PDF during registration and save them to DB."""
    if not GEMINI_API_KEY:
        print(f"[AI] GEMINI_API_KEY missing, skipping background menu extraction for {rest_id}")
        return
    try:
        print(f"[AI] Starting background menu extraction for {rest_id} from {file_path}")
        from google import genai
        from google.genai import types as genai_types
        import asyncio
        import json
        
        with open(file_path, "rb") as f:
            raw = f.read()
            
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
            "category": "string"
          }
        ]
        Return ONLY valid JSON, nothing else. No markdown formatting like ```json.
        """
        response = await asyncio.to_thread(
            client_ai.models.generate_content,
            model="gemini-1.5-flash",
            contents=[prompt, genai_types.Part.from_bytes(data=raw, mime_type=mime_type)],
        )
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        items = json.loads(text)
        
        if items and isinstance(items, list) and len(items) > 0:
            await db.menu.delete_many({"restaurant_id": rest_id})
            for item in items:
                item_doc = {
                    "id": str(uuid.uuid4()),
                    "restaurant_id": rest_id,
                    "name": item.get("name", "Unnamed Item"),
                    "description": item.get("description", ""),
                    "price": float(item.get("price", 0)),
                    "category": item.get("category", "General"),
                    "available": True,
                    "tags": ["ai-extracted"],
                    "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80"
                }
                await db.menu.insert_one(item_doc)
            print(f"[AI] Successfully extracted and saved {len(items)} menu items for {rest_id}")
    except Exception as e:
        print(f"[AI] Background menu extraction failed for {rest_id}: {e}")

@router.post("/api/restaurants/request")
async def request_restaurant_access(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    cuisine: str = Form(""),
    notes: str = Form(""),
    primary_color: str = Form(None),
    secondary_color: str = Form(None),
    logo: UploadFile = File(None),
    menu: UploadFile = File(None),
    service_type: str = Form("fine_dining")
):
    """Public endpoint for self-serve onboarding. Grants a 14-day Pro trial instantly."""
    import shutil
    import os
    import re
    
    clean_phone = re.sub(r'\D', '', phone)
    if len(clean_phone) == 12 and clean_phone.startswith("91"):
        clean_phone = clean_phone[2:]
    elif len(clean_phone) == 11 and clean_phone.startswith("0"):
        clean_phone = clean_phone[1:]
    if not re.match(r'^\d{10}$', clean_phone):
        raise HTTPException(status_code=400, detail="Please provide a valid 10-digit mobile number.")
    phone = clean_phone
    
    # 0. Check OTP verification
    email_otp = await db.otps.find_one({"target": email, "type": "email", "verified": True})
    if not email_otp:
        raise HTTPException(status_code=400, detail="Email address must be verified first")
        
    existing_rest = await db.restaurants.find_one({"owner_email": email})
    if existing_rest:
        if existing_rest.get("status") == "deleted" or existing_rest.get("subscription_status") == "deleted":
            old_id = existing_rest["id"]
            old_slug = existing_rest.get("slug")
            await db.restaurants.delete_one({"id": old_id})
            await db.users.delete_many({"restaurant_id": old_id})
            if old_slug:
                await db.users.delete_many({"restaurant_slug": old_slug})
                await db.restaurant_configs.delete_many({"slug": old_slug})
        else:
            raise HTTPException(status_code=400, detail="This email is already registered with an active restaurant. Please login or use a different email.")

    existing_user = await db.users.find_one({"email": email})
    if existing_user:
        rest_id = existing_user.get("restaurant_id")
        rest = await db.restaurants.find_one({"id": rest_id}) if rest_id else None
        if not rest or rest.get("status") == "deleted" or rest.get("subscription_status") == "deleted":
            if rest_id:
                await db.users.delete_many({"restaurant_id": rest_id})
            await db.users.delete_many({"email": email})
        else:
            raise HTTPException(status_code=400, detail="This email is already registered. Please login or use a different email.")

    slug = name.lower().replace(" ", "-").replace("'", "")
    
    # check slug unique
    existing = await db.restaurants.find_one({"slug": slug})
    if existing:
        slug = f"{slug}-{uuid.uuid4().hex[:4]}"
        
    rest_id = f"rest_{slug.replace('-', '_')}_{uuid.uuid4().hex[:4]}"
    
    # 1. Create restaurant with 14-day trial of Pro plan
    trial_ends = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
    await db.restaurants.insert_one({
        "id": rest_id, 
        "name": name, 
        "slug": slug, 
        "owner_email": email,
        "phone": phone,
        "service_type": service_type or "fine_dining",
        "plan_tier": "pro", 
        "subscription_status": "trial", 
        "trial_ends_at": trial_ends,
        "is_verified": False,
        "sandbox_mode": True,
        "created_at": now_iso(),
    })
    
    # Handle File Uploads
    logo_url = ""
    if logo and logo.filename:
        os.makedirs("uploads", exist_ok=True)
        logo_path = f"uploads/{uuid.uuid4().hex}_{logo.filename}"
        with open(logo_path, "wb") as buffer:
            shutil.copyfileobj(logo.file, buffer)
        logo_url = f"/api/{logo_path}"
        
    menu_path = ""
    if menu and menu.filename:
        os.makedirs("uploads", exist_ok=True)
        menu_path = f"uploads/{uuid.uuid4().hex}_{menu.filename}"
        with open(menu_path, "wb") as buffer:
            shutil.copyfileobj(menu.file, buffer)
    
    # 2. Create frontend config
    config = generate_frontend_config(name, slug, rest_id, phone, email, cuisine or "global")
    config["service_type"] = service_type or "fine_dining"
    if primary_color: config["primary_color"] = primary_color
    if secondary_color: config["secondary_color"] = secondary_color
    if logo_url: config["logo_url"] = logo_url
    
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
        
    # 4. Create initial tables
    for i in range(1, 11): # Defaults to 10 tables for onboarding
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
        uemail = f"{r}@{slug}.com"
        if r == "admin": uemail = email
        
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": uemail,
            "password_hash": hash_password(pw),
            "name": f"{name} {r.capitalize()}",
            "role": r,
            "restaurant_id": rest_id,
            "restaurant_slug": slug,
            "created_at": now_iso()
        })
        creds[r] = {"email": uemail, "password": pw}
        
    await db.restaurants.update_one({"id": rest_id}, {"$set": {"initial_creds": creds}})
    verify_otp = str(random.randint(100000, 999999))
    await db.verifications.insert_one({
        "restaurant_id": rest_id,
        "otp": verify_otp,
        "created_at": now_iso()
    })
    background_tasks.add_task(send_welcome_email, email, name, creds, verify_otp)
    
    # 6. Trigger AI Menu Extraction if uploaded
    if menu_path:
        mime_type = menu.content_type or "image/jpeg"
        background_tasks.add_task(_extract_and_save_menu_bg, rest_id, menu_path, mime_type)

    return {
        "status": "success",
        "url": f"https://{slug}.smartdineai.co.in/admin",
        "slug": slug,
        "credentials": creds
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