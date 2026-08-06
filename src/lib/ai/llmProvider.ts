import { GoogleGenAI } from "@google/genai";
import { AI_CONFIG, isMockMode, canUseProviders } from "./config";
import { SCOPE_REFUSAL } from "./guardrails";
import { vceStaticData } from "./vceStaticData";
import type { BuiltAIContext } from "./contextBuilder";

export interface ChatTurn {
  role: "user" | "ai" | "model" | "assistant";
  content: string;
}

export interface GenerateOptions {
  message: string;
  history?: ChatTurn[];
  systemPrompt: string;
  context?: BuiltAIContext;
  forceFailover?: boolean;
}

export interface GenerateResult {
  content: string;
  provider: "gemini" | "groq" | "mock-gemini" | "mock-groq";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function isRetryableError(error: unknown): boolean {
  const anyError = error as { code?: unknown; status?: unknown; statusCode?: unknown; message?: string };
  const code = anyError?.code ?? anyError?.status ?? anyError?.statusCode;
  const message = String(anyError?.message ?? "");

  if (code === 429 || code === 500 || code === 502 || code === 503 || code === 504) return true;
  if (typeof code === "string" && /RESOURCE_EXHAUSTED|INTERNAL|UNAVAILABLE|RATE_LIMIT/i.test(code)) {
    return true;
  }
  if (/429|rate limit|resource exhausted|temporarily unavailable|server error|timed out/i.test(message)) {
    return true;
  }
  return false;
}

function sanitizeHistory(history: ChatTurn[]): { role: "user" | "model"; content: string }[] {
  const out: { role: "user" | "model"; content: string }[] = [];
  let lastRole = "";

  for (const turn of history.slice(-AI_CONFIG.limits.maxHistoryTurns)) {
    const role: "user" | "model" = turn.role === "user" ? "user" : "model";
    const content = String(turn.content || "").trim();
    if (!content) continue;
    if (role === lastRole) continue;
    out.push({ role, content });
    lastRole = role;
  }
  return out;
}

async function generateWithGemini(opts: GenerateOptions, model: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

  const ai = new GoogleGenAI({ apiKey });
  const history = sanitizeHistory(opts.history || []);

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: opts.systemPrompt,
      temperature: AI_CONFIG.gemini.temperature,
      maxOutputTokens: AI_CONFIG.gemini.maxOutputTokens,
      topP: AI_CONFIG.gemini.topP,
    },
    history,
  });

  const response = await withTimeout(
    chat.sendMessage({ message: opts.message }),
    AI_CONFIG.request.timeoutMs,
    "Gemini request"
  );

  const text = response?.text?.trim();
  if (!text) throw new Error("Gemini returned an empty response.");
  return text;
}

