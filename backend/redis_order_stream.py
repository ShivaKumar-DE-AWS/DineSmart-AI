"""Redis-backed order streaming for SSE endpoints (replaces in-memory queues).
Provides distributed pub/sub for order updates across multiple workers.
"""
import os
import json
import redis.asyncio as redis
from typing import Optional, Callable
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "")

class RedisOrderStream:
    """Manages order updates via Redis Pub/Sub."""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.pubsub = None
        self.channel_prefix = "orders:"
    
    async def connect(self):
        """Initialize Redis connection."""
        if not REDIS_URL:
            logger.warning("REDIS_URL not set. Order streaming will be unavailable.")
            return
        
        try:
            self.redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
            await self.redis_client.ping()
            logger.info("✅ Connected to Redis for order streaming")
        except Exception as e:
            logger.error(f"❌ Failed to connect to Redis: {e}")
            self.redis_client = None
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
    
    async def broadcast_order_update(self, restaurant_id: str, order_data: dict) -> bool:
        """Publish order update to all subscribers of this restaurant.
        
        Args:
            restaurant_id: The restaurant to broadcast to
            order_data: The order update payload
        
        Returns:
            True if broadcast succeeded, False otherwise
        """
        if not self.redis_client:
            logger.debug("Redis not available; skipping broadcast")
            return False
        
        channel = f"{self.channel_prefix}{restaurant_id}"
        try:
            subscribers = await self.redis_client.publish(
                channel,
                json.dumps(order_data)
            )
            logger.debug(f"Broadcast to {subscribers} subscriber(s) on {channel}")
            return True
        except Exception as e:
            logger.error(f"Failed to broadcast on {channel}: {e}")
            return False
    
    async def subscribe(self, restaurant_id: str) -> Optional[redis.client.PubSub]:
        """Subscribe to order updates for a restaurant.
        
        Args:
            restaurant_id: The restaurant to subscribe to
        
        Returns:
            PubSub object for consuming messages, or None if Redis unavailable
        """
        if not self.redis_client:
            return None
        
        channel = f"{self.channel_prefix}{restaurant_id}"
        pubsub = self.redis_client.pubsub()
        await pubsub.subscribe(channel)
        logger.debug(f"Subscribed to {channel}")
        return pubsub

# Singleton instance
order_stream = RedisOrderStream()
