"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase/config";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  role: "admin" | "member" | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, role: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "member" | null>(null);
  const [loading, setLoading] = useState(!isFirebaseConfigured || !auth);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
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
          } else {
            // Default to admin if no claim is found (since original setup was just the admin)
            // or we could check the email explicitly against a hardcoded list.
            setRole("admin");
          }
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setRole("member"); // Fail safe to lowest privilege
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, role }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
