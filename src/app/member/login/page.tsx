"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      if (role === "admin") {
        router.push("/admin");
      } else {
        router.push("/member/dashboard");
      }
    }
  }, [user, role, authLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will handle the redirect based on the role
    } catch (err: any) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-row">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/20 via-[#050505] to-primary/10" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-[128px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -left-20 w-96 h-96 bg-primary/20 rounded-full blur-[128px]" 
        />

        <div className="relative z-10 flex items-center mb-8">
          <img 
            src="/logo/logo-transparent.png" 
            alt="Connect Club" 
            className="h-32 md:h-40 w-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="relative z-10 max-w-lg mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70 mb-6">
              <Users className="w-3 h-3 text-blue-400" />
              <span>Member Portal Access</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black font-heading text-white leading-[1.1] tracking-tight mb-6">
              Welcome to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Inner Circle</span>.
            </h1>
            <p className="text-lg text-white/50 leading-relaxed max-w-md">
              Log in to your member account to collaborate on projects, organize events, and manage the Connect Club community.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 flex">
          <div className="flex items-center space-x-2 text-sm text-white/40">
            <Sparkles className="w-4 h-4" />
            <span>Empowering Student Leaders</span>
          </div>
        </div>
      </div>

      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-bl from-blue-900/20 via-[#050505] to-primary/10" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-12">
            <img 
              src="/logo/logo-transparent.png" 
              alt="Connect Club" 
              className="h-24 w-auto object-contain brightness-0 invert"
            />
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-card/40 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors"
          >
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
            
            <div className="mb-8">
              <h2 className="text-3xl font-black font-heading text-white mb-2">Member Login</h2>
              <p className="text-white/50 text-sm">Sign in to access your dashboard</p>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center">
                {error}
              </motion.div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Club Email</label>
                <div className="relative group/input">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
                    placeholder="member@connectclub.com"
                  />
                </div>
              </div>
              
              <div className="space-y-2 relative">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Password</label>
                <div className="relative group/input">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8 group/btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Sign In 
                    <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
