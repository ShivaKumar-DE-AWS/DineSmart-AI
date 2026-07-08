import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Any

from google import genai
from google.genai import types

from deps import GEMINI_API_KEY, redis_client
from routers.voice_tools import get_live_menu, update_cart, analyze_checkout_upsell, VOICE_TOOLS_SCHEMA

import os
import httpx

SARVAM_API_KEY = os.environ.get("SARVAM_API_KEY")

logger = logging.getLogger(__name__)

router = APIRouter(tags=["voice-agent"])

# The System Prompt as per user instructions
SYSTEM_PROMPT = """You are a highly experienced, Real-Time Voice AI Waiter at a premium restaurant.
Rules:
1. BREVITY: Keep all responses to STRICTLY 1 or 2 short sentences. You are speaking out loud. Do not use markdown or lists.
2. ACTION FIRST: If the user asks for food, strictly use the update_cart tool first before responding.
3. CONVERSATIONAL UPSELL: Suggest logical pairings naturally. If they are ready to checkout, explicitly trigger analyze_checkout_upsell.
4. If a tool fails, politely inform the user.
5. You must never invent items. Use get_live_menu to see what is available.
"""

async def generate_tts_audio(text: str) -> bytes:
    """Synthesize speech from text using Sarvam AI TTS."""
    if not SARVAM_API_KEY:
        logger.warning("[TTS] SARVAM_API_KEY not set.")
        return b""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.sarvam.ai/text-to-speech",
                headers={
                    "api-subscription-key": SARVAM_API_KEY,
                    "Content-Type": "application/json"
                },
                json={
                    "inputs": [text],
                    "target_language_code": "en-IN",
                    "speaker": "anushka", # Sarvam removed 'meera', using 'anushka'
                    "pitch": 0,
                    "pace": 1.0,
                    "loudness": 1.5,
                    "speech_sample_rate": 8000,
                    "enable_preprocessing": True,
                    "model": "bulbul:v1"
                },
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()
            import base64
            # Sarvam returns base64 encoded audio strings in the audios array
            if data.get("audios") and len(data["audios"]) > 0:
                return base64.b64decode(data["audios"][0])
            return b""
    except httpx.HTTPStatusError as e:
        logger.error(f"[TTS] HTTP Error {e.response.status_code}: {e.response.text}")
        return b""
    except Exception as e:
        logger.error(f"[TTS] Error: {e}")
        return b""

async def transcribe_audio(audio_chunk: bytes) -> str:
    """Transcribe audio chunk to text using Sarvam AI STT."""
    if not SARVAM_API_KEY:
        return ""
    try:
        async with httpx.AsyncClient() as client:
            files = {
                'file': ('audio.webm', audio_chunk, 'audio/webm')
            }
            data = {
                'model': 'saaras:v1'
            }
            response = await client.post(
                "https://api.sarvam.ai/speech-to-text-translate",
                headers={
                    "api-subscription-key": SARVAM_API_KEY
                },
                data=data,
                files=files,
                timeout=10.0
            )
            response.raise_for_status()
            result = response.json()
            return result.get("transcript", "")
    except Exception as e:
        logger.error(f"[STT] Error: {e}")
        return ""

async def execute_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """Dynamically routes tool calls to python functions."""
    if tool_name == "get_live_menu":
        return await get_live_menu(**args)
    elif tool_name == "update_cart":
        return await update_cart(**args)
    elif tool_name == "analyze_checkout_upsell":
        return await analyze_checkout_upsell(**args)
    return "Error: Unknown tool."

