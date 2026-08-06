export const AI_CONFIG = {
  gemini: {
    primaryModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    secondaryModel: process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash",
    temperature: 0.7,
    maxOutputTokens: 1024,
    topP: 0.9,
  },
  groq: {
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    temperature: 0.7,
    maxOutputTokens: 1024,
  },
  retry: {
    maxAttempts: 3,
    baseDelayMs: 1000,
    maxDelayMs: 8000,
  },
  cache: {
    ttlMs: Number(process.env.AI_CACHE_TTL_MS) || 2 * 60 * 1000,
    maxEntries: 100,
  },
  request: {
    timeoutMs: 30000,
  },
  limits: {
    maxMessageLength: 2000,
    maxHistoryTurns: 20,
  },
} as const;

export const isMockMode = process.env.AI_MOCK_MODE === "true";

export const canUseProviders = {
  gemini: Boolean(process.env.GEMINI_API_KEY),
  groq: Boolean(process.env.GROQ_API_KEY),
};
