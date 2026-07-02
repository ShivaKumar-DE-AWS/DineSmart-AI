"""Restaurant onboarding, sample menus, and config generation."""
import uuid
import random
import string
from typing import Optional
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends, Form, UploadFile, File
from deps import db, now_iso, require_user, require_roles, GEMINI_API_KEY, hash_password, get_gemini_models
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

SAMPLE_MENU_TIFFIN = [
    {"name": "Ghee Roast Masala Dosa", "description": "Crispy fermented crepe roasted in pure ghee with potato masala.", "price": 120, "category": "Dosas", "image_url": "https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian", "bestseller"]},
    {"name": "Steamed Idli (3 Pcs)", "description": "Soft steamed rice cakes served with sambar and 3 varieties of chutney.", "price": 60, "category": "Idli & Vada", "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&q=80", "prep_time_min": 5, "tags": ["vegetarian", "healthy"]},
    {"name": "Medu Vada (2 Pcs)", "description": "Crispy golden lentil fritters studded with black pepper and curry leaves.", "price": 70, "category": "Idli & Vada", "image_url": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&q=80", "prep_time_min": 6, "tags": ["vegetarian", "classic"]},
    {"name": "Ghee Pongal", "description": "Comforting blend of rice and yellow moong dal tempered with cashews, ghee and black pepper.", "price": 90, "category": "Specials", "image_url": "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80", "prep_time_min": 7, "tags": ["vegetarian", "comfort"]},
    {"name": "Onion Uttapam", "description": "Thick rice pancake topped with caramelized onions, green chilies and cilantro.", "price": 100, "category": "Uttapam", "image_url": "https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&q=80", "prep_time_min": 10, "tags": ["vegetarian"]},
    {"name": "Filter Coffee", "description": "Traditional authentic South Indian decoction coffee frothed with hot milk.", "price": 40, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80", "prep_time_min": 3, "tags": ["signature", "must-try"]},
    {"name": "Mysore Bonda (4 Pcs)", "description": "Golden deep-fried spiced flour dumplings served with coconut chutney.", "price": 80, "category": "Snacks", "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian", "bestseller"]},
    {"name": "Poori Bhaji", "description": "Fluffy deep-fried whole wheat breads served with spiced potato curry.", "price": 90, "category": "Specials", "image_url": "https://images.unsplash.com/photo-1626074353765-517a681e40be?w=600&q=80", "prep_time_min": 10, "tags": ["vegetarian"]},
]

