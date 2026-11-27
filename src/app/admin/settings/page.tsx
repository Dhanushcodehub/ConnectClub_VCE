"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { auth, db } from "@/lib/firebase/config";
import { 
  EmailAuthProvider, 
  reauthenticateWithCredential, 
  updatePassword 
} from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc 
} from "firebase/firestore";
import { ShieldCheck, Key, History, Loader2, AlertCircle } from "lucide-react";
import { authenticator } from "otplib";
import { QRCodeSVG } from "qrcode.react";

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"security" | "history">("security");

  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSuccess, setPwdSuccess] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false);
  const [setupSecret, setSetupSecret] = useState("");
  const [setupUri, setSetupUri] = useState("");
  const [totpInput, setTotpInput] = useState("");
  const [tfaError, setTfaError] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);

  // History State
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    if (!user) return;

    // Fetch 2FA Status
    const fetchAdminStatus = async () => {
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        setTwoFactorEnabled(!!adminDoc.data().twoFactorEnabled);
      }
    };

    // Fetch Login History
    const fetchHistory = async () => {
      try {
        const q = query(
          collection(db, "loginHistory"),
          where("uid", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLoginHistory(history);
      } catch (error: any) {
        if (error.message?.includes("requires an index")) {
          setHistoryError(error.message);
        }
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchAdminStatus();
    fetchHistory();
  }, [user]);

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    setPwdSuccess("");
    setChangingPwd(true);

    if (!user || !user.email) return;

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setPwdSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err: any) {
      if (err.code === "auth/wrong-password") {
        setPwdError("Incorrect current password.");
      } else {
        setPwdError("Failed to update password. " + err.message);
      }
    } finally {
      setChangingPwd(false);
    }
  };

  // Handle 2FA Setup Initiation
  const start2FASetup = () => {
    if (!user || !user.email) return;
    const secret = authenticator.generateSecret();
    const uri = authenticator.keyuri(user.email, "ConnectClub Admin", secret);
    setSetupSecret(secret);
    setSetupUri(uri);
    setIsSettingUp2FA(true);
    setTfaError("");
    setTotpInput("");
  };

  // Handle 2FA Verification and Saving
  const verifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setTfaLoading(true);
    setTfaError("");

    const isValid = authenticator.verify({ token: totpInput, secret: setupSecret });
    
    if (isValid) {
      try {
        await setDoc(doc(db, "admins", user.uid), {
          twoFactorEnabled: true,
          twoFactorSecret: setupSecret
        }, { merge: true });
        
        setTwoFactorEnabled(true);
        setIsSettingUp2FA(false);
        sessionStorage.setItem("2fa_verified", "true"); // Prevent immediate logout
      } catch (error: any) {
        setTfaError("Failed to save settings: " + error.message);
      }
    } else {
      setTfaError("Invalid code. Try again.");
    }
    setTfaLoading(false);
  };

  // Handle 2FA Disable
  const disable2FA = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.")) return;
    
    setTfaLoading(true);
    try {
      await setDoc(doc(db, "admins", user.uid), {
        twoFactorEnabled: false,
        twoFactorSecret: null
      }, { merge: true });
      setTwoFactorEnabled(false);
    } catch (error) {
      console.error("Failed to disable 2FA", error);
    } finally {
      setTfaLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-black font-heading text-white">Settings</h1>
        <p className="text-white/50 mt-2">Manage your account security and preferences.</p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-white/10 mb-8">
        <button
          onClick={() => setActiveTab("security")}
          className={`pb-4 px-6 font-medium transition-colors border-b-2 ${
            activeTab === "security" 
              ? "border-primary text-primary" 
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <Key className="w-4 h-4 mr-2" /> Security
          </div>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`pb-4 px-6 font-medium transition-colors border-b-2 ${
            activeTab === "history" 
              ? "border-primary text-primary" 
              : "border-transparent text-white/50 hover:text-white"
          }`}
        >
          <div className="flex items-center">
            <History className="w-4 h-4 mr-2" /> Login History
          </div>
        </button>
      </div>

      {activeTab === "security" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Change Password */}
          <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-6">Change Password</h2>
            
            {pwdError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-start">
                <AlertCircle className="w-4 h-4 mt-0.5 mr-2 shrink-0" />
                {pwdError}
              </div>
            )}
            
            {pwdSuccess && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 text-green-400 rounded-xl text-sm flex items-start">
                <ShieldCheck className="w-4 h-4 mt-0.5 mr-2 shrink-0" />
                {pwdSuccess}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white/80">New Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={changingPwd}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 mt-4 flex justify-center"
              >
                {changingPwd ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Password"}
              </button>
            </form>
          </div>

          {/* Two-Factor Authentication */}
          <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-white mb-2">Two-Factor Authentication</h2>
            <p className="text-white/50 text-sm mb-6">
              Add an extra layer of security to your account using an Authenticator app (like Google Authenticator or Authy).
            </p>

            {twoFactorEnabled ? (
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-green-500 font-bold mb-2">2FA is Enabled</h3>
                <p className="text-green-500/70 text-sm mb-6">
                  Your account is protected. You will be asked for a code when you log in.
                </p>
                <button
                  onClick={disable2FA}
                  disabled={tfaLoading}
                  className="px-6 py-2 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                >
                  Disable 2FA
                </button>
              </div>
            ) : !isSettingUp2FA ? (
              <div className="text-center py-6">
                <button
                  onClick={start2FASetup}
                  className="px-6 py-3 bg-white/10 hover:bg-white/15 text-white rounded-xl font-medium transition-colors"
                >
                  Set up 2FA
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <h3 className="text-white font-bold mb-4">Scan this QR Code</h3>
                <div className="bg-white p-4 rounded-xl inline-block mb-4">
                  <QRCodeSVG value={setupUri} size={150} />
                </div>
                <p className="text-white/50 text-sm mb-4">
                  Open your Authenticator app and scan the QR code above. Then enter the 6-digit code below to verify.
                </p>
                
                {tfaError && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                    {tfaError}
                  </div>
                )}

                <form onSubmit={verifyAndEnable2FA} className="flex gap-2">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 bg-background border border-white/10 rounded-lg px-4 py-2 text-white font-mono tracking-widest text-center focus:outline-none focus:border-primary"
                    placeholder="000000"
                  />
                  <button
                    type="submit"
                    disabled={tfaLoading || totpInput.length !== 6}
                    className="px-6 bg-primary text-white font-bold rounded-lg disabled:opacity-50 flex items-center"
                  >
                    {tfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                  </button>
                </form>
                <button
                  onClick={() => setIsSettingUp2FA(false)}
                  className="mt-4 text-sm text-white/50 hover:text-white transition-colors"
                >
                  Cancel Setup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-8">
          <h2 className="text-xl font-bold text-white mb-6">Recent Login History</h2>
          
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : historyError ? (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 shrink-0" />
                <div className="text-red-400">
                  <p className="font-bold mb-1">Firestore Index Required</p>
                  <p className="mb-2">To display the login history efficiently, Firestore requires a composite index.</p>
                  <p className="text-white/70 overflow-hidden break-words text-xs">
                    Please open your browser console, copy the URL provided in the error, and paste it into your browser to automatically create the index. 
                    Alternatively, click this link if it rendered:
                  </p>
                  <a 
                    href={historyError.match(/(https:\/\/[^\s]+)/)?.[0] || "#"} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-primary hover:underline mt-2 inline-block break-all"
                  >
                    {historyError.match(/(https:\/\/[^\s]+)/)?.[0] || "Link not found in error."}
                  </a>
                </div>
              </div>
            </div>
          ) : loginHistory.length === 0 ? (
            <div className="text-center py-12 text-white/50">
              No login history found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white/50 text-sm">
                    <th className="pb-4 font-medium">Date & Time</th>
                    <th className="pb-4 font-medium">Account</th>
                    <th className="pb-4 font-medium">Device / Browser Info</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {loginHistory.map((log) => (
                    <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                      <td className="py-4 text-white">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 text-white/70">{log.email}</td>
                      <td className="py-4 text-white/50 truncate max-w-xs" title={log.userAgent}>
                        {log.userAgent}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
