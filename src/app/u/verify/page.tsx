"use client";

import { useState, useRef, Suspense } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const [otpVals, setOtpVals] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otp = otpVals.join("");
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

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (!value && e.target.value !== "") return;

    const newOtp = [...otpVals];
    newOtp[index] = value.substring(value.length - 1);
    setOtpVals(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!otpVals[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const newOtp = [...otpVals];
      newOtp[index] = "";
      setOtpVals(newOtp);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text/plain").replace(/[^0-9]/g, "").substring(0, 6);
    const newOtp = [...otpVals];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpVals(newOtp);
    
    if (pastedData.length > 0) {
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
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
      className="w-full max-w-[450px] relative z-10 mt-8 mx-auto"
    >
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Verify Email</span>
        </div>
        
        <h1 className="text-4xl sm:text-5xl font-black font-heading text-white leading-[1.1] tracking-tight mb-4 uppercase">
          Check Your <span className="text-primary">Inbox.</span>
        </h1>
        
        <p className="text-sm text-white/50 leading-relaxed max-w-[300px] mx-auto font-medium">
          We've sent a 6-digit verification code to <strong className="text-white">{email || "your email"}</strong>.
        </p>
      </div>

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
        <div className="flex gap-3 sm:gap-4 justify-center" onPaste={handlePaste}>
          {otpVals.map((val, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={val}
              onChange={(e) => handleChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold bg-black/50 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            />
          ))}
        </div>

        <button 
          type="submit"
          disabled={loading || otp.length !== 6 || resendLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-center group/btn shadow-[0_0_20px_rgba(0,85,255,0.3)] hover:shadow-[0_0_30px_rgba(0,85,255,0.5)] uppercase tracking-[0.2em] text-xs"
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

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-5 mt-8 text-left flex items-start space-x-4">
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 sm:px-12 pt-20 pb-12 relative overflow-hidden bg-[#0c0c0e]">
      {/* Background elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-[128px]" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[128px]" />
      
      <Suspense fallback={
        <div className="text-white/50 flex items-center justify-center relative z-10 mt-20">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }>
        <div className="relative z-10 w-full max-w-[450px]">
          <VerifyForm />
        </div>
      </Suspense>
    </div>
  );
}
