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
                    "speaker": "meera", # Or "shubh", "meera" for english/hindi
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

@router.websocket("/ws/voice-agent/{restaurant_id}")
async def voice_agent_endpoint(websocket: WebSocket, restaurant_id: str):
    await websocket.accept()
    
    device_id = websocket.query_params.get("device_id", "unknown_device")
    logger.info(f"[VoiceAgent] Client connected: {device_id} for {restaurant_id}")

    # Initialize Gemini Client
    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # We maintain conversational memory. If Redis is available, we load past history.
    chat_history = []
    mem_key = f"voice_mem:{device_id}"
    if redis_client:
        cached_mem = await redis_client.get(mem_key)
        if cached_mem:
            chat_history = json.loads(cached_mem)

    # Initial Welcome flow if the history is empty
    if not chat_history:
        welcome_text = "Welcome! I am your AI Voice Waiter. What can I get started for you today?"
        audio = await generate_tts_audio(welcome_text)
        await websocket.send_text(json.dumps({"type": "TEXT", "content": welcome_text}))
        if audio:
            await websocket.send_bytes(audio)
        chat_history.append({"role": "model", "parts": [{"text": welcome_text}]})
        
    try:
        while True:
            # We can receive either TEXT (json events) or BYTES (audio chunks)
            message = await websocket.receive()
            
            user_input = ""
            
            if "text" in message:
                data = json.loads(message["text"])
                if data.get("type") == "EVENT":
                    # This happens when the user clicks 'Add to Cart' manually on the UI
                    event_data = data.get("event")
                    user_input = f"[SYSTEM EVENT: User manually interacted with UI: {event_data}. Respond and suggest pairings.]"
            elif "bytes" in message:
                audio_bytes = message["bytes"]
                user_input = await transcribe_audio(audio_bytes)
                if not user_input or not user_input.strip():
                    continue

            if not user_input:
                continue

            logger.info(f"[VoiceAgent] User Input: {user_input}")
            chat_history.append({"role": "user", "parts": [{"text": user_input}]})

            # Call Gemini
            gemini_tools = [{"function_declarations": VOICE_TOOLS_SCHEMA}]
            
            config = types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                tools=gemini_tools,
                temperature=0.3
            )
            
            # Format history for genai SDK (convert dicts to types.Content)
            contents = []
            for msg in chat_history:
                contents.append(
                    types.Content(role=msg["role"], parts=[types.Part.from_text(p["text"]) for p in msg["parts"]])
                )
                
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=contents,
                config=config
            )

            # Handle potential tool calls
            while response.function_calls:
                for func_call in response.function_calls:
                    tool_name = func_call.name
                    args = func_call.args
                    
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
                    
                    # Append function call and response to history
                    contents.append(response.candidates[0].content)
                    contents.append(
                        types.Content(
                            role="tool",
                            parts=[
                                types.Part.from_function_response(
                                    name=tool_name,
                                    response={"result": result}
                                )
                            ]
                        )
                    )
                
                # Get subsequent response from Gemini after tool execution
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=contents,
                    config=config
                )

            final_text = response.text
            if final_text:
                logger.info(f"[VoiceAgent] AI Response: {final_text}")
                # Save to history
                chat_history.append({"role": "model", "parts": [{"text": final_text}]})
                
                if redis_client:
                    # Save last 10 messages to Redis
                    await redis_client.setex(mem_key, 3600, json.dumps(chat_history[-10:]))
                
                # Send text response back to UI for captioning
                await websocket.send_text(json.dumps({"type": "TEXT", "content": final_text}))
                
                # Synthesize and send audio
                audio_response = await generate_tts_audio(final_text)
                if audio_response:
                    await websocket.send_bytes(audio_response)

    except WebSocketDisconnect:
        logger.info(f"[VoiceAgent] Client disconnected: {device_id}")
    except Exception as e:
        logger.error(f"[VoiceAgent] Error: {e}")
        try:
            await websocket.close()
        except:
            pass
