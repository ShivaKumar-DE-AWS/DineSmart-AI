import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import Response
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
You have real-time awareness of the user's screen. If the user uses pronouns like 'this', 'that', or 'the first one', refer to the [CURRENT SCREEN STATE] to deduce the item and execute the appropriate tool.
Rules:
1. BREVITY: Keep all responses to STRICTLY 1 or 2 short sentences. You are speaking out loud. Do not use markdown or lists.
2. ACTION FIRST: If the user asks for food, strictly use the update_cart tool first before responding.
3. CONVERSATIONAL UPSELL: Suggest logical pairings naturally. If they are ready to checkout, explicitly trigger analyze_checkout_upsell.
4. If a tool fails, politely inform the user.
5. You must never invent items. Use get_live_menu to see what is available.
6. SILENT TOOL EXECUTIONS: When you successfully execute `update_cart`, do NOT generate any conversational text in your response. The system will automatically speak a confirmation and upsell to the user. Be completely silent.
"""

async def generate_tts_audio(text: str) -> bytes:
    """Synthesize speech from text using Edge TTS with Google TTS fallback."""
    try:
        import edge_tts
        import asyncio
        # Basic heuristic to detect language for Voice selection
        voice = "en-IN-NeerjaNeural"
        if any(char in text for char in ["ह", "क", "म", "न", "स", "त"]):
            voice = "hi-IN-SwaraNeural"
        elif any(char in text for char in ["న", "మ", "స", "క", "ర", "ప", "చ"]):
            voice = "te-IN-ShrutiNeural"
            
        communicate = edge_tts.Communicate(text, voice)
        audio_data = bytearray()
        
        # Add timeout to edge_tts stream to prevent hanging on Render/Vercel
        async def fetch_edge():
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data.extend(chunk["data"])
                    
        await asyncio.wait_for(fetch_edge(), timeout=4.0)
        
        if len(audio_data) > 0:
            return bytes(audio_data)
            
    except Exception as e:
        logger.error(f"[TTS] Edge TTS failed or timed out: {e}. Falling back to Google TTS.")
        
    # Google TTS Fallback
    try:
        import httpx
        import urllib.parse
        # Default to hi-in if hindi characters, otherwise en-in
        tl = "hi-in" if any(char in text for char in ["ह", "क", "म", "न", "स", "त"]) else "en-in"
        url = f"https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl={tl}&client=tw-ob"
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=5.0)
            if response.status_code == 200:
                return response.content
            else:
                logger.error(f"[TTS] Google TTS fallback failed with status {response.status_code}")
    except Exception as fallback_err:
        logger.error(f"[TTS] Google TTS fallback exception: {fallback_err}")
        
    return b""

async def execute_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """Dynamically routes tool calls to python functions."""
    if tool_name == "get_live_menu":
        return await get_live_menu(**args)
    elif tool_name == "update_cart":
        return await update_cart(**args)
    elif tool_name == "analyze_checkout_upsell":
        return await analyze_checkout_upsell(**args)
    return "Error: Unknown tool."

@router.get("/api/tts")
async def get_tts_audio_endpoint(text: str = ""):
    if not text:
        return Response(status_code=400)
    audio = await generate_tts_audio(text)
    if not audio:
        return Response(status_code=500)
    return Response(content=audio, media_type="audio/mpeg")

@router.websocket("/api/ws/voice-agent/{restaurant_id}")
async def voice_agent_endpoint(websocket: WebSocket, restaurant_id: str):
    await websocket.accept()
    
    device_id = websocket.query_params.get("device_id", "unknown_device")
    logger.info(f"[VoiceAgent] Client connected: {device_id} for {restaurant_id}")

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    is_executing_tool = False
    message_queue = asyncio.Queue()
    session_ui_state = {}

    # Background task to continuously drain the ASGI websocket buffer
    async def receive_loop():
        try:
            while True:
                msg = await websocket.receive()
                if "text" in msg:
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
                try:
                    data = json.loads(msg["data"])
                except Exception:
                    continue
                    
                if data.get("type") == "SPEAK":
                    text_to_speak = data.get("text")
                    if text_to_speak:
                        audio = await generate_tts_audio(text_to_speak)
                        if audio:
                            await websocket.send_text(json.dumps({"type": "TEXT", "content": text_to_speak}))
                            await websocket.send_bytes(audio)
                    continue
                elif data.get("type") == "USER_TEXT":
                    base_text = data.get("text", "")
                    if not base_text.strip():
                        continue
                    user_input = f"[CURRENT SCREEN STATE: {json.dumps(session_ui_state)}]\n\nUser Speech: \"{base_text}\""
                elif data.get("type") == "EVENT":
                    event_data = data.get("event")
                    user_input = f"[CURRENT SCREEN STATE: {json.dumps(session_ui_state)}]\n\n[SYSTEM EVENT: User manually interacted with UI: {event_data}. Respond and suggest pairings.]"
                elif data.get("type") == "ui_state":
                    # Replace wholesale to keep a clean, bounded snapshot
                    session_ui_state = data.get("state", {})
                    continue
                elif data.get("type") == "init":
                    lang = data.get("language", "en-IN")
                    user_input = f"[EVENT: NEW_SESSION] [TARGET_LANGUAGE: {lang}] [CONTEXT: Returning customer]. Generate a warm, humanoid welcome message introducing yourself as the digital waiter. [CURRENT SCREEN STATE: {json.dumps(session_ui_state)}]"

            if not user_input:
                continue

            final_text = ""
            groq_failed = False
            
            from deps import GROQ_API_KEY
            if GROQ_API_KEY:
                try:
                    from groq import AsyncGroq
                    from routers.voice_tools import GROQ_VOICE_TOOLS_SCHEMA
                    groq_client = AsyncGroq(api_key=GROQ_API_KEY)
                    
                    messages = [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_input}
                    ]
                    
                    while True:
                        response = await asyncio.wait_for(
                            groq_client.chat.completions.create(
                                model="llama-3.1-8b-instant",
                                messages=messages,
                                tools=GROQ_VOICE_TOOLS_SCHEMA,
                                tool_choice="auto",
                                temperature=0.3,
                                max_tokens=256
                            ),
                            timeout=5.0
                        )
                        msg = response.choices[0].message
                        # Ensure msg is appended exactly as it was returned
                        messages.append(msg)
                        
                        if msg.tool_calls:
                            is_executing_tool = True
                            for tc in msg.tool_calls:
                                tool_name = tc.function.name
                                try:
                                    args = json.loads(tc.function.arguments)
                                except:
                                    args = {}
                                logger.info(f"[VoiceAgent-Groq] Tool Call: {tool_name} with {args}")
                                
                                # Inject implicit args
                                if tool_name in ["update_cart", "analyze_checkout_upsell"]:
                                    args["device_id"] = device_id
                                if tool_name in ["get_live_menu", "update_cart"]:
                                    args["restaurant_id"] = restaurant_id
                                    
                                result = await execute_tool(tool_name, args)
                                
                                # Forward any ACTION JSON returned from tools to the frontend
                                try:
                                    parsed_res = json.loads(result)
                                    if isinstance(parsed_res, dict) and parsed_res.get("type") == "ACTION":
                                        await websocket.send_text(result)
                                except json.JSONDecodeError:
                                    pass
                                
                                messages.append({
                                    "role": "tool",
                                    "tool_call_id": tc.id,
                                    "name": tool_name,
                                    "content": result
                                })
                            is_executing_tool = False
                        else:
                            final_text = msg.content or ""
                            break
                except Exception as e:
                    logger.warning(f"[VoiceAgent] Groq failed: {e}. Falling back to Gemini.")
                    groq_failed = True
            else:
                groq_failed = True

            if groq_failed and GEMINI_API_KEY:
                # --- GEMINI FALLBACK ---
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
    
                    # Handle potential tool calls (loop stays inside async with)
                    while True:
                        candidates = response_data.get("candidates", [])
                        if not candidates:
                            break
                            
                        first_candidate = candidates[0]
                        parts = first_candidate.get("content", {}).get("parts", [])
                        
                        function_calls = [p["functionCall"] for p in parts if "functionCall" in p]
                        
                        if not function_calls:
                            break
                            
                        is_executing_tool = True
                        payload["contents"].append(first_candidate["content"])
                        
                        tool_responses_parts = []
                        for func_call in function_calls:
                            tool_name = func_call["name"]
                            args = func_call.get("args", {})
                            logger.info(f"[VoiceAgent-Gemini] Tool Call: {tool_name} with {args}")
                            
                            matching_tools = [k for k in VOICE_TOOLS_SCHEMA if k["name"] == tool_name]
                            if matching_tools:
                                properties = matching_tools[0].get("parameters", {}).get("properties", {})
                                if "device_id" in properties:
                                     args["device_id"] = device_id
                                if "restaurant_id" in properties:
                                     args["restaurant_id"] = restaurant_id
                            
                            result = await execute_tool(tool_name, args)
                            
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
                        
                        payload["contents"].append({
                            "role": "function",
                            "parts": tool_responses_parts
                        })
                        
                        is_executing_tool = False
                        response = await http_client.post(api_url, json=payload, timeout=15.0)
                        response.raise_for_status()
                        response_data = response.json()
    
                    candidates = response_data.get("candidates", [])
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
