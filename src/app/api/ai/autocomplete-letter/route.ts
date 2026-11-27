import { NextResponse } from "next/server";
import { requireStaffRequest } from "@/lib/firebase/requestAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaffRequest(req);

    const body = await req.json();
    const { text, fieldName, otherContext } = body;

    if (!text || typeof text !== "string" || text.trim().length < 20) {
      return NextResponse.json({ suggestion: "" });
    }

    const apiKey = process.env.LETTER_GENERATOR_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ suggestion: "" });
    }

    const fieldDescriptions: Record<string, string> = {
      letterBody: "the main body of a formal college permission letter",
      subject: "the subject line of a formal college permission letter",
      signOff: "the sign-off / closing paragraph of a formal college permission letter",
      toAddress: "the recipient address block of a formal college letter",
      salutation: "the opening salutation of a formal college letter",
      date: "the date field of a formal letter",
    };

    const fieldDesc = fieldDescriptions[fieldName] || "a formal college letter";
    const contextNote = otherContext ? `\nAdditional context: ${otherContext}` : "";

    const systemInstruction = `You are an AI writing assistant that provides extremely concise inline autocomplete suggestions for ${fieldDesc} at Vardhaman College of Engineering's Connect Club.

Rules:
- Output ONLY the continuation text — no explanations, no preamble, no quotes
- Suggest the NEXT 1–2 sentences or a natural phrase that follows the given text
- Keep formal, professional, academic tone appropriate for official college letters
- Maximum 40 words
- Do NOT repeat any part of the given text
- If the text seems complete, return an empty string${contextNote}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemInstruction },
          {
            role: "user",
            content: `Continue this text naturally:\n\n"${text.slice(-500)}"`,
          },
        ],
        temperature: 0.3,
        max_tokens: 80,
        stop: ["\n\n", "Dear", "Respected", "To,", "Subject:"],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ suggestion: "" });
    }

    const data = await response.json();
    const suggestion = data?.choices?.[0]?.message?.content?.trim() || "";

    // Strip any quotes the model might wrap around it
    const clean = suggestion.replace(/^["']|["']$/g, "").trim();

    return NextResponse.json({ suggestion: clean });
  } catch {
    return NextResponse.json({ suggestion: "" });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
