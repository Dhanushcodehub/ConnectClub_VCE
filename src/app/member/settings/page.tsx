"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { auth, db } from "@/lib/firebase/config";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getMemberByEmail, ConnectMember } from "@/lib/firebase/members";
import {
  User,
  Key,
  Camera,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Save,
  Trash2,
} from "lucide-react";

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

function compressImage(file: File, maxDim = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve(e.target?.result as string);
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ─── Password Strength ───
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  bgColor: string;
} {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Very Weak", color: "text-red-400", bgColor: "bg-red-500" };
  if (score === 2) return { score, label: "Weak", color: "text-orange-400", bgColor: "bg-orange-500" };
  if (score === 3) return { score, label: "Fair", color: "text-yellow-400", bgColor: "bg-yellow-500" };
  if (score === 4) return { score, label: "Strong", color: "text-emerald-400", bgColor: "bg-emerald-500" };
  return { score, label: "Very Strong", color: "text-green-400", bgColor: "bg-green-500" };
}

function StrengthIcon({ score }: { score: number }) {
  if (score <= 1) return <ShieldX className="w-4 h-4 text-red-400" />;
  if (score <= 2) return <ShieldAlert className="w-4 h-4 text-orange-400" />;
  if (score <= 3) return <Shield className="w-4 h-4 text-yellow-400" />;
  return <ShieldCheck className="w-4 h-4 text-green-400" />;
}

