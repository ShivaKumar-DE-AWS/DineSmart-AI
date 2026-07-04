import asyncio
import json
import os
from pathlib import Path
from deps import db, now_iso

MAHIKA_CONFIG = {
    "id": "rest_mahika",
    "name": "Mahika Restro",
    "slug": "mahika-restro",
    "service_type": "fine_dining",
    "tagline": "Exquisite Fine Dining & Table Service",
    "description": "Experience luxury dine-in table ordering with AI waiter recommendations and instant digital billing.",
    "primary_color": "#8A1A2A",
    "secondary_color": "#D4AF37",
    "hero_images": ["https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200"],
    "history": [],
    "specialties": ["Royal Biryani", "Butter Garlic Prawns", "Truffle Naan", "Saffron Kheer"],
    "famous_dishes": [
        {
            "name": "Royal Hyderabadi Dum Biryani",
            "description": "Slow-cooked aromatic basmati rice with tender spiced mutton and saffron.",
            "price": "₹450",
            "image": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600"
        },
        {
            "name": "Paneer Tikka Masala",
            "description": "Charcoal-grilled cottage cheese cubes simmered in rich creamy tomato gravy.",
            "price": "₹340",
            "image": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=600"
        }
    ],
    "why_us": ["Table-side AI Waiter Assistance", "Zero-Waiting UPI Settlement", "Fresh Organic Ingredients"],
    "contact": {
        "phone": "+91 98765 43210",
        "email": "dine@mahikarestro.com",
        "address": "Banjara Hills, Hyderabad"
    },
    "social_links": {
        "instagram": "https://instagram.com/mahikarestro"
    },
    "hours": {
        "lunch": "12:00 PM - 3:30 PM",
        "dinner": "7:00 PM - 11:30 PM",
        "open_days": "Mon - Sun"
    },
    "reviews": [],
    "offers": [],
    "menu_config": {
        "category_order": ["Starters", "Main Course", "Breads", "Desserts", "Beverages"],
        "show_best_sellers": True,
        "show_chef_specials": True,
        "show_recommendations": True
    }
}

PAARU_CONFIG = {
    "id": "rest_paaru",
    "name": "Paaru's Tiffins",
    "slug": "paarus-tiffins",
    "service_type": "self_service",
    "tagline": "Quick Self-Service Authentic South Indian Tiffins",
    "description": "Scan, order, pay instantly via UPI or Cash Pay-Codes, and grab your delicious hot tiffins from the counter!",
    "primary_color": "#D97706",
    "secondary_color": "#10B981",
    "hero_images": ["https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=1200"],
    "history": [],
    "specialties": ["Ghee Roast Dosa", "Fluffy Idli", "Mysore Bajji", "Filter Coffee"],
    "famous_dishes": [
        {
            "name": "Ghee Roast Masala Dosa",
            "description": "Crispy fermented crepe roasted in pure cow ghee, served with 3 chutneys and sambar.",
            "price": "₹120",
            "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600"
        },
        {
            "name": "Steamed Idli (4 pcs)",
            "description": "Soft and fluffy rice cakes served with piping hot sambar and coconut chutney.",
            "price": "₹60",
            "image": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600"
        }
    ],
    "why_us": ["Lightning Quick Counter Checkout", "Instant UPI Tap & Pay", "Fresh Chutneys Made Hourly"],
    "contact": {
        "phone": "+91 91234 56789",
        "email": "orders@paarustiffins.com",
        "address": "Indiranagar, Bangalore"
    },
    "social_links": {
        "instagram": "https://instagram.com/paarustiffins"
    },
    "hours": {
        "lunch": "7:00 AM - 1:00 PM",
        "dinner": "4:30 PM - 10:00 PM",
        "open_days": "Mon - Sun"
    },
    "reviews": [],
    "offers": [],
    "menu_config": {
        "category_order": ["Tiffins", "Dosas", "Vadas & Bajjis", "Beverages"],
        "show_best_sellers": True,
        "show_chef_specials": True,
        "show_recommendations": True
    }
}

