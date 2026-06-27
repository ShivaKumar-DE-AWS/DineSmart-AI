import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
client = AsyncIOMotorClient(os.getenv("MONGO_URI", "mongodb+srv://dinesmart:dinesmart123@cluster0.mongodb.net/dinesmart?retryWrites=true&w=majority"))
db = client.get_database("test_db" if not os.getenv("MONGO_URI") else None)

async def main():
    print("Testing DB connection...")
    rest = await db.restaurants.find_one({"slug": "mehfil"})
    print("Restaurant:", rest)
    if rest:
        rest_id = rest["id"]
        menus = await db.menu.find({"restaurant_id": rest_id}).to_list(None)
        print(f"Found {len(menus)} menu items for {rest_id}")
        for m in menus[:3]:
            print(" -", m.get("name"), m.get("restaurant_id"))

asyncio.run(main())
