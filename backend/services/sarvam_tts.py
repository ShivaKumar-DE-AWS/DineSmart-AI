import aiohttp
import os
import logging
import base64

logger = logging.getLogger(__name__)

async def generate_tts(text: str) -> bytes:
    """
    Calls Sarvam Bulbul API to generate TTS and returns PCM bytes.
    """
    api_key = os.getenv("SARVAM_API_KEY")
    if not api_key:
        logger.warning("SARVAM_API_KEY is not set for TTS!")
        return b""
        
    url = "https://api.sarvam.ai/text-to-speech"
    headers = {
        "api-subscription-key": api_key,
        "Content-Type": "application/json"
    }
    payload = {
        "inputs": [text],
        "target_language_code": "en-IN",
        "speaker": "meera",
        "pitch": 0,
        "pace": 1.13,
        "loudness": 1.5,
        "speech_sample_rate": 16000,
        "enable_preprocessing": True,
        "model": "bulbul:v1"
    }
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=payload, headers=headers) as response:
                if response.status == 200:
                    data = await response.json()
                    # The response typically contains a base64 encoded string in `audios` array
                    audios = data.get("audios", [])
                    if audios:
                        # audio[0] is base64 encoded PCM16 or WAV
                        b64_audio = audios[0]
                        return base64.b64decode(b64_audio)
                else:
                    err = await response.text()
                    logger.error(f"Sarvam TTS failed with {response.status}: {err}")
    except Exception as e:
        logger.error(f"Failed to generate TTS from Sarvam: {e}")
        
    return b""
