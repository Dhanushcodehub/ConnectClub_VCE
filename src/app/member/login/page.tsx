"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function MemberLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot Password state
  const [view, setView] = useState<"login" | "reset">("login");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push("/member/dashboard");
    }
  }, [user, authLoading, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isFirebaseConfigured || !auth) {
        throw new Error("Authentication is not configured.");
      }
      await signInWithEmailAndPassword(auth, email, password);
      // AuthContext will handle the redirect after sign-in
    } catch (err: unknown) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetLoading || cooldown > 0) return;
    setResetError("");
    setResetSuccess("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setResetError("Please enter a valid email address.");
      return;
    }

    setResetLoading(true);

    try {
      if (!isFirebaseConfigured || !auth) {
        const cfgErr = new Error("Authentication is not configured. Missing Firebase environment variables.");
        (cfgErr as Error & { code?: string }).code = "auth/configuration-not-found";
        throw cfgErr;
      }
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSuccess(
        "Password reset instructions have been sent if an account exists with this email address. Please check your inbox and spam folder."
      );
      setCooldown(60);
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      const code = (err as { code?: string })?.code;
      if (code === "auth/user-not-found") {
        // Generic success for security to prevent user enumeration
        setResetSuccess(
          "Password reset instructions have been sent if an account exists with this email address. Please check your inbox and spam folder."
        );
        setCooldown(60);
      } else if (code === "auth/invalid-email") {
        setResetError("Please enter a valid email address.");
      } else if (code === "auth/missing-email") {
        setResetError("Please enter your email address.");
      } else if (code === "auth/too-many-requests") {
        setResetError("Too many requests. Please wait a moment before trying again.");
      } else if (code === "auth/network-request-failed") {
        setResetError("Network error. Please check your internet connection.");
      } else if (code === "auth/configuration-not-found") {
        setResetError("Authentication is not configured. Missing Firebase environment variables.");
      } else {
        setResetError("An error occurred while sending the reset link. Please try again.");
      }
    } finally {
      setResetLoading(false);
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
              Welcome to the <span className="text-primary">Inner Circle</span>.
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

      {/* Right Side - Login / Reset Form */}
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
            
            <AnimatePresence mode="wait">
              {view === "login" ? (
                <motion.div
                  key="login-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-8">
                    <h2 className="text-3xl font-black font-heading text-white mb-2">Member Login</h2>
                    <p className="text-white/50 text-sm">Sign in to access your dashboard</p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center"
                    >
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
                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setView("reset");
                            setError("");
                            setResetError("");
                            setResetSuccess("");
                          }}
                          className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors focus:outline-none focus:underline"
                        >
                          Forgot Password?
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8 group/btn"
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
              ) : (
                <motion.div
                  key="reset-view"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="mb-8">
                    <h2 className="text-3xl font-black font-heading text-white mb-2">Reset Your Password</h2>
                    <p className="text-white/50 text-sm">
                      Enter your registered club email address and we&apos;ll send you a password reset link.
                    </p>
                  </div>

                  {resetError && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center"
                    >
                      {resetError}
                    </motion.div>
                  )}

                  {resetSuccess && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium"
                    >
                      {resetSuccess}
                    </motion.div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div className="space-y-2 relative">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Club Email</label>
                      <div className="relative group/input">
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 focus:bg-white/5 transition-all"
                          placeholder="member@connectclub.com"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resetLoading || cooldown > 0}
                      className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8 group/btn"
                    >
                      {resetLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : cooldown > 0 ? (
                        `Resend Link in ${cooldown}s`
                      ) : (
                        <>
                          Send Reset Link
                          <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setView("login");
                          setError("");
                          setResetError("");
                          setResetSuccess("");
                        }}
                        className="inline-flex items-center text-xs font-medium text-white/50 hover:text-white transition-colors focus:outline-none focus:underline"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                        Back to Login
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
