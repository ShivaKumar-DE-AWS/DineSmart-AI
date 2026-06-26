"""Menu CRUD, inventory, and image upload routes."""
import uuid
from pathlib import Path
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from deps import (
    db, now_iso, require_user, require_roles, UPLOAD_DIR,
    MenuItemModel, InventoryItemModel,
    MenuItemUpdateModel, InventoryItemUpdateModel,
)

router = APIRouter(tags=["menu"])

ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB


# =========================================================
# Menu
# =========================================================
@router.get("/api/menu")
async def list_menu(restaurant_id: str):
    q: Dict[str, Any] = {"available": True, "restaurant_id": restaurant_id}
    items = await db.menu.find(q, {"_id": 0}).sort("category", 1).to_list(500)
    return {"items": items}


@router.post("/api/menu", dependencies=[Depends(require_roles("admin"))])
async def create_menu_item(item: MenuItemModel, user=Depends(require_user)):
    item_dict = item.model_dump()
    if user.get("restaurant_id"):
        item_dict["restaurant_id"] = user["restaurant_id"]
    await db.menu.insert_one(item_dict)
    return item


@router.patch("/api/menu/{item_id}", dependencies=[Depends(require_roles("admin"))])
async def update_menu_item(item_id: str, patch_data: MenuItemUpdateModel, user=Depends(require_user)):
    patch = patch_data.model_dump(exclude_unset=True)
    if not patch:
        return {"ok": True}
    q = {"id": item_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.menu.update_one(q, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


@router.delete("/api/menu/{item_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_menu_item(item_id: str, user=Depends(require_user)):
    q = {"id": item_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    await db.menu.delete_one(q)
    return {"ok": True}


# =========================================================
# Inventory
# =========================================================
@router.get("/api/inventory", dependencies=[Depends(require_roles("admin", "kitchen"))])
async def list_inventory(user=Depends(require_user)):
    q: Dict[str, Any] = {}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    items = await db.inventory.find(q, {"_id": 0}).to_list(500)
    return {"items": items}


@router.post("/api/inventory/seed-demo", dependencies=[Depends(require_roles("admin"))])
async def seed_inventory_demo(user=Depends(require_user)):
    """Seed inventory with dynamic AI-generated ingredients and recipes."""
    import json, asyncio, random
    if not user.get("restaurant_id"):
        raise HTTPException(status_code=403, detail="No restaurant assigned")
    q_menu: Dict[str, Any] = {"restaurant_id": user["restaurant_id"]}
    menu = await db.menu.find(q_menu).to_list(length=None)
    if not menu:
        return {"message": "No menu items found to generate inventory from."}

    menu_names = [m.get("name", "Unknown") for m in menu]
    from deps import GEMINI_API_KEY
    prompt = f"""
    You are an expert chef and restaurant manager. I have a restaurant with the following menu items:
    {', '.join(menu_names)}
    
    1. Create a realistic list of raw ingredients (inventory) needed to cook all these dishes. Keep the list concise (10-15 core ingredients total).
    2. For each menu item, list which of those exact ingredients are required and in what quantity (in kg, L, or g).
    
    Respond STRICTLY with a valid JSON object matching this schema:
    {{
        "inventory": [
            {{"id": "inv_1", "name": "Ingredient Name", "unit": "kg/g/L", "qty": 100, "min_qty": 20}}
        ],
        "recipes": {{
            "Exact Menu Item Name": [
                {{"ingredient_id": "inv_1", "qty_required": 0.5}}
            ]
        }}
    }}
    Do not include any markdown formatting, backticks, or explanation. Just the raw JSON.
    """

    try:
        from google import genai
        from google.genai import types as genai_types
        client_ai = genai.Client(api_key=GEMINI_API_KEY)
        response = await asyncio.to_thread(
            client_ai.models.generate_content,
            model="gemini-2.5-flash",
            contents=prompt,
        )
        data_str = response.text.strip()
        if data_str.startswith("```json"):
            data_str = data_str[7:-3].strip()
        elif data_str.startswith("```"):
            data_str = data_str[3:-3].strip()
        data = json.loads(data_str)

        if data.get("inventory"):
            inv_list = data["inventory"]
            for inv in inv_list:
                if user.get("restaurant_id"):
                    inv["restaurant_id"] = user["restaurant_id"]
            q_inv: Dict[str, Any] = {}
            if user.get("restaurant_id"):
                q_inv["restaurant_id"] = user["restaurant_id"]
            await db.inventory.delete_many(q_inv)
            await db.inventory.insert_many(inv_list)

        recipes_map = data.get("recipes", {})
        for item in menu:
            recipe = recipes_map.get(item.get("name"), [])
            update_q: Dict[str, Any] = {"id": item["id"]}
            if user.get("restaurant_id"):
                update_q["restaurant_id"] = user["restaurant_id"]
            await db.menu.update_one(update_q, {"$set": {"recipe": recipe}})

        from deps import now_iso
        if user.get("restaurant_id"):
            await db.ai_usage_logs.insert_one({
                "restaurant_id": user["restaurant_id"],
                "endpoint": "/api/menu/demo-recipes",
                "timestamp": now_iso()
            })

        return {"message": "Demo data seeded dynamically using AI!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {e}")


@router.post("/api/inventory", dependencies=[Depends(require_roles("admin"))])
async def create_inventory_item(item: InventoryItemModel, user=Depends(require_user)):
    item_dict = item.model_dump()
    if user.get("restaurant_id"):
        item_dict["restaurant_id"] = user["restaurant_id"]
    await db.inventory.insert_one(item_dict)
    return item


@router.patch("/api/inventory/{item_id}", dependencies=[Depends(require_roles("admin", "kitchen"))])
async def update_inventory(item_id: str, patch_data: InventoryItemUpdateModel, user=Depends(require_user)):
    patch = patch_data.model_dump(exclude_unset=True)
    if not patch:
        return {"ok": True}
    q = {"id": item_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    res = await db.inventory.update_one(q, {"$set": patch})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return {"ok": True}


@router.delete("/api/inventory/{item_id}", dependencies=[Depends(require_roles("admin"))])
async def delete_inventory(item_id: str, user=Depends(require_user)):
    q = {"id": item_id}
    if user.get("restaurant_id"):
        q["restaurant_id"] = user["restaurant_id"]
    await db.inventory.delete_one(q)
    return {"ok": True}


# =========================================================
# Image Upload (admin)
# =========================================================
@router.post("/api/upload/image", dependencies=[Depends(require_roles("admin"))])
async def upload_image(file: UploadFile = File(...)):
    """Save an uploaded image to S3 (if configured) or disk and return its public URL."""
    import uuid as _uuid
    import os
    ext = Path(file.filename or "").suffix.lower() or ".jpg"
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type {ext}")
    raw = await file.read()
    if len(raw) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=400, detail="Image too large (max 5MB)")
    if len(raw) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    
    fname = f"{_uuid.uuid4().hex}{ext}"
    
    aws_bucket = os.environ.get("AWS_BUCKET_NAME")
    if aws_bucket:
        import boto3
        s3 = boto3.client(
            "s3",
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            region_name=os.environ.get("AWS_REGION", "us-east-1")
        )
        try:
            # Upload to S3
            s3.put_object(
                Bucket=aws_bucket,
                Key=f"uploads/{fname}",
                Body=raw,
                ContentType=file.content_type or "image/jpeg",
                ACL="public-read"
            )
            # Depending on bucket region, URL might vary, assuming standard format
            s3_url = f"https://{aws_bucket}.s3.amazonaws.com/uploads/{fname}"
            return {"url": s3_url, "filename": fname, "size": len(raw)}
        except Exception as e:
            # Fallback to local if S3 fails
            print(f"[S3 UPLOAD ERROR] {e}. Falling back to local storage.")
    
    # Local fallback
    out_path = UPLOAD_DIR / fname
    with open(out_path, "wb") as f:
        f.write(raw)
    return {"url": f"/api/uploads/{fname}", "filename": fname, "size": len(raw)}
