"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useSpring, useTransform } from "framer-motion";
import { Menu, X, Sparkles, UserCircle, LayoutDashboard, FolderGit2, Bell, Settings, LogOut, Calendar, Award } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/config";

const navLinks = [
  { name: "Events",    href: "/events" },
  { name: "Projects",  href: "/projects" },
  { name: "Timeline",  href: "/timeline" },
  { name: "Team",      href: "/team" },
  { name: "Gallery",   href: "/gallery" },
  { name: "Contact",   href: "/contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { user, role } = useAuth();

  const { scrollY } = useScroll();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Size transformations: starts small and widens slightly on scroll
  const navMaxWidth = useTransform(scrollY, [0, 150], ["835px", "900px"]);

  // Premium Smooth scroll transformations
  const navBg = useTransform(scrollY, [0, 100], ["rgba(9,9,11,0.4)", "rgba(9,9,11,0.85)"]);
  const navBlur = useTransform(scrollY, [0, 100], ["blur(12px)", "blur(24px)"]);
  const navBorder = useTransform(scrollY, [0, 100], ["rgba(255,255,255,0.03)", "rgba(255,255,255,0.08)"]);
  const navShadow = useTransform(
    scrollY, 
    [0, 100], 
    ["0 4px 20px rgba(0,0,0,0.3)", "0 16px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"]
  );

  useEffect(() => {
    setMobileOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserDropdownOpen(false);
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const photoURL = user?.photoURL; // Add profile?.photoURL if available in the context

  return (
    <>
      {/* Scroll progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[2px] z-[100] origin-left"
        style={{
          scaleX,
          background: "linear-gradient(90deg,#0055FF,#00E5FF,#0055FF)",
        }}
      />

      <div className="fixed top-5 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none md:pr-[15px]">
        <motion.header
          initial={{ y: -72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="w-full pointer-events-auto flex justify-center"
        >
          {/* Animated glass pill tied directly to scroll */}
          <motion.div
            className="w-full mx-auto overflow-visible flex items-center justify-between px-5 py-3"
            style={{ 
              maxWidth: navMaxWidth,
              backgroundColor: navBg,
              backdropFilter: navBlur,
              borderColor: navBorder,
              boxShadow: navShadow,
              borderWidth: "1px",
              borderStyle: "solid",
              borderRadius: "1.25rem", // Industry standard balanced radius (not 50%)
            }}
          >
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0 z-50 relative">
              <img 
                src="/logo/navbarlogo.png" 
                alt="Connect Club Logo" 
                className="h-8 w-auto object-contain brightness-0 invert transition-transform duration-300 group-hover:scale-105"
              />
              <div className="flex items-baseline">
                <span className="font-display font-black text-[15px] tracking-tighter text-white uppercase group-hover:text-white transition-colors">
                  Connect Club
                </span>
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="text-secondary font-black text-xl leading-none ml-0.5"
                >
                  .
                </motion.span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={cn(
                    "relative px-3.5 py-2 text-[13px] font-semibold rounded-lg transition-all duration-300",
                    pathname === link.href
                      ? "text-white"
                      : "text-white/60 hover:text-white hover:bg-white/[0.06]"
                  )}
                >
                  {pathname === link.href && (
                    <motion.span
                      layoutId="active-pill"
                      className="absolute inset-0 rounded-lg bg-white/[0.08] border border-white/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{link.name}</span>
                </Link>
              ))}
            </nav>

            {/* CTA + hamburger */}
            <div className="flex items-center gap-3">
              <Link
                href="/connect-ai"
                className="hidden md:flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] group"
              >
                <Sparkles className="w-3.5 h-3.5 text-current group-hover:animate-pulse shrink-0" />
                <span>Connect AI</span>
              </Link>


              <button
                className="md:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {mobileOpen ? (
                    <motion.span key="x"
                      initial={{ rotate: -90, scale: 0.5, opacity: 0 }} 
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      exit={{ rotate: 90, scale: 0.5, opacity: 0 }} 
                      transition={{ duration: 0.2 }}>
                      <X className="w-5 h-5" />
                    </motion.span>
                  ) : (
                    <motion.span key="m"
                      initial={{ rotate: 90, scale: 0.5, opacity: 0 }} 
                      animate={{ rotate: 0, scale: 1, opacity: 1 }}
                      exit={{ rotate: -90, scale: 0.5, opacity: 0 }} 
                      transition={{ duration: 0.2 }}>
                      <Menu className="w-5 h-5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </motion.div>
        </motion.header>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed top-[84px] inset-x-4 z-40 flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="w-full overflow-hidden pointer-events-auto"
              style={{ maxWidth: "750px" }} // Matches the initial navbar size
            >
              <div className="p-3 flex flex-col gap-1 bg-[rgba(12,12,14,0.98)] backdrop-blur-3xl rounded-2xl border border-white/10 shadow-2xl">
                {navLinks.map((link, i) => (
                  <motion.div key={link.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 + 0.1 }}>
                    <Link
                      href={link.href}
                      className={cn(
                        "block px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                        pathname === link.href
                          ? "text-white bg-white/10 border border-white/10"
                          : "text-white/60 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {link.name}
                    </Link>
                  </motion.div>
                ))}
                <div className="p-2 mt-2 border-t border-white/10 flex flex-col gap-2">

                  <Link href="/connect-ai"
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider w-full btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)] group">
                    <Sparkles className="w-4 h-4 text-current group-hover:animate-pulse" /> Connect AI
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
