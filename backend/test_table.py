
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

async def run():
    client = AsyncIOMotorClient('mongodb+srv://dinesmart:dinesmart123@cluster0.mongodb.net/dinesmart?retryWrites=true&w=majority', tls=True, tlsCAFile=certifi.where())
    db = client['dinesmart']
    
    # Let's insert a table directly using motor to see if it throws
    doc = {
        'number': 999,
        'capacity': 4,
        'is_active': True,
        'restaurant_id': 'test_restro_id'
    }
    await db.tables.insert_one(doc)
    doc.pop('_id', None)
    print(doc)
    
asyncio.run(run())

