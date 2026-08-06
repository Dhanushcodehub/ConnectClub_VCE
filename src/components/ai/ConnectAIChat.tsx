"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, X, Sparkles, Loader2, RotateCcw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

const QUICK_ACTIONS = [
  "Upcoming Events",
  "About Connect Club",
  "VCE Departments",
  "Join a Domain",
];

const WELCOME_MESSAGE =
  "Hi! I'm Connect AI. I can help with Connect Club events, team, domains, registrations, and questions about Vardhaman College of Engineering. How can I help?";

export function ConnectAIChat() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    const scroller = messagesRef.current ?? document.scrollingElement ?? document.documentElement;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
    if (nearBottom) scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Guarantee touchpad / scroll-wheel scrolling inside the chat panel, even in
  // browsers where native nested scrolling is unreliable.
  useEffect(() => {
    if (!isOpen) return;
    const container = messagesRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight <= clientHeight) return;
      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const goingUp = e.deltaY < 0;
      const goingDown = e.deltaY > 0;
      if ((goingUp && atTop) || (goingDown && atBottom)) return;
      e.preventDefault();
      container.scrollTop += e.deltaY;
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, [isOpen]);

  const sendChatRequest = useCallback(async (chatMessages: ChatMessage[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.details || "Failed to fetch response");
      setMessages((prev) => [...prev, { role: "ai", content: data.content }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!input.trim() || isLoading) return;

      const userMessage = input.trim();
      const nextMessages = [...messages, { role: "user" as const, content: userMessage }];
      setMessages(nextMessages);
      setInput("");
      await sendChatRequest(nextMessages);
    },
    [input, isLoading, messages, sendChatRequest]
  );

  const handleQuickAction = useCallback(
    async (question: string) => {
      if (isLoading) return;
      const nextMessages = [...messages, { role: "user" as const, content: question }];
      setMessages(nextMessages);
      await sendChatRequest(nextMessages);
    },
    [isLoading, messages, sendChatRequest]
  );

  const handleRetry = useCallback(() => {
    const lastUserIndex = messages.map((m) => m.role).lastIndexOf("user");
    if (lastUserIndex === -1) return;
    const trimmed = messages.slice(0, lastUserIndex + 1);
    setMessages(trimmed);
    sendChatRequest(trimmed);
  }, [messages, sendChatRequest]);

  if (pathname?.startsWith("/connect-ai")) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        type="button"
        aria-label={isOpen ? "Close Connect AI" : "Open Connect AI"}
        onClick={() => setIsOpen((prev) => !prev)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-[60] w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(0,85,255,0.45)] cursor-pointer"
        style={{ background: "linear-gradient(135deg, #0055FF, #00E5FF)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-7 h-7" />
            </motion.span>
          ) : (
            <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot className="w-7 h-7" />
            </motion.span>
          )}
        </AnimatePresence>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#0A0B14]" />
        )}
      </motion.button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-5 right-5 md:bottom-7 md:right-7 z-[60] w-[calc(100vw-2.5rem)] max-w-[400px] h-[min(620px,calc(100vh-6rem))] flex flex-col rounded-3xl overflow-hidden bg-[#0A0B14]/90 backdrop-blur-2xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.7)]"
          >
            {/* Header */}
            <header className="shrink-0 px-5 py-4 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-primary/15 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Sparkles className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
                    Connect AI
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </h2>
                  <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
                    Virtual Assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Messages */}
            <div ref={messagesRef} className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-5 space-y-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-white/85 text-[14px] leading-relaxed">
                    {WELCOME_MESSAGE}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div className={cn("flex gap-2.5 max-w-[88%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                    <div
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1",
                        msg.role === "user"
                          ? "bg-white/10 text-white/70"
                          : "bg-primary/20 text-primary border border-primary/20"
                      )}
                    >
                      {msg.role === "user" ? <MessageSquare className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={cn(
                        "px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap shadow-sm",
                        msg.role === "user"
                          ? "bg-primary text-white rounded-2xl rounded-tr-sm"
                          : "bg-white/[0.04] border border-white/10 text-white/90 rounded-2xl rounded-tl-sm"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              ))}

              {isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/20 text-primary border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3.5">
                      <div className="flex space-x-1.5 items-center">
                        <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <motion.span animate={{ scale: [1, 1.25, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary rounded-full" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {error && !isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-2">
                  <div className="mx-auto max-w-[90%] text-center px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs">
                    {error}
                  </div>
                  <button
                    onClick={handleRetry}
                    className="mx-auto flex items-center gap-1.5 text-[11px] font-medium text-white/60 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Try again
                  </button>
                </motion.div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Quick Actions */}
            {messages.length === 0 && !isLoading && (
              <div className="shrink-0 px-4 pb-2 flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSubmit} className="shrink-0 p-3.5 border-t border-white/5 bg-white/[0.02]">
              <div className="flex items-end gap-2 bg-[#131316] p-1.5 rounded-2xl border border-white/10 focus-within:border-primary/50 transition-all">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about Connect Club or VCE..."
                  disabled={isLoading}
                  className="flex-1 bg-transparent border-none text-white px-2.5 py-2 focus:outline-none placeholder:text-white/30 text-[14px]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-primary text-white rounded-xl hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-primary/20"
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 -ml-0.5 mt-0.5" />}
                </button>
              </div>
              <p className="text-center mt-2 text-[9px] text-white/25 font-medium uppercase tracking-widest">
                Connect AI can make mistakes. Verify important information.
              </p>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
