"use client";

import { createContext, useContext, useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const p = await getUserProfile(user.uid);
      setProfile(p);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          // Force refresh on first load to get latest custom claims
          const idTokenResult = await getIdTokenResult(currentUser, true);
          
          if (idTokenResult.claims.role === "member") {
            setRole("member");
          } else if (idTokenResult.claims.role === "user") {
            setRole("user");
            // Load user profile from Firestore
            const userProfile = await getUserProfile(currentUser.uid);
            setProfile(userProfile);
          } else if (idTokenResult.claims.role === "admin") {
            setRole("admin");
          } else {
            // Check if the user has a profile in the users collection (Google sign-in without claim yet)
            const userProfile = await getUserProfile(currentUser.uid);
            if (userProfile) {
              setRole("user");
              setProfile(userProfile);
            } else {
              // Fallback for new/incomplete accounts
              if (currentUser.email === "admin@connectclubvce.in") {
                setRole("admin");
              } else {
                // Not an admin, no profile yet. Leave as user so they can complete onboarding.
                setRole("user");
              }
            }
          }
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setRole(null); // Fail safe to lowest privilege
        }
      } else {
        setRole(null);
        setProfile(null);
      }

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
