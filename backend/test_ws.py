import asyncio
import websockets
import json
import base64

async def test_voice_agent():
    uri = "ws://localhost:8000/ws/voice-agent/test_rest?device_id=test_dev"
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket.")
            
            # 1. Listen for Welcome Text
            resp1 = await websocket.recv()
            print("Received:", resp1)
            
            # 2. Listen for Welcome Audio
            resp2 = await websocket.recv()
            if isinstance(resp2, bytes):
                print(f"Received audio bytes: {len(resp2)} bytes")
            else:
                print("Expected bytes, got:", resp2)
                
            # 3. Send a simulated ITEM_ADDED event
            event_payload = json.dumps({"type": "EVENT", "event": "ITEM_ADDED"})
            await websocket.send(event_payload)
            print("Sent ITEM_ADDED event.")
            
            # 4. Wait for Gemini response text
            resp3 = await websocket.recv()
            print("Received:", resp3)
            
            # 5. Wait for Gemini response audio
            resp4 = await websocket.recv()
            if isinstance(resp4, bytes):
                print(f"Received audio bytes: {len(resp4)} bytes")
            else:
                print("Expected bytes, got:", resp4)
                
    except Exception as e:
        print("WebSocket Error:", e)

if __name__ == "__main__":
    asyncio.run(test_voice_agent())
