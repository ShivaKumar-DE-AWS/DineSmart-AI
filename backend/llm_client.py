import json
import logging
import asyncio
from typing import Type, TypeVar, Optional, Any
from pydantic import BaseModel
from deps import GROQ_API_KEY, GEMINI_API_KEY

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

async def generate_structured_json(prompt: str, schema_cls: Type[T], system_prompt: str = "", model_preference: str = "llama-3.3-70b-versatile") -> Optional[T]:
    """Generates structured JSON using Groq with an automatic fallback to Gemini."""
    
    groq_err = "Not attempted or no API Key"
    gemini_err = "Not attempted or no API Key"
    
    # Attempt Groq first
    if GROQ_API_KEY:
        try:
            from groq import AsyncGroq
            client = AsyncGroq(api_key=GROQ_API_KEY)
            schema_json = schema_cls.model_json_schema()
            
            messages = []
            sys_msg = system_prompt + f"\n\nCRITICAL: You MUST return ONLY raw valid JSON that strictly matches this JSON Schema:\n{json.dumps(schema_json)}\nDo not wrap in markdown blocks like ```json."
            messages.append({"role": "system", "content": sys_msg.strip()})
            messages.append({"role": "user", "content": prompt})

            # Use timeout to prevent hanging
            response = await asyncio.wait_for(
                client.chat.completions.create(
                    messages=messages,
                    model=model_preference,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=800,
                ),
                timeout=4.0
            )
            raw = response.choices[0].message.content
            return schema_cls.model_validate_json(raw)
        except Exception as e:
            groq_err = str(e)
            logger.warning(f"[llm_client] Groq generation failed: {e}. Falling back to Gemini.")

    # Fallback to Gemini
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types as genai_types
            
            client = genai.Client(api_key=GEMINI_API_KEY)
            config = genai_types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=800,
                response_mime_type="application/json",
            )
            
            full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-2.5-flash",
                    contents=full_prompt,
                    config=config,
                ),
                timeout=5.0
            )
            
            import re
            raw = (getattr(response, "text", None) or "").strip()
            json_match = re.search(r'\{.*\}', raw, re.DOTALL)
            if json_match:
                raw = json_match.group(0)
            else:
                raw = raw.strip()
                
            return schema_cls.model_validate_json(raw)
        except Exception as e:
            gemini_err = str(e)
            logger.error(f"[llm_client] Gemini fallback also failed: {e}")
            
    # If we got here, everything failed. Raise a detailed error.
    error_msg = f"Groq Error: {groq_err} | Gemini Error: {gemini_err}"
    raise Exception(error_msg)