SAMPLE_MENU_CHINESE = [
    {"name": "Veg Fried Rice", "description": "Wok-tossed basmati rice with crunchy veggies and soy.", "price": 180, "category": "Rice & Noodles", "image_url": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80", "prep_time_min": 12, "tags": ["vegetarian", "bestseller"]},
    {"name": "Hakka Noodles", "description": "Classic stir-fried noodles with garlic, capsicum, and spring onions.", "price": 170, "category": "Rice & Noodles", "image_url": "https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&q=80", "prep_time_min": 12, "tags": ["vegetarian", "classic"]},
    {"name": "Chilli Paneer Dry", "description": "Crispy paneer cubes tossed in spicy soy-chilli sauce with green peppers.", "price": 220, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?w=600&q=80", "prep_time_min": 15, "tags": ["vegetarian", "spicy"]},
    {"name": "Chicken Manchurian", "description": "Juicy chicken balls simmered in tangy garlic ginger gravy.", "price": 260, "category": "Mains", "image_url": "https://images.unsplash.com/photo-1525755662778-989d0524087e?w=600&q=80", "prep_time_min": 18, "tags": ["bestseller"]},
    {"name": "Sweet Corn Soup", "description": "Warm comforting broth with crushed sweet corn and vegetables.", "price": 110, "category": "Soups", "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=600&q=80", "prep_time_min": 8, "tags": ["vegetarian", "comfort"]},
    {"name": "Spring Rolls (6 Pcs)", "description": "Crispy fried rolls stuffed with julienned vegetables and served with sweet chilli dip.", "price": 150, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80", "prep_time_min": 10, "tags": ["vegetarian", "crunchy"]},
]

SAMPLE_MENU_FASTFOOD = [
    {"name": "Crispy Paneer Burger", "description": "Crunchy paneer patty with lettuce, tomato, and tandoori mayo in a toasted bun.", "price": 150, "category": "Burgers", "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80", "prep_time_min": 10, "tags": ["vegetarian", "bestseller"]},
    {"name": "Classic Chicken Burger", "description": "Juicy fried chicken fillet with cheddar cheese and special house sauce.", "price": 180, "category": "Burgers", "image_url": "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600&q=80", "prep_time_min": 12, "tags": ["bestseller"]},
    {"name": "Peri Peri French Fries", "description": "Golden crinkle-cut fries tossed in spicy peri-peri seasoning.", "price": 110, "category": "Sides & Fries", "image_url": "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=600&q=80", "prep_time_min": 6, "tags": ["vegetarian", "spicy"]},
    {"name": "Loaded Cheesy Nachos", "description": "Crispy tortilla chips topped with melted cheese, jalapeños, and salsa.", "price": 160, "category": "Snacks", "image_url": "https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=600&q=80", "prep_time_min": 8, "tags": ["sharing", "vegetarian"]},
    {"name": "Oreo Mudshake", "description": "Thick chocolate milkshake blended with crunchy Oreo cookies.", "price": 140, "category": "Shakes", "image_url": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80", "prep_time_min": 5, "tags": ["sweet", "bestseller"]},
]

SAMPLE_MENUS = {
    "generic": SAMPLE_MENU_GENERIC,
    "indian": SAMPLE_MENU_INDIAN,
    "italian": SAMPLE_MENU_ITALIAN,
    "cafe": SAMPLE_MENU_CAFE,
    "tiffin": SAMPLE_MENU_TIFFIN,
    "chinese": SAMPLE_MENU_CHINESE,
    "fastfood": SAMPLE_MENU_FASTFOOD,
}

def get_sample_menu_for_restaurant(cuisine: str, name: str) -> list[dict]:
    combined = (str(cuisine) + " " + str(name)).lower()
    if any(k in combined for k in ["tiffin", "south", "idli", "dosa", "udipi", "chennai", "bhavan", "vada", "pongal"]):
        return SAMPLE_MENU_TIFFIN
    if any(k in combined for k in ["chinese", "wok", "noodle", "dragon", "momos", "asian", "manchurian"]):
        return SAMPLE_MENU_CHINESE
    if any(k in combined for k in ["burger", "fast", "fry", "crispy", "wings", "kfc", "mc", "snack"]):
        return SAMPLE_MENU_FASTFOOD
    if any(k in combined for k in ["pizza", "pizzeria", "italian", "pasta"]):
        return SAMPLE_MENU_ITALIAN
    if any(k in combined for k in ["cafe", "coffee", "tea", "chai", "bistro", "bake"]):
        return SAMPLE_MENU_CAFE
    if any(k in combined for k in ["indian", "curry", "biryani", "mehfil", "darbar", "spice", "dhaba", "tandoor", "paneer", "kebab"]):
        return SAMPLE_MENU_INDIAN
    return SAMPLE_MENU_GENERIC

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
        models_to_try = get_gemini_models(client_ai)

        response = None
        last_err = None
        for model_name in models_to_try:
            for api_ver in [None, "v1"]:
                try:
                    c = client_ai if not api_ver else genai.Client(api_key=GEMINI_API_KEY, http_options=genai_types.HttpOptions(api_version=api_ver))
                    response = await asyncio.to_thread(
                        c.models.generate_content,
                        model=model_name,
                        contents=[prompt, genai_types.Part.from_bytes(data=raw, mime_type=mime)],
                    )
                    if response and getattr(response, "text", None):
                        break
                except Exception as e:
                    last_err = e
                    continue
            if response and getattr(response, "text", None):
                break
        if not response or not getattr(response, "text", None):
            raise HTTPException(status_code=500, detail=f"Menu extraction failed across available models ({models_to_try[:5]}): {str(last_err)}")
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

@router.post("/api/restaurants/request")
async def request_restaurant_access(
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    owner_name: Optional[str] = Form(None),
    email: str = Form(...),
    phone: str = Form(...),
    cuisine: str = Form(""),
    notes: str = Form(""),
    primary_color: str = Form(None),
    secondary_color: str = Form(None),
    logo: UploadFile = File(None),
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

    slug_clean = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
    if not slug_clean:
        slug_clean = "restaurant"
    slug = slug_clean
    
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
    sample_menu = get_sample_menu_for_restaurant(cuisine or "", name or "")
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
            "name": f"{owner_name or name} ({r.capitalize()})",
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
    background_tasks.add_task(send_welcome_email, email, owner_name or name, creds, verify_otp)
    
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
    sample_menu = get_sample_menu_for_restaurant(cuisine or "", name or "")
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