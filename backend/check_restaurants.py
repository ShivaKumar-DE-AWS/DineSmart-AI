import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    rest = await db.restaurants.find({}, {"_id": 0}).to_list(10)
    print(f"Restaurants in DB: {len(rest)}")
    for r in rest:
        print(f"  id={r.get('id')} | slug={r.get('slug')} | name={r.get('name')}")
asyncio.run(check())
