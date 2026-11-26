"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";
import { getUserProfile, ConnectUser } from "@/lib/firebase/users";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: "admin" | "member" | "user" | null;
  profile: ConnectUser | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  role: null, 
  profile: null,
  refreshProfile: async () => {} 
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "member" | "user" | null>(null);
  const [profile, setProfile] = useState<ConnectUser | null>(null);
  const [loading, setLoading] = useState(() => isFirebaseConfigured && Boolean(auth));
  const authEventIdRef = useRef(0);

  const refreshProfile = async () => {
    const current = auth?.currentUser ?? user;
    if (current) {
      const p = await getUserProfile(current.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const eventId = ++authEventIdRef.current;

      if (!currentUser) {
        setUser(null);
        setRole(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Keep loading=true until role and Firestore profile finish resolving
      // so route guards and login pages do not flash onboarding prematurely.
      setLoading(true);

      let resolvedRole: "admin" | "member" | "user" | null = null;
      let resolvedProfile: ConnectUser | null = null;

      try {
        // Force refresh to pick up latest custom claims
        const idTokenResult = await getIdTokenResult(currentUser, true);
        if (eventId !== authEventIdRef.current) return;

        if (idTokenResult.claims.role === "member") {
          resolvedRole = "member";
        } else if (idTokenResult.claims.role === "user") {
          resolvedRole = "user";
          resolvedProfile = await getUserProfile(currentUser.uid);
        } else if (idTokenResult.claims.role === "admin") {
          resolvedRole = "admin";
          resolvedProfile = await getUserProfile(currentUser.uid);
        } else {
          // Check if the user has a profile in the users collection (Google sign-in without claim yet)
          resolvedProfile = await getUserProfile(currentUser.uid);
          if (resolvedProfile) {
            resolvedRole = "user";
          } else if (currentUser.email === "admin@connectclubvce.in") {
            resolvedRole = "admin";
          } else {
            // Not an admin, no profile yet. Leave as user so they can complete onboarding.
            resolvedRole = "user";
          }
        }
      } catch (error) {
        console.error("Error fetching custom claims:", error);
        resolvedRole = null; // Fail safe to lowest privilege
        resolvedProfile = null;
      }

      if (eventId !== authEventIdRef.current) return;

      setUser(currentUser);
      setRole(resolvedRole);
      setProfile(resolvedProfile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role, profile, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
