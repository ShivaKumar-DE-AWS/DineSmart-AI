"""Collaborative cart SSE routes for table sessions."""
import asyncio
import json
import uuid
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from deps import db, now_iso, require_user, current_user

router = APIRouter(tags=["cart"])

# ponytail: in-memory SSE listeners for real-time cart sync (single-worker only)
# For multi-worker deployments, replace with Redis pub/sub
cart_listeners: Dict[str, List[asyncio.Queue]] = {}

def broadcast_cart(session_id: str, cart_data: Dict[str, Any]):
    """Push a cart update to all SSE subscribers of this session."""
    if session_id in cart_listeners:
        for q in cart_listeners[session_id]:
            try:
                q.put_nowait(cart_data)
            except asyncio.QueueFull:
                pass

@router.post("/api/tables/{session_id}/cart")
async def update_cart(session_id: str, request: Request):
    data = await request.json()
    items = data.get("items", [])
    # ponytail: validate cart items structure before broadcasting
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="items must be a list")
    validated_items = []
    for item in items:
        if not isinstance(item, dict):
            continue
        # Only allow expected fields
        validated_items.append({
            "cart_item_id": str(item.get("cart_item_id", "")),
            "item_id": str(item.get("item_id", "")),
            "name": str(item.get("name", ""))[:100],
            "price": float(item.get("price", 0)),
            "qty": max(1, min(99, int(item.get("qty", 1)))),
            "category": str(item.get("category", ""))[:50],
            "notes": str(item.get("notes", ""))[:300] if item.get("notes") else None
        })
    cart_data = {"session_id": session_id, "items": validated_items, "updated_at": now_iso()}
    await db.table_carts.update_one(
        {"session_id": session_id},
        {"$set": cart_data},
        upsert=True
    )
    broadcast_cart(session_id, validated_items)
    return {"ok": True}

@router.get("/api/tables/{session_id}/cart/stream")
async def stream_cart(session_id: str, req: Request):
    """SSE endpoint: streams cart updates for table sessions."""
    session = await db.table_sessions.find_one({"id": session_id})
    if not session:
        return JSONResponse({"detail": "Session not found"}, status_code=404)

    async def stream():
        q: asyncio.Queue = asyncio.Queue()
        cart_listeners.setdefault(session_id, []).append(q)
        try:
            current = await db.table_carts.find_one({"session_id": session_id}, {"_id": 0})
            if current:
                yield f"data: {json.dumps(current.get('items', []))}\n\n"
            while True:
                items = await asyncio.wait_for(q.get(), timeout=30)
                yield f"data: {json.dumps(items)}\n\n"
        except asyncio.TimeoutError:
            pass
        except asyncio.CancelledError:
            pass
        finally:
            if session_id in cart_listeners:
                try:
                    cart_listeners[session_id].remove(q)
                except ValueError:
                    pass
    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}
    )