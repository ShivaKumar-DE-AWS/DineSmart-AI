"""AI Waiter — chat, history, transcribe (STT), speak (TTS) routes."""
import json
import uuid
import asyncio
from typing import Dict, Any, Optional
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse, Response
from deps import (
    db, now_iso, GEMINI_API_KEY, ChatReq, TTSReq, require_user
)

router = APIRouter(tags=["ai-waiter"])

PROMPT_TEMPLATE_PATH = Path(__file__).parent.parent / "prompt_templates" / "ai_waiter_system_prompt.txt"


async def _build_waiter_system_prompt(restaurant_id: str, restaurant_name: str, language: str = "auto", tone: str = "friendly", customer_name: str = None) -> str:
    """Compose the system prompt with the current live menu inlined from template."""
    menu_docs = await db.menu.find(
        {"available": True, "restaurant_id": restaurant_id},
        {"_id": 0, "name": 1, "description": 1, "price": 1, "category": 1, "tags": 1},
    ).to_list(60)
    menu_block = "\n".join(
        f"- {m['name']} ({m['category']}) — ₹{int(m['price'])}: {m['description']}"
        + (f" [tags: {', '.join(m.get('tags') or [])}]" if m.get('tags') else "")
        for m in menu_docs
    )
    categories = {}
    for m in menu_docs:
        cat = m['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(f"{m['name']} (₹{int(m['price'])})")
    cat_summary = "\n".join(f"  {cat}: {', '.join(items)}" for cat, items in categories.items())

    lang_map = {
        "auto": "Detect the guest's language from their message and reply in the SAME language completely. If they mix Hindi/Urdu and English (Hinglish), reply in matching natural Hinglish. If they speak Telugu, Hindi, Urdu, Arabic, or Spanish, respond COMPLETELY in that language. Do not mention that you are switching languages.",
        "en": "Always reply in warm, slightly poetic English.",
        "hi": "Always reply in Hindi (हिन्दी, Devanagari script). Use respectful 'aap'. Keep dish names in their original English form so they match the menu.",
        "ur": "Always reply in Urdu (اردو, Nastaliq script). Use respectful 'aap'. Keep dish names in their original English form.",
        "te": "Always reply in Telugu (తెలుగు script). Keep dish names in their original English form.",
        "ta": "Always reply in Tamil (தமிழ் script). Keep dish names in their original English form.",
        "mr": "Always reply in Marathi (मराठी, Devanagari script). Keep dish names in their original English form.",
    }
    tone_map = {
        "friendly": "Warm, attentive, like a beloved family waiter who remembers your last visit. Sprinkle one tasteful Hyderabadi word per reply ('aadab', 'shukriya', 'subhanallah', 'wallah').",
        "formal": "Refined, restrained, like a Taj concierge. Address the guest as 'sir' or 'madam'.",
        "playful": "Playful, lightly teasing, like a young brother who knows the menu by heart. Use one tasteful pun where it fits.",
        "poetic": "Speak in lyrical, Urdu-flavoured English — short shayari-style cadences. Compare flavours to memories.",
    }
    lang_rule = lang_map.get(language, lang_map["auto"])
    tone_rule = tone_map.get(tone, tone_map["friendly"])
    greeting_rule = f"You are serving a guest named '{customer_name}'. Greet them warmly by name and welcome them back if they seem like a returning customer!" if customer_name else "Greet the guest warmly."
    upsell_rule = "Proactively upsell! If they order a main course (like Biryani or Curry), naturally suggest a pairing like Raita, Naan, or a refreshing beverage."

    # ponytail: load prompt from template file, inject dynamic parts
    template = PROMPT_TEMPLATE_PATH.read_text(encoding="utf-8")
    return template.format(
        restaurant_name=restaurant_name,
        greeting_rule=greeting_rule,
        upsell_rule=upsell_rule,
        lang_rule=lang_rule,
        tone_rule=tone_rule,
        cat_summary=cat_summary,
        menu_block=menu_block,
    )


async def _make_waiter_stream(session_id: str, message: str, system_prompt: str, restaurant_id: str = None):
    """Return an async generator that yields SSE 'data:' lines for the chat reply."""
    async def event_gen():
        try:
            from google import genai
            from google.genai import types as genai_types

            client = genai.Client(api_key=GEMINI_API_KEY)
            history_docs = await db.chat_messages.find({"session_id": session_id}).sort("created_at", 1).to_list(50)
            history = []
            for doc in history_docs:
                role = "user" if doc["role"] == "user" else "model"
                history.append(genai_types.Content(role=role, parts=[genai_types.Part(text=doc["content"])]))

            # ponytail: use native async streaming instead of thread+queue
            models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
            full = ""
            
            for model_name in models_to_try:
                try:
                    response = await client.aio.models.generate_content_stream(
                        model=model_name,
                        contents=[*[{"role": h.role, "parts": [{"text": h.parts[0].text}]} for h in history],
                                  {"role": "user", "parts": [{"text": message}]}],
                        config=genai_types.GenerateContentConfig(system_instruction=system_prompt),
                    )
                    async for chunk in response:
                        if chunk.text:
                            full += chunk.text
                            yield f"data: {json.dumps({'delta': chunk.text})}\n\n"
                    # Success - break out of model retry loop
                    break
                except Exception as e:
                    err_str = str(e).lower()
                    if "quota" in err_str or "rate" in err_str or "not found" in err_str or "not supported" in err_str or "unavailable" in err_str:
                        continue
                    else:
                        raise
            else:
                # All models exhausted
                err_msg = "I'm a bit overwhelmed right now — please try again in a moment!"
                yield f"data: {json.dumps({'error': err_msg})}\n\n"
                return

            await db.chat_messages.insert_one({
                "session_id": session_id, "role": "assistant", "content": full, "created_at": now_iso(),
            })
            if restaurant_id:
                await db.ai_usage_logs.insert_one({
                    "restaurant_id": restaurant_id,
                    "endpoint": "/api/ai-waiter/chat",
                    "timestamp": now_iso()
                })
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    return event_gen


@router.post("/api/ai-waiter/chat")
async def ai_chat(req: ChatReq, user=Depends(require_user)):
    """Streams Gemini's response as SSE."""
    msg_lower = req.message.lower()
    if any(p in msg_lower for p in ["ignore previous", "system prompt", "forget instruction", "you are now", "bypass"]):
        raise HTTPException(status_code=400, detail="Invalid message content")
    if not GEMINI_API_KEY:
        async def mock_event_gen():
            mock_text = "I'm currently operating in offline demo mode since my Gemini brain is disconnected. I can still take your order manually from the menu!"
            yield f"data: {json.dumps({'delta': mock_text})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"
        return StreamingResponse(mock_event_gen(), media_type="text/event-stream",
                                headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})

    session = await db.table_sessions.find_one({"id": req.session_id})
    customer_name = session.get("customer_name") if session else None
    restaurant_id = req.restaurant_id
    restaurant_name = "SmartDine"

    if restaurant_id:
        rest = await db.restaurants.find_one({"id": restaurant_id})
        if rest:
            restaurant_name = rest.get("name", "SmartDine")
    elif session and session.get("restaurant_id"):
        restaurant_id = session["restaurant_id"]
        rest = await db.restaurants.find_one({"id": restaurant_id})
        if rest:
            restaurant_name = rest.get("name", "SmartDine")
    elif session and session.get("table_id"):
        table = await db.tables.find_one({"id": session["table_id"]})
        if table and table.get("restaurant_id"):
            restaurant_id = table["restaurant_id"]
            rest = await db.restaurants.find_one({"id": restaurant_id})
            if rest:
                restaurant_name = rest.get("name", "SmartDine")

    # ponytail: validate restaurant_id matches session (prevents cross-restaurant data leak)
    if session and session.get("restaurant_id") and restaurant_id and session["restaurant_id"] != restaurant_id:
        raise HTTPException(status_code=403, detail="Session belongs to a different restaurant")

    if not restaurant_id:
        raise HTTPException(status_code=400, detail="Could not determine restaurant for this session")

    system_prompt = await _build_waiter_system_prompt(
        restaurant_id=restaurant_id, restaurant_name=restaurant_name,
        language=req.language or "auto", tone=req.tone or "friendly",
        customer_name=customer_name,
    )
    await db.chat_messages.insert_one({
        "session_id": req.session_id, "role": "user", "content": req.message, "created_at": now_iso(),
    })
    event_gen = _make_waiter_stream(req.session_id, req.message, system_prompt, restaurant_id)
    return StreamingResponse(event_gen(), media_type="text/event-stream",
                            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})


