import asyncio
import json
import uuid
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from deps import db, now_iso
from services.waiter_orchestrator import WaiterOrchestrator

logger = logging.getLogger(__name__)

router = APIRouter(tags=["ai-waiter-ws"])

@router.websocket("/api/ws/ai-waiter/{session_id}")
async def ai_waiter_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    
    # 1. Fetch Session from DB, or create one
    session = await db.ai_waiter_sessions.find_one({"session_id": session_id})
    if not session:
        # Require a session_start message to init properly
        await websocket.send_json({"type": "error", "message": "Session not initialized. Send session_start first."})
        
    orchestrator = None
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                continue
                
            msg_type = msg.get("type")
            
            if msg_type == "session_start":
                restaurant_id = msg.get("restaurant_id")
                table_id = msg.get("table_id")
                qr_token = msg.get("qr_token", "")
                mode = msg.get("mode", "text")
                
                # Upsert session
                session_doc = {
                    "session_id": session_id,
                    "restaurant_id": restaurant_id,
                    "table_id": table_id,
                    "qr_token": qr_token,
                    "mode": mode,
                    "status": "active",
                    "last_activity_at": now_iso()
                }
                await db.ai_waiter_sessions.update_one(
                    {"session_id": session_id},
                    {"$set": session_doc},
                    upsert=True
                )
                orchestrator = WaiterOrchestrator(session_id, restaurant_id, table_id)
                await websocket.send_json({"type": "session_started", "session_id": session_id})
                
            elif msg_type == "user_text":
                text = msg.get("text", "").strip()
                if not text:
                    continue
                    
                if not orchestrator:
                    await websocket.send_json({"type": "error", "message": "Session not started."})
                    continue
                    
                # Update last activity
                await db.ai_waiter_sessions.update_one({"session_id": session_id}, {"$set": {"last_activity_at": now_iso()}})
                
                # Process via Gemini
                try:
                    response_text = await orchestrator.process_message(text)
                    await websocket.send_json({
                        "type": "assistant_text",
                        "text": response_text
                    })
                    
                    # Push order update if order was modified
                    current_session = await db.ai_waiter_sessions.find_one({"session_id": session_id})
                    if current_session and current_session.get("order_id"):
                        order = await db.orders.find_one({"id": current_session["order_id"]})
                        if order:
                            # Send order update
                            await websocket.send_json({
                                "type": "order_update",
                                "order_id": order["id"],
                                "items": order.get("items", []),
                                "subtotal": order.get("subtotal", 0),
                                "tax": order.get("tax", 0),
                                "total": order.get("total", 0)
                            })
                except Exception as e:
                    logger.error(f"Error processing message: {e}", exc_info=True)
                    await websocket.send_json({
                        "type": "error",
                        "message": "Sorry, I encountered an internal error. Please try again."
                    })

            # Note: Voice processing (voice_start, binary frames) will be added in Phase 2
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass
