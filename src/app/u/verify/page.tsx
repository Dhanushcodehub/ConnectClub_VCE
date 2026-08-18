"use client";

import { useState, Suspense } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Email address is missing. Please register again.");
      return;
    }
    
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      return;
    }

    setLoading(true);
    setError("");
    setResendSuccess("");

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify OTP");
      }

      // Verification successful! 
      // If the user is currently signed in (e.g. from registration), reload their profile 
      // so Firebase sees emailVerified=true. The layout will then automatically route them to the dashboard.
      const { auth } = await import("@/lib/firebase/config");
      if (auth.currentUser) {
        await auth.currentUser.reload();
      }

      router.push("/u/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setError("Email address is missing. Please register again.");
      return;
    }

    setResendLoading(true);
    setError("");
    setResendSuccess("");

    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to resend OTP");
      }

      setResendSuccess("A new verification code has been sent to your email!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResendLoading(false);
    }
  };

  return (
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
        We've sent a 6-digit verification code to <strong className="text-white">{email || "your email"}</strong>.
      </p>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {resendSuccess && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm font-medium">
          {resendSuccess}
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="000000"
            className="w-full text-center text-4xl tracking-[0.5em] bg-black/50 border border-white/10 rounded-2xl px-5 py-6 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
          />
        </div>

        <button 
          type="submit"
          disabled={loading || otp.length !== 6 || resendLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-2xl transition-all flex items-center justify-center group/btn shadow-[0_0_20px_rgba(0,85,255,0.3)] border border-blue-400/30"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Verify Account
              <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mt-8 text-left flex items-start space-x-4">
        <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-yellow-500 font-bold mb-1">Didn't receive it?</h4>
          <p className="text-yellow-500/80 text-sm leading-relaxed mb-3">
            Sometimes emails can get lost. Please check your <strong>Spam</strong> or <strong>Junk</strong> folder.
          </p>
          <button 
            onClick={handleResend}
            disabled={resendLoading || loading}
            type="button"
            className="text-yellow-500 text-sm font-bold hover:underline flex items-center transition-all disabled:opacity-50"
          >
            {resendLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Resend Verification Code
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 pt-24 relative overflow-hidden bg-[#0c0c0e]">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
      <Suspense fallback={
        <div className="text-white/50 flex items-center justify-center relative z-10">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }>
        <div className="relative z-10 w-full max-w-lg">
          <VerifyForm />
        </div>
      </Suspense>
    </div>
  );
}
