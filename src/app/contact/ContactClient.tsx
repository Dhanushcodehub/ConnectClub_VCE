"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MapPin, Camera, Briefcase, ArrowUpRight, Send, Globe, Users, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { cn } from "@/lib/utils";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: ""
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName || !formData.email || !formData.message) {
      setStatus("error");
      setErrorMessage("Please fill in all required fields.");
      return;
    }
    
    setStatus("loading");
    
    try {
      await addDoc(collection(db, "contact_messages"), {
        ...formData,
        status: "unread",
        createdAt: serverTimestamp(),
      });
      
      setStatus("success");
      setFormData({ firstName: "", lastName: "", email: "", message: "" });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setStatus("idle");
      }, 5000);
    } catch (error: any) {
      console.error("Error submitting form: ", error);
      setStatus("error");
      setErrorMessage("Failed to send message. Please try again later.");
    }
  };

  return (
    <div className="w-full min-h-screen pt-28 pb-20 md:pt-40 md:pb-24">
      {/* Main Grid for Header, Contact Info and Form */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full container-grid items-start"
      >
        
        {/* Left Column: Header + Contact Info */}
        <div className="col-span-full lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-left mb-12 lg:mb-0 lg:pr-8">
          
          {/* Header Section */}
          <motion.div variants={fadeUp} className="mb-12 md:mb-16 flex flex-col items-center lg:items-start">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-4">
              <span className="w-6 h-[2px] bg-primary rounded-full" />
              <span className="text-[11px] text-primary font-bold uppercase tracking-[0.2em]">Connect With Us</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black text-white uppercase tracking-tight mb-5 leading-[1.1]">
              Get in Touch
            </h1>
            <p className="text-[15px] md:text-[16px] text-white/50 max-w-xl leading-relaxed">
              Whether you want to sponsor an event, collaborate on a project, or just say hi—we'd love to hear from you. Let's build the future together.
            </p>
          </motion.div>

          {/* Contact Info Section */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="space-y-10 flex flex-col items-center lg:items-start w-full"
          >
            {/* Email */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#0C0C0E] border border-white/10 flex items-center justify-center shrink-0 shadow-lg group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(0,112,243,0.15)] transition-all duration-300">
                <Mail className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight mb-1">Email Us</h3>
                <p className="text-[14px] text-white/50 mb-2 leading-relaxed max-w-xs">For general inquiries, partnerships, or sponsorships.</p>
                <a href="mailto:hello@connectclubvce.in" className="text-[14px] text-white font-semibold hover:text-primary transition-colors inline-block relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-[1px] after:bg-primary after:origin-center lg:after:origin-right after:scale-x-0 hover:after:origin-center lg:hover:after:origin-left hover:after:scale-x-100 after:transition-transform after:duration-300">
                  hello@connectclubvce.in
                </a>
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-4 group">
              <div className="w-12 h-12 rounded-xl bg-[#0C0C0E] border border-white/10 flex items-center justify-center shrink-0 shadow-lg group-hover:border-primary/50 group-hover:shadow-[0_0_20px_rgba(0,112,243,0.15)] transition-all duration-300">
                <MapPin className="w-5 h-5 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex flex-col items-center lg:items-start">
                <h3 className="text-lg md:text-xl font-bold text-white uppercase tracking-tight mb-1">Visit Us</h3>
                <p className="text-[14px] text-white/50 mb-2 leading-relaxed max-w-xs">Vardhaman College of Engineering,<br/>Shamshabad, Hyderabad.</p>
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-[13px] text-white font-semibold hover:text-primary transition-colors inline-flex items-center gap-1 group/link">
                  Get Directions 
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>

            {/* Social Media */}
            <div className="pt-6 border-t border-white/10 w-full flex flex-col items-center lg:items-start">
              <h3 className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em] mb-4 text-center lg:text-left">Connect on Socials</h3>
              <div className="flex gap-3 justify-center lg:justify-start">
                {[
                  { icon: Globe, href: "#", label: "Website" },
                  { icon: Users, href: "#", label: "Community" },
                  { icon: MessageSquare, href: "#", label: "Discord" },
                  { icon: Camera, href: "#", label: "Instagram" }
                ].map((social, i) => (
                  <a 
                    key={i}
                    href={social.href} 
                    aria-label={social.label}
                    className="w-10 h-10 rounded-full bg-[#0C0C0E] border border-white/10 flex items-center justify-center text-white/60 hover:text-primary hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(0,112,243,0.2)] transition-all duration-300"
                  >
                    <social.icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column: Contact Form Section */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          className="col-span-full lg:col-span-7 flex justify-center w-full"
        >
          <div className="glass-card p-6 md:p-10 relative overflow-hidden w-full max-w-[600px] lg:max-w-none">
            {/* Ambient Glows */}
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[80px] pointer-events-none translate-y-1/2 -translate-x-1/3" />
            
            <div className="relative z-10">
              <h3 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight mb-6">
                Send a Message
              </h3>
              
              <AnimatePresence mode="wait">
                {status === "success" ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center text-center py-12 space-y-4"
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h4 className="text-xl font-bold text-white uppercase tracking-tight">Message Sent</h4>
                    <p className="text-[14px] text-white/60 max-w-sm">
                      Thanks for reaching out! We've received your message and will get back to you shortly.
                    </p>
                  </motion.div>
                ) : (
                  <motion.form 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5" 
                    onSubmit={handleSubmit}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-[0.1em]">First Name *</label>
                        <input 
                          type="text" 
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleChange}
                          required
                          disabled={status === "loading"}
                          placeholder="John"
                          className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-[14px] focus:outline-none focus:border-primary/50 focus:bg-[#0C0C0E]/90 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-white/20 disabled:opacity-50"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-white/60 uppercase tracking-[0.1em]">Last Name</label>
                        <input 
                          type="text" 
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleChange}
                          disabled={status === "loading"}
                          placeholder="Doe"
                          className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-[14px] focus:outline-none focus:border-primary/50 focus:bg-[#0C0C0E]/90 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-white/20 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/60 uppercase tracking-[0.1em]">Email Address *</label>
                      <input 
                        type="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={status === "loading"}
                        placeholder="john@example.com"
                        className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-[14px] focus:outline-none focus:border-primary/50 focus:bg-[#0C0C0E]/90 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-white/20 disabled:opacity-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-white/60 uppercase tracking-[0.1em]">Message *</label>
                      <textarea 
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        disabled={status === "loading"}
                        rows={6}
                        placeholder="How can we help you?"
                        className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-[14px] focus:outline-none focus:border-primary/50 focus:bg-[#0C0C0E]/90 focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-white/20 resize-none disabled:opacity-50"
                      />
                    </div>

                    {status === "error" && (
                      <p className="text-red-400 text-[13px] font-medium">{errorMessage}</p>
                    )}

                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="btn-glow w-full flex items-center justify-center gap-2 py-3.5 rounded-lg mt-6 text-[13px] font-bold uppercase tracking-wider disabled:opacity-70"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Message</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
