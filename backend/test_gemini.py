import os
import asyncio
from google import genai
from google.genai import types

# 1. Initialize the client exactly like your main app
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Mock Database Tools to see if Gemini actually triggers your code
def update_cart(action: str, item_name: str, qty: int, notes: str) -> str:
    print(f"\n[SYSTEM ACTION SUCCESS]: Executed update_cart({action}, {item_name}, qty={qty}, notes='{notes}')")
    return f"Success: {qty}x {item_name} added to database."

# Define the tools exactly how Gemini expects them
my_tools = [update_cart]

system_instruction = """
You are a fast voice waiter. 
If the user wants food, you MUST call the `update_cart` tool immediately. 
Keep spoken responses to 1 short sentence.
"""

async def simulate_voice_conversation():
    print("🤖 Starting AI Waiter Engine Simulation...")
    
    # Simulate a user speaking: "I want two orders of hot spicy chicken lollipops please"
    user_speech_transcription = "I want two orders of hot spicy chicken lollipops please"
    print(f"\nUser Says: '{user_speech_transcription}'")

    # Call Gemini exactly how your WebSocket loop does
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=user_speech_transcription,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            tools=my_tools,
            temperature=0.2
        ),
    )

    # 2. Test if Gemini correctly identified the tool call
    if response.function_calls:
        print("\n✅ SUCCESS: Gemini correctly identified the tool call configuration!")
        for function_call in response.function_calls:
            name = function_call.name
            args = function_call.args
            print(f"-> Gemini wants to execute: {name} with arguments: {args}")
            
            # Execute the local tool mock
            if name == "update_cart":
                tool_result = update_cart(**args)
                
                # Send the database confirmation back to Gemini so it can speak to the user
                follow_up = client.models.generate_content(
                    model='gemini-2.5-flash',
                    contents=[
                        types.Content(role="user", parts=[types.Part.from_text(text=user_speech_transcription)]),
                        response.candidates[0].content, # AI's tool request
                        types.Content(role="tool", parts=[
                            types.Part.from_function_response(name=name, response={"result": tool_result})
                        ])
                    ],
                    config=types.GenerateContentConfig(system_instruction=system_instruction, tools=my_tools)
                )
                print(f"\nAI Spoken Response (Text-to-Speech Input): \"{follow_up.text.strip()}\"")
    else:
        print("\n❌ FAILURE: Gemini did not call the tool. Check your API key or tool registration syntax.")

if __name__ == "__main__":
    asyncio.run(simulate_voice_conversation())
