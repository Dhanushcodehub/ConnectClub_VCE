"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ShieldCheck, ArrowRight, Activity, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { authenticator } from "otplib";


export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [tempUser, setTempUser] = useState<User | null>(null);

  const router = useRouter();

  const logLoginHistory = async (user: User) => {
    try {
      await addDoc(collection(db, "loginHistory"), {
        uid: user.uid,
        email: user.email,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
    } catch (e) {
      console.error("Failed to log history", e);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists() && adminDoc.data().twoFactorEnabled) {
        setTotpSecret(adminDoc.data().twoFactorSecret);
        setTempUser(user);
        setRequires2FA(true);
        setLoading(false);
        return;
      }

      await logLoginHistory(user);
      router.push("/admin");
    } catch (err: any) {
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isValid = authenticator.verify({ token: totpCode, secret: totpSecret });
      if (isValid && tempUser) {
        sessionStorage.setItem("2fa_verified", "true");
        await logLoginHistory(tempUser);
        router.push("/admin");
      } else {
        setError("Invalid 2FA code.");
        setLoading(false);
      }
    } catch (err) {
      setError("Error verifying code.");
      setLoading(false);
    }
  };

  const handleCancel2FA = async () => {
    await signOut(auth);
    setRequires2FA(false);
    setTotpCode("");
    setTempUser(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#0c0c0e]">
      {/* Left Side - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center pt-24 border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-900/20" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
        
        {/* Animated Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }} 
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/30 rounded-full blur-[128px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }} 
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[128px]" 
        />

        <div className="relative z-10 w-full max-w-xl px-12 flex-1 flex flex-col justify-start">
          <div className="-mb-2 relative z-20 -ml-4 md:-ml-6">
            <img src="/logo/logo-transparent.png" alt="Connect Club" className="h-32 md:h-48 w-auto object-contain object-left brightness-0 invert" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-lg mt-6"
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70 mb-6">
              <Activity className="w-3 h-3 text-primary" />
              <span>Connect OS Administration</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-black font-heading text-white leading-[1.1] tracking-tight mb-6 whitespace-pre-line">
              Empowering the{"\n"}<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">Next Generation</span>{"\n"}of Innovators.
            </h1>
            <p className="text-lg text-white/50 leading-relaxed">
              Securely access the Connect Club operating system to manage events, moderate projects, and oversee the community at Vardhaman College of Engineering.
            </p>
          </motion.div>
        </div>

        <div className="relative z-10 w-full max-w-xl px-12 pb-12 shrink-0 mt-auto">
          <div className="flex items-center space-x-4 text-sm text-white/40">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>24/7 Admin Access</span>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative min-h-screen overflow-y-auto">
        <div className="absolute inset-0 lg:hidden bg-gradient-to-br from-primary/10 via-transparent to-purple-900/20" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-12">
            <img src="/logo/logo-transparent.png" alt="Connect Club" className="h-24 w-auto object-contain brightness-0 invert" />
          </div>

          <AnimatePresence mode="wait">
            {!requires2FA ? (
              <motion.div 
                key="login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-[#0c0c0e] border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors"
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
                
                <div className="mb-8">
                  <h2 className="text-3xl font-black font-heading text-white mb-2">Admin Portal</h2>
                  <p className="text-white/50 text-sm">Please authenticate to continue</p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center">
                    <ShieldCheck className="w-4 h-4 mr-2 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Email Address</label>
                    <div className="relative group/input">
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:bg-white/5 transition-all"
                        placeholder="admin@connectclub.com"
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
                        className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:bg-white/5 transition-all"
                        placeholder="••••••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-white/90 font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-8 group/btn"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Authenticate 
                        <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="2fa"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0c0c0e] border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden"
              >
                <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent" />
                
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <Lock className="w-7 h-7 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-black font-heading text-white">Security Verification</h2>
                  <p className="text-white/50 text-sm mt-2">
                    Enter the 6-digit code from your authenticator app to verify your identity.
                  </p>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium text-center">
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handle2FAVerify} className="space-y-6">
                  <div>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-4 py-5 text-white text-center text-3xl tracking-[0.75em] font-mono focus:outline-none focus:border-green-500 focus:bg-white/5 transition-all shadow-inner"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>

                  <div className="flex flex-col space-y-3 mt-8">
                    <button
                      type="submit"
                      disabled={loading || totpCode.length !== 6}
                      className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Sign In"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel2FA}
                      disabled={loading}
                      className="w-full bg-transparent hover:bg-white/5 text-white/60 hover:text-white font-medium py-4 px-4 rounded-2xl transition-all disabled:opacity-50"
                    >
                      Cancel & Go Back
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
