"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
// UserSidebar removed
import { getUserProfile, ConnectUser } from "@/lib/firebase/users";

function ProtectedUserLayout({ children }: { children: React.ReactNode }) {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [userProfile, setUserProfile] = useState<ConnectUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (loading) return;

      const isAuthPage = pathname === "/u/login" || pathname === "/u/register";

      if (!user && !isAuthPage) {
        router.push("/u/login");
        return;
      }

      if (user && !isAuthPage) {
        if (role === "admin") {
          router.replace("/admin");
          return;
        }
        if (role === "member") {
          router.replace("/member/dashboard");
          return;
        }

        if (user.uid) {
          try {
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
            
            if (!profile) {
              // They are logged in but have no profile. Force them to the login page for onboarding.
              router.replace("/u/login");
              return;
            }
          } catch (error) {
            console.error("Error fetching user profile:", error);
          }
        }
      }
      setProfileLoading(false);
    };

    checkAuth();
  }, [user, role, loading, pathname, router]);

  const isAuthPage = pathname === "/u/login" || pathname === "/u/register";

  if (loading || (user && profileLoading && !isAuthPage)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user && !isAuthPage) {
    return null;
  }
  
  if ((role === "admin" || role === "member") && !isAuthPage) {
    return null;
  }

  return (
    <div className="w-full text-white pt-28 pb-12 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {children}
      </div>
    </div>
  );
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedUserLayout>
      {children}
    </ProtectedUserLayout>
  );
}
