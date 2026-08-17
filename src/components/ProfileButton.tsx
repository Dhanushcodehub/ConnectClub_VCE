"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { UserCircle, LayoutDashboard, Calendar, FolderGit2, Bell, Settings, LogOut } from "lucide-react";

export function ProfileButton() {
  const { user, role, profile, loading } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    
    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userDropdownOpen]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserDropdownOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const photoURL = profile?.photoURL || user?.photoURL;

  return (
    <div className="fixed top-[26px] right-6 md:right-10 z-[60] flex items-center justify-end">
      {loading ? (
        <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse border border-white/10 shadow-lg backdrop-blur-md" />
      ) : user ? (
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/20 text-primary border border-primary/30 text-sm font-bold uppercase hover:bg-primary/30 transition-all shrink-0 overflow-hidden shadow-lg backdrop-blur-md"
            title="Profile Menu"
          >
            {photoURL ? (
              <Image src={photoURL} alt="Profile" fill sizes="40px" className="object-cover" referrerPolicy="no-referrer" />
            ) : (
              <>{user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}</>
            )}
          </button>
          
          <AnimatePresence>
            {userDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-56 bg-[#0C0C0E]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
              >
                <div className="px-4 py-3 border-b border-white/10 bg-white/[0.02]">
                  <p className="text-sm font-semibold text-white truncate">{user.displayName || "User"}</p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
                <div className="p-2 flex flex-col gap-1">
                  {role === "admin" && (
                    <Link href="/admin" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                      <LayoutDashboard className="w-4 h-4" /> Admin Portal
                    </Link>
                  )}
                  {role === "user" && (
                    <>
                      <Link href="/u/dashboard" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link href="/u/events" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <Calendar className="w-4 h-4" /> My Events
                      </Link>
                      <Link href="/u/projects" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <FolderGit2 className="w-4 h-4" /> My Projects
                      </Link>
                      <Link href="/u/notifications" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <Bell className="w-4 h-4" /> Notifications
                      </Link>
                      <Link href="/u/profile" onClick={() => setUserDropdownOpen(false)} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:text-white hover:bg-white/5 transition-colors">
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors w-full text-left mt-1 border-t border-white/5 pt-3">
                    <LogOut className="w-4 h-4" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Link
          href="/u/login"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-white/70 hover:text-white hover:bg-white/10 transition-all shadow-lg backdrop-blur-md border border-white/5 bg-black/20"
        >
          <UserCircle className="w-4 h-4" />
          <span>Login</span>
        </Link>
      )}
    </div>
  );
}
