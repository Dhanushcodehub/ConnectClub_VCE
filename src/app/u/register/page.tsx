"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, signInWithRedirect, GoogleAuthProvider, User } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, Sparkles, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/contexts/AuthContext";
import { checkUserExists } from "@/lib/firebase/users";
import OnboardingModal from "@/components/user/OnboardingModal";
import Link from "next/link";

export default function UserRegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    phone: "",
    email: "",
    password: "",
    department: "",
    yearOfStudy: ""
  });
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
    if (!authLoading && user && !showOnboarding) {
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "member") {
        router.push("/member/dashboard");
      } else if (profile) {
        router.push("/u/dashboard");
      } else if (!profile) {
        setPendingUser(user);
        setShowOnboarding(true);
      }
    }
  }, [user, role, profile, authLoading, router, showOnboarding]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register.");
      }

      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      // Let useEffect handle routing
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError("");
    setGoogleLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
      // No code runs after this, as the page redirects.
      // Upon returning, the global AuthContext and local useEffect will catch the new user
      // and either route them to the dashboard or open the OnboardingModal.
    } catch (err: any) {
      console.error(err);
      setError("Failed to redirect to Google. Please try again.");
      setGoogleLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#050505] flex flex-row">
        {/* Left Side - Branding (Hidden on mobile) */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-between p-12 overflow-hidden border-r border-white/5">
          <div className="absolute inset-0 bg-gradient-to-bl from-blue-900/20 via-[#050505] to-primary/10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay" />
          
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
                <GraduationCap className="w-3 h-3 text-blue-400" />
                <span>Student Portal Access</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-black font-heading text-white leading-[1.1] tracking-tight mb-6 whitespace-pre-line">
                Join the{"\n"}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-primary">Connect Club</span>.
              </h1>
              <p className="text-lg text-white/50 leading-relaxed max-w-md">
                Create your student account to register for events, showcase your projects, and more.
              </p>
            </motion.div>
          </div>

          <div className="relative z-10 flex">
            <div className="flex items-center space-x-2 text-sm text-white/40">
              <Sparkles className="w-4 h-4" />
              <span>Built for Students, by Students</span>
            </div>
          </div>
        </div>

        {/* Right Side - Register Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative overflow-y-auto">
          <div className="absolute inset-0 lg:hidden bg-gradient-to-bl from-blue-900/20 via-[#050505] to-primary/10" />
          
          <div className="w-full max-w-md relative z-10 py-10">
            <div className="lg:hidden flex items-center justify-center mb-8">
              <img 
                src="/logo/logo-transparent.png" 
                alt="Connect Club" 
                className="h-20 w-auto object-contain brightness-0 invert"
              />
            </div>

            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-[#0C0C0E]/80 backdrop-blur-2xl border border-white/10 p-8 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden group hover:border-white/20 transition-colors"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
              
              <div className="mb-8">
                <h2 className="text-3xl font-black font-heading text-white mb-2">Create Account</h2>
                <p className="text-white/50 text-sm">Join the Connect Club community</p>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center">
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Full Name</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
                    placeholder="John Doe"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Roll Number</label>
                    <input
                      type="text"
                      required
                      name="rollNo"
                      value={formData.rollNo}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all uppercase"
                      placeholder="21881A0500"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Email</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
                    placeholder="student@vardhaman.org"
                  />
                </div>
                
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Password</label>
                  <input
                    type="password"
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all"
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Department</label>
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all appearance-none"
                    >
                      <option value="" disabled>Select Dept</option>
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="MECH">MECH</option>
                      <option value="CIVIL">CIVIL</option>
                      <option value="IT">IT</option>
                      <option value="AI&ML">AI&ML</option>
                      <option value="DS">DS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2 relative">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Year</label>
                    <select
                      name="yearOfStudy"
                      value={formData.yearOfStudy}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all appearance-none"
                    >
                      <option value="" disabled>Select Year</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6 group/btn"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center my-6 space-x-2 text-white/20">
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-xs font-medium uppercase text-white/40">── OR ──</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignUp}
                disabled={loading || googleLoading}
                className="w-full bg-white text-black font-bold py-4 px-4 rounded-2xl hover:bg-gray-200 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign up with Google</span>
                  </>
                )}
              </button>

              <div className="mt-8 text-center">
                <p className="text-white/50 text-sm">
                  Already have an account?{" "}
                  <Link href="/u/login" className="text-blue-400 hover:text-blue-300 font-medium">
                    Sign in
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
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
