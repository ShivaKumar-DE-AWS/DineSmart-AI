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
    email = "superadmin@smartdine.ai"
    existing = await db.users.find_one({"email": email})
    if existing:
        print(f"✓ Superadmin already exists: {email}")
        return

    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "email": email,
        "name": "SmartDine Admin",
        "role": "superadmin",
        "restaurant_id": None,
        "password_hash": hash_password("SuperAdmin@123"),
        "created_at": now_iso(),
    })
    print(f"✓ Superadmin created: {email} / SuperAdmin@123")


if __name__ == "__main__":
    asyncio.run(seed())
