import asyncio
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

# Try to load env if available
try:
    from dotenv import load_dotenv
    from pathlib import Path
    load_dotenv(Path(__file__).parent.parent / ".env")
except ImportError:
    pass

MONGO_URL = os.environ.get("MONGO_URL") or os.environ.get("MONGODB_URI")
DB_NAME = os.environ.get("DB_NAME") or os.environ.get("MONGODB_DB_NAME") or "smartdine"

if not MONGO_URL:
    print("MONGO_URL not found. Exiting.")
    exit(1)

kwargs = {}
if "localhost" not in MONGO_URL and "127.0.0.1" not in MONGO_URL:
    kwargs["tls"] = True
    kwargs["tlsCAFile"] = certifi.where()

client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=30000, **kwargs)
db = client[DB_NAME]

async def run_migration():
    print(f"Connected to db: {DB_NAME}")
    
    # Update all restaurants
    # If they are 'active', move them to 'trial'
    # Set trial_ends_at to 14 days from now if not present
    
    new_trial_ends = datetime.now(timezone.utc) + timedelta(days=14)
    
    result = await db.restaurants.update_many(
        {"trial_ends_at": {"$exists": False}},
        {"$set": {
            "subscription_status": "trial",
            "trial_ends_at": new_trial_ends
        }}
    )
    
    print(f"Matched {result.matched_count} restaurants without trial_ends_at.")
    print(f"Modified {result.modified_count} restaurants.")
    
    # Update those that have trial_ends_at but are somehow marked active (force them to trial)
    result2 = await db.restaurants.update_many(
        {"subscription_status": "active"},
        {"$set": {"subscription_status": "trial"}}
    )
    print(f"Forced {result2.modified_count} 'active' restaurants to 'trial'.")
    
    print("Migration complete.")

if __name__ == "__main__":
    asyncio.run(run_migration())
