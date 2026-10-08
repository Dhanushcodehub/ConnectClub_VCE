"use client";

import { auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import Link from "next/link";
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
  FileText,
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
  { name: "Letter Editor", path: "/member/letter-editor", icon: FileText, permission: "letter_editor" },
];

const INSPIREX_NAV_ITEMS = [
  { name: "Attendance", path: "/member/event-management/inspirex/attendance", icon: Calendar, permission: "inspirex_attendance" },
  { name: "Members List", path: "/member/event-management/inspirex/member-lists", icon: Briefcase, permission: "inspirex_members_list" },
  { name: "Certificates", path: "/member/event-management/inspirex/certificates", icon: ImageIcon, permission: "inspirex_certificates" },
];

const BATTLEGROUND_NAV_ITEMS = [
  { name: "Attendance", path: "/member/event-management/battleground/attendance", icon: Calendar, permission: "battleground_attendance" },
  { name: "Members List", path: "/member/event-management/battleground/member-lists", icon: Briefcase, permission: "battleground_members_list" },
  { name: "Certificates", path: "/member/event-management/battleground/certificates", icon: ImageIcon, permission: "battleground_certificates" },
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
  const battlegroundItems = BATTLEGROUND_NAV_ITEMS.filter(item => permissions.includes(item.permission));

  return (
    <>
      {/* ================================
          MOBILE HEADER
      ================================= */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#0c0c0e] shrink-0 w-full z-40 relative">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 -ml-1.5 hover:bg-white/10 rounded-md transition-colors"
            aria-label="Toggle sidebar"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>

          <Link href="/member/dashboard">
            <img
              src="/logo/logo-light.svg"
              alt="Connect Club"
              className="h-10 w-auto object-contain brightness-0 invert"
            />
          </Link>
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">
            {memberProfile?.name?.charAt(0).toUpperCase() || auth.currentUser?.email?.charAt(0).toUpperCase() || "M"}
          </span>
        </div>
      </div>

      {/* ================================
          MOBILE OVERLAY
      ================================= */}
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

      {/* ================================
          SIDEBAR
      ================================= */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          transform transition-all duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative
          group
          w-72
          md:w-20
          md:hover:w-72
          border-r border-white/5
          bg-[#0c0c0e]
          flex flex-col
          shrink-0
          shadow-2xl
          h-[100svh]
        `}
      >
        <div className="p-6 border-b border-white/5 flex flex-col items-center shrink-0">
          <Link href="/member/dashboard">
            <img
              src="/logo/logo-transparent.png"
              alt="Connect Club"
              className="
                w-16 h-16
                md:w-10 md:h-10
                md:group-hover:w-20
                md:group-hover:h-20
                transition-all
                duration-300
                object-contain
                brightness-0
                invert
              "
            />
          </Link>
          <div className="hidden md:group-hover:flex flex-col items-center mt-3">
            <h2 className="text-lg font-bold text-white whitespace-nowrap">CONNECT CLUB</h2>
            <p className="text-[11px] text-gray-400 text-center leading-4 whitespace-nowrap">
              Vardhaman College
              <br />
              of Engineering
            </p>
            <div className="w-20 h-px bg-white/10 mt-3"></div>
            <span className="mt-3 text-[10px] uppercase tracking-[0.35em] text-blue-400 whitespace-nowrap">
              MEMBER PORTAL
            </span>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden" data-lenis-prevent>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className="
                  relative flex items-center px-3 py-3 rounded-xl transition-all duration-300
                  hover:bg-white/5 overflow-hidden whitespace-nowrap
                  justify-start md:justify-center md:group-hover:justify-start
                "
              >
                {isActive && (
                  <motion.div
                    layoutId="member-sidebar-active"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="w-6 h-6 flex items-center justify-center shrink-0 mx-0 md:mx-auto md:group-hover:mx-0 transition-all duration-300">
                  <Icon 
                    className={`w-5 h-5 transition-colors relative z-10 ${
                      isActive ? "text-primary" : "text-white/40 group-hover:text-white"
                    }`} 
                  />
                </div>
                <span 
                  className={`
                    ml-3 text-sm font-medium transition-all duration-300 relative z-10
                    block md:hidden md:group-hover:block
                    ${isActive ? "text-primary font-semibold" : "text-white/60 group-hover:text-white"}
                  `}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}

          {inspirexItems.length > 0 && (
            <div className="pt-4 pb-2">
              <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block md:hidden md:group-hover:block transition-all">InspireX</p>
              {inspirexItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className="
                      relative flex items-center px-3 py-3 rounded-xl transition-all duration-300
                      hover:bg-white/5 overflow-hidden whitespace-nowrap
                      justify-start md:justify-center md:group-hover:justify-start
                    "
                  >
                    {isActive && (
                      <motion.div
                        layoutId="member-sidebar-active"
                        className="absolute inset-0 bg-blue-500/10 border border-blue-500/20 rounded-xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 mx-0 md:mx-auto md:group-hover:mx-0 transition-all duration-300">
                      <Icon 
                        className={`w-5 h-5 transition-colors relative z-10 ${
                          isActive ? "text-blue-400" : "text-white/40 group-hover:text-blue-200"
                        }`} 
                      />
                    </div>
                    <span 
                      className={`
                        ml-3 text-sm font-medium transition-all duration-300 relative z-10
                        block md:hidden md:group-hover:block
                        ${isActive ? "text-blue-400 font-semibold" : "text-white/60 group-hover:text-white"}
                      `}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {battlegroundItems.length > 0 && (
            <div className="pt-4 pb-2 border-t border-white/5">
              <p className="px-3 text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2 block md:hidden md:group-hover:block transition-all">Battlegrounds</p>
              {battlegroundItems.map((item) => {
                const isActive = pathname.startsWith(item.path);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className="
                      relative flex items-center px-3 py-3 rounded-xl transition-all duration-300
                      hover:bg-white/5 overflow-hidden whitespace-nowrap
                      justify-start md:justify-center md:group-hover:justify-start
                    "
                  >
                    {isActive && (
                      <motion.div
                        layoutId="member-sidebar-active"
                        className="absolute inset-0 bg-orange-500/10 border border-orange-500/20 rounded-xl"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    
                    <div className="w-6 h-6 flex items-center justify-center shrink-0 mx-0 md:mx-auto md:group-hover:mx-0 transition-all duration-300">
                      <Icon 
                        className={`w-5 h-5 transition-colors relative z-10 ${
                          isActive ? "text-orange-400" : "text-white/40 group-hover:text-orange-200"
                        }`} 
                      />
                    </div>
                    <span 
                      className={`
                        ml-3 text-sm font-medium transition-all duration-300 relative z-10
                        block md:hidden md:group-hover:block
                        ${isActive ? "text-orange-400 font-semibold" : "text-white/60 group-hover:text-white"}
                      `}
                    >
                      {item.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Global Chat is accessible to all members */}
          <Link
            href="/member/chat"
            onClick={() => setIsOpen(false)}
            className="
              relative flex items-center px-3 py-3 rounded-xl transition-all duration-300
              hover:bg-white/5 overflow-hidden whitespace-nowrap mt-4
              justify-start md:justify-center md:group-hover:justify-start
            "
          >
            {pathname === "/member/chat" && (
              <motion.div
                layoutId="member-sidebar-active"
                className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                initial={false}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            <div className="w-6 h-6 flex items-center justify-center shrink-0 mx-0 md:mx-auto md:group-hover:mx-0 transition-all duration-300">
              <MessageSquare 
                className={`w-5 h-5 transition-colors relative z-10 ${
                  pathname === "/member/chat" ? "text-primary" : "text-white/40 group-hover:text-white"
                }`} 
              />
            </div>
            <span 
              className={`
                ml-3 text-sm font-medium transition-all duration-300 relative z-10
                block md:hidden md:group-hover:block
                ${pathname === "/member/chat" ? "text-primary font-semibold" : "text-white/60 group-hover:text-white"}
              `}
            >
              Club Chat
            </span>
          </Link>
        </nav>

        <div className="p-3 md:p-4 border-t border-white/5 bg-black/20 overflow-hidden whitespace-nowrap mt-auto shrink-0">
          <div className="flex items-center space-x-3 mb-4 bg-white/5 p-2 rounded-xl border border-white/5 justify-start md:justify-center md:group-hover:justify-start transition-all duration-300">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {memberProfile?.name?.charAt(0).toUpperCase() || auth.currentUser?.email?.charAt(0).toUpperCase() || "M"}
              </span>
            </div>
            <div className="overflow-hidden transition-all duration-300 block md:hidden md:group-hover:block">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">{memberProfile?.name || auth.currentUser?.email}</div>
              <div className="text-[10px] text-blue-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
                {memberProfile?.tier || "Member"}
              </div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center px-3 py-2.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-all duration-300 justify-start md:justify-center md:group-hover:justify-start"
          >
            <LogOut className="w-4 h-4 shrink-0 mr-2 md:mr-0 md:group-hover:mr-2 transition-all duration-300" />
            <span className="block md:hidden md:group-hover:block">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
