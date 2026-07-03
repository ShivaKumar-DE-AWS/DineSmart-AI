"""Seed a superadmin user into MongoDB. Idempotent — safe to run multiple times."""
import asyncio
import os
import uuid
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from deps import db, hash_password, now_iso


async def seed():
    email = "admin@smartdineai.co.in"
    old_user = await db.users.find_one({"$or": [{"email": "admin@smartdine.ai"}, {"role": "superadmin", "email": {"$ne": email}}]})
    if old_user:
        await db.users.update_one({"_id": old_user["_id"]}, {"$set": {"email": email}})
        print(f"✓ Migrated old superadmin email to {email}")

    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"✓ Superadmin already exists: {email}")
        return

    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": "Super Admin",
        "role": "superadmin",
        "restaurant_id": None,
        "password_hash": hash_password("Admin@123"),
        "created_at": now_iso(),
    })
    print(f"✓ Superadmin created: {email} / Admin@123")


if __name__ == "__main__":
    asyncio.run(seed())
