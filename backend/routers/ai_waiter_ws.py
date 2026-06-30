import asyncio
import json
import uuid
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from deps import db, now_iso
from services.waiter_orchestrator import WaiterOrchestrator
from services.sarvam_stt import SarvamSTTClient
from services.sarvam_tts import generate_tts

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
    stt_client = None
    
    async def on_transcript(transcript: str, is_final: bool):
        # Stream partials to UI
        if not is_final:
            await websocket.send_json({"type": "partial_transcript", "text": transcript})
        else:
            await websocket.send_json({"type": "final_transcript", "text": transcript})
            # Process via Gemini
            if orchestrator:
                await handle_user_text(transcript)

    async def handle_user_text(text: str):
        # Update last activity
        await db.ai_waiter_sessions.update_one({"session_id": session_id}, {"$set": {"last_activity_at": now_iso()}})
        
        # Process via Gemini
        try:
            response_text = await orchestrator.process_message(text)
            await websocket.send_json({
                "type": "assistant_text",
                "text": response_text
            })
            
            # Trigger TTS
            audio_bytes = await generate_tts(response_text)
            if audio_bytes:
                await websocket.send_bytes(audio_bytes)
            
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

    try:
        while True:
            message = await websocket.receive()
            if "bytes" in message:
                if stt_client and stt_client.is_connected:
                    await stt_client.send_audio(message["bytes"])
                continue
                
            if "text" not in message:
                continue
                
            data = message["text"]
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
                
            elif msg_type == "voice_start":
                if not stt_client:
                    stt_client = SarvamSTTClient(on_transcript)
                    await stt_client.connect()
                elif not stt_client.is_connected:
                    await stt_client.connect()
                await websocket.send_json({"type": "voice_started"})
                    
            elif msg_type == "voice_stop":
                if stt_client:
                    await stt_client.close()
                await websocket.send_json({"type": "voice_stopped"})
                
            elif msg_type == "user_text":
                text = msg.get("text", "").strip()
                if not text:
                    continue
                    
                if not orchestrator:
                    await websocket.send_json({"type": "error", "message": "Session not started."})
                    continue
                    
                await handle_user_text(text)
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        try:
            await websocket.close()
        except:
            pass
    finally:
        if stt_client:
            await stt_client.close()
