"use client";

import { useState } from "react";
import { User, getIdTokenResult } from "firebase/auth";
import { Loader2, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function OnboardingModal({ isOpen, onClose, user }: OnboardingModalProps) {
  const [formData, setFormData] = useState({
    name: user.displayName || "",
    rollNo: "",
    phone: "",
    department: "",
    yearOfStudy: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          photoURL: user.photoURL,
          ...formData
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to complete profile.");
      }

      // Force token refresh to get updated custom claims
      await getIdTokenResult(user, true);
      
      router.push("/u/dashboard");
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-lg bg-[#0C0C0E] border border-white/10 p-8 rounded-3xl shadow-2xl relative z-10"
          >
            <div className="mb-8 text-center">
              <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 text-primary border border-primary/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black font-heading text-white mb-2">Complete Your Profile</h2>
              <p className="text-white/50 text-sm">Just a few more details to get you started</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm font-medium flex items-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Department</label>
                  <div className="relative">
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-[#0C0C0E] text-white/50">Select Dept (Optional)</option>
                      <option value="CSE" className="bg-[#0C0C0E] text-white">CSE</option>
                      <option value="ECE" className="bg-[#0C0C0E] text-white">ECE</option>
                      <option value="EEE" className="bg-[#0C0C0E] text-white">EEE</option>
                      <option value="MECH" className="bg-[#0C0C0E] text-white">MECH</option>
                      <option value="CIVIL" className="bg-[#0C0C0E] text-white">CIVIL</option>
                      <option value="IT" className="bg-[#0C0C0E] text-white">IT</option>
                      <option value="AI&ML" className="bg-[#0C0C0E] text-white">AI&ML</option>
                      <option value="DS" className="bg-[#0C0C0E] text-white">DS</option>
                      <option value="Other" className="bg-[#0C0C0E] text-white">Other</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">Year</label>
                  <div className="relative">
                    <select
                      name="yearOfStudy"
                      value={formData.yearOfStudy}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:bg-white/5 transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-[#0C0C0E] text-white/50">Select Year (Optional)</option>
                      <option value="1st Year" className="bg-[#0C0C0E] text-white">1st Year</option>
                      <option value="2nd Year" className="bg-[#0C0C0E] text-white">2nd Year</option>
                      <option value="3rd Year" className="bg-[#0C0C0E] text-white">3rd Year</option>
                      <option value="4th Year" className="bg-[#0C0C0E] text-white">4th Year</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-4 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Complete Setup"
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
