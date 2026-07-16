import asyncio
from edge_tts import Communicate

async def main():
    text = "Hello world"
    voice = "en-IN-NeerjaNeural"
    communicate = Communicate(text, voice)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    with open("test.mp3", "wb") as f:
        f.write(audio_data)
    print(f"Success! {len(audio_data)} bytes")

asyncio.run(main())
