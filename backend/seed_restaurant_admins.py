import asyncio
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from deps import db, hash_password, now_iso
import uuid

async def seed_admins():
    users_to_create = [
        {
            "email": "mahika@smartdineai.co.in",
            "name": "Mahika Manager",
            "role": "admin",
            "restaurant_id": "rest_mahika",
            "password": "Password@123"
        },
        {
            "email": "paaru@smartdineai.co.in",
            "name": "Paaru Manager",
            "role": "admin",
            "restaurant_id": "rest_paaru",
            "password": "Password@123"
        }
    ]

    for u in users_to_create:
        existing = await db.users.find_one({"email": u["email"]})
        if not existing:
            user_id = str(uuid.uuid4())
            await db.users.insert_one({
                "id": user_id,
                "email": u["email"],
                "name": u["name"],
                "role": u["role"],
                "restaurant_id": u["restaurant_id"],
                "password_hash": hash_password(u["password"]),
                "created_at": now_iso(),
            })
            print(f"[OK] Created user {u['email']} for {u['restaurant_id']}")
        else:
            await db.users.update_one(
                {"_id": existing["_id"]}, 
                {"$set": {"restaurant_id": u["restaurant_id"], "role": u["role"]}}
            )
            print(f"[OK] Updated user {u['email']} for {u['restaurant_id']}")

if __name__ == "__main__":
    asyncio.run(seed_admins())
