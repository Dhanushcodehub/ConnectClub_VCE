"use client";

import { useAuth, AuthProvider } from "@/lib/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase/config";
import AdminSidebar from "./_components/AdminSidebar";

function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [verifiedUid, setVerifiedUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const checkAuth = async () => {
      if (loading) return;

      if (!user && pathname !== "/admin/login") {
        if (active) setVerifiedUid(null);
        router.push("/admin/login");
        return;
      }

      if (user && pathname !== "/admin/login") {
        // Admin access is verified server-side below. The role claim can still
        // be "member" for someone who also has access to the member portal.
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/admin/2fa", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            await signOut(auth).catch(() => {});
            if (active) setVerifiedUid(null);
            router.replace("/admin/login");
            return;
          }
          const data = await res.json();
          if (data.twoFactorEnabled && !data.verified) {
            await signOut(auth).catch(() => {});
            if (active) setVerifiedUid(null);
            router.replace("/admin/login");
            return;
          }
          if (active) setVerifiedUid(user.uid);
        } catch {
          await signOut(auth).catch(() => {});
          if (active) setVerifiedUid(null);
          router.replace("/admin/login");
        }
      }
    };

    void checkAuth();
    return () => {
      active = false;
    };
  }, [user, loading, pathname, router]);

  const isChecking =
    loading ||
    (pathname !== "/admin/login" && Boolean(user) && verifiedUid !== user?.uid);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user && pathname !== "/admin/login") {
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
