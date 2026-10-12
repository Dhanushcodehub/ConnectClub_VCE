"use client";

import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { 
  LogOut, 
  LayoutGrid, 
  Calendar, 
  Briefcase, 
  Clock, 
  Image as ImageIcon,
  MessageSquare,
  Bell,
  Settings,
  ClipboardList,
  Menu,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ConnectMember } from "@/lib/firebase/members";

const ALL_NAV_ITEMS = [
  { name: "Dashboard", path: "/member/dashboard", icon: LayoutGrid, permission: "dashboard" },
  { name: "Events", path: "/member/events", icon: Calendar, permission: "events" },
  { name: "Projects", path: "/member/projects", icon: Briefcase, permission: "projects" },
  { name: "Timeline", path: "/member/timeline", icon: Clock, permission: "timeline" },
  { name: "Gallery", path: "/member/gallery", icon: ImageIcon, permission: "gallery" },
  // Available to every signed-in member, no extra permission needed.
  { name: "Notifications", path: "/member/notifications", icon: Bell, permission: "dashboard" },
  { name: "Settings", path: "/member/settings", icon: Settings, permission: "dashboard" },
];

const INSPIREX_NAV_ITEMS = [
  { name: "Attendance", path: "/member/event-management/inspirex/attendance", icon: Calendar, permission: "inspirex_attendance" },
  { name: "Members List", path: "/member/event-management/inspirex/member-lists", icon: Briefcase, permission: "inspirex_members_list" },
  { name: "Certificates", path: "/member/event-management/inspirex/certificates", icon: ImageIcon, permission: "inspirex_certificates" },
  { name: "Feedback", path: "/member/event-management/inspirex/feedback", icon: ClipboardList, permission: "inspirex_feedback" },
];

export default function MemberSidebar({ memberProfile }: { memberProfile: ConnectMember | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
  };

  // Filter items based on permissions
  const permissions = memberProfile?.permissions || [];
  
  const navItems = ALL_NAV_ITEMS.filter(item => 
    item.permission === "dashboard" || permissions.includes(item.permission)
  );

  const inspirexItems = INSPIREX_NAV_ITEMS.filter(item => permissions.includes(item.permission));

  const isActive = (path: string) => pathname === path;

  const navLink = (item: { name: string; path: string; icon: typeof Bell }, active: boolean) => {
    const Icon = item.icon;
    return (
      <Link
        key={item.path}
        href={item.path}
        onClick={() => setIsOpen(false)}
        className="relative flex items-center px-4 py-3.5 rounded-2xl transition-all group overflow-hidden"
      >
        {active && (
          <motion.div
            layoutId="member-sidebar-active"
            className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-2xl"
            initial={false}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        )}

        <Icon 
          className={`w-5 h-5 mr-3 transition-colors relative z-10 ${
            active ? "text-primary" : "text-white/40 group-hover:text-white"
          }`} 
        />
        <span 
          className={`font-medium transition-colors relative z-10 ${
            active ? "text-primary font-semibold" : "text-white/60 group-hover:text-white"
          }`}
        >
          {item.name}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* MOBILE HEADER — the desktop sidebar is hidden below md, so without
          this bar members on a phone had no way to reach any portal route. */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-card/70 backdrop-blur-xl shrink-0 w-full z-40 relative">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsOpen((open) => !open)}
            className="p-1.5 -ml-1.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Toggle navigation"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>

          <Link href="/member/dashboard" onClick={() => setIsOpen(false)}>
            <Image
              src="/logo/logo-transparent.png"
              alt="Connect Club"
              width={96}
              height={36}
              priority
              className="h-9 w-auto object-contain brightness-0 invert"
            />
          </Link>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">
            {memberProfile?.name?.charAt(0).toUpperCase() ||
              auth.currentUser?.email?.charAt(0).toUpperCase() ||
              "M"}
          </span>
        </div>
      </div>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto
          border-r border-white/5 bg-card/50 backdrop-blur-xl
          flex flex-col shrink-0 shadow-2xl h-[100svh]
        `}
      >
        <div className="p-6 border-b border-white/5 flex flex-col items-center">
          <Link href="/member/dashboard" onClick={() => setIsOpen(false)}>
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
          {navItems.map((item) => navLink(item, isActive(item.path)))}

          {inspirexItems.length > 0 && (
            <div className="pt-4 pb-2">
              <p className="px-4 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">InspireX Event Tools</p>
              {inspirexItems.map((item) => navLink(item, pathname.startsWith(item.path)))}
            </div>
          )}

          {/* Global Chat is accessible to all members */}
          {navLink(
            { name: "Club Chat", path: "/member/chat", icon: MessageSquare },
            isActive("/member/chat")
          )}
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
            onClick={() => {
              setIsOpen(false);
              handleSignOut();
            }}
            className="w-full flex items-center justify-center px-4 py-3 text-sm font-bold text-red-400 hover:text-white hover:bg-red-500 rounded-xl transition-all group"
          >
            <LogOut className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
