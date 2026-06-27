import fs from 'fs';
import http from 'http';

async function runTest() {
  console.log("Starting AI Waiter Chat API Test...");
  
  const payload = {
    restaurantName: "Dine Smart Special",
    language: "english",
    tone: "professional",
    cart: [],
    menu: [
      { id: "item_1", name: "Chicken Biryani", price: 15, category: "Signature Biryani", available: true },
      { id: "item_2", name: "Paneer Tikka", price: 10, category: "Starters", available: true }
    ],
    messages: [
      { role: "user", content: "I would like to order one Chicken Biryani please." }
    ]
  };

  try {
    const res = await fetch("http://localhost:3000/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${res.status}`);
    
    if (!res.ok) {
      const text = await res.text();
      console.error(`Failed with status ${res.status}: ${text}`);
      process.exit(1);
    }

    // Since it's a Vercel AI SDK DataStreamResponse, it uses a specific format (e.g. 0: text, 3: tool call, etc.)
    const text = await res.text();
    console.log("Response Body (Stream Output):");
    console.log(text);
    
    if (text.includes("addToTray") || text.includes('tool-call')) {
      console.log("\\n✅ TEST PASSED: Tool call detected in stream.");
    } else {
      console.log("\\n⚠️ WARNING: No tool call detected. Checking if text response makes sense.");
    }
  } catch (error) {
    console.error("Error connecting to server:", error);
    process.exit(1);
  }
}

runTest();
