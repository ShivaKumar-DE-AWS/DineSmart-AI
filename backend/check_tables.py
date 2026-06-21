import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    tables = await db.tables.find({}, {"_id": 0}).to_list(50)
    print(f"Total tables: {len(tables)}")
    for t in tables:
        rest = t.get("restaurant_id", "NONE")
        num = t.get("number")
        token = t.get("qr_token")
        active = t.get("is_active")
        print(f"  Table {num} | token={token} | rest={rest} | active={active}")
    
    sessions = await db.table_sessions.find({}, {"_id": 0}).to_list(50)
    print(f"\nTotal table sessions: {len(sessions)}")
    for s in sessions:
        print(f"  session={s.get('id', '')[:8]} table_id={s.get('table_id', '')[:8]} status={s.get('status')}")

asyncio.run(check())
