import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def fix():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    res = await db.reservations.find({"restaurant_id": None}).to_list(50)
    print(f"Found {len(res)} reservations without restaurant_id")
    for r in res:
        name = r.get("name", "")
        if name in ["Khan Sahib"]:
            await db.reservations.update_one({"id": r["id"]}, {"$set": {"restaurant_id": "rest_mehfil_001"}})
            print(f"  Fixed {name} -> rest_mehfil_001")
        elif name in ["Reddy Family"]:
            await db.reservations.update_one({"id": r["id"]}, {"$set": {"restaurant_id": "rest_spice_garden_001"}})
            print(f"  Fixed {name} -> rest_spice_garden_001")
        else:
            print(f"  Skipped {name} (unknown)")
    print("Done")

asyncio.run(fix())
