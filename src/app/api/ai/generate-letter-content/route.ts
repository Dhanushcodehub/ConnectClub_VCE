import { NextResponse } from "next/server";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaffRequest(req);

    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "A non-empty 'prompt' is required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.LETTER_GENERATOR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "LETTER_GENERATOR_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const systemInstruction = `You are a professional assistant writing formal permission letters and official documents for Connect Club at Vardhaman College of Engineering. 
    You must output your response in strictly valid JSON format with three keys:
    - "subject": The formal subject line of the letter.
    - "content": The exact body paragraphs of the letter.
    - "signOff": The sign-off block at the end of the letter. Always start with "Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering". If the letter is for a specific event, append the event name and date at the very end like "\n\nEvent: [Name]\nDate: [Date]". If not applicable, do not append them.
    Do NOT include the To address, Date at the top, or Salutation (e.g., Respected Sir) in any of the fields.
    Keep the tone extremely formal, respectful, and concise.`;

    // Assuming it's a Groq key (starts with gsk_) since the user provided it.
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", // Using the correct available groq model
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        temperature: 0.4,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(`API Error: ${response.status} ${errText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new Error("Failed to generate content.");
    }

    return NextResponse.json({ content: text });
  } catch (error: unknown) {
    const messageText = error instanceof Error ? error.message : String(error);
    console.error("[api/ai/generate-letter-content] Error:", messageText);
    return NextResponse.json(
      { error: "Failed to generate letter content.", details: messageText },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
