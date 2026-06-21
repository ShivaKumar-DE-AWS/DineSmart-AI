# SmartDine - Restaurant Cloning Guide

## How to Add a New Restaurant

There are **two ways** to add a new restaurant:

### Method 1: Self-Service (Automated — No Code Needed)

**Just fill the request form at `/auth/login` → "Request Access" tab** and the system auto-creates everything:

1. Go to `http://localhost:3000/auth/login`
2. Click **"Request Access"** tab
3. Fill in: Restaurant Name, Your Email, Phone, Tables, Cuisine
4. Click **"Create My Restaurant Portal"**
5. The system instantly creates your restaurant with:
   - Branded homepage, menu, about, contact pages
   - Staff user accounts (Owner, Admin, Kitchen, Counter)
   - Sample menu items tailored to your cuisine
   - Tables with QR codes
   - AI Waiter with restaurant-specific greeting
6. Credentials and URL are shown immediately — click to visit

**Zero code changes. Zero server restarts. Zero manual steps.**

---

### Method 2: Config Files (For Developers)

Adding a new restaurant via config files is **fully automatic** — just drop config files and restart.

**Zero code changes required.** The system auto-discovers restaurants from config files.

---

## Step 1: Create Backend Restaurant Config

Create a new JSON file in `backend/data/restaurants/` with your restaurant's slug name.

**File:** `backend/data/restaurants/{restaurant-slug}.json`

```json
{
  "id": "rest_your_restaurant_001",
  "name": "Your Restaurant Name",
  "slug": "your-restaurant-slug",
  "plan": "trial",
  "users": [
    {"email": "your-restaurant-slug@smartdine.ai", "password": "Owner@123", "name": "Owner Name", "role": "admin"},
    {"email": "admin-your-restaurant-slug@smartdine.ai", "password": "Admin@123", "name": "Admin Name", "role": "admin"},
    {"email": "kitchen-your-restaurant-slug@smartdine.ai", "password": "Chef@123", "name": "Head Chef", "role": "kitchen"},
    {"email": "counter-your-restaurant-slug@smartdine.ai", "password": "Counter@123", "name": "Counter Staff", "role": "counter"}
  ],
  "menu": [
    {"name": "Signature Dish", "description": "Description here.", "price": 300, "category": "Starters", "image_url": "https://images.unsplash.com/photo-XXXXX?w=600&q=80", "prep_time_min": 15, "tags": ["bestseller", "signature"]}
  ]
}
```

---

## Step 2: Create Frontend Restaurant Config

Create a matching JSON file in `frontend/src/data/restaurants/` with the same slug name.

**File:** `frontend/src/data/restaurants/{restaurant-slug}.json`

Use the template from `backend/data/restaurants/_template.json` or copy an existing config.

### Required Fields:

| Field | Purpose | Example |
|-------|---------|---------|
| `id` | Unique restaurant ID | `rest_bistro_001` |
| `name` | Display name | `The Bistro` |
| `slug` | URL slug (must match filename) | `the-bistro` |
| `primary_color` | Brand color (hex) | `#1B4332` |
| `secondary_color` | Accent color (hex) | `#D4A843` |
| `contact` | Phone, email, address | See examples |
| `hours` | Business hours | See examples |
| `ai_waiter` | AI personality & greeting | See examples |

### Full Config Template:

```json
{
  "id": "rest_the_bistro_001",
  "name": "The Bistro",
  "slug": "the-bistro",
  "tagline": "Where flavors meet finesse",
  "description": "A modern bistro with classic charm.",
  "logo_url": "",
  "primary_color": "#1B4332",
  "secondary_color": "#D4A843",
  "accent_color": "#E78B1F",
  "hero_images": ["https://images.unsplash.com/photo-XXXXX?w=1600&q=80"],
  "hero_quote": "Every plate tells a story.",
  "history_intro": "Our journey began in 2020...",
  "history": [
    {"year": "2020", "title": "Founded", "description": "How it started...", "image_url": "https://images.unsplash.com/photo-XXXXX?w=900&q=80"}
  ],
  "specialties": ["Specialty 1", "Specialty 2"],
  "famous_dishes": [
    {"name": "Dish Name", "description": "Description", "image_url": "https://...", "rating": 4.8, "popularity_badge": "Bestseller"}
  ],
  "why_us": [
    {"icon": "Crown", "title": "Quality", "description": "Why we're the best"}
  ],
  "contact": {
    "phone": "+91 98765 43210",
    "email": "hello@thebistro.com",
    "address": "123 Main Street, City",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "google_map_url": "https://maps.google.com/?q=The+Bistro"
  },
  "social_links": {
    "instagram": "https://instagram.com/thebistro",
    "facebook": "https://facebook.com/thebistro"
  },
  "hours": {
    "lunch": "12:00 PM to 3:00 PM",
    "dinner": "6:00 PM to 11:00 PM",
    "open_days": "Open all 7 days"
  },
  "ai_waiter": {
    "name": "BistroBot",
    "personality": "Friendly and knowledgeable",
    "greeting": "Welcome to The Bistro! How can I help you today?",
    "languages": ["en"],
    "tones": ["friendly"]
  },
  "reviews": [
    {"name": "Customer", "role": "Regular", "text": "Amazing food!", "rating": 5}
  ],
  "offers": [],
  "menu_config": {
    "category_order": ["Starters", "Mains", "Desserts"],
    "show_best_sellers": true,
    "show_chef_specials": true,
    "show_recommendations": true
  }
}
```

