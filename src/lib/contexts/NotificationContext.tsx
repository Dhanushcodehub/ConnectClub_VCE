"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X } from "lucide-react";

interface Toast {
  id: string;
  title: string;
  message: string;
  onClick?: () => void;
}

interface NotificationContextType {
  toast: (title: string, message: string, onClick?: () => void) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create an audio element for the ding sound
    // Using a base64 encoded short subtle ding sound to avoid needing external assets
    const audio = new Audio("data:audio/wav;base64,UklGRlIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTEAAAAA/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/AP8A/wD/");
    audio.volume = 0.5;
    audioRef.current = audio;
  }, []);

  const toast = (title: string, message: string, onClick?: () => void) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, message, onClick }]);
    
    // Play sound
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.log("Audio play blocked by browser:", e));
    }
    
    // Auto remove after 5s
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ toast }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-[#18181B]/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-4 w-[320px] cursor-pointer flex gap-3 relative overflow-hidden group"
              onClick={() => {
                if (t.onClick) t.onClick();
                removeToast(t.id);
              }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              <div className="shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary mt-0.5">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-bold text-sm truncate">{t.title}</h4>
                <p className="text-white/60 text-xs mt-0.5 line-clamp-2 leading-relaxed">{t.message}</p>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                className="absolute top-2 right-2 text-white/30 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
