import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi, os
from dotenv import load_dotenv
load_dotenv()
client = AsyncIOMotorClient(os.environ['MONGO_URL'], tls=True, tlsCAFile=certifi.where())
db = client[os.environ['DB_NAME']]

async def check():
    orders_by_rest = await db.orders.aggregate([{"$group": {"_id": "$restaurant_id", "count": {"$sum": 1}}}]).to_list(10)
    print("=== ORDERS BY RESTAURANT ===")
    for r in orders_by_rest: print(r)

    users_by_rest = await db.users.aggregate([{"$group": {"_id": "$restaurant_id", "count": {"$sum": 1}}}]).to_list(10)
    print("=== USERS BY RESTAURANT ===")
    for r in users_by_rest: print(r)

    rests = await db.restaurants.find({}, {"_id":0, "id":1, "slug":1}).to_list(10)
    print("=== RESTAURANTS ===")
    for r in rests: print(r)

    # Check orders for new restaurants specifically
    gd_orders = await db.orders.count_documents({"restaurant_id": "rest_the-golden-dragon_001"})
    pp_orders = await db.orders.count_documents({"restaurant_id": "rest_pasta-palace_001"})
    print(f"Golden Dragon orders: {gd_orders}")
    print(f"Pasta Palace orders: {pp_orders}")

asyncio.run(check())
