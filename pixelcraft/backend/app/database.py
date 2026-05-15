from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGODB_URI, DATABASE_NAME

class Database:
    client: AsyncIOMotorClient = None
    
db_instance = Database()

async def connect_to_mongo():
    """Connect to MongoDB"""
    db_instance.client = AsyncIOMotorClient(MONGODB_URI)
    print(f"Connected to MongoDB at {MONGODB_URI}")

async def close_mongo_connection():
    """Close MongoDB connection"""
    if db_instance.client:
        db_instance.client.close()
        print("Closed MongoDB connection")

def get_database():
    """Get database instance"""
    return db_instance.client[DATABASE_NAME]
