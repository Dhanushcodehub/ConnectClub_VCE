import { NextResponse } from "next/server";
import { AI_CONFIG } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/guardrails";
import { buildContext } from "@/lib/ai/contextBuilder";
import { generateResponse, type ChatTurn } from "@/lib/ai/llmProvider";
import { checkRateLimit, getClientIp, rateLimitExceededResponse } from "@/lib/security/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy `/api/chat` endpoint — secured with distributed rate limiting, strict
 * payload bounds, prompt guardrails, and sanitized errors.
 */
export async function POST(req: Request) {
  const rl = await checkRateLimit({
    namespace: "public:ai-chat",
    identifier: getClientIp(req),
    limit: 25,
    windowMs: 5 * 60 * 1000,
  });
  if (!rl.allowed) {
    return rateLimitExceededResponse(rl);
  }

  try {
    const body = await req.json().catch(() => null);
    const messages = body && typeof body === "object" ? (body as { messages?: unknown }).messages : null;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "A non-empty messages array is required." }, { status: 400 });
    }

    const sanitized: ChatTurn[] = [];
    for (const item of messages.slice(-AI_CONFIG.limits.maxHistoryTurns)) {
      if (!item || typeof item !== "object") continue;
      const entry = item as { role?: unknown; content?: unknown };
      if (typeof entry.content !== "string") continue;
      const content = entry.content.trim().slice(0, AI_CONFIG.limits.maxMessageLength);
      if (!content) continue;
      const role = entry.role === "user" ? "user" : "ai";
      sanitized.push({ role, content });
    }

    const lastTurn = sanitized[sanitized.length - 1];
    if (!lastTurn || lastTurn.role !== "user") {
      return NextResponse.json({ error: "Last message must be a non-empty user message." }, { status: 400 });
    }

    const context = await buildContext();
    const systemPrompt = buildSystemPrompt(context.contextText);
    const result = await generateResponse({
      message: lastTurn.content,
      history: sanitized.slice(0, -1),
      systemPrompt,
      context,
    });

    return NextResponse.json({
      content: result.content,
      role: "ai",
    });
  } catch (error) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "Failed to generate response." }, { status: 500 });
  }
}
