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
  Bell,
  Ticket,
  ClipboardList,
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
  {
    name: "Feedback Forms",
    path: "/admin/feedback",
    icon: ClipboardList,
  },
  { name: "Club Chat", path: "/admin/chat", icon: MessageSquare },
  {
    name: "Event Management",
    path: "/admin/event-management",
    icon: Ticket,
  },
  { name: "Settings", path: "/admin/settings", icon: Settings },
];

export default function AdminSidebar() {
  const { user } = useAuth();
  const pathname = usePathname();

  // Mobile sidebar state only
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <>
      {/* ================================
          MOBILE HEADER
      ================================= */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-background shrink-0 w-full z-40 relative">
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
          Desktop:
          - Default: collapsed (icon-only, w-20)
          - Hover: expands (full labels, w-72)
          - Smooth 300ms transition
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
        {/* ================================
            SIDEBAR HEADER / LOGO
        ================================= */}
        <div className="p-6 border-b border-white/5 flex flex-col items-center shrink-0">
          <Link href="/admin">
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

          {/* Club information appears only when sidebar expands on desktop */}
          <div className="hidden md:group-hover:flex flex-col items-center mt-3">
            <h2 className="text-lg font-bold text-white whitespace-nowrap">
              CONNECT CLUB
            </h2>

            <p className="text-[11px] text-gray-400 text-center leading-4 whitespace-nowrap">
              Vardhaman College
              <br />
              of Engineering
            </p>

            <div className="w-20 h-px bg-white/10 mt-3"></div>

            <span className="mt-3 text-[10px] uppercase tracking-[0.35em] text-blue-400 whitespace-nowrap">
              ADMIN PORTAL
            </span>
          </div>
        </div>

        {/* ================================
            NAVIGATION
        ================================= */}
        <nav
          className="
            flex-1
            px-3
            py-6
            space-y-1.5
            overflow-y-auto
            custom-scrollbar
            overflow-x-hidden
          "
          data-lenis-prevent
        >
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className="
                  relative
                  flex
                  items-center
                  px-3
                  py-3
                  rounded-xl
                  transition-all
                  duration-300
                  hover:bg-white/5
                  overflow-hidden
                  whitespace-nowrap
                  justify-start
                  md:justify-center
                  md:group-hover:justify-start
                "
              >
                {/* Active background */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="
                      absolute
                      inset-0
                      bg-primary/10
                      border
                      border-primary/20
                      rounded-xl
                    "
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  />
                )}

                {/* Icon */}
                <div
                  className="
                    w-6
                    h-6
                    flex
                    items-center
                    justify-center
                    shrink-0
                    mx-0
                    md:mx-auto
                    md:group-hover:mx-0
                    transition-all
                    duration-300
                  "
                >
                  <Icon
                    className={`
                      w-5
                      h-5
                      transition-colors
                      relative
                      z-10
                      ${
                        isActive
                          ? "text-primary"
                          : "text-white/40 group-hover:text-white"
                      }
                    `}
                  />
                </div>

                {/* Navigation text */}
                <span
                  className={`
                    ml-3
                    text-sm
                    font-medium
                    transition-all
                    duration-300
                    relative
                    z-10
                    block
                    md:hidden
                    md:group-hover:block
                    ${
                      isActive
                        ? "text-primary font-semibold"
                        : "text-white/60 group-hover:text-white"
                    }
                  `}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ================================
            USER SECTION
        ================================= */}
        <div
          className="
            p-3
            md:p-4
            border-t
            border-white/5
            bg-black/20
            overflow-hidden
            whitespace-nowrap
            mt-auto
            shrink-0
          "
        >
          {/* User card */}
          <div
            className="
              flex
              items-center
              space-x-3
              mb-4
              bg-white/5
              p-2
              rounded-xl
              border
              border-white/5
              justify-start
              md:justify-center
              md:group-hover:justify-start
              transition-all
              duration-300
            "
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">
                {user?.email?.charAt(0).toUpperCase() || "A"}
              </span>
            </div>

            {/* User information */}
            <div className="overflow-hidden transition-all duration-300 block md:hidden md:group-hover:block">
              <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                {user?.email}
              </div>

              <div className="text-[10px] text-green-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                Admin
              </div>
            </div>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="
              w-full
              flex
              items-center
              px-3
              py-2.5
              text-xs
              font-bold
              text-red-400
              hover:text-white
              hover:bg-red-500
              rounded-lg
              transition-all
              duration-300
              justify-start
              md:justify-center
              md:group-hover:justify-start
            "
          >
            <LogOut className="w-4 h-4 shrink-0 mr-2 md:mr-0 md:group-hover:mr-2 transition-all duration-300" />

            <span className="block md:hidden md:group-hover:block">
              Sign Out
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}