MAHIKA_MENU = [
    {"id": "item_m1", "restaurant_id": "rest_mahika", "name": "Royal Hyderabadi Dum Biryani", "description": "Aromatic basmati rice cooked with tender spiced mutton and saffron.", "price": 450, "category": "Main Course", "image_url": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 20, "spice_level": 2},
    {"id": "item_m2", "restaurant_id": "rest_mahika", "name": "Paneer Tikka Masala", "description": "Charcoal-grilled cottage cheese in creamy tomato gravy.", "price": 340, "category": "Main Course", "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 15, "spice_level": 1},
    {"id": "item_m3", "restaurant_id": "rest_mahika", "name": "Butter Garlic Prawns", "description": "Jumbo prawns tossed in herb butter and roasted garlic.", "price": 520, "category": "Starters", "image_url": "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 15, "spice_level": 1},
    {"id": "item_m4", "restaurant_id": "rest_mahika", "name": "Truffle Butter Naan", "description": "Soft tandoori flatbread brushed with aromatic white truffle butter.", "price": 90, "category": "Breads", "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 10, "spice_level": 0},
    {"id": "item_m5", "restaurant_id": "rest_mahika", "name": "Saffron Pista Kheer", "description": "Rich condensed milk pudding with Kashmiri saffron and pistachios.", "price": 180, "category": "Desserts", "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 5, "spice_level": 0}
]

PAARU_MENU = [
    {"id": "item_p1", "restaurant_id": "rest_paaru", "name": "Ghee Roast Masala Dosa", "description": "Crispy fermented rice crepe roasted in pure cow ghee with potato masala.", "price": 120, "category": "Dosas", "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 5, "spice_level": 1},
    {"id": "item_p2", "restaurant_id": "rest_paaru", "name": "Steamed Idli (4 pcs)", "description": "Soft fluffy steamed rice cakes served with sambar and 3 chutneys.", "price": 60, "category": "Tiffins", "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 3, "spice_level": 0},
    {"id": "item_p3", "restaurant_id": "rest_paaru", "name": "Mysore Bajji (6 pcs)", "description": "Golden fried fritters served with spicy ginger chutney.", "price": 70, "category": "Vadas & Bajjis", "image_url": "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 5, "spice_level": 2},
    {"id": "item_p4", "restaurant_id": "rest_paaru", "name": "Medu Vada (2 pcs)", "description": "Crispy lentil doughnuts with soft inside, served with hot sambar.", "price": 50, "category": "Vadas & Bajjis", "image_url": "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 3, "spice_level": 0},
    {"id": "item_p5", "restaurant_id": "rest_paaru", "name": "South Indian Filter Coffee", "description": "Strong decoction coffee frothed with fresh hot milk.", "price": 30, "category": "Beverages", "image_url": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=600", "available": True, "prep_time_min": 2, "spice_level": 0}
]

async def seed():
    # Write JSON files for fast frontend/backend config resolution
    data_dir = Path(__file__).parent / "data" / "restaurants"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    with open(data_dir / "mahika-restro.json", "w", encoding="utf-8") as f:
        json.dump(MAHIKA_CONFIG, f, indent=2)
    with open(data_dir / "paarus-tiffins.json", "w", encoding="utf-8") as f:
        json.dump(PAARU_CONFIG, f, indent=2)
    print("[OK] Created JSON configs in data/restaurants/")

    # Seed restaurants in MongoDB
    for cfg in [MAHIKA_CONFIG, PAARU_CONFIG]:
        rest_doc = {
            "id": cfg["id"],
            "name": cfg["name"],
            "slug": cfg["slug"],
            "service_type": cfg["service_type"],
            "tagline": cfg["tagline"],
            "sandbox_mode": True,
            "created_at": now_iso()
        }
        await db.restaurants.update_one({"slug": cfg["slug"]}, {"$set": rest_doc}, upsert=True)
        await db.restaurant_configs.update_one({"slug": cfg["slug"]}, {"$set": {"slug": cfg["slug"], "config": cfg}}, upsert=True)
        print(f"[OK] Seeded MongoDB restaurant & config: {cfg['name']} ({cfg['slug']}) -> {cfg['service_type']}")

    # Seed menu items
    await db.menu_items.delete_many({"restaurant_id": {"$in": ["rest_mahika", "rest_paaru"]}})
    await db.menu_items.insert_many(MAHIKA_MENU + PAARU_MENU)
    print("[OK] Seeded menu items for both restaurants")

    # Seed tables for Mahika Restro (Dine-In)
    await db.tables.delete_many({"restaurant_id": "rest_mahika"})
    tables = [
        {"id": f"tbl_mahika_{i}", "restaurant_id": "rest_mahika", "number": i, "capacity": 4 if i % 2 == 0 else 2, "qr_token": f"qr_mahika_t{i}", "is_active": True, "created_at": now_iso()}
        for i in range(1, 11)
    ]
    await db.tables.insert_many(tables)
    print("[OK] Seeded 10 tables for Mahika Restro")

if __name__ == "__main__":
    asyncio.run(seed())
