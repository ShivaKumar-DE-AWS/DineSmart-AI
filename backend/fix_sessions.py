import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def fix():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db_name = os.getenv("DB_NAME")
    db = client[db_name]
    
    sessions = await db.table_sessions.find({"restaurant_id": {"$exists": False}}).to_list(50)
    print(f"Sessions without restaurant_id: {len(sessions)}")
    
    for s in sessions:
        table_id = s.get("table_id")
        if table_id:
            table = await db.tables.find_one({"id": table_id})
            if table and table.get("restaurant_id"):
                await db.table_sessions.update_one(
                    {"id": s["id"]},
                    {"$set": {"restaurant_id": table["restaurant_id"]}}
                )
                print(f"  Fixed session {s['id'][:8]} -> {table['restaurant_id']}")
            else:
                print(f"  Skipped session {s['id'][:8]} (table has no restaurant_id)")
        else:
            print(f"  Skipped session {s['id'][:8]} (no table_id)")
    
    print("Done")

asyncio.run(fix())
