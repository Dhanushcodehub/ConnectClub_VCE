"use client";

import { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getMemberByEmail, ConnectMember } from "@/lib/firebase/members";
import { getFirebaseErrorMessage } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, KeyRound, ShieldCheck, Save, User as UserIcon } from "lucide-react";
import { motion } from "framer-motion";

const MIN_PASSWORD_LENGTH = 6;

export default function MemberSettingsPage() {
  const { user } = useAuth();
  const [memberProfile, setMemberProfile] = useState<ConnectMember | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user?.email) {
      setProfileLoading(false);
      return;
    }
    (async () => {
      try {
        const profile = await getMemberByEmail(user.email!);
        if (!cancelled) setMemberProfile(profile);
      } catch (error) {
        console.error("Unable to load member profile:", error);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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

  return (
    <div className="p-6 md:p-12 max-w-4xl mx-auto w-full space-y-8">
      <div className="pb-4 border-b border-white/5">
        <h1 className="text-3xl md:text-4xl font-black font-heading text-white mb-2">
          Account Settings
        </h1>
        <p className="text-sm text-white/50">
          Manage your sign-in credentials and review what your member role can access.
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
            <h2 className="text-lg font-bold text-white">Profile</h2>
            <p className="text-xs text-white/40">Read-only details synced with the club directory.</p>
          </div>
        </div>

        {profileLoading ? (
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading profile…
          </div>
        ) : (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Name</dt>
              <dd className="text-sm text-white font-semibold mt-1">
                {memberProfile?.name || user?.displayName || "—"}
              </dd>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Club Email</dt>
              <dd className="text-sm text-white font-semibold mt-1 break-all">
                {user?.email || "—"}
              </dd>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Tier</dt>
              <dd className="text-sm text-white font-semibold mt-1">
                {memberProfile?.tier || "Member"}
              </dd>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Email Verified</dt>
              <dd className="text-sm font-semibold mt-1">
                {user?.emailVerified ? (
                  <span className="text-emerald-400">Verified</span>
                ) : (
                  <span className="text-amber-400">Not verified</span>
                )}
              </dd>
            </div>
            {memberProfile?.permissions && memberProfile.permissions.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-2">
                  Granted Permissions
                </dt>
                <dd className="flex flex-wrap gap-2">
                  {memberProfile.permissions.map((permission) => (
                    <span
                      key={permission}
                      className="px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-300"
                    >
                      {permission.replace(/_/g, " ")}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        )}
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
              You will be asked for your current password before the new one takes effect.
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
      </motion.section>

      {/* Session tips */}
      <section className="p-5 rounded-3xl bg-blue-500/5 border border-blue-500/20 text-xs text-white/50 leading-relaxed">
        Signed out unexpectedly? Your password may have been reset from another
        device — use “Forgot password?” on the member login page to set a new one.
        Changing your password does not sign out other devices; sign out of those
        sessions manually if you no longer recognise them.
      </section>
    </div>
  );
}
