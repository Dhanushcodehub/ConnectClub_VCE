"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Mail,
  Loader2,
  KeyRound,
  Crown,
} from "lucide-react";

interface AdminEntry {
  uid: string | null;
  email: string;
  displayName: string;
  grantedByEmail: string;
  grantedAt: string | null;
  twoFactorEnabled: boolean;
  primary: boolean;
}

export default function AdminAccessPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [email, setEmail] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [granting, setGranting] = useState(false);
  const [revokingUid, setRevokingUid] = useState<string | null>(null);

  const fetchAdmins = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/access", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load admins.");
      }
      const data = await response.json();
      setAdmins(data.admins || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load admins.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    const run = async () => {
      try {
        const token = await user.getIdToken();
        const response = await fetch("/api/admin/access", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load admins.");
        }
        const data = await response.json();
        setAdmins(data.admins || []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load admins.");
      } finally {
        setLoadingList(false);
      }
    };
    void run();
  }, [user]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      toast.error("Enter an admin email address.");
      return;
    }

    setGranting(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "grant", email: targetEmail }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to grant admin access.");
      }
      if (data.alreadyAdmin) {
        toast.info(`${targetEmail} already has admin access.`);
      } else {
        toast.success(`Admin access granted to ${targetEmail}`);
      }
      setEmail("");
      await fetchAdmins();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to grant admin access.");
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (admin: AdminEntry) => {
    if (!user) return;
    if (!confirm(`Revoke admin access for ${admin.email}? They will lose access to the admin portal.`)) {
      return;
    }

    setRevokingUid(admin.uid);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "revoke", email: admin.email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke admin access.");
      }
      toast.success(`Admin access revoked for ${admin.email}`);
      await fetchAdmins();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke admin access.");
    } finally {
      setRevokingUid(null);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black font-heading text-white">Admin Access</h1>
            <p className="text-white/50 mt-1">
              Grant or revoke admin access for club team members using any email address.
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Grant Admin Access</h2>
          <p className="text-white/50 text-sm mb-6 flex items-start gap-2">
            <KeyRound className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
            Enter the team member&apos;s email. The account must already exist in Firebase Auth
            (create it first via Admin → Members if it doesn&apos;t). Once granted, they can sign in
            at /admin/login with their own email.
          </p>

          <form onSubmit={handleGrant} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammember@gmail.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <button
              type="submit"
              disabled={granting}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Grant Access
            </button>
          </form>
        </div>

        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Current Admins</h2>

          {loadingList ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : admins.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              No admins found. Use the form above to grant access.
            </div>
          ) : (
            <div className="space-y-3">
              {admins.map((admin) => {
                const isSelf = user?.email === admin.email;
                return (
                  <div
                    key={admin.uid ?? admin.email}
                    className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-4"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        admin.primary
                          ? "bg-primary/20 border border-primary/30"
                          : "bg-white/10 border border-white/10"
                      }`}
                    >
                      <span className="text-sm font-bold text-white">
                        {admin.displayName.charAt(0).toUpperCase() || "A"}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {admin.displayName}
                        </span>
                        {(admin.primary || isSelf) && (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              admin.primary
                                ? "bg-primary/15 text-primary border border-primary/20"
                                : "bg-white/10 text-white/50 border border-white/10"
                            }`}
                          >
                            {admin.primary ? (
                              <span className="inline-flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Primary Admin
                              </span>
                            ) : (
                              "You"
                            )}
                          </span>
                        )}
                        {admin.twoFactorEnabled && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            <span className="inline-flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> 2FA
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/50 truncate">{admin.email}</div>
                      {!admin.primary && (
                        <div className="text-[11px] text-white/30 mt-1">
                          {admin.grantedAt
                            ? `Granted ${new Date(admin.grantedAt).toLocaleDateString()} by ${admin.grantedByEmail || "an admin"}`
                            : "Granted access"}
                        </div>
                      )}
                    </div>

                    {!admin.primary && !isSelf && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(admin)}
                        disabled={revokingUid === admin.uid}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                      >
                        {revokingUid === admin.uid ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserMinus className="w-3.5 h-3.5" />
                        )}
                        Revoke
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}