@router.websocket("/api/ws/voice-agent/{restaurant_id}")
async def voice_agent_endpoint(websocket: WebSocket, restaurant_id: str):
    await websocket.accept()
    
    device_id = websocket.query_params.get("device_id", "unknown_device")
    logger.info(f"[VoiceAgent] Client connected: {device_id} for {restaurant_id}")

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # Initial Welcome flow (Stateless)
    welcome_text = "Welcome! I am your AI Voice Waiter. What can I get started for you today?"
    audio = await generate_tts_audio(welcome_text)
    await websocket.send_text(json.dumps({"type": "TEXT", "content": welcome_text}))
    if audio:
        await websocket.send_bytes(audio)
        
    is_executing_tool = False
    message_queue = asyncio.Queue()

    # Background task to continuously drain the ASGI websocket buffer
    async def receive_loop():
        try:
            while True:
                msg = await websocket.receive()
                if "bytes" in msg:
                    # Buffer, Don't Forward: While is_executing_tool is True, safely drop incoming audio
                    if is_executing_tool:
                        logger.info("[VoiceAgent] Dropping incoming audio frame because tool is currently executing.")
                        continue
                    await message_queue.put({"type": "bytes", "data": msg["bytes"]})
                elif "text" in msg:
                    await message_queue.put({"type": "text", "data": msg["text"]})
        except WebSocketDisconnect:
            pass
        except Exception as e:
            logger.error(f"[VoiceAgent] Receiver error: {e}")
            pass

    receiver_task = asyncio.create_task(receive_loop())

    try:
        while True:
            # Process one message at a time
            msg = await message_queue.get()
            
            user_input = ""
            
            if msg["type"] == "text":
                data = json.loads(msg["data"])
                if data.get("type") == "EVENT":
                    # This happens when the user clicks 'Add to Cart' manually on the UI
                    event_data = data.get("event")
                    user_input = f"[SYSTEM EVENT: User manually interacted with UI: {event_data}. Respond and suggest pairings.]"
            elif msg["type"] == "bytes":
                audio_bytes = msg["data"]
                user_input = await transcribe_audio(audio_bytes)
                if not user_input or not user_input.strip():
                    continue

            if not user_input:
                continue

            # Call Gemini statelessly for this burst using httpx to bypass SDK additionalProperties bug
            gemini_tools = [{"functionDeclarations": VOICE_TOOLS_SCHEMA}]
            
            payload = {
                "systemInstruction": {
                    "parts": [{"text": SYSTEM_PROMPT}]
                },
                "tools": gemini_tools,
                "generationConfig": {
                    "temperature": 0.3
                },
                "contents": [
                    {"role": "user", "parts": [{"text": user_input}]}
                ]
            }
            
            async with httpx.AsyncClient() as http_client:
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
                response = await http_client.post(api_url, json=payload, timeout=15.0)
                response.raise_for_status()
                response_data = response.json()

            # Handle potential tool calls
            while True:
                candidates = response_data.get("candidates", [])
                if not candidates:
                    break
                    
                first_candidate = candidates[0]
                parts = first_candidate.get("content", {}).get("parts", [])
                
                function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
                
                if not function_calls:
                    break
                    
                # Implement a Lock: Flip this to True to drop/buffer incoming client audio
                is_executing_tool = True
                
                # Append model's function call to history
                payload["contents"].append(first_candidate["content"])
                
                tool_responses_parts = []
                
                for func_call in function_calls:
                    tool_name = func_call["name"]
                    args = func_call.get("args", {})
                    
                    logger.info(f"[VoiceAgent] Tool Call: {tool_name} with {args}")
                    
                    # Ensure device_id and restaurant_id are forcibly injected into args if needed
                    matching_tools = [k for k in VOICE_TOOLS_SCHEMA if k["name"] == tool_name]
                    if matching_tools:
                        properties = matching_tools[0].get("parameters", {}).get("properties", {})
                        if "device_id" in properties:
                             args["device_id"] = device_id
                        if "restaurant_id" in properties:
                             args["restaurant_id"] = restaurant_id
                    
                    result = await execute_tool(tool_name, args)
                    
                    # Forward any ACTION JSON returned from tools to the frontend
                    try:
                        parsed_res = json.loads(result)
                        if isinstance(parsed_res, dict) and parsed_res.get("type") == "ACTION":
                            await websocket.send_text(result)
                    except json.JSONDecodeError:
                        pass
                    
                    tool_responses_parts.append({
                        "functionResponse": {
                            "name": tool_name,
                            "response": {"result": result}
                        }
                    })
                
                # Append tool responses to history
                payload["contents"].append({
                    "role": "function",
                    "parts": tool_responses_parts
                })
                
                # Resume and Flush: Once DB finishes, flip to False
                is_executing_tool = False
                
                # Get subsequent response from Gemini after tool execution
                response = await http_client.post(api_url, json=payload, timeout=15.0)
                response.raise_for_status()
                response_data = response.json()

            candidates = response_data.get("candidates", [])
            final_text = ""
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                for p in parts:
                    if "text" in p:
                        final_text += p["text"]
                        
            if final_text:
                logger.info(f"[VoiceAgent] AI Response: {final_text}")
                
                # Send text response back to UI for captioning
                await websocket.send_text(json.dumps({"type": "TEXT", "content": final_text}))
                
                # Synthesize and send audio
                audio_response = await generate_tts_audio(final_text)
                if audio_response:
                    await websocket.send_bytes(audio_response)

    except Exception as e:
        logger.error(f"[VoiceAgent] Error: {e}")
    finally:
        receiver_task.cancel()
        try:
            await websocket.close()
        except:
            pass
