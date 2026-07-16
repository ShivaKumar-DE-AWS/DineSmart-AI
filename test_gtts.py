import httpx
import urllib.parse
import asyncio

async def test_gtts():
    text = 'Hello world from Google TTS'
    url = f'https://translate.google.com/translate_tts?ie=UTF-8&q={urllib.parse.quote(text)}&tl=en-in&client=tw-ob'
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        if response.status_code == 200:
            audio_bytes = response.content
            print(f'Success! {len(audio_bytes)} bytes downloaded.')
        else:
            print(f'Failed with status: {response.status_code}')

asyncio.run(test_gtts())
