import Link from "next/link";
import { ArrowUpRight, ExternalLink, Mail, GitBranch } from "lucide-react";

const footerLinks = {
  Platform: [
    { label: "Events", href: "/events" },
    { label: "Projects", href: "/projects" },
    { label: "Timeline", href: "/timeline" },
    { label: "Gallery", href: "/gallery" },
  ],
  Connect: [
    { label: "Connect AI", href: "/connect-ai" },
    { label: "Contact Us", href: "/contact" },
    { label: "Admin", href: "/admin" },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-background pt-16 lg:pt-24 pb-8 overflow-hidden">
      <div className="container-grid relative z-10">

        {/* Main grid: 12 cols desktop, 2 cols mobile */}
        <div className="col-span-4 md:col-span-6 lg:col-span-12 grid grid-cols-2 md:grid-cols-12 gap-y-12 gap-x-4 sm:gap-x-8 md:gap-x-6 lg:gap-12 mb-12 lg:mb-20">

          {/* Brand - spans both columns on mobile */}
          <div className="col-span-2 md:col-span-6 lg:col-span-5 flex flex-col lg:flex-row items-center md:items-start gap-6 lg:gap-8 text-center md:text-left">
            <Link href="/" className="inline-flex shrink-0 group">
              <img 
                src="/logo/logo-transparent.svg" 
                alt="Connect Club Logo" 
                className="w-32 lg:w-40 h-auto object-contain brightness-0 invert opacity-90 group-hover:opacity-100 transition-all group-hover:scale-105 origin-center md:origin-left"
              />
            </Link>
            <div className="flex flex-col gap-6 lg:pt-4 items-center md:items-start">
              <p className="text-body text-white/40 max-w-[280px]">
                Building the Next Generation of Innovators. The official student-led technology community at Vardhaman College of Engineering.
              </p>
              {/* Social icons */}
              <div className="flex items-center gap-3">
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="Instagram"
                >
                  <ExternalLink className="w-4 h-4 lg:w-4 lg:h-4" />
                </a>
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="LinkedIn"
                >
                  <GitBranch className="w-4 h-4 lg:w-4 lg:h-4" />
                </a>
                <a
                  href="mailto:connectclub@vce.ac.in"
                  className="w-10 h-10 lg:w-9 lg:h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.08] transition-all"
                  aria-label="Email"
                >
                  <Mail className="w-4 h-4 lg:w-4 lg:h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Spacer — 1 col on large */}
          <div className="hidden lg:block lg:col-span-1" />

          {/* Nav cols - 1 col each on mobile (side-by-side) */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading} className="col-span-1 md:col-span-3 text-center sm:text-left">
              <h4 className="text-label font-bold uppercase tracking-widest text-white/30 mb-6">{heading}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body text-white/50 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="col-span-2 md:col-span-12 border-t border-white/[0.06] pt-8 pb-16 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <p className="text-label text-white/25 text-balance">
            &copy; {new Date().getFullYear()} Connect Club, Vardhaman College of Engineering. All rights reserved.
          </p>
          <p className="text-label text-white/20">
            Built For Students
          </p>
        </div>
      </div>

      {/* Massive watermark */}
      <div className="absolute bottom-0 left-0 w-full flex justify-center pointer-events-none select-none z-0 translate-y-[20%] overflow-hidden">
        <span
          className="font-display font-black leading-none whitespace-nowrap text-white opacity-5"
          style={{ 
            fontSize: "clamp(3rem, 11vw, 15rem)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)"
          }}
        >
          CONNECT CLUB
        </span>
      </div>
    </footer>
  );
}
