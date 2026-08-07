"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, ArrowRight, Search, ChevronLeft, ChevronRight, X, MapPin } from "lucide-react";
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
  const [selectedEvent, setSelectedEvent] = useState<ConnectEvent | null>(null);
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
  const filteredEvents = events.filter((event) => {
    const matchesTab = activeTab === "All" || event.status === activeTab;
    const matchesSearch = 
      event.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesTab && matchesSearch;
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedEvent) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [selectedEvent]);

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
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative">
      
      {/* Trending Events Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-white/80 text-xs font-bold uppercase tracking-widest bg-white/5 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              🔥 Hot Right Now
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
            Trending events
          </h1>
          <p className="text-white/50 text-base md:text-lg">
            What students are booking this week.
          </p>
        </div>
        <button className="flex items-center gap-2 text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-full text-sm font-medium transition-all group">
          Browse all
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>

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
              onClick={() => setSelectedEvent(featuredEvent)}
            >
              {/* Featured Image */}
              <div className="relative w-full md:w-1/2 h-[350px] md:h-[500px]">
                {featuredEvent.banner ? (
                  <img
                    src={featuredEvent.banner}
                    alt={featuredEvent.title}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-[#0C0C0E] via-[#0C0C0E]/40 to-transparent" />
                
                {/* ConnectClub Label */}
                <div className="absolute top-6 left-6 z-20">
                  <div className="bg-primary text-white text-xs font-black px-2.5 py-1 rounded-sm shadow-lg tracking-tighter flex items-center">
                    connectclub<span className="opacity-70">.</span>
                  </div>
                </div>
              </div>

              {/* Featured Content */}
              <div className="flex flex-col justify-center w-full md:w-1/2 p-8 md:p-12 relative z-10 bg-[#0C0C0E]">
                <span className="px-4 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/20 text-primary border border-primary/20 w-fit mb-6 shadow-[0_0_15px_rgba(0,85,255,0.3)]">
                  Featured Event
                </span>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tight mb-4 leading-tight">
                  {featuredEvent.title || "Untitled Event"}
                </h2>
                <p className="text-white/50 text-sm md:text-base leading-relaxed mb-8 line-clamp-3">
                  {featuredEvent.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between mt-auto">
                   <div className="flex items-center text-white/60 text-sm gap-2 font-medium">
                     <Calendar className="w-4 h-4 text-primary" />
                     {featuredEvent.date || "TBD"}
                   </div>
                   <button className="relative z-30 px-8 py-3 rounded-md bg-white text-black text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors shadow-lg">
                     Explore
                   </button>
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
          className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8"
        >
          {filteredEvents.map((event) => (
            <motion.div
              key={event.id}
              variants={fadeUp}
              onClick={() => setSelectedEvent(event)}
              className="group cursor-pointer relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#111114] overflow-hidden transition-all hover:border-white/[0.15] hover:bg-[#16161a] shadow-xl hover:shadow-2xl"
            >
              {/* Image Top */}
              <div className="relative w-full aspect-[16/9] overflow-hidden bg-white/5">
                {event.banner && (
                  <img
                    src={event.banner}
                    alt={event.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                
                {/* Overlay Badges */}
                <div className="absolute top-4 left-4 z-20 flex gap-2">
                  <div className="bg-primary text-white text-[10px] font-black px-2 py-1 rounded-sm shadow-lg tracking-tighter flex items-center h-fit">
                    connectclub<span className="opacity-70">.</span>
                  </div>
                  <span
                    className={cn(
                      "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-[0.15em] backdrop-blur-md shadow-lg",
                      event.status === "Upcoming"
                        ? "bg-primary text-white"
                        : event.status === "Ongoing"
                        ? "bg-green-500 text-white"
                        : "bg-white/20 text-white"
                    )}
                  >
                    {event.status}
                  </span>
                </div>
              </div>

              {/* Content Bottom */}
              <div className="flex flex-col flex-1 p-5 md:p-6">
                <h3 className="font-display font-black text-xl md:text-2xl text-white uppercase tracking-tight mb-2 group-hover:text-primary transition-colors line-clamp-2">
                  {event.title}
                </h3>
                <p className="text-white/50 leading-relaxed text-sm line-clamp-2 mb-6">
                  {event.description}
                </p>

                {/* Footer of Card */}
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/[0.05]">
                  <div className="flex items-center gap-2 text-white/50 text-xs font-medium">
                    <Calendar className="w-4 h-4 text-white/30" />
                    {event.date}
                  </div>
                  <div className="flex items-center text-white/70 text-[10px] font-bold uppercase tracking-[0.2em] gap-2 group-hover:text-primary transition-all group-hover:gap-3">
                    Explore
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

      {/* Event Details Modal Overlay (Using React Portal to escape z-index hell) */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedEvent && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8">
              {/* Blurred Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-xl"
                onClick={() => setSelectedEvent(null)}
              />
              
              {/* Massive Industry-Level Modal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-7xl h-full max-h-[90vh] bg-[#0A0A0C] border border-white/10 rounded-xl overflow-hidden flex flex-col md:flex-row shadow-[0_0_100px_rgba(0,0,0,0.8)] z-10"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 z-50 w-12 h-12 flex items-center justify-center rounded-md bg-black/50 border border-white/10 text-white/70 hover:text-white hover:bg-black/80 backdrop-blur-md transition-all hover:scale-105 shadow-2xl"
                >
                  <X className="w-6 h-6" />
                </button>

                {/* Modal Banner (Left Side on Desktop) */}
                <div className="w-full md:w-1/2 h-[250px] md:h-full relative shrink-0 border-b md:border-b-0 md:border-r border-white/10">
                  <img src={selectedEvent.banner} alt={selectedEvent.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-[#0A0A0C]/40 to-transparent md:bg-gradient-to-r" />
                  
                  {/* Floating Title on Banner for Mobile */}
                  <div className="absolute bottom-6 left-6 right-6 md:hidden">
                    <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight mb-2 drop-shadow-xl">{selectedEvent.title}</h3>
                  </div>
                </div>

                {/* Modal Content Scrollable Area (Right Side on Desktop) */}
                <div className="w-full md:w-1/2 flex-1 overflow-y-auto p-6 md:p-10 lg:p-14 scrollbar-hide" data-lenis-prevent="true">
                  
                  {/* Meta details */}
                  <div className="flex flex-wrap items-center gap-4 mb-8">
                    <span className={cn(
                        "px-4 py-1.5 rounded-sm text-xs font-bold uppercase tracking-[0.2em]",
                        selectedEvent.status === "Upcoming"
                          ? "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_15px_rgba(0,85,255,0.2)]"
                          : selectedEvent.status === "Ongoing"
                          ? "bg-green-500/20 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                          : "bg-white/10 text-white/50 border border-white/10"
                      )}>
                      {selectedEvent.status}
                    </span>
                    <div className="flex items-center gap-2 text-white/60 text-xs md:text-sm font-medium">
                      <Calendar className="w-4 h-4 text-white/40" />
                      {selectedEvent.date}
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-xs md:text-sm font-medium">
                      <MapPin className="w-4 h-4 text-white/40" />
                      {selectedEvent.venue}
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-black text-white uppercase tracking-tighter mb-6 leading-none">
                    {selectedEvent.title}
                  </h2>
                  
                  {/* Description */}
                  <p className="text-white/60 text-sm md:text-base leading-relaxed mb-10 max-w-2xl">
                    {selectedEvent.description}
                  </p>

                  {/* Event Highlights Section */}
                  {selectedEvent.highlights && selectedEvent.highlights.length > 0 && (
                    <div className="mb-12">
                      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                        Event Highlights
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
                        {selectedEvent.highlights.map((highlight, i) => (
                          <li key={i} className="flex items-start gap-3 bg-white/[0.01] p-4 rounded-md border border-white/[0.03]">
                            <div className="w-6 h-6 shrink-0 rounded-sm bg-primary/20 text-primary flex items-center justify-center mt-0.5">
                              <span className="text-[10px] font-bold">✓</span>
                            </div>
                            <span className="text-white/80 text-sm md:text-base leading-relaxed">{highlight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Speakers Section */}
                  {selectedEvent.speakers && selectedEvent.speakers.length > 0 && (
                    <div className="mb-12">
                      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                        Guest Speakers
                      </h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedEvent.speakers.map((speaker, i) => (
                          <li key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.04] p-4 rounded-md hover:bg-white/[0.05] transition-colors">
                            <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-primary/40 to-secondary/40 border border-white/10 flex items-center justify-center text-white/50 font-bold uppercase">
                              {speaker.charAt(0)}
                            </div>
                            <span className="text-white/80 text-sm font-medium">{speaker}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Agenda Section */}
                  {selectedEvent.agenda && selectedEvent.agenda.length > 0 && (
                    <div className="mb-10">
                      <h3 className="text-xs md:text-sm font-bold text-white mb-6 uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                        Event Agenda
                      </h3>
                      <div className="space-y-3 max-w-2xl">
                        {selectedEvent.agenda.map((item, i) => (
                          <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 bg-white/[0.01] p-4 rounded-md border border-white/[0.02] hover:border-white/[0.08] transition-colors">
                            <div className="text-primary text-xs font-bold uppercase tracking-widest shrink-0 md:w-32">
                              {item.time}
                            </div>
                            <div className="text-white/90 text-sm md:text-base font-medium">
                              {item.title}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certificates Banner */}
                  {selectedEvent.certificates && (
                    <div className="mb-12 max-w-4xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 rounded-md p-6 flex items-center gap-6">
                      <div className="w-12 h-12 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
                        <span className="text-xl">🏆</span>
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-lg mb-1">Certificates of Participation</h4>
                        <p className="text-white/60 text-sm">All attendees will receive a verified certificate upon completion of this event.</p>
                      </div>
                    </div>
                  )}

                  {/* Gallery Section */}
                  {selectedEvent.galleryAlbums && selectedEvent.galleryAlbums.length > 0 && (
                    <div className="mb-12">
                      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                        Gallery & Memories
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {selectedEvent.galleryAlbums.map((img, i) => (
                          <div key={i} className="relative aspect-video rounded-md overflow-hidden border border-white/10 group">
                            <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* FAQs Section */}
                  {selectedEvent.faqs && selectedEvent.faqs.length > 0 && (
                    <div className="mb-12">
                      <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-[0.2em] border-b border-white/10 pb-4">
                        Frequently Asked Questions
                      </h3>
                      <div className="space-y-4 max-w-4xl">
                        {selectedEvent.faqs.map((faq, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-md">
                            <h4 className="text-white font-bold text-sm md:text-base mb-2">{faq.question}</h4>
                            <p className="text-white/60 text-sm leading-relaxed">{faq.answer}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Registration CTA */}
                  <div className="pt-8 border-t border-white/10 mt-auto">
                    {selectedEvent.registrationLink ? (
                      <a
                        href={selectedEvent.registrationLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center px-10 py-5 rounded-md bg-primary text-white text-sm font-bold uppercase tracking-[0.2em] hover:bg-primary/90 hover:scale-105 transition-all shadow-[0_0_30px_rgba(0,85,255,0.4)] w-full sm:w-auto"
                      >
                        Register Now
                      </a>
                    ) : (
                      <button disabled className="inline-flex items-center justify-center px-10 py-5 rounded-md bg-white/5 border border-white/10 text-white/30 text-sm font-bold uppercase tracking-[0.2em] w-full sm:w-auto cursor-not-allowed">
                        Registrations Closed
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
