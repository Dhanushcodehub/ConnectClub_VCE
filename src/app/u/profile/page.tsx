"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firebase/users";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Camera, Check, X } from "lucide-react";
import Image from "next/image";
import { RollNumberVerify } from "@/components/user/RollNumberVerify";

const DEFAULT_AVATARS = [
  "/avatars/avatar_lady_coder.jpg",
  "/avatars/avatar_hacker.jpg",
  "/avatars/avatar_lady_designer.jpg",
  "/avatars/avatar_designer.jpg",
  "/avatars/avatar_lady_gamer.jpg",
  "/avatars/avatar_cyber.jpg",
  "/avatars/avatar_lady_cyber.jpg",
  "/avatars/avatar_data.jpg",
  "/avatars/avatar_hardware.jpg",
  "/avatars/avatar_gamer.jpg",
];

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [rollNoVerified, setRollNoVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rollNo: "",
    phone: "",
    department: "",
    yearOfStudy: "",
    bio: "",
    linkedinUrl: "",
    githubUrl: "",
    photoURL: "",
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        rollNo: profile.rollNo || "",
        phone: profile.phone || "",
        department: profile.department || "",
        yearOfStudy: profile.yearOfStudy || "",
        bio: profile.bio || "",
        linkedinUrl: profile.linkedinUrl || "",
        githubUrl: profile.githubUrl || "",
        photoURL: profile.photoURL || "",
      });
      setRollNoVerified(profile.rollNoVerified === true);
    }
  }, [profile]);

  const rollVerifyClearedRef = useRef(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // If roll number changes, reset verification both locally and in Firebase (once)
    if (name === "rollNo" && value !== profile?.rollNo) {
      setRollNoVerified(false);
      if (user?.uid && !rollVerifyClearedRef.current) {
        rollVerifyClearedRef.current = true;
        updateUserProfile(user.uid, { rollNoVerified: false } as any).catch(() => { });
      }
    } else if (name === "rollNo" && value === profile?.rollNo) {
      // User reverted to original roll number — restore original verification state
      setRollNoVerified(profile?.rollNoVerified === true);
      rollVerifyClearedRef.current = false;
    }
  };

  const handleRollVerified = async () => {
    if (!user?.uid) return;
    try {
      // Save both the current roll number and verification flag together
      // so refreshProfile doesn't revert the form to the old saved value
      await updateUserProfile(user.uid, {
        rollNo: formData.rollNo,
        rollNoVerified: true,
      } as any);
      setRollNoVerified(true);
      rollVerifyClearedRef.current = false;
      await refreshProfile();
    } catch (err) {
      console.error("Error saving roll verification:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setLoading(true);
    setSuccess(false);

    try {
      await updateUserProfile(user.uid, formData);
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2) : "U";
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl md:text-4xl font-heading font-black text-white tracking-tight mb-2">
          Your Profile
        </h1>
        <p className="text-zinc-300 text-sm md:text-base">
          Manage your personal information, department details, and campus preferences.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#111116] border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-xl"
        >
          {/* Avatar Section */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-8 pb-8 border-b border-zinc-800">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-zinc-900 border-2 border-primary flex items-center justify-center relative shadow-lg">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-heading font-black text-primary">
                    {getInitials(formData.name)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-primary hover:bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 border-2 border-[#111116]"
                title="Change Avatar"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-xl font-heading font-bold text-white mb-1">Profile Photo</h3>
              <p className="text-zinc-300 text-sm mb-4">
                Update your avatar or campus photo to personalize your Connect Club identity.
              </p>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 hover:text-white text-sm font-semibold transition-colors border border-zinc-700 shadow-sm"
              >
                Change Avatar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 font-medium transition-colors outline-none"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                  Roll Number
                </label>
                <RollNumberVerify
                  rollNo={formData.rollNo}
                  isVerified={rollNoVerified}
                  onVerified={handleRollVerified}
                />
              </div>
              <input
                type="text"
                name="rollNo"
                value={formData.rollNo}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 font-mono font-medium transition-colors outline-none"
                placeholder="e.g. 1602-23-733-001"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white font-medium transition-colors outline-none"
              >
                <option value="" className="bg-[#16161D] text-zinc-400">Select Department</option>
                <option value="CSE" className="bg-[#16161D] text-white">CSE</option>
                <option value="ECE" className="bg-[#16161D] text-white">ECE</option>
                <option value="EEE" className="bg-[#16161D] text-white">EEE</option>
                <option value="MECH" className="bg-[#16161D] text-white">MECH</option>
                <option value="CIVIL" className="bg-[#16161D] text-white">CIVIL</option>
                <option value="IT" className="bg-[#16161D] text-white">IT</option>
                <option value="AI&ML" className="bg-[#16161D] text-white">AI&ML</option>
                <option value="DS" className="bg-[#16161D] text-white">DS</option>
                <option value="Other" className="bg-[#16161D] text-white">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                Year of Study
              </label>
              <select
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white font-medium transition-colors outline-none"
              >
                <option value="" className="bg-[#16161D] text-zinc-400">Select Year</option>
                <option value="1st Year" className="bg-[#16161D] text-white">1st Year</option>
                <option value="2nd Year" className="bg-[#16161D] text-white">2nd Year</option>
                <option value="3rd Year" className="bg-[#16161D] text-white">3rd Year</option>
                <option value="4th Year" className="bg-[#16161D] text-white">4th Year</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 font-medium transition-colors outline-none"
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                LinkedIn Profile
              </label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 font-medium transition-colors outline-none"
                placeholder="https://linkedin.com/in/username"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 font-medium transition-colors resize-none leading-relaxed outline-none"
                placeholder="Tell us about yourself, your interests, tech stack, and goals..."
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-zinc-200 uppercase tracking-wider ml-1">
                GitHub Profile
              </label>
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="w-full bg-[#16161D] border border-zinc-700 hover:border-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 font-medium transition-colors outline-none"
                placeholder="https://github.com/username"
              />
            </div>
          </div>
        </motion.div>

        <div className="flex items-center justify-end gap-4">
          {success && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-2 text-emerald-200 bg-emerald-950 border border-emerald-600 px-4 py-2.5 rounded-xl shadow-md font-semibold text-xs"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Profile updated successfully!</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-purple-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-purple-950 disabled:opacity-60 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>

      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAvatarModalOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#121217] border border-zinc-700 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-heading font-black text-white mb-1">Choose Avatar</h2>
                  <p className="text-zinc-300 text-sm">Select an avatar character to represent your profile.</p>
                </div>
                <button
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3.5">
                {DEFAULT_AVATARS.map((url) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, photoURL: url });
                      setIsAvatarModalOpen(false);
                    }}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all bg-zinc-900 ${
                      formData.photoURL === url
                        ? "border-primary scale-105 shadow-lg shadow-purple-950/60 z-10"
                        : "border-zinc-800 hover:border-zinc-500 hover:scale-105"
                    }`}
                  >
                    <img src={url} alt="avatar" className="w-full h-full object-cover" />
                    {formData.photoURL === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white shadow-md">
                          <Check className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, photoURL: user?.photoURL || "" });
                    setIsAvatarModalOpen(false);
                  }}
                  className="text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Revert to Google Photo
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-primary hover:bg-purple-600 text-white font-bold transition-colors shadow-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
