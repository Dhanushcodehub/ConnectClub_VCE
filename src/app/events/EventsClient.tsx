"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Search, ChevronLeft, ChevronRight, X, MapPin, Clock } from "lucide-react";
import { EventStatus, ConnectEvent } from "@/lib/data/events";
import { getEvents } from "@/lib/firebase/api";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/animations";

export default function EventsClient({ initialEvents }: { initialEvents: ConnectEvent[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [isLoading, setIsLoading] = useState(initialEvents.length === 0);
  const [activeTab, setActiveTab] = useState<EventStatus | "All">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentFeaturedIndex, setCurrentFeaturedIndex] = useState(0);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getEvents().then((data) => {
      setEvents(data);
      setIsLoading(false);
    });
  }, []);

  const tabs: (EventStatus | "All")[] = ["All", "Upcoming", "Ongoing", "Past"];

  // 1. Carousel Logic (Using all upcoming events for the carousel)
  const featuredEvents = events.filter((e) => e.status === "Upcoming");
  const featuredEvent = featuredEvents.length > 0 ? featuredEvents[currentFeaturedIndex] : events[0];

  const handleNextFeatured = () => {
    if (featuredEvents.length > 1) {
      setCurrentFeaturedIndex((prev) => (prev + 1) % featuredEvents.length);
    }
  };

  const handlePrevFeatured = () => {
    if (featuredEvents.length > 1) {
      setCurrentFeaturedIndex((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length);
    }
  };

  // 2. Search & Filter Logic
  const statusWeight: Record<string, number> = {
    Upcoming: 1,
    Ongoing: 2,
    Past: 3,
  };

  const filteredEvents = events.filter((event) => {
    const matchesTab = activeTab === "All" || event.status === activeTab;
    const matchesSearch = 
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    const weightA = statusWeight[a.status] || 4;
    const weightB = statusWeight[b.status] || 4;
    return weightA - weightB;
  });

  // Auto-slide carousel every 5 seconds
  useEffect(() => {
    if (featuredEvents.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentFeaturedIndex((prev: number) => (prev + 1) % featuredEvents.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [featuredEvents.length]);

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative">
        {/* Industry-Level Skeleton Hero Carousel */}
        <div className="w-full rounded-2xl mb-12 bg-[#0C0C0E] border border-white/[0.06] overflow-hidden flex flex-col md:flex-row shadow-2xl relative">
          <div className="w-full md:w-1/2 h-[350px] md:h-[500px] bg-white/[0.03] animate-pulse relative">
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0C0C0E] to-transparent" />
          </div>
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-[#0C0C0E]">
             <div className="w-32 h-6 bg-white/[0.05] rounded-sm mb-6 animate-pulse" />
             <div className="w-3/4 h-10 md:h-12 bg-white/[0.08] rounded-md mb-4 animate-pulse" />
             <div className="w-full h-4 bg-white/[0.04] rounded-sm mb-2 animate-pulse" />
             <div className="w-full h-4 bg-white/[0.04] rounded-sm mb-2 animate-pulse" />
             <div className="w-4/5 h-4 bg-white/[0.04] rounded-sm mb-8 animate-pulse" />
             <div className="flex justify-between items-center mt-auto">
               <div className="w-24 h-5 bg-white/[0.05] rounded-sm animate-pulse" />
               <div className="w-32 h-12 bg-white/[0.06] rounded-md animate-pulse" />
             </div>
          </div>
        </div>
        
        {/* Skeleton Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-12">
          <div className="w-full md:w-[300px] h-[48px] bg-[#0C0C0E] rounded-xl animate-pulse border border-white/5" />
          <div className="flex flex-wrap justify-center gap-2">
            {[1,2,3,4].map(i => <div key={i} className="w-20 md:w-24 h-[42px] bg-[#0C0C0E] rounded-full animate-pulse border border-white/5" />)}
          </div>
        </div>

        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col h-[450px] bg-[#0C0C0E] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
               <div className="w-full h-[200px] bg-white/[0.03] animate-pulse" />
               <div className="p-6 flex flex-col flex-1">
                 <div className="w-24 h-5 bg-white/[0.05] rounded-full mb-4 animate-pulse" />
                 <div className="w-3/4 h-7 bg-white/[0.06] rounded-md mb-3 animate-pulse" />
                 <div className="w-full h-4 bg-white/[0.04] rounded-sm mb-2 animate-pulse" />
                 <div className="w-5/6 h-4 bg-white/[0.04] rounded-sm mb-6 animate-pulse" />
                 <div className="w-full mt-auto h-12 bg-white/[0.03] rounded-xl animate-pulse" />
               </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 md:pt-36 md:pb-20 relative">
      
      {/* Trending Events Heading */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="mb-8 md:mb-12"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
          <span className="w-8 h-[2px] bg-primary rounded-full" />
          <span className="text-xs md:text-sm text-primary font-bold uppercase tracking-[0.2em]">{`Hot Right Now`}</span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight mb-4"
        >
          Trending Events
        </motion.h1>
        <motion.p variants={fadeUp} className="text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed">
          Discover the most anticipated events happening around campus.
        </motion.p>
      </motion.div>

      {/* Featured Event Hero Carousel */}
      {featuredEvent && (
        <div className="relative mb-12 group/carousel">
          {/* Carousel Arrows (straddling the border) */}
          {featuredEvents.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); handlePrevFeatured(); }}
                className="hidden md:flex absolute -left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 items-center justify-center rounded-xl bg-background border border-white/10 text-white hover:text-primary transition-all hover:scale-105 shadow-2xl opacity-100"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleNextFeatured(); }}
                className="hidden md:flex absolute -right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 items-center justify-center rounded-xl bg-background border border-white/10 text-white hover:text-primary transition-all hover:scale-105 shadow-2xl opacity-100"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="relative w-full rounded-2xl bg-[#0C0C0E] border border-white/[0.06] overflow-hidden flex flex-col md:flex-row shadow-[0_20px_50px_rgba(0,0,0,0.5)]">

          <AnimatePresence mode="wait">
            <motion.div
              key={featuredEvent.id}
              initial={{ opacity: 0, x: 50, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.98 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col md:flex-row w-full cursor-pointer"
              onClick={() => router.push(`/events/${featuredEvent.id}`)}
            >
              {/* Featured Image */}
              <div className="relative w-full md:w-1/2 h-[350px] md:h-[500px]">
                {featuredEvent.banner ? (
                  <img
                    src={featuredEvent.banner}
                    alt={featuredEvent.title}
                    className="w-full h-full object-contain object-center transition-transform duration-1000 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0C0C0E] via-[#0C0C0E]/40 to-transparent" />
                
                {/* ConnectClub Label */}
                <div className="absolute bottom-6 right-6 z-20">
                  <div className="text-[#FFD700] text-sm font-black tracking-tighter flex items-center drop-shadow-md">
                    connectclub<span className="opacity-70">.</span>
                  </div>
                </div>
              </div>

              {/* Featured Content */}
              <div className="flex flex-col justify-center w-full md:w-1/2 p-8 md:p-12 relative z-10 bg-[#0C0C0E]">
                <span className="px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/20 text-primary border border-primary/20 w-fit mb-6 shadow-[0_0_15px_rgba(0,85,255,0.3)]">
                  Featured Event
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tight mb-2 leading-tight">
                  {featuredEvent.title || "Untitled Event"}
                </h2>
                <p className="text-white/50 text-sm mb-6">
                  Organized by <span className="text-white font-medium">{featuredEvent.organizedBy || "Connect Club"}</span>
                </p>

                <div className="flex flex-col gap-3 text-white/60 text-sm mb-8">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    {featuredEvent.date || "TBD"}
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-primary" />
                    {featuredEvent.venue || "TBA"}
                  </div>
                  {featuredEvent.time && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-primary" />
                      {featuredEvent.time}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-auto border-t border-white/[0.05] pt-6 group cursor-pointer" onClick={() => router.push(`/events/${featuredEvent.id}`)}>
                   <div className="flex flex-col">
                     <span className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">From</span>
                     <span className="text-white font-bold text-lg">{featuredEvent.price || "Free"}</span>
                   </div>
                   <div className="flex items-center text-white/70 text-xs font-bold uppercase tracking-[0.2em] gap-2 group-hover:text-primary transition-all group-hover:gap-3">
                     {featuredEvent.registrationLink ? "Register" : "Explore"}
                     <ArrowRight className="w-4 h-4 transition-transform group-hover:-rotate-45" />
                   </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          </div>
          
          {/* Carousel Pagination Dots */}
          {featuredEvents.length > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              {featuredEvents.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentFeaturedIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentFeaturedIndex 
                      ? "w-8 bg-primary" 
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sleek Filter & Search Bar (Middle Section) */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12"
      >
        <div className="flex items-center bg-[#0C0C0E] border border-white/[0.08] rounded-xl p-1.5 shadow-2xl flex-wrap justify-center">
          
          {/* Active Search Input */}
          <div className="pl-5 pr-4 py-2 flex items-center border-r border-white/10 text-white/40 focus-within:text-white transition-colors">
            <Search className="w-4 h-4 shrink-0" />
            <input 
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-white text-xs md:text-sm px-3 w-[150px] md:w-[200px] placeholder:text-white/30"
            />
          </div>

          {/* Filter Tabs */}
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-5 md:px-8 py-3 rounded-md text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all duration-300",
                activeTab === tab
                  ? "bg-white/[0.08] text-white shadow-sm"
                  : "text-white/40 hover:text-white/80"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </motion.div>

      {/* 2-Column Grid of Remaining Events */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab + searchQuery}
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
        >
          {filteredEvents.map((event) => (
            <motion.div
              key={event.id}
              variants={fadeUp}
              onClick={() => router.push(`/events/${event.id}`)}
              className="group cursor-pointer relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#111114] overflow-hidden transition-all hover:border-white/[0.15] hover:bg-[#16161a] shadow-xl hover:shadow-2xl"
            >
              {/* Image Top */}
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-white/5">
                {event.banner && (
                  <img
                    src={event.banner}
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-contain object-center transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                
                {/* Overlay Badges */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <span
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest backdrop-blur-md border",
                      event.status === "Upcoming"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : event.status === "Ongoing"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : "bg-zinc-800/80 text-zinc-400 border-zinc-700/50"
                    )}
                  >
                    {event.status}
                  </span>
                </div>

                {/* ConnectClub Label */}
                <div className="absolute bottom-4 right-4 z-20">
                  <div className="text-[#FFD700] text-xs font-black tracking-tighter flex items-center drop-shadow-md">
                    connectclub<span className="opacity-70">.</span>
                  </div>
                </div>
              </div>

              {/* Content Bottom */}
              <div className="flex flex-col flex-1 p-5 md:p-6">
                <h3 className="font-display font-black text-xl md:text-2xl text-white tracking-tight mb-1 group-hover:text-primary transition-colors line-clamp-2">
                  {event.title}
                </h3>
                <p className="text-white/50 text-sm mb-6">
                  Organized by <span className="text-white font-medium">{event.organizedBy || "Connect Club"}</span>
                </p>

                <div className="flex flex-col gap-2 text-white/60 text-sm mb-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-white/30" />
                    {event.date || "TBD"}
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-white/30" />
                    {event.venue || "TBA"}
                  </div>
                  {event.time && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-white/30" />
                      {event.time}
                    </div>
                  )}
                </div>

                {/* Footer of Card */}
                <div className="mt-auto pt-4 border-t border-white/[0.05] flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">From</span>
                    <span className="text-white font-bold text-base">{event.price || "Free"}</span>
                  </div>
                  <div className="flex items-center text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] gap-2 group-hover:text-primary transition-all group-hover:gap-3">
                    {event.registrationLink ? "Register" : "Explore"}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:-rotate-45" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </AnimatePresence>


      {filteredEvents.length === 0 && (
        <div className="text-center py-32">
          <p className="text-white/30 text-sm font-bold uppercase tracking-widest">
            No events found matching your criteria.
          </p>
        </div>
      )}
    </div>
  );
}
