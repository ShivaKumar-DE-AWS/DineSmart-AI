import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
load_dotenv()

async def fix():
    client = AsyncIOMotorClient(os.getenv('MONGO_URL'))
    db = client[os.getenv('DB_NAME')]
    
    # Delete ALL old users and re-seed
    r = await db.users.delete_many({})
    print(f"Deleted {r.deleted_count} old users")
    
    # Verify menu items
    mehfil = await db.menu.count_documents({"restaurant_id": "rest_mehfil_001"})
    spg = await db.menu.count_documents({"restaurant_id": "rest_spice_garden_001"})
    print(f"Menu: Mehfil={mehfil}, Spice Garden={spg}")
    
    # Verify restaurants
    rests = await db.restaurants.find({}).to_list(10)
    for r in rests:
        print(f"Restaurant: {r['name']} ({r['slug']})")

asyncio.run(fix())
