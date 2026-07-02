import asyncio
import json
import logging
import websockets
import os

logger = logging.getLogger(__name__)

class SarvamSTTClient:
    def __init__(self, on_transcript_callback, language_code: str = "unknown"):
        self.api_key = os.getenv("SARVAM_API_KEY")
        if not self.api_key:
            logger.warning("SARVAM_API_KEY is not set!")
        
        self.ws_url = "wss://api.sarvam.ai/speech-to-text/ws"
        self.ws = None
        self.on_transcript = on_transcript_callback
        self.language_code = language_code if language_code and language_code.strip() else "unknown"
        self.receive_task = None
        self.is_connected = False
        
    async def connect(self):
        if not self.api_key:
            return
            
        try:
            try:
                self.ws = await websockets.connect(
                    self.ws_url,
                    additional_headers={"api-subscription-key": self.api_key}
                )
            except TypeError:
                self.ws = await websockets.connect(
                    self.ws_url,
                    extra_headers={"api-subscription-key": self.api_key}
                )
            self.is_connected = True
            logger.info(f"Connected to Sarvam STT streaming API (language: {self.language_code})")
            
            # Send configuration
            config = {
                "language_code": self.language_code,
                "model": "saaras:v1"
            }
            # The exact config schema might vary based on Sarvam's API version.
            await self.ws.send(json.dumps(config))
            
            # Start receiving loop
            self.receive_task = asyncio.create_task(self._receive_loop())
            
        except Exception as e:
            logger.error(f"Failed to connect to Sarvam STT: {e}")
            self.is_connected = False

    async def send_audio(self, pcm_bytes: bytes):
        if self.is_connected and self.ws:
            try:
                await self.ws.send(pcm_bytes)
            except Exception as e:
                logger.error(f"Error sending audio to Sarvam STT: {e}")
                
    async def _receive_loop(self):
        try:
            async for message in self.ws:
                if isinstance(message, str):
                    try:
                        data = json.loads(message)
                        # Depending on Sarvam's response format:
                        transcript = data.get("transcript", "")
                        is_final = data.get("is_final", False)
                        
                        if transcript:
                            await self.on_transcript(transcript, is_final)
                    except json.JSONDecodeError:
                        logger.error(f"Failed to parse Sarvam STT message: {message}")
        except websockets.exceptions.ConnectionClosed:
            logger.info("Sarvam STT connection closed")
        finally:
            self.is_connected = False
            
    async def close(self):
        self.is_connected = False
        if self.ws:
            await self.ws.close()
        if self.receive_task:
            self.receive_task.cancel()
