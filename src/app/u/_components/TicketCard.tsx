"use client";

import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, Ticket } from "lucide-react";

interface TicketCardProps {
  ticketId: string;
  eventName: string;
  userName: string;
  userEmail: string;
  date?: string;
  location?: string;
}

export function TicketCard({
  ticketId,
  eventName,
  userName,
  userEmail,
  date = "Coming Soon",
  location = "Vardhaman College of Engineering",
}: TicketCardProps) {
  
  // 3D Tilt Logic
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 300, damping: 30 });

  // Rotate constraints (max 10 degrees)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);

  // Hologram Glare Gradient
  const glareX = useTransform(mouseX, [-0.5, 0.5], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [-0.5, 0.5], ["0%", "100%"]);
  const glareBackground = useMotionTemplate`radial-gradient(
    circle at ${glareX} ${glareY}, 
    rgba(255, 255, 255, 0.15) 0%, 
    rgba(100, 150, 255, 0.1) 20%, 
    rgba(255, 100, 200, 0.05) 40%, 
    transparent 60%
  )`;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseXPos = e.clientX - rect.left;
    const mouseYPos = e.clientY - rect.top;
    
    // Normalize to -0.5 to 0.5
    x.set(mouseXPos / width - 0.5);
    y.set(mouseYPos / height - 0.5);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <div style={{ perspective: "1500px" }} className="w-full max-w-4xl mx-auto cursor-pointer">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ 
          rotateX, 
          rotateY, 
          transformStyle: "preserve-3d" 
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 20, stiffness: 100 }}
        className="relative w-full overflow-hidden rounded-[2rem] bg-[#0c0c0e] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row group"
      >
        {/* Hologram Overlay */}
        <motion.div 
          className="absolute inset-0 z-50 pointer-events-none mix-blend-screen opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: glareBackground }}
        />

        {/* Ambient Lights */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" style={{ transform: "translateZ(-10px)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" style={{ transform: "translateZ(-10px)" }} />

        {/* Main Ticket Info Area */}
        <div className="flex-1 p-6 md:p-10 relative z-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-dashed border-white/20" style={{ transform: "translateZ(20px)" }}>
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.2)] shrink-0">
                <Ticket className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Admit One</p>
                <h2 className="text-xl md:text-2xl font-display font-black text-white tracking-tight leading-none">{eventName}</h2>
              </div>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Ticket ID</p>
              <p className="font-mono text-white/80 font-medium tracking-wider text-base">{ticketId.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4 mb-8">
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Attendee Name</p>
              <p className="text-2xl md:text-3xl font-bold text-white capitalize tracking-tight">{userName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Email / Roll No</p>
              <p className="text-base text-white/70 font-medium">{userEmail}</p>
            </div>
          </div>

          {/* Event Details */}
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 pt-6 border-t border-white/5">
            <div className="flex items-start gap-3">
              <Calendar className="w-4 h-4 text-primary mt-0.5" />
              <div>
                <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase mb-1">Date & Time</p>
                <p className="text-xs md:text-sm text-white/80 font-medium">{date}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-blue-400 mt-0.5" />
              <div>
                <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase mb-1">Location</p>
                <p className="text-xs md:text-sm text-white/80 font-medium">{location}</p>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code Section */}
        <div className="w-full md:w-[280px] p-6 md:p-10 relative z-10 flex flex-col items-center justify-center bg-black/40" style={{ transform: "translateZ(30px)" }}>
          
          {/* Mobile Ticket ID */}
          <div className="md:hidden text-center mb-8">
            <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Ticket ID</p>
            <p className="font-mono text-white/80 text-xl tracking-widest">{ticketId.substring(0, 8).toUpperCase()}</p>
          </div>

          <div className="bg-white p-5 rounded-[1.5rem] mb-6 shadow-[0_0_40px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_60px_rgba(255,255,255,0.3)] transition-all duration-500">
            <QRCodeSVG
              value={ticketId}
              size={180}
              level="H"
              includeMargin={false}
              fgColor="#000000"
              bgColor="#FFFFFF"
              className="w-full h-auto max-w-[200px] md:max-w-none"
            />
          </div>
          
          <p className="text-[10px] text-white/40 text-center uppercase tracking-widest font-bold max-w-[200px] leading-relaxed">
            Present this code at the registration desk
          </p>

          {/* Cutout holes - properly styled to look punched through */}
          <div className="hidden md:block absolute -top-6 -left-6 w-12 h-12 rounded-full bg-[#050505] border-b border-r border-white/10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]" style={{ transform: "translateZ(-30px)" }} />
          <div className="hidden md:block absolute -bottom-6 -left-6 w-12 h-12 rounded-full bg-[#050505] border-t border-r border-white/10 shadow-[inset_0_4px_10px_rgba(0,0,0,0.8)]" style={{ transform: "translateZ(-30px)" }} />
        </div>
      </motion.div>
    </div>
  );
}
