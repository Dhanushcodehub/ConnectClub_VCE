"use client";

import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LogOut, 
  LayoutGrid, 
  Calendar, 
  Briefcase, 
  Clock, 
  Image as ImageIcon,
  MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";
import { ConnectMember } from "@/lib/firebase/members";

const ALL_NAV_ITEMS = [
  { name: "Dashboard", path: "/member/dashboard", icon: LayoutGrid, permission: "dashboard" },
  { name: "Events", path: "/member/events", icon: Calendar, permission: "events" },
  { name: "Projects", path: "/member/projects", icon: Briefcase, permission: "projects" },
  { name: "Timeline", path: "/member/timeline", icon: Clock, permission: "timeline" },
  { name: "Gallery", path: "/member/gallery", icon: ImageIcon, permission: "gallery" },
];

export default function MemberSidebar({ memberProfile }: { memberProfile: ConnectMember | null }) {
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut(auth);
  };

  // Filter items based on permissions
  const permissions = memberProfile?.permissions || [];
  
  const navItems = ALL_NAV_ITEMS.filter(item => 
    item.permission === "dashboard" || permissions.includes(item.permission)
  );

  return (
    <aside className="w-72 border-r border-white/5 bg-card/50 backdrop-blur-xl flex flex-col hidden md:flex shrink-0 z-50 shadow-2xl">
      <div className="p-6 border-b border-white/5 flex flex-col items-center">
        <Link href="/member/dashboard">
          <img
            src="/logo/logo-transparent.png"
            alt="Connect Club"
            className="w-16 h-16 lg:w-20 lg:h-20 object-contain brightness-0 invert"
          />
        </Link>
        <div className="flex flex-col items-center mt-3">
          <h2 className="text-lg font-bold text-white">CONNECT CLUB</h2>
          <p className="text-[11px] text-gray-400 text-center leading-4">
            Vardhaman College
            <br />
            of Engineering
          </p>
          <div className="w-20 h-px bg-white/10 mt-3"></div>
          <span className="mt-3 text-[10px] uppercase tracking-[0.35em] text-blue-400">
            MEMBER PORTAL
          </span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar" data-lenis-prevent>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.path}
              className="relative flex items-center px-4 py-3.5 rounded-2xl transition-all group overflow-hidden"
            >
              {isActive && (
                <motion.div
                  layoutId="member-sidebar-active"
                  className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <Icon 
                className={`w-5 h-5 mr-3 transition-colors relative z-10 ${
                  isActive ? "text-primary" : "text-white/40 group-hover:text-white"
                }`} 
              />
              <span 
                className={`font-medium transition-colors relative z-10 ${
                  isActive ? "text-primary font-semibold" : "text-white/60 group-hover:text-white"
                }`}
              >
                {item.name}
              </span>
            </Link>
          );
        })}

        {/* Global Chat is accessible to all members */}
        <Link
          href="/member/chat"
          className="relative flex items-center px-4 py-3.5 rounded-2xl transition-all group overflow-hidden mt-4"
        >
          {pathname === "/member/chat" && (
            <motion.div
              layoutId="member-sidebar-active"
              className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          
          <MessageSquare 
            className={`w-5 h-5 mr-3 transition-colors relative z-10 ${
              pathname === "/member/chat" ? "text-primary" : "text-white/40 group-hover:text-white"
            }`} 
          />
          <span 
            className={`font-medium transition-colors relative z-10 ${
              pathname === "/member/chat" ? "text-primary font-semibold" : "text-white/60 group-hover:text-white"
            }`}
          >
            Club Chat
          </span>
        </Link>
      </nav>

      <div className="p-6 border-t border-white/5 bg-black/20">
        <div className="flex items-center space-x-3 mb-6 bg-white/5 p-3 rounded-2xl border border-white/5">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white">
              {memberProfile?.name?.charAt(0).toUpperCase() || auth.currentUser?.email?.charAt(0).toUpperCase() || "M"}
            </span>
          </div>
          <div className="overflow-hidden">
            <div className="text-sm font-semibold truncate">{memberProfile?.name || auth.currentUser?.email}</div>
            <div className="text-xs text-blue-400 font-medium flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
              {memberProfile?.tier || "Member"}
            </div>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all group"
        >
          <LogOut className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
