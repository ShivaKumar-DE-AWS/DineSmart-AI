"""Caching service for hot data (menu, restaurant config, etc.).
Provides TTL-based local and Redis caching.
"""
import json
import time
from typing import Optional, Dict, Any, Callable
import redis.asyncio as redis
import os
import logging

logger = logging.getLogger(__name__)

REDIS_URL = os.environ.get("REDIS_URL", "").strip()
if "redis://" in REDIS_URL or "rediss://" in REDIS_URL:
    import re
    match = re.search(r'(redis[s]?://[^\s"']+)', REDIS_URL)
    if match:
        REDIS_URL = match.group(1)

class CacheService:
    """Distributed cache with local TTL fallback."""
    
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self.local_cache: Dict[str, tuple[Any, float]] = {}  # (value, expiry_time)
        self.redis_client: Optional[redis.Redis] = None
    
    async def connect(self):
        """Initialize Redis connection."""
        if not REDIS_URL:
            logger.debug("REDIS_URL not set. Using local cache only.")
            return
        
        try:
            self.redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
            await self.redis_client.ping()
            logger.info("✅ Connected to Redis for caching")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis for caching: {e}")
            self.redis_client = None
    
    async def disconnect(self):
        """Close Redis connection."""
        if self.redis_client:
            await self.redis_client.close()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache.
        
        Returns:
            Cached value or None if expired/missing
        """
        # Try Redis first
        if self.redis_client:
            try:
                value = await self.redis_client.get(key)
                if value:
                    logger.debug(f"Cache HIT (Redis): {key}")
                    return json.loads(value)
            except Exception as e:
                logger.warning(f"Redis get failed for {key}: {e}")
        
        # Try local cache
        if key in self.local_cache:
            value, expiry = self.local_cache[key]
            if time.time() < expiry:
                logger.debug(f"Cache HIT (Local): {key}")
                return value
            else:
                del self.local_cache[key]
        
        logger.debug(f"Cache MISS: {key}")
        return None
    
    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with TTL.
        
        Args:
            key: Cache key
            value: Value to cache (must be JSON-serializable)
            ttl: Optional TTL in seconds (uses instance default if not provided)
        
        Returns:
            True if successful, False otherwise
        """
        ttl = ttl or self.ttl
        
        # Set Redis
        if self.redis_client:
            try:
                await self.redis_client.setex(
                    key,
                    ttl,
                    json.dumps(value)
                )
                logger.debug(f"Cache SET (Redis): {key} (ttl={ttl}s)")
            except Exception as e:
                logger.warning(f"Redis set failed for {key}: {e}")
        
        # Set local cache
        self.local_cache[key] = (value, time.time() + ttl)
        logger.debug(f"Cache SET (Local): {key} (ttl={ttl}s)")
        return True
    
    async def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if self.redis_client:
            try:
                await self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"Redis delete failed for {key}: {e}")
        
        self.local_cache.pop(key, None)
        logger.debug(f"Cache DELETE: {key}")
        return True
    
    async def clear_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern (e.g., 'menu:*').
        
        Returns:
            Number of keys deleted
        """
        deleted = 0
        
        if self.redis_client:
            try:
                keys = await self.redis_client.keys(pattern)
                if keys:
                    deleted += await self.redis_client.delete(*keys)
                    logger.debug(f"Cache CLEAR (Redis): {pattern} ({deleted} keys)")
            except Exception as e:
                logger.warning(f"Redis clear failed for pattern {pattern}: {e}")
        
        # Clear local cache
        import fnmatch
        local_keys = [k for k in self.local_cache.keys() if fnmatch.fnmatch(k, pattern)]
        for k in local_keys:
            del self.local_cache[k]
            deleted += 1
        
        if local_keys:
            logger.debug(f"Cache CLEAR (Local): {pattern} ({len(local_keys)} keys)")
        
        return deleted

# Singleton instances
menu_cache = CacheService(ttl_seconds=300)  # 5 minutes
config_cache = CacheService(ttl_seconds=600)  # 10 minutes
