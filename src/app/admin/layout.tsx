"use client";

import { useAuth, AuthProvider } from "@/lib/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import AdminSidebar from "./_components/AdminSidebar";

function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [is2FAChecking, setIs2FAChecking] = useState(true);

  useEffect(() => {
    const checkAuthAnd2FA = async () => {
      if (loading) return;

      if (!user && pathname !== "/admin/login") {
        router.push("/admin/login");
        return;
      }

      if (user && pathname !== "/admin/login") {
        // Strict Role Check: Members cannot access /admin
        if (role === "member") {
          router.replace("/member/dashboard");
          return;
        }

        try {
          const adminDoc = await getDoc(doc(db, "admins", user.uid));
          if (adminDoc.exists() && adminDoc.data().twoFactorEnabled) {
            const isVerified = sessionStorage.getItem("2fa_verified");
            if (isVerified !== "true") {
              await signOut(auth);
              router.push("/admin/login");
              return;
            }
          }
        } catch (error) {
          console.error("Error checking 2FA status", error);
        }
      }
      setIs2FAChecking(false);
    };

    checkAuthAnd2FA();
  }, [user, role, loading, pathname, router]);

  if (loading || (user && is2FAChecking && pathname !== "/admin/login")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If not logged in and not on login page, render nothing while redirecting
  if (!user && pathname !== "/admin/login") {
    return null;
  }
  
  // If user is a member and not on login page, render nothing while redirecting
  if (role === "member" && pathname !== "/admin/login") {
    return null;
  }

  return (
    <div className="flex flex-col md:flex-row h-[100svh] bg-transparent overflow-hidden">
      {pathname !== "/admin/login" && <AdminSidebar />}
      <main className="flex-1 overflow-y-auto" data-lenis-prevent>
        {children}
      </main>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedAdminLayout>
        {children}
      </ProtectedAdminLayout>
    </AuthProvider>
  );
}
