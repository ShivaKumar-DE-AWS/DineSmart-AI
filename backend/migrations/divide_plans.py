import asyncio
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

try:
    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URI, tlsCAFile=certifi.where())
db = client.smartdine

async def migrate():
    print("Dividing restaurants into test subscription plans...")
    
    # 1. Spice Garden -> Starter (Expired Trial)
    await db.restaurants.update_one(
        {"slug": "spice-garden"},
        {"$set": {
            "plan_tier": "starter",
            "subscription_status": "trial",
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=2) # Expired 2 days ago
        }}
    )
    print("- Spice Garden: set to Starter (Expired Trial)")
    
    # 2. Mehfil -> Pro (Active Subscription)
    await db.restaurants.update_one(
        {"slug": "mehfil"},
        {"$set": {
            "plan_tier": "pro",
            "subscription_status": "active",
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=10),
            "stripe_customer_id": "mock_cus_mehfil",
            "stripe_subscription_id": "mock_sub_mehfil"
        }}
    )
    print("- Mehfil: set to Pro (Active Subscription)")
    
    # 3. Biryani House -> Starter (Active Trial)
    await db.restaurants.update_one(
        {"slug": "biryani-house"},
        {"$set": {
            "plan_tier": "starter",
            "subscription_status": "trial",
            "trial_ends_at": datetime.now(timezone.utc) + timedelta(days=5) # 5 days left
        }}
    )
    print("- Biryani House: set to Starter (Active Trial)")
    
    # 4. Any others -> Enterprise (Active Subscription)
    await db.restaurants.update_many(
        {"slug": {"$nin": ["spice-garden", "mehfil", "biryani-house"]}},
        {"$set": {
            "plan_tier": "enterprise",
            "subscription_status": "active",
            "trial_ends_at": datetime.now(timezone.utc) - timedelta(days=5)
        }}
    )
    print("- Others: set to Enterprise (Active Subscription)")

    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