@router.get("/api/ai-waiter/history")
async def ai_history(session_id: str, user=Depends(require_user)):
    msgs = await db.chat_messages.find({"session_id": session_id}, {"_id": 0}).sort("created_at", 1).to_list(200)
    return {"messages": msgs}


@router.post("/api/ai-waiter/transcribe")
async def ai_transcribe(file: UploadFile = File(...), language: str = Form(""), user=Depends(require_user)):
    """Transcribe audio to text via Gemini."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY missing")
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty audio")
    if len(raw) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio too large (max 20MB)")
    try:
        from google import genai
        from google.genai import types as genai_types
        client = genai.Client(api_key=GEMINI_API_KEY)
        prompt = "You are an expert transcriber. Transcribe the following audio exactly as spoken. Output ONLY the transcribed text, nothing else."
        if language and language.strip() and language.strip() != "auto":
            prompt += f" The expected language might be {language}."
        mime = file.content_type or "audio/webm"
        models_to_try = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
        for model_name in models_to_try:
            try:
                response = await asyncio.to_thread(
                    client.models.generate_content,
                    model=model_name,
                    contents=[prompt, genai_types.Part.from_bytes(data=raw, mime_type=mime)],
                )
                text = response.text.strip() if response and response.text else ""
                return {"text": text}
            except Exception as inner_e:
                err_str = str(inner_e).lower()
                if "quota" in err_str or "rate" in err_str or "not found" in err_str or "not supported" in err_str or "unavailable" in err_str:
                    continue
                raise
        raise HTTPException(status_code=429, detail="All models at quota limit. Try again shortly.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")


@router.post("/api/ai-waiter/speak")
async def ai_speak(req: TTSReq, user=Depends(require_user)):
    """Convert text to mp3 audio via edge-tts."""
    clean_text = req.text.strip()[:4000]
    if not clean_text:
        raise HTTPException(status_code=400, detail="Empty text")
    try:
        import edge_tts
        voice = "en-IN-NeerjaNeural"
        communicate = edge_tts.Communicate(clean_text, voice)
        audio_data = bytearray()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data.extend(chunk["data"])
        return Response(content=bytes(audio_data), media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS failed: {e}")