'use client';

import Link from 'next/link';
import { AuthProvider } from '@/lib/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function FeedbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-[#0c0c0e] bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]">
        <header className="w-full py-6 px-8 flex justify-center border-b border-white/[0.06] bg-[#0c0c0e]/80 backdrop-blur-md sticky top-0 z-50">
          <Link href="/" className="flex items-center gap-2.5 group relative">
            <img 
              src="/logo/navbarlogo.png" 
              alt="Connect Club Logo" 
              className="h-8 w-auto object-contain brightness-0 invert transition-transform duration-300 group-hover:scale-105"
            />
            <div className="flex items-baseline">
              <span className="font-display font-black text-[15px] tracking-tighter text-white uppercase group-hover:text-white transition-colors">
                Connect Club
              </span>
              <motion.span
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-secondary font-black text-xl leading-none ml-0.5"
              >
                .
              </motion.span>
            </div>
          </Link>
        </header>
        <main className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto flex-1">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
