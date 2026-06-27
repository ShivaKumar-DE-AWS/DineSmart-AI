// @ts-nocheck
import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages, menu, cart, language, tone, restaurantName } = await req.json();

    // Construct a comprehensive system prompt
    const systemPrompt = `You are a highly intelligent, premium AI Waiter for a restaurant named "${restaurantName}".
Your role is to assist customers, recommend dishes, and manage their order tray.

## Menu
You have access to the following menu:
${JSON.stringify(menu, null, 2)}

## User's Current Order Tray
${cart && cart.length > 0 ? JSON.stringify(cart, null, 2) : "The user's tray is currently empty."}

## Guidelines
- Be concise, helpful, and conversational.
- Your tone should be ${tone}.
- The user prefers to speak in ${language === 'auto' ? 'their detected language' : language}. Always respond in this language natively if possible, or english.
- Do not make up menu items. Only recommend items from the provided menu.
- If the user asks to add an item to their order, use the \`addToTray\` tool. DO NOT say you added it if you didn't use the tool.
- If the user wants to remove an item, use the \`removeFromTray\` tool.
- If the user is ready to pay, use the \`proceedToCheckout\` tool.
- Only use tools when explicitly requested or strongly implied by the user.

Remember, you represent a premium dining experience.`;

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages,
      tools: {
        addToTray: tool({
          description: "Add a specific menu item to the user's order tray. Call this when the user says they want to order something.",
          parameters: z.object({
            itemId: z.string().describe("The ID of the menu item to add"),
            quantity: z.number().default(1).describe("The number of items to add"),
            itemName: z.string().describe("The name of the item being added, for confirmation"),
          }),
        }),
        removeFromTray: tool({
          description: "Remove a menu item from the user's order tray or decrease its quantity.",
          parameters: z.object({
            itemId: z.string().describe("The ID of the menu item to remove"),
            quantity: z.number().default(1).describe("The quantity to remove. Pass a large number to remove completely."),
          }),
        }),
        proceedToCheckout: tool({
          description: "Navigate the user to the checkout screen when they are ready to pay.",
          parameters: z.object({}),
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
