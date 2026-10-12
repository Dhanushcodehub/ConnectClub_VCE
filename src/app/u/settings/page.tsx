"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  signOut,
} from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getFirebaseErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2,
  KeyRound,
  ShieldCheck,
  Save,
  User as UserIcon,
  Mail,
  AlertTriangle,
  Trash2,
  LogOut,
} from "lucide-react";
import { motion } from "framer-motion";

const MIN_PASSWORD_LENGTH = 6;

export default function UserSettingsPage() {
  const router = useRouter();
  const { user, profile, role } = useAuth();

  const isPasswordUser =
    !!user?.providerData?.some((provider) => provider.providerId === "password");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");

    if (!user || !user.email) {
      setPwdError("You are not signed in.");
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPwdError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setPwdError("New password must be different from your current password.");
      return;
    }

    setChangingPwd(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPwdSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed");
    } catch (error) {
      console.error("Password change failed:", error);
      setPwdError(getFirebaseErrorMessage(error));
    } finally {
      setChangingPwd(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");

    if (!user?.email) {
      setDeleteError("You are not signed in.");
      return;
    }
    if (deleteConfirm.trim().toLowerCase() !== user.email.toLowerCase()) {
      setDeleteError("Type your account email exactly to confirm deletion.");
      return;
    }

    setDeleting(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirm: deleteConfirm.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Account deletion failed.");

      toast.success("Your account has been deleted.");
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Account deletion failed:", error);
      setDeleteError(error instanceof Error ? error.message : "Account deletion failed.");
      setDeleting(false);
    }
  };

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8">
      <div className="pb-4 border-b border-white/5">
        <h1 className="text-3xl md:text-4xl font-black font-heading text-white mb-2">
          Account Settings
        </h1>
        <p className="text-sm text-white/50">
          Manage how you sign in, your password, and your account lifecycle.
        </p>
      </div>

      {/* Account overview */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-3xl bg-card/50 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <UserIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Account</h2>
            <p className="text-xs text-white/40">Your identity across Connect Club.</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Name</dt>
            <dd className="text-sm text-white font-semibold mt-1">
              {profile?.name || user?.displayName || "—"}
            </dd>
          </div>
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Email</dt>
            <dd className="text-sm text-white font-semibold mt-1 break-all flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-white/40 shrink-0" />
              {user?.email || "—"}
            </dd>
          </div>
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Role</dt>
            <dd className="text-sm text-white font-semibold mt-1 capitalize">{role || "user"}</dd>
          </div>
          <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
            <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">
              Email Verified
            </dt>
            <dd className="text-sm font-semibold mt-1">
              {user?.emailVerified ? (
                <span className="text-emerald-400">Verified</span>
              ) : (
                <span className="text-amber-400">Not verified</span>
              )}
            </dd>
          </div>
        </dl>
      </motion.section>

      {/* Change password */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="p-6 rounded-3xl bg-card/50 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Change Password</h2>
            <p className="text-xs text-white/40">
              {isPasswordUser
                ? "You will be asked for your current password before the new one takes effect."
                : "This account signs in with Google, so there is no password to change here."}
            </p>
          </div>
        </div>

        {pwdError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">
            {pwdError}
          </div>
        )}
        {pwdSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            {pwdSuccess}
          </div>
        )}

        {isPasswordUser ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">
                Current Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:bg-white/5 transition-all text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:bg-white/5 transition-all text-sm"
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-white/40 ml-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="off"
                  data-form-type="other"
                  data-lpignore="true"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-primary focus:bg-white/5 transition-all text-sm"
                  placeholder="Repeat the new password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPwd}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {changingPwd ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Update Password
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white/60 leading-relaxed">
            Manage your Google password in your Google account settings. Signing
            out here ends this session on this device only.
          </div>
        )}
      </motion.section>

      {/* Sessions */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="p-6 rounded-3xl bg-card/50 border border-white/10"
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-white/70" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Session</h2>
              <p className="text-xs text-white/40">
                Sign out of this device. Other devices stay signed in.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl text-sm transition-all"
          >
            Sign out
          </button>
        </div>
      </motion.section>

      {/* Danger zone */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="p-6 rounded-3xl bg-red-500/5 border border-red-500/25"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-red-400">Delete Account</h2>
            <p className="text-xs text-white/40">
              Permanently removes your profile, notifications, and projects. Your
              tickets and certificates are kept as club records.
            </p>
          </div>
        </div>

        {deleteError && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm">
            {deleteError}
          </div>
        )}

        <form onSubmit={handleDeleteAccount} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-red-400/70 ml-1">
              Type your email to confirm
            </label>
            <input
              type="email"
              required
              autoComplete="off"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="w-full bg-black/50 border border-red-500/20 rounded-2xl px-5 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-red-500/50 focus:bg-white/5 transition-all text-sm"
              placeholder={user?.email || "you@example.com"}
            />
          </div>

          <button
            type="submit"
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-red-500/90 hover:bg-red-500 text-white font-bold rounded-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete my account
          </button>
        </form>
      </motion.section>
    </div>
  );
}
