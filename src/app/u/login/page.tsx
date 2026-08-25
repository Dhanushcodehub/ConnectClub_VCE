"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Sparkles, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/contexts/AuthContext";
import { checkUserExists } from "@/lib/firebase/users";
import OnboardingModal from "@/components/user/OnboardingModal";
import Link from "next/link";

export default function UserLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const router = useRouter();
  const { user, role, profile, loading: authLoading } = useAuth();

  // onAuthStateChanged in AuthContext already detects the user after redirect.
  // This useEffect reacts to the auth state change and routes accordingly.

  useEffect(() => {
    if (!authLoading && user) {
      if (!user.emailVerified) {
        router.push(`/u/verify?email=${encodeURIComponent(user.email || "")}`);
      } else if (role === "admin") {
        router.push("/admin");
      } else if (role === "member") {
        router.push("/member/dashboard");
      } else if (profile) {
        // Only push to dashboard if they actually have a profile (completed onboarding)
        router.push("/u/dashboard");
      } else if (!profile) {
        // They are logged in but have no profile. Show onboarding automatically!
        setPendingUser(user);
        setShowOnboarding(true);
      }
    }
  }, [user, role, profile, authLoading, router, showOnboarding]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      if (!userCred.user.emailVerified) {
        await auth.signOut();
        throw new Error("Please verify your email before logging in. Check your inbox.");
      }
      // If verified, useEffect will handle routing
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid email or password. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Popup resolves and local useEffect catches the new user and routes them.
    } catch (err: any) {
      console.error(err);
      setError("Failed to sign in with Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen w-full bg-[#0c0c0e] flex flex-col items-center justify-center pt-20 pb-12 px-6 sm:px-12 relative overflow-hidden font-sans">
        
        {/* Background elements */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />

        <div className="w-full max-w-[450px] relative z-10 mt-4">
          
          <div className="flex justify-center mb-0">
            <img src="/logo/logo-transparent.png" alt="Connect Club" className="h-28 sm:h-32 w-auto object-contain brightness-0 invert" />
          </div>

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Student Portal</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl font-black font-heading text-white leading-[1.1] tracking-tight mb-4 uppercase">
              Welcome <span className="text-primary">Back.</span>
            </h1>
            
            <p className="text-sm text-white/50 leading-relaxed max-w-[300px] mx-auto font-medium">
              Sign in to access your student dashboard and manage your registrations.
            </p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold text-center">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                placeholder="student@vardhaman.org"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/40 ml-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6 shadow-[0_0_20px_rgba(0,85,255,0.3)] hover:shadow-[0_0_30px_rgba(0,85,255,0.5)] uppercase tracking-[0.2em] text-xs"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full mt-4 bg-white text-black font-bold py-4 px-6 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center space-x-3 shadow-sm uppercase tracking-[0.2em] text-xs"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <div className="mt-8 text-center">
            <p className="text-white/50 text-[11px] font-bold uppercase tracking-wider">
              Don't have an account?{" "}
              <Link href="/u/register" className="text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* Branding Footer */}
        <div className="relative z-10 mt-8 text-center flex items-center gap-2 text-white/30 text-[10px] font-bold uppercase tracking-[0.2em]">
          <Sparkles className="w-3 h-3" />
          Built by Connect Club
        </div>
      </div>

      {showOnboarding && pendingUser && (
        <OnboardingModal 
          isOpen={showOnboarding} 
          onClose={() => setShowOnboarding(false)} 
          user={pendingUser} 
        />
      )}
    </>
  );
}
