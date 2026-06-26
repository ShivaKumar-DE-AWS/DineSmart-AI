import asyncio
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
client = AsyncIOMotorClient(os.environ['MONGO_URL'], tls=True, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

async def update_slugs():
    # Update restaurants
    await db.restaurants.update_many({"slug": "mehfil-hyderabad"}, {"$set": {"slug": "mehfil"}})
    # Update configs
    await db.restaurant_configs.update_many({"slug": "mehfil-hyderabad"}, {"$set": {"slug": "mehfil"}})
    
    print("Database updated!")

asyncio.run(update_slugs())
