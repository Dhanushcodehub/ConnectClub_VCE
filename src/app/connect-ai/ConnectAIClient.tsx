"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Sparkles,
  User,
  ArrowLeft,
  Loader2,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ai/MarkdownContent";
import { AIMascot } from "@/components/ai/AIMascot";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";

const SUGGESTED_QUESTIONS = [
  "What is Connect Club?",
  "What is the next event?",
  "Is InspireX free?",
  "How can I join Connect Club?",
  "Show our projects.",
  "When are recruitments?",
];

export default function ConnectAIClient() {
  const { profile, loading: authLoading } = useAuth();

  // Conversation messages — starts empty so initial hero is clean
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    const scroller =
      mainRef.current ?? document.scrollingElement ?? document.documentElement;
    const nearBottom =
      scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 220;
    if (nearBottom) scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const sendChatRequest = useCallback(
    async (chatMessages: typeof messages) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: chatMessages }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch response");
        setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn("Chat request failed:", message);
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content:
              "Sorry, I'm having trouble connecting right now. Please try again later.",
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage = input.trim();
      const newMessages = [
        ...messages,
        { role: "user" as const, content: userMessage },
      ];
      setMessages(newMessages);
      setInput("");
      await sendChatRequest(newMessages);
    },
    [input, isLoading, messages, sendChatRequest]
  );

  const handleEdit = useCallback(
    (index: number) => {
      const userMsg = messages[index].content;
      setInput(userMsg);
      setMessages(messages.slice(0, index));
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    [messages]
  );

  const handleRetry = useCallback(
    async (index: number) => {
      const userMsg = messages[index].content;
      const previousMessages = messages.slice(0, index);
      const newMessages = [
        ...previousMessages,
        { role: "user" as const, content: userMsg },
      ];
      setMessages(newMessages);
      await sendChatRequest(newMessages);
    },
    [messages, sendChatRequest]
  );

  const handleSuggestion = useCallback(
    (question: string) => {
      if (isLoading) return;
      const newMessages = [
        ...messages,
        { role: "user" as const, content: question },
      ];
      setMessages(newMessages);
      sendChatRequest(newMessages);
    },
    [isLoading, messages, sendChatRequest]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Greeting: use authenticated user's first name if available, else generic
  const userName =
    !authLoading && profile?.name ? profile.name.split(" ")[0] : null;
  const greeting = userName
    ? `How can I help you, ${userName}?`
    : "How can I help you today?";

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col min-h-dvh bg-[#09090b] relative overflow-x-hidden">

      {/* ── Background ambient glows ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[520px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(147, 51, 234, 0.45) 0%, rgba(59, 130, 246, 0.18) 50%, transparent 72%)",
            filter: "blur(65px)",
          }}
        />
        <div
          className="absolute bottom-0 left-0 w-[450px] h-[450px] rounded-full opacity-15"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(59, 130, 246, 0.35) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[450px] h-[450px] rounded-full opacity-18"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.38) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* ── Top Navigation Bar ── */}
      <header className="sticky top-0 z-30 shrink-0 h-16 border-b border-white/5 bg-[#09090b]/85 backdrop-blur-md flex items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_12px_rgba(147,51,234,0.3)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide leading-tight">
                Connect AI
              </h1>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium leading-tight">
                Virtual Assistant
              </p>
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-[11px] text-white/40 font-medium px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="hidden sm:inline">Online</span>
        </div>
      </header>

      {/* ── Main Chat Area ── */}
      <main ref={mainRef} className="relative z-10 flex-1 flex flex-col">
        <div className="max-w-3xl w-full mx-auto py-6 px-4 md:px-6 flex flex-col flex-1">

          {/* ── Hero section (Mascot + Heading + Supporting Text) ── */}
          <div
            className={cn(
              "flex flex-col items-center justify-center text-center transition-all duration-500",
              hasMessages
                ? "pt-2 pb-6 border-b border-white/5 mb-6"
                : "my-auto pt-6 pb-8"
            )}
          >
            {/* 3D Animated Mascot — Clickable with cursor tracking */}
            <div className="mb-5 flex justify-center">
              <AIMascot size={hasMessages ? 100 : 130} />
            </div>

            <h2
              className={cn(
                "font-black text-white tracking-tight transition-all duration-300",
                hasMessages
                  ? "text-xl md:text-2xl mb-1.5"
                  : "text-3xl md:text-4xl mb-3"
              )}
            >
              {greeting}
            </h2>

            <p
              className={cn(
                "text-white/50 leading-relaxed max-w-md transition-all duration-300",
                hasMessages ? "text-xs md:text-sm" : "text-sm md:text-base"
              )}
            >
              I can help you find events, learn about projects, or answer any
              questions about Connect Club.
            </p>
          </div>

          {/* ── Conversation Messages ── */}
          {hasMessages && (
            <div className="flex-1 space-y-6 pb-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "flex w-full",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "flex gap-3 max-w-[88%] md:max-w-[80%]",
                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                      )}
                    >
                      {/* Avatar */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                          msg.role === "user"
                            ? "bg-white/10"
                            : "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(147,51,234,0.18)]"
                        )}
                      >
                        {msg.role === "user" ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div
                          className={cn(
                            "px-5 py-3.5",
                            msg.role === "user"
                              ? "bg-purple-600/30 border border-purple-500/30 text-white rounded-2xl rounded-tr-sm backdrop-blur-sm"
                              : "bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-sm text-white/90"
                          )}
                        >
                          {msg.role === "ai" && (
                            <div className="font-bold text-xs text-primary mb-1.5 flex items-center gap-1.5">
                              <span>Connect AI</span>
                            </div>
                          )}
                          {msg.role === "ai" ? (
                            <MarkdownContent
                              content={msg.content}
                              className="text-white/90 text-sm leading-relaxed"
                            />
                          ) : (
                            <div className="whitespace-pre-wrap text-white text-sm">
                              {msg.content}
                            </div>
                          )}
                        </div>

                        {/* Action buttons for user messages */}
                        {msg.role === "user" && !isLoading && (
                          <div className="flex items-center gap-3 mt-0.5 mr-2 justify-end text-white/40">
                            <button
                              onClick={() => handleEdit(idx)}
                              className="p-1 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-medium opacity-60 hover:opacity-100"
                              title="Edit message"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleRetry(idx)}
                              className="p-1 hover:text-white transition-colors flex items-center gap-1.5 text-[11px] font-medium opacity-60 hover:opacity-100"
                              title="Resend message"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Retry</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[88%] md:max-w-[80%]">
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(147,51,234,0.18)] flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-sm px-5 py-3.5">
                      <div className="font-bold text-xs text-primary mb-2">
                        Connect AI
                      </div>
                      <div className="flex space-x-1.5 items-center h-5">
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0 }}
                          className="w-1.5 h-1.5 bg-primary rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0.2 }}
                          className="w-1.5 h-1.5 bg-primary rounded-full"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.3, 1] }}
                          transition={{ repeat: Infinity, duration: 1, delay: 0.4 }}
                          className="w-1.5 h-1.5 bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </main>

      {/* ── Sticky Input & Suggested Prompts Area ── */}
      <div className="sticky bottom-0 z-30 shrink-0 bg-[#09090b]/92 backdrop-blur-xl border-t border-white/5 pb-5 pt-3.5 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">

          {/* Suggested chips — always visible in empty state; in chat state shows compactly */}
          {!hasMessages && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="flex flex-wrap gap-2 mb-4 justify-center"
            >
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(q)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-purple-500/40 text-white/70 hover:text-white text-xs md:text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          )}

          {/* Wide Message Composer with glowing purple outline */}
          <form
            id="ai-form"
            onSubmit={handleSubmit}
            className="relative flex items-center rounded-2xl bg-[#141419] border border-white/10 transition-all duration-300 focus-within:border-purple-500/80 focus-within:ring-2 focus-within:ring-purple-500/30 focus-within:shadow-[0_0_25px_rgba(147,51,234,0.35)] shadow-xl"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Connect AI..."
              className="w-full bg-transparent border-none py-3.5 pl-5 pr-14 text-white placeholder:text-white/35 focus:outline-none text-sm md:text-base"
              disabled={isLoading}
              autoFocus
              aria-label="Message Connect AI"
            />

            {/* Circular purple send button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="absolute right-2 w-9 h-9 rounded-full flex items-center justify-center bg-primary text-white hover:bg-primary/90 disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-[0_0_14px_rgba(147,51,234,0.5)]"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          {/* Footer disclaimer matching reference exactly */}
          <div className="text-center mt-2.5">
            <p className="text-[11px] text-white/30 tracking-tight">
              Connect AI can make mistakes. Verify for more information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