export default function MemberSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");
  const [member, setMember] = useState<ConnectMember | null>(null);
  const [memberLoading, setMemberLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instaUrl, setInstaUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Photo upload
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState("");
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    const load = async () => {
      const m = await getMemberByEmail(user.email!);
      if (m) {
        setMember(m);
        setName(m.name || "");
        setLinkedinUrl(m.linkedinUrl || "");
        setInstaUrl(m.instaUrl || "");
        setImageUrl(m.imageUrl || "");
      }
      setMemberLoading(false);
    };
    load();
  }, [user]);

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("Please select a valid image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setPhotoError("Image must be under 10MB.");
      return;
    }

    setPhotoUploading(true);
    setPhotoError("");
    setPhotoSuccess("");

    try {
      // 1. Instant client-side compression & preview
      const compressedDataUrl = await compressImage(file, 800, 0.85);
      setImageUrl(compressedDataUrl);

      let finalUrl = compressedDataUrl;

      // 2. Attempt Cloudinary upload via /api/upload
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "image");

        const token = await user?.getIdToken();
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.secure_url || data.url) {
            finalUrl = data.secure_url || data.url;
            setImageUrl(finalUrl);
          }
        }
      } catch (uploadErr) {
        console.warn("Cloudinary upload skipped, using optimized image:", uploadErr);
      }

      // 3. Persist to Firestore (try server API route first, then client SDK)
      if (member?.id) {
        let saved = false;
        try {
          const token = await user?.getIdToken();
          const apiRes = await fetch("/api/member/update-profile", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              memberId: member.id,
              imageUrl: finalUrl,
            }),
          });
          if (apiRes.ok) {
            saved = true;
          }
        } catch (apiErr) {
          console.warn("Server API update failed, falling back to client updateDoc:", apiErr);
        }

        if (!saved) {
          await updateDoc(doc(db, "members", member.id), { imageUrl: finalUrl });
        }

        setMember((prev) => (prev ? { ...prev, imageUrl: finalUrl } : null));
        setPhotoSuccess("Profile photo updated successfully!");
        setTimeout(() => setPhotoSuccess(""), 4000);
      }
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setPhotoError(err?.message || "Failed to update photo. Please try again.");
    } finally {
      setPhotoUploading(false);
      // Reset input value so user can select the same file again if desired
      if (e.target) e.target.value = "";
    }
  };

  // Photo removal handler
  const handleRemovePhoto = async () => {
    if (!member?.id) return;
    setPhotoUploading(true);
    setPhotoError("");
    setPhotoSuccess("");

    try {
      // 1. Immediately clear local preview and file input
      setImageUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      // 2. Persist empty imageUrl to server API route
      let saved = false;
      try {
        const token = await user?.getIdToken();
        const apiRes = await fetch("/api/member/update-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            memberId: member.id,
            imageUrl: "",
          }),
        });

        if (apiRes.ok) {
          saved = true;
        } else {
          const errData = await apiRes.json().catch(() => ({}));
          console.warn("API remove photo returned error:", errData);
        }
      } catch (apiErr) {
        console.warn("Server API remove photo failed, trying client SDK:", apiErr);
      }

      // 3. Fallback client-side update if API route failed
      if (!saved) {
        await updateDoc(doc(db, "members", member.id), { imageUrl: "" });
      }

      // 4. Update local member state
      setMember((prev) => (prev ? { ...prev, imageUrl: "" } : null));
      setPhotoSuccess("Profile photo removed successfully!");
      setTimeout(() => setPhotoSuccess(""), 4000);
    } catch (err: any) {
      console.error("Photo remove error:", err);
      setPhotoError(err?.message || "Failed to remove photo. Please try again.");
    } finally {
      setPhotoUploading(false);
    }
  };

  // Save profile info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member?.id) return;
    setProfileSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      let saved = false;
      try {
        const token = await user?.getIdToken();
        const apiRes = await fetch("/api/member/update-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            memberId: member.id,
            name,
            linkedinUrl,
            instaUrl,
            imageUrl,
          }),
        });
        if (apiRes.ok) {
          saved = true;
        }
      } catch (apiErr) {
        console.warn("Server API update failed, falling back to client updateDoc:", apiErr);
      }

      if (!saved) {
        await updateDoc(doc(db, "members", member.id), {
          name,
          linkedinUrl,
          instaUrl,
          imageUrl,
        });
      }

      setMember((prev) =>
        prev
          ? {
              ...prev,
              name,
              linkedinUrl,
              instaUrl,
              imageUrl,
            }
          : null
      );

      setProfileSuccess("Profile updated successfully!");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err: any) {
      console.error("Profile update error:", err);
      setProfileError("Failed to save profile. " + (err?.message || ""));
    } finally {
      setProfileSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("Password must be at least 6 characters.");
      return;
    }

    setChangingPwd(true);

    if (!user || !user.email) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setPwdSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwdSuccess(""), 4000);
    } catch (err: any) {
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPwdError("Incorrect current password.");
      } else {
        setPwdError("Failed to update password. " + (err.message || ""));
      }
    } finally {
      setChangingPwd(false);
    }
  };

  const pwdStrength = getPasswordStrength(newPassword);

  if (memberLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="px-4 sm:px-6 md:px-8 py-4 sm:py-6 border-b border-white/5 sticky top-0 bg-background/90 backdrop-blur-md z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight">Settings</h1>
          <p className="text-white/50 text-xs sm:text-sm mt-1">Manage your profile, photo, and account security.</p>
        </header>

        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto pb-24">
          {/* Tabs */}
          <div className="flex border-b border-white/10 mb-6 sm:mb-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 sm:pb-4 px-4 sm:px-6 font-medium text-sm sm:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "profile"
                  ? "border-primary text-primary"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" /> Profile
              </div>
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={`pb-3 sm:pb-4 px-4 sm:px-6 font-medium text-sm sm:text-base transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "security"
                  ? "border-primary text-primary"
                  : "border-transparent text-white/50 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4" /> Security
              </div>
            </button>
          </div>

          {/* ─── PROFILE TAB ─── */}
          {activeTab === "profile" && (
            <div className="space-y-6 sm:space-y-8">
              {/* Profile Photo Card */}
              <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                <h2 className="text-base sm:text-xl font-bold text-white mb-5 sm:mb-6">Profile Photo</h2>

                {photoError && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{photoError}</span>
                  </div>
                )}

                {photoSuccess && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{photoSuccess}</span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8">
                  {/* Avatar */}
                  <div className="relative group shrink-0">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-white/10 border-2 border-white/10 ring-4 ring-primary/10">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white/30">
                          {name?.charAt(0)?.toUpperCase() || "M"}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={photoUploading}
                      className="absolute bottom-0 right-0 w-9 h-9 sm:w-10 sm:h-10 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center shadow-lg transition-all border-2 border-[#0c0c0e] active:scale-90"
                      title="Upload new photo"
                    >
                      {photoUploading ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-white" />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </div>

                  <div className="text-center sm:text-left flex-1">
                    <p className="text-sm text-white/60">Upload a new photo. JPG, PNG or WebP. Auto-compressed & optimized.</p>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={photoUploading}
                        className="text-xs sm:text-sm bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
                      >
                        {photoUploading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Photo...</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3.5 h-3.5" />
                            <span>Change Photo</span>
                          </>
                        )}
                      </button>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          disabled={photoUploading}
                          className="text-xs sm:text-sm bg-white/5 hover:bg-red-500/20 text-white/60 hover:text-red-400 px-3 py-2 rounded-xl font-medium transition-colors border border-white/5 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                          title="Remove your profile photo"
                        >
                          {photoUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Info Card */}
              <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                <h2 className="text-base sm:text-xl font-bold text-white mb-5 sm:mb-6">Profile Information</h2>

                {profileError && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {profileError}
                  </div>
                )}

                {profileSuccess && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    {profileSuccess}
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4 sm:space-y-5">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="Your full name"
                    />
                  </div>

                  {/* Email (read-only) */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Email</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ""}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white/50 focus:outline-none cursor-not-allowed"
                    />
                    <p className="text-[10px] sm:text-xs text-white/30">Email cannot be changed. Contact an admin if needed.</p>
                  </div>

                  {/* Read-Only Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-white/80">Position</label>
                      <input
                        type="text"
                        disabled
                        value={member?.position || "—"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white/50 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-white/80">Tier</label>
                      <input
                        type="text"
                        disabled
                        value={member?.tier || "—"}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white/50 focus:outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  {/* Social Links */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center gap-1.5">
                      <LinkedInIcon className="w-3.5 h-3.5 text-blue-400" /> LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80 flex items-center gap-1.5">
                      <InstagramIcon className="w-3.5 h-3.5 text-pink-400" /> Instagram URL
                    </label>
                    <input
                      type="url"
                      value={instaUrl}
                      onChange={(e) => setInstaUrl(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="https://instagram.com/..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {profileSaving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ─── SECURITY TAB ─── */}
          {activeTab === "security" && (
            <div className="space-y-6 sm:space-y-8">
              <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                <h2 className="text-base sm:text-xl font-bold text-white mb-5 sm:mb-6">Change Password</h2>

                {pwdError && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {pwdError}
                  </div>
                )}

                {pwdSuccess && (
                  <div className="mb-5 p-3.5 sm:p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-xs sm:text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                    {pwdSuccess}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 sm:space-y-5">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPwd ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                      >
                        {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPwd ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                      >
                        {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength Meter */}
                    {newPassword.length > 0 && (
                      <div className="mt-2.5 space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                level <= pwdStrength.score ? pwdStrength.bgColor : "bg-white/10"
                              }`}
                            />
                          ))}
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs ${pwdStrength.color}`}>
                          <StrengthIcon score={pwdStrength.score} />
                          {pwdStrength.label}
                        </div>
                        <ul className="text-[10px] sm:text-xs text-white/40 space-y-0.5 mt-1">
                          <li className={newPassword.length >= 6 ? "text-green-400" : ""}>• At least 6 characters</li>
                          <li className={/[A-Z]/.test(newPassword) ? "text-green-400" : ""}>• One uppercase letter</li>
                          <li className={/[0-9]/.test(newPassword) ? "text-green-400" : ""}>• One number</li>
                          <li className={/[^A-Za-z0-9]/.test(newPassword) ? "text-green-400" : ""}>• One special character</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPwd ? "text" : "password"}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full bg-white/5 border rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-12 ${
                          confirmPassword && confirmPassword !== newPassword
                            ? "border-red-500/50"
                            : confirmPassword && confirmPassword === newPassword
                            ? "border-green-500/50"
                            : "border-white/10"
                        }`}
                        placeholder="Re-enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors p-1"
                      >
                        {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-400 mt-1">Passwords do not match.</p>
                    )}
                    {confirmPassword && confirmPassword === newPassword && newPassword.length >= 6 && (
                      <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={changingPwd || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-bold text-sm py-3 px-6 rounded-xl transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2 active:scale-95"
                  >
                    {changingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    Update Password
                  </button>
                </form>
              </div>

              {/* Account Info */}
              <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl sm:rounded-3xl p-5 sm:p-8">
                <h2 className="text-base sm:text-xl font-bold text-white mb-4">Account Information</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-white/5">
                    <span className="text-white/50 sm:w-32 shrink-0 text-xs sm:text-sm">Email</span>
                    <span className="text-white text-xs sm:text-sm break-all">{user?.email}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-white/5">
                    <span className="text-white/50 sm:w-32 shrink-0 text-xs sm:text-sm">Member Since</span>
                    <span className="text-white text-xs sm:text-sm">
                      {user?.metadata?.creationTime
                        ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 border-b border-white/5">
                    <span className="text-white/50 sm:w-32 shrink-0 text-xs sm:text-sm">Last Sign-In</span>
                    <span className="text-white text-xs sm:text-sm">
                      {user?.metadata?.lastSignInTime
                        ? new Date(user.metadata.lastSignInTime).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3">
                    <span className="text-white/50 sm:w-32 shrink-0 text-xs sm:text-sm">Tier</span>
                    <span className="text-primary font-semibold text-xs sm:text-sm">{member?.tier || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
