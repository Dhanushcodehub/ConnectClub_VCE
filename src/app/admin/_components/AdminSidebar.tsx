"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
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
  Users, 
  Settings,
  MessageSquare,
  Mail,
  Menu,
  X,
  Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Overview", path: "/admin", icon: LayoutGrid },
  { name: "Events", path: "/admin/events", icon: Calendar },
  { name: "Projects", path: "/admin/projects", icon: Briefcase },
  { name: "Timeline", path: "/admin/timeline", icon: Clock },
  { name: "Gallery", path: "/admin/gallery", icon: ImageIcon },
  { name: "Members", path: "/admin/members", icon: Users },
  { name: "Inquiries", path: "/admin/messages", icon: Mail },
  { name: "Notifications", path: "/admin/notifications", icon: Bell },
  { name: "Club Chat", path: "/admin/chat", icon: MessageSquare },
  { name: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background shrink-0 w-full z-40 relative">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsOpen(!isOpen)} 
            className="p-1.5 -ml-1.5 hover:bg-white/10 rounded-md transition-colors"
          >
            {isOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
          <Link href="/admin">
            <img 
              src="/logo/logo-light.svg" 
              alt="Connect Club" 
             className="h-10 w-auto object-contain brightness-0 invert"
            />
          </Link>
        </div>
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
          <span className="text-xs font-bold text-white">
            {user?.email?.charAt(0).toUpperCase() || "A"}
          </span>
        </div>
      </div>

      {/* Mobile Overlay */}
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

      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0 md:relative
        group w-72 md:w-20 lg:w-72 border-r border-white/5 bg-background md:bg-card/50 md:backdrop-blur-xl flex flex-col shrink-0 shadow-2xl md:hover:w-72 h-[100svh]
      `}>
        <div className="p-6 border-b border-white/5 flex flex-col items-center">

  <Link href="/admin">
    <img
      src="/logo/logo-transparent.png"
      alt="Connect Club"
      className="w-16 h-16 lg:w-20 lg:h-20 object-contain brightness-0 invert"
    />
  </Link>

  {/* Hide text on mobile */}
  <div className="hidden lg:flex flex-col items-center mt-3">
    <h2 className="text-lg font-bold text-white">
      CONNECT CLUB
    </h2>

    <p className="text-[11px] text-gray-400 text-center leading-4">
      Vardhaman College
      <br />
      of Engineering
    </p>

    <div className="w-20 h-px bg-white/10 mt-3"></div>

<span className="mt-3 text-[10px] uppercase tracking-[0.35em] text-blue-400">
  ADMIN PORTAL
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
                onClick={() => setIsOpen(false)} // Close on mobile navigation
                className="relative flex items-center px-3 py-3 rounded-xl transition-all hover:bg-white/5 overflow-hidden whitespace-nowrap"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                
                <div className="w-6 h-6 flex items-center justify-center shrink-0 mx-0 md:mx-auto lg:mx-0 group-hover:mx-0">
                  <Icon 
                    className={`w-5 h-5 transition-colors relative z-10 ${
                      isActive ? "text-primary" : "text-white/40 group-hover:text-white"
                    }`} 
                  />
                </div>
                <span 
                  className={`ml-3 text-sm font-medium transition-colors relative z-10 block md:hidden lg:block group-hover:block ${
                    isActive ? "text-primary font-semibold" : "text-white/60 group-hover:text-white"
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 md:p-4 border-t border-white/5 bg-black/20 overflow-hidden whitespace-nowrap mt-auto">
          <div className="flex items-center space-x-3 mb-4 bg-white/5 p-2 rounded-xl border border-white/5 justify-start md:justify-center lg:justify-start group-hover:justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>
            <div className="overflow-hidden block md:hidden lg:block group-hover:block transition-opacity duration-300">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">{user?.email}</div>
              <div className="text-[10px] text-green-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                Admin
              </div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center justify-start md:justify-center lg:justify-start group-hover:justify-start px-3 py-2.5 text-xs font-bold text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4 shrink-0 mr-2 md:mr-0 lg:mr-2 group-hover:mr-2 transition-all" />
            <span className="block md:hidden lg:block group-hover:block">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
