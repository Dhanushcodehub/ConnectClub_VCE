"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, User, ArrowLeft, Loader2, Bot, Pencil, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const suggestedQuestions = [
  "What is Connect Club?",
  "What is the next event?",
  "Is InspireX free?",
  "How can I join Connect Club?",
  "Show our projects.",
  "When are recruitments?"
];

export default function ConnectAIPage() {
  const [messages, setMessages] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I'm Connect AI. I can help you find events, learn about our projects, or answer any questions about Connect Club. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const scroller = mainRef.current ?? document.scrollingElement ?? document.documentElement;
    const nearBottom = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160;
    if (nearBottom) scrollToBottom();
  }, [messages, isLoading]);

  const sendChatRequest = async (chatMessages: typeof messages) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: chatMessages }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch response");
      setMessages(prev => [...prev, { role: "ai", content: data.content }]);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("Chat request failed:", message);
      setMessages(prev => [...prev, { role: "ai", content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    const newMessages = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(newMessages);
    setInput("");
    
    await sendChatRequest(newMessages);
  };

  const handleEdit = (index: number) => {
    const userMsg = messages[index].content;
    setInput(userMsg);
    setMessages(messages.slice(0, index));
  };

  const handleRetry = async (index: number) => {
    const userMsg = messages[index].content;
    const previousMessages = messages.slice(0, index);
    const newMessages = [...previousMessages, { role: "user" as const, content: userMsg }];
    setMessages(newMessages);
    
    await sendChatRequest(newMessages);
  };

  const handleSuggestion = (question: string) => {
    setInput(question);
    setTimeout(() => {
      const form = document.getElementById("ai-form") as HTMLFormElement;
      if (form) form.requestSubmit();
    }, 10);
  };

  return (
    <div className="flex flex-col min-h-dvh bg-[#09090b]">
      
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 shrink-0 h-16 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">Connect AI</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Virtual Assistant</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <main ref={mainRef} className="flex-1 relative">
        <div className="max-w-3xl mx-auto py-8 px-4 md:px-0 flex flex-col">
          
          {/* Welcome Header (disappears after multiple messages) */}
          {messages.length === 1 && (
            <div className="flex flex-col items-center justify-center mt-12 mb-16 text-center">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center text-primary mb-6 border border-primary/20 shadow-[0_0_30px_rgba(0,85,255,0.2)]"
              >
                <Bot className="w-10 h-10" />
              </motion.div>
              <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
                How can I help you today?
              </h2>
              <p className="text-white/50 text-base max-w-md">
                I can help you find events, learn about projects, or answer any questions about Connect Club.
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-6 pb-6">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full",
                    msg.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "flex gap-3 max-w-[85%] md:max-w-[80%]",
                    msg.role === "user" ? "flex-row-reverse" : "flex-row"
                  )}>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1",
                      msg.role === "user" ? "bg-white/10" : "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,85,255,0.1)]"
                    )}>
                      {msg.role === "user" ? <User className="w-4 h-4 text-white" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className={cn(
                        "px-5 py-3.5 shadow-sm",
                        msg.role === "user" 
                          ? "bg-white/10 text-white rounded-2xl rounded-tr-sm" 
                          : "bg-transparent text-white/90"
                      )}>
                        {msg.role === "ai" && <div className="font-bold text-xs text-primary mb-1">Connect AI</div>}
                        <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-[15px] whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                      
                      {/* Action Buttons for User Messages */}
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

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 max-w-[85%] md:max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,85,255,0.1)] flex items-center justify-center shrink-0 mt-1">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="px-5 py-3.5">
                    <div className="font-bold text-xs text-primary mb-2">Connect AI</div>
                    <div className="flex space-x-1.5 items-center h-5">
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="w-1.5 h-1.5 bg-primary/80 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-primary/80 rounded-full" />
                      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-primary/80 rounded-full" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>
      </main>

      {/* Input Area (Sticky at Bottom) */}
      <div className="sticky bottom-0 z-20 shrink-0 bg-[#09090b]/80 backdrop-blur-xl border-t border-white/5 pb-6 pt-4 px-4 md:px-0">
        <div className="max-w-3xl mx-auto">
          
          {/* Suggested Questions */}
          {messages.length === 1 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap gap-2 mb-4 justify-center"
            >
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(q)}
                  className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-all hover:scale-105 active:scale-95"
                >
                  {q}
                </button>
              ))}
            </motion.div>
          )}

          {/* Form */}
          <form id="ai-form" onSubmit={handleSubmit} className="relative flex items-center shadow-2xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Connect AI..."
              className="w-full bg-[#18181B] border border-white/10 rounded-2xl py-4 pl-6 pr-16 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all text-base shadow-inner"
              disabled={isLoading}
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:bg-white/10 disabled:text-white/30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-0.5 mt-0.5" />}
            </button>
          </form>
          <div className="text-center mt-3">
            <p className="text-[10px] text-white/30">Connect AI can make mistakes. Verify important information.</p>
          </div>
        </div>
      </div>

    </div>
  );
}
