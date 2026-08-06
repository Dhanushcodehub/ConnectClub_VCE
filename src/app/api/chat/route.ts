import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { eventsData } from "@/lib/data/events";
import { projectsData } from "@/lib/data/projects";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(req: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Gemini API Key is not configured." }, { status: 500 });
    }

    const { messages } = await req.json();
    
    // RAG Lite: Fetch club knowledge
    let knowledgeContext = "";
    try {
      // In a real app, this would query the `knowledge_base` collection in Firestore.
      // For now, we'll build a context string from our events and projects data
      const eventsContext = eventsData.map(e => `- ${e.title} (${e.status}): ${e.description} on ${e.date} at ${e.venue}`).join("\\n");
      const projectsContext = projectsData.map(p => `- ${p.name}: ${p.description}`).join("\\n");
      
      knowledgeContext = `
      Connect Club Information:
      We are a student-led technology community at Vardhaman College of Engineering.
      
      Events:
      ${eventsContext}
      
      Projects:
      ${projectsContext}
      `;
    } catch (e) {
      console.warn("Failed to fetch knowledge base", e);
    }

    const systemInstruction = `
      You are Connect AI, the official AI assistant for Connect Club at Vardhaman College of Engineering.
      Your goal is to assist students, answer their questions about the club, events, and projects, and help them get involved.
      You are friendly, concise, and highly knowledgeable.
      
      Use the following knowledge base to answer questions:
      ${knowledgeContext}
      
      If a user asks a question not covered by the knowledge base, politely inform them that you are still learning and recommend they contact us at hello@connectclubvce.in.
      Do not hallucinate events or projects that do not exist in your knowledge base.
    `;

    // Map messages to Gemini format
    const history = messages.map((m: any) => ({
      role: m.role === "ai" ? "model" : "user",
      parts: [{ text: m.content }]
    }));
    
    const latestMessage = history.pop()?.parts[0].text;


    
    // Send history (we have to send history if it's more than just the latest message)
    // Actually, @google/genai chats API allows passing history in the create call:
    const chatSession = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: history
    });

    const response = await chatSession.sendMessage({ message: latestMessage });

    return NextResponse.json({
      content: response.text,
      role: "ai"
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response.", details: error.message },
      { status: 500 }
    );
  }
}