async function generateWithGroq(opts: GenerateOptions): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

  const history = sanitizeHistory(opts.history || []);
  const messages: { role: string; content: string }[] = [
    { role: "system", content: opts.systemPrompt },
    ...history.map((turn) => ({
      role: turn.role === "user" ? "user" : "assistant",
      content: turn.content,
    })),
    { role: "user", content: opts.message },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_CONFIG.request.timeoutMs);

  try {
    const response = await fetch(AI_CONFIG.groq.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_CONFIG.groq.model,
        messages,
        temperature: AI_CONFIG.groq.temperature,
        max_tokens: AI_CONFIG.groq.maxOutputTokens,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Groq API responded with ${response.status}: ${body.slice(0, 300)}`);
    }

    const data = await response.json();
    const content: string = data?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Groq returned an empty response.");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateResponse(opts: GenerateOptions): Promise<GenerateResult> {
  if (isMockMode) {
    return mockGenerate(opts);
  }

  if (!canUseProviders.gemini && !canUseProviders.groq) {
    throw new Error(
      "No AI provider is configured. Set GEMINI_API_KEY (primary) and/or GROQ_API_KEY (fallback) in .env.local."
    );
  }

  const errors: string[] = [];

  if (canUseProviders.gemini && !opts.forceFailover) {
    for (let attempt = 1; attempt <= AI_CONFIG.retry.maxAttempts; attempt++) {
      try {
        const content = await generateWithGemini(opts, AI_CONFIG.gemini.primaryModel);
        return { content, provider: "gemini" };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`Gemini attempt ${attempt}: ${message}`);

        if (attempt < AI_CONFIG.retry.maxAttempts) {
          const delay = Math.min(
            AI_CONFIG.retry.baseDelayMs * 2 ** (attempt - 1),
            AI_CONFIG.retry.maxDelayMs
          );
          await sleep(delay);
        }
      }
    }
  }

  if (canUseProviders.groq) {
    try {
      const content = await generateWithGroq(opts);
      return { content, provider: "groq" };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(`Groq fallback: ${message}`);
    }
  }

  const detail = errors.length > 0 ? errors.join(" | ") : "No AI provider was available.";
  throw new Error(`All AI providers failed. ${detail}`);
}

function mockNormalize(query: string): string {
  return query.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

const INJECTION_PATTERNS: RegExp[] = [
  /ignore previous/i,
  /ignore all (previous|instructions)/i,
  /disregard/i,
  /you are now/i,
  /pretend (you|to be)/i,
  /act as/i,
  /role.?play/i,
  /reveal (your|the) (system prompt|instructions)/i,
  /repeat (your|the) (system prompt|instructions|rules)/i,
  /jailbreak/i,
  /DAN mode/i,
  /bypass/i,
];

const OFF_TOPIC_PATTERNS: RegExp[] = [
  /binary tree/i,
  /write a song/i,
  /song about cats/i,
  /write (a|some|me) (poem|essay|story|letter)/i,
  /reverse a/i,
  /leetcode/i,
  /python|javascript|java|react|c\+\+/i,
  /code|program|debug|compile/i,
  /math|homework|equation|calculus|algebra/i,
  /recipe|cook|meal/i,
  /weather|forecast|temperature/i,
  /capital of|president of|prime minister/i,
  /translate/i,
  /stock|invest|crypto price/i,
  /tell me a joke/i,
];

function isInjectionAttempt(query: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(query));
}

function isOffTopic(query: string): boolean {
  return OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(query));
}

function isLocationQuestion(query: string): boolean {
  return (
    /\b(where|location|located|address|campus)\b/.test(query) &&
    /\b(vce|vardhaman|college|campus|kachaaram|shamshabad)\b/.test(query)
  );
}

function isEventsQuestion(query: string): boolean {
  return /\b(event|events|workshop|hackathon|bootcamp|summit|session|when|next|upcoming)\b/.test(query);
}

function isGreeting(query: string): boolean {
  return /^(hi|hello|hey|greetings|namaste|good (morning|afternoon|evening))(\b|$|!|\s)/.test(query);
}

function mockGenerate(opts: GenerateOptions): GenerateResult {
  const provider: "mock-gemini" | "mock-groq" = opts.forceFailover ? "mock-groq" : "mock-gemini";
  const query = mockNormalize(opts.message);

  if (isInjectionAttempt(query)) {
    return { content: SCOPE_REFUSAL, provider };
  }

  if (isOffTopic(query)) {
    return { content: SCOPE_REFUSAL, provider };
  }

  if (isLocationQuestion(query)) {
    return {
      content: `Vardhaman College of Engineering is located at: ${vceStaticData.college.address} ${vceStaticData.college.location}`,
      provider,
    };
  }

  if (isGreeting(query)) {
    return {
      content:
        "Hello! I'm Connect AI, the official virtual assistant for Connect Club at Vardhaman College of Engineering. I can help you with club events, team members, domains, registrations, announcements, FAQs, and questions about VCE. What would you like to know?",
      provider,
    };
  }

  if (isEventsQuestion(query)) {
    const upcoming = opts.context?.upcomingEvents ?? [];
    if (upcoming.length > 0) {
      return {
        content: `Here are the upcoming Connect Club events:\n${upcoming
          .map((title) => `- ${title}`)
          .join("\n")}\n\nYou can find full details (dates, venues, and registration links) on the Events page.`,
        provider,
      };
    }
    return {
      content:
        "There are no upcoming events scheduled right now. Check the Events page or our announcements for the latest updates.",
      provider,
    };
  }

  return {
    content:
      "I can help with questions about Connect Club and Vardhaman College of Engineering. Ask me about upcoming events, how to join, team members, technical domains, or VCE departments and campus facilities.",
    provider,
  };
}
