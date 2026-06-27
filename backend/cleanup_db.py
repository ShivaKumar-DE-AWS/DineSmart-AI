import asyncio
import motor.motor_asyncio
import certifi

async def run():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb+srv://dinesmart:dinesmart123@cluster0.mongodb.net/dinesmart?retryWrites=true&w=majority", tls=True, tlsCAFile=certifi.where())
    db = client["dinesmart"]
    
    docs = await db.restaurant_configs.find({}).to_list(None)
    for d in docs:
        print(d.get("slug"), d.get("config", {}).get("name"))

    print("Checking for duplicate mehfil:")
    # Clean up duplicate mehfils
    mehfils = await db.restaurant_configs.find({"slug": "mehfil"}).to_list(None)
    print("Found", len(mehfils), "mehfils")
    if len(mehfils) > 1:
        # keep the first one, delete the rest
        for m in mehfils[1:]:
            await db.restaurant_configs.delete_one({"_id": m["_id"]})
            print("Deleted duplicate config:", m["_id"])
            
    # Remove any remaining mehfil-hyderabad
    res = await db.restaurant_configs.delete_many({"slug": "mehfil-hyderabad"})
    if res.deleted_count > 0:
        print(f"Deleted {res.deleted_count} remaining mehfil-hyderabad configs")

asyncio.run(run())
