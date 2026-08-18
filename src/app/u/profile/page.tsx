"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { updateUserProfile } from "@/lib/firebase/users";
import { motion, AnimatePresence } from "framer-motion";
import { Save, Camera, Check, X } from "lucide-react";
import Image from "next/image";

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
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
    <div className="p-8 md:p-12 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
          Your Profile
        </h1>
        <p className="text-white/50">
          Manage your personal information and preferences.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl p-8"
        >
          {/* Avatar Section */}
          <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-10 border-b border-white/[0.06]">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/20 flex items-center justify-center relative">
                {formData.photoURL ? (
                  <img src={formData.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-display font-bold text-primary">
                    {getInitials(formData.name)}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="absolute bottom-0 right-0 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:bg-primary/90 transition-transform hover:scale-105 border-2 border-[#0C0C0E]"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center md:text-left flex-1">
              <h3 className="text-xl font-display font-bold text-white mb-1">Profile Photo</h3>
              <p className="text-white/50 text-sm mb-4">
                Update your avatar to personalize your Connect Club profile.
              </p>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(true)}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-colors border border-white/10"
              >
                Change Avatar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">Roll Number</label>
              <input
                type="text"
                name="rollNo"
                value={formData.rollNo}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="e.g. 1602-xx-xxx-xxx"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">Department</label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors appearance-none"
              >
                <option value="" className="bg-[#0C0C0E]">Select Department</option>
                <option value="CSE" className="bg-[#0C0C0E]">CSE</option>
                <option value="ECE" className="bg-[#0C0C0E]">ECE</option>
                <option value="EEE" className="bg-[#0C0C0E]">EEE</option>
                <option value="MECH" className="bg-[#0C0C0E]">MECH</option>
                <option value="CIVIL" className="bg-[#0C0C0E]">CIVIL</option>
                <option value="IT" className="bg-[#0C0C0E]">IT</option>
                <option value="AI&ML" className="bg-[#0C0C0E]">AI&ML</option>
                <option value="DS" className="bg-[#0C0C0E]">DS</option>
                <option value="Other" className="bg-[#0C0C0E]">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">Year of Study</label>
              <select
                name="yearOfStudy"
                value={formData.yearOfStudy}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors appearance-none"
              >
                <option value="" className="bg-[#0C0C0E]">Select Year</option>
                <option value="1st Year" className="bg-[#0C0C0E]">1st Year</option>
                <option value="2nd Year" className="bg-[#0C0C0E]">2nd Year</option>
                <option value="3rd Year" className="bg-[#0C0C0E]">3rd Year</option>
                <option value="4th Year" className="bg-[#0C0C0E]">4th Year</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="+91"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-white/70 ml-1">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={3}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors resize-none"
                placeholder="Tell us a bit about yourself..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">LinkedIn Profile</label>
              <input
                type="url"
                name="linkedinUrl"
                value={formData.linkedinUrl}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="https://linkedin.com/in/..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">GitHub Profile</label>
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="https://github.com/..."
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
              className="flex items-center gap-2 text-green-400 bg-green-400/10 px-4 py-2 rounded-xl"
            >
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Profile updated successfully!</span>
            </motion.div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0C0C0E] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-display font-bold text-white mb-1">Choose Avatar</h2>
                  <p className="text-white/50 text-sm">Select a character to represent you.</p>
                </div>
                <button
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors border border-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {DEFAULT_AVATARS.map(url => (
                  <button 
                    key={url}
                    type="button"
                    onClick={() => {
                      setFormData({...formData, photoURL: url});
                      setIsAvatarModalOpen(false);
                    }}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      formData.photoURL === url 
                        ? 'border-primary scale-105 shadow-[0_0_20px_rgba(var(--primary),0.3)] z-10' 
                        : 'border-white/5 hover:border-white/30 hover:scale-105'
                    }`}
                  >
                    <img src={url} alt="avatar" className="w-full h-full object-cover" />
                    {formData.photoURL === url && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                          <Check className="w-5 h-5" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-white/10 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, photoURL: user?.photoURL || ""});
                    setIsAvatarModalOpen(false);
                  }}
                  className="text-sm text-white/50 hover:text-white transition-colors"
                >
                  Revert to Google Photo
                </button>
                <button
                  type="button"
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium transition-colors"
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
