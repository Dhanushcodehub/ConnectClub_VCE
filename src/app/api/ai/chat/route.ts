import { NextResponse } from "next/server";
import { AI_CONFIG, isMockMode } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/guardrails";
import { buildContext } from "@/lib/ai/contextBuilder";
import { getCachedResponse, setCachedResponse } from "@/lib/ai/cache";
import { generateResponse, type ChatTurn } from "@/lib/ai/llmProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface IncomingMessage {
  role?: string;
  content?: unknown;
}

interface RequestBody {
  message?: unknown;
  history?: unknown;
  messages?: unknown;
}

function validateMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > AI_CONFIG.limits.maxMessageLength) return null;
  return trimmed;
}

function sanitizeHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: ChatTurn[] = [];

  for (const item of value.slice(-AI_CONFIG.limits.maxHistoryTurns)) {
    if (!item || typeof item !== "object") continue;
    const msg = item as IncomingMessage;
    if (typeof msg.content !== "string") continue;
    const content = msg.content.trim();
    if (!content) continue;

    const role = msg.role === "user" ? "user" : msg.role === "model" || msg.role === "assistant" ? "ai" : msg.role;
    if (role !== "user" && role !== "ai") continue;

    turns.push({ role, content });
  }
  return turns;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  let message: string | null = null;
  let history: ChatTurn[] = [];

  if (typeof body.message === "string") {
    message = validateMessage(body.message);
    history = sanitizeHistory(body.history);
  } else if (Array.isArray(body.messages)) {
    const raw = body.messages as unknown[];
    const turns = sanitizeHistory(raw);
    const last = raw[raw.length - 1] as IncomingMessage | undefined;
    message = validateMessage(last?.content);
    history = turns.slice(0, -1);
  }

  if (!message) {
    return NextResponse.json(
      { error: "A non-empty 'message' (max " + AI_CONFIG.limits.maxMessageLength + " chars) is required." },
      { status: 400 }
    );
  }

  try {
    const forceFailover =
      req.headers.get("x-ai-force-failover") === "true" || process.env.AI_FORCE_FAILOVER === "true";

    const cached = forceFailover ? null : getCachedResponse(message);
    if (cached) {
      return NextResponse.json({
        content: cached.content,
        role: "ai",
        cached: true,
        provider: cached.provider,
        contextSource: null,
        timestamp: Date.now(),
      });
    }

    const context = await buildContext();
    const systemPrompt = buildSystemPrompt(context.contextText);

    const result = await generateResponse({ message, history, systemPrompt, context, forceFailover });

    if (!forceFailover) {
      setCachedResponse(message, result.content, result.provider);
    }

    return NextResponse.json({
      content: result.content,
      role: "ai",
      cached: false,
      provider: result.provider,
      contextSource: context.liveSources,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const messageText = error instanceof Error ? error.message : String(error);
    console.error("[api/ai/chat] Error:", messageText);

    const status = isMockMode ? 500 : 503;
    return NextResponse.json(
      {
        error: "Failed to generate a response.",
        details: messageText,
        hint: "Check that GEMINI_API_KEY / GROQ_API_KEY are configured in .env.local.",
      },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST." }, { status: 405 });
}
