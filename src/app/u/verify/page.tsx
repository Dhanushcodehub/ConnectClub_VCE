"use client";

import { motion } from "framer-motion";
import { Mail, ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/20 via-[#050505] to-primary/10" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-[#0C0C0E]/80 backdrop-blur-2xl border border-white/10 p-10 md:p-12 rounded-3xl shadow-2xl relative overflow-hidden group text-center"
      >
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
        
        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-blue-500/20">
          <Mail className="w-10 h-10 text-blue-400" />
        </div>

        <h2 className="text-3xl font-black font-heading text-white mb-4">Check your inbox</h2>
        
        <p className="text-white/60 text-lg mb-8 leading-relaxed">
          We've sent a verification link to your email address. Please click the link to verify your account.
        </p>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-8 text-left flex items-start space-x-4">
          <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-yellow-500 font-bold mb-1">Didn't receive it?</h4>
            <p className="text-yellow-500/80 text-sm leading-relaxed">
              Sometimes emails can get lost. Please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
            </p>
          </div>
        </div>

        <Link href="/u/login">
          <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-2xl transition-all flex items-center justify-center group/btn">
            Proceed to Login
            <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
