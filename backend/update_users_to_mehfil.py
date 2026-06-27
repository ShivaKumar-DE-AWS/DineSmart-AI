import asyncio
import os
import certifi
from motor.motor_asyncio import AsyncIOMotorClient

async def update_users():
    client = AsyncIOMotorClient("mongodb+srv://dinesmart:dinesmart123@cluster0.mongodb.net/dinesmart?retryWrites=true&w=majority", tls=True, tlsCAFile=certifi.where())
    db = client["dinesmart"]
    
    # Update restaurant_slug
    res = await db.users.update_many({"restaurant_slug": "mehfil-hyderabad"}, {"$set": {"restaurant_slug": "mehfil"}})
    print(f"Updated {res.modified_count} users' restaurant_slug")
    
    # Update emails
    users = await db.users.find({"email": {"$regex": "mehfil-hyderabad"}}).to_list(None)
    for u in users:
        new_email = u["email"].replace("mehfil-hyderabad", "mehfil")
        await db.users.update_one({"_id": u["_id"]}, {"$set": {"email": new_email}})
    print(f"Updated {len(users)} users' emails")
    
    # We should also check tables and orders for any mehfil-hyderabad references if they exist
    res = await db.tables.update_many({"restaurant_slug": "mehfil-hyderabad"}, {"$set": {"restaurant_slug": "mehfil"}})
    print(f"Updated {res.modified_count} tables")
    
    res = await db.orders.update_many({"restaurant_slug": "mehfil-hyderabad"}, {"$set": {"restaurant_slug": "mehfil"}})
    print(f"Updated {res.modified_count} orders")
    
    res = await db.restaurants.update_many({"slug": "mehfil-hyderabad"}, {"$set": {"slug": "mehfil"}})
    print(f"Updated {res.modified_count} restaurants")

    res = await db.restaurant_configs.update_many({"slug": "mehfil-hyderabad"}, {"$set": {"slug": "mehfil"}})
    print(f"Updated {res.modified_count} restaurant configs")

    print("Database updated!")

if __name__ == "__main__":
    asyncio.run(update_users())
