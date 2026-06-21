import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()

async def check():
    client = AsyncIOMotorClient(os.getenv("MONGO_URL"))
    db = client[os.getenv("DB_NAME")]
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    print(f"Today (UTC): {today}")
    res = await db.reservations.find({}).to_list(50)
    print(f"Total reservations in DB: {len(res)}")
    for r in res:
        print(f"  {r.get('name')} | date={r.get('date')} | rest={r.get('restaurant_id')} | status={r.get('status')}")
    today_res = await db.reservations.find({"date": today}).to_list(20)
    print(f"Today matches: {len(today_res)}")

asyncio.run(check())
