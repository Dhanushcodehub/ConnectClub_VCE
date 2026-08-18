"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { GlobalChatListener } from "./chat/GlobalChatListener";
import { AuthProvider } from "@/lib/contexts/AuthContext";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/admin") || pathname.startsWith("/member") || pathname.startsWith("/connect-ai");

  return (
    <AuthProvider>
      <NotificationProvider>
        {!isPortal && <Navbar />}
        
        <main className="flex-1 flex flex-col relative z-0">
          {!isPortal && <GlobalChatListener />}
          {children}
        </main>
        
        {!isPortal && <Footer />}
      </NotificationProvider>
    </AuthProvider>
  );
}
