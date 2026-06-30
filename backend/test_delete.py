
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import certifi

async def run():
    client = AsyncIOMotorClient('mongodb+srv://dinesmart:dinesmart123@cluster0.mongodb.net/dinesmart?retryWrites=true&w=majority', tls=True, tlsCAFile=certifi.where())
    db = client['dinesmart']
    res = await db.users.delete_many({'email': 'smartdine.ai2@gmail.com'})
    print(f'Deleted {res.deleted_count} users')

asyncio.run(run())