---

## Step 3: Restart the Backend

```bash
cd backend
# The server auto-discovers new configs on startup
python -m uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The seed function will automatically:
- Create the restaurant in MongoDB
- Insert all menu items with correct `restaurant_id`
- Create all staff user accounts

---

## Step 4: Restart the Frontend

```bash
cd frontend
npm run dev
```

The frontend auto-discovers new config files via webpack `require.context`.

---

## Step 5: Test

Visit `http://localhost:3000/r/{restaurant-slug}` and verify:
- [ ] Homepage loads with correct branding
- [ ] Menu page shows only this restaurant's items
- [ ] Login page shows correct staff credentials
- [ ] About page shows correct history
- [ ] Contact page shows correct info
- [ ] Kitchen display shows only this restaurant's orders
- [ ] Counter display shows only this restaurant's orders

---

## Credential Format

| Login Type | Email Format | Password |
|------------|-------------|----------|
| SmartDine Owner | `{slug}@smartdine.ai` | `Owner@123` |
| Restaurant Admin | `admin-{slug}@smartdine.ai` | `Admin@123` |
| Kitchen Staff | `kitchen-{slug}@smartdine.ai` | `Chef@123` |
| Counter Staff | `counter-{slug}@smartdine.ai` | `Counter@123` |

---

## Theme Colors

| Color | Purpose | Example |
|-------|---------|---------|
| `primary_color` | Main brand (buttons, headings) | `#1B4332` (green) |
| `secondary_color` | Accent (gold highlights) | `#D4A843` (gold) |
| `accent_color` | Additional accent | `#E78B1F` (orange) |

### Color Palette Suggestions:

| Restaurant Type | Primary | Secondary |
|----------------|---------|-----------|
| Indian | `#8A1A2A` (Royal Red) | `#C9A348` (Gold) |
| Italian | `#1B4332` (Forest Green) | `#D4A843` (Golden) |
| Modern Cafe | `#2D3436` (Dark Gray) | `#E17055` (Coral) |
| Seafood | `#0984E3` (Ocean Blue) | `#FFEAA7` (Light Yellow) |

---

## What Happens Automatically

When you drop a new config file:

| Component | What Updates |
|-----------|-------------|
| **Backend Seed** | Auto-creates restaurant, menu items, users |
| **Kitchen Display** | Auto-filters orders by `restaurant_id` |
| **Counter Display** | Auto-filters orders by `restaurant_id` |
| **Admin Panel** | Auto-filters tables by `restaurant_id` |
| **All Pages** | Auto-load branding, colors, content from config |
| **Login Page** | Auto-generates credential display |
| **AI Waiter** | Auto-uses restaurant-specific greeting |
| **QR Codes** | Auto-generate correct URLs |

---

## File Structure

```
backend/
  data/
    restaurants/
      _template.json          ← Copy this for new restaurants
      mehfil-hyderabad.json   ← Mehfil config
      spice-garden.json       ← Spice Garden config
      your-new-restaurant.json ← ADD YOURS HERE

frontend/
  src/
    data/
      restaurants/
        mehfil-hyderabad.json   ← Must match backend slug
        spice-garden.json       ← Must match backend slug
        your-new-restaurant.json ← ADD YOURS HERE
```

---

## Troubleshooting

### Restaurant page shows "Restaurant" instead of custom name
- Check JSON file exists in BOTH `backend/data/restaurants/` AND `frontend/src/data/restaurants/`
- Verify the slug (filename) matches the URL
- Restart both servers after adding new files

### Menu items not showing
- Ensure `restaurant_id` in backend config matches the `id` field
- Check menu items have all required fields (name, price, category, image_url, tags)

### Kitchen/Counter showing all restaurants' orders
- Ensure users have correct `restaurant_id` in the config
- The backend auto-assigns `restaurant_id` from config on seed

### Colors not applying
- Ensure `primary_color` and `secondary_color` are valid hex codes (e.g., `#1B4332`)
- Check the layout file is reading the config
