"use client";

import { useAuth, AuthProvider } from "@/lib/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import MemberSidebar from "./_components/MemberSidebar";
import { getMemberByEmail, ConnectMember } from "@/lib/firebase/members";

function ProtectedMemberLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const getRequiredPermission = (path: string) => {
    if (path.startsWith("/member/events")) return "events";
    if (path.startsWith("/member/projects")) return "projects";
    if (path.startsWith("/member/timeline")) return "timeline";
    if (path.startsWith("/member/gallery")) return "gallery";
    return null;
  };

  const [memberProfile, setMemberProfile] = useState<ConnectMember | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;

      if (!user && pathname !== "/member/login") {
        router.push("/member/login");
        return;
      }

      if (user && pathname !== "/member/login") {
        if (role === "admin") {
          router.replace("/admin");
          return;
        }

        if (user.email) {
          try {
            let currentProfile = memberProfile;
            if (!currentProfile) {
              currentProfile = await getMemberByEmail(user.email);
              setMemberProfile(currentProfile);
            }

            // RBAC Enforcement
            if (currentProfile) {
              const reqPerm = getRequiredPermission(pathname);
              if (reqPerm && (!currentProfile.permissions || !currentProfile.permissions.includes(reqPerm))) {
                router.replace("/member/dashboard");
                return; // Keep profileLoading true to prevent UI flash during redirect
              }
            }
          } catch (error) {
            console.error("Error fetching member profile:", error);
          }
        }
      }
      setProfileLoading(false);
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, loading, pathname, router]);

  if (loading || (user && profileLoading && pathname !== "/member/login")) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If not logged in and not on login page, render nothing while redirecting
  if (!user && pathname !== "/member/login") {
    return null;
  }
  
  // If user is an admin and not on login page, render nothing while redirecting
  if (role === "admin" && pathname !== "/member/login") {
    return null;
  }

  // Synchronous RBAC fallback (prevents rendering before redirect)
  if (memberProfile) {
    const reqPerm = getRequiredPermission(pathname);
    if (reqPerm && (!memberProfile.permissions || !memberProfile.permissions.includes(reqPerm))) {
      return null;
    }
  }

  return (
    <div className="flex h-screen bg-transparent overflow-hidden text-white">
      {pathname !== "/member/login" && <MemberSidebar memberProfile={memberProfile} />}
      <main className="flex-1 overflow-y-auto relative" data-lenis-prevent>
        {children}
      </main>
    </div>
  );
}

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedMemberLayout>
        {children}
      </ProtectedMemberLayout>
    </AuthProvider>
  );
}
