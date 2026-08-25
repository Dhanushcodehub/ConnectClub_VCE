"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ArrowLeft, Share2, Calendar, Clock, MapPin, ExternalLink, CheckCircle2, PlayCircle, X, Loader2 } from "lucide-react";
import { ConnectEvent } from "@/lib/data/events";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import { registerForEvent } from "@/lib/firebase/users";

const formatText = (text?: string) => {
  if (!text) return null;
  const paragraphs = text.split(/\n\s*\n/);
  
  return paragraphs.map((para, i) => {
    // Basic Markdown parsing: replace **bold** with <strong>bold</strong>
    let formatted = para.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    return (
      <p key={i} className="mb-4 last:mb-0" dangerouslySetInnerHTML={{ __html: formatted }} />
    );
  });
};

const isVideoMedia = (url: string) => {
  if (!url) return false;
  const lowerUrl = url.toLowerCase();
  return lowerUrl.includes(".mp4") || lowerUrl.includes(".webm") || lowerUrl.includes(".ogg");
};

export default function EventDetailClient({ event }: { event: ConnectEvent }) {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    setMounted(true);
  }, []);

  const handleRegister = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!user) {
      router.push(`/u/login`);
      return;
    }

    setIsRegistering(true);
    try {
      await registerForEvent(user.uid, event.id, event.title);
      // If there's an external link, open it, otherwise go to dashboard
      if (event.registrationLink && event.registrationLink !== "#") {
        window.open(event.registrationLink, "_blank");
      }
      router.push("/u/dashboard");
    } catch (err: any) {
      if (err.message === "Already registered for this event") {
        router.push("/u/dashboard");
      } else {
        alert(err.message || "Failed to register for event");
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${event.title} | Connect Club`,
          text: `Check out ${event.title} organized by ${event.organizedBy || "Connect Club"}!`,
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen pt-24 pb-20">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.push("/events")}
            className="flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to events
          </button>
          
          <button 
            onClick={handleShare}
            className="flex items-center text-sm font-medium text-white/70 hover:text-white transition-colors gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>

        {/* Hero Section Split Layout */}
        <div className="flex flex-col lg:flex-row items-stretch gap-6 mb-12">
          
          {/* Left: Banner Image */}
          <div className="w-full lg:w-3/5 rounded-2xl overflow-hidden border border-white/5 bg-[#0A0A0C] relative aspect-[16/9] lg:aspect-auto">
             {/* Blurred backdrop to fill empty space seamlessly */}
             <div 
               className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
               style={{ backgroundImage: `url(${event.banner || "/images/placeholder.jpg"})` }}
             />
             <img 
               src={event.banner || "/images/placeholder.jpg"} 
               alt={event.title}
               className="absolute inset-0 w-full h-full object-contain p-2 md:p-4 z-10 drop-shadow-2xl"
             />
          </div>

          {/* Right: Event Info Box */}
          <div className="w-full lg:w-2/5 rounded-2xl bg-[#111114] border border-white/[0.05] p-8 md:p-10 flex flex-col">
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-tight mb-4 uppercase">
              {event.title}
            </h1>
            <p className="text-white/50 text-sm mb-8">
              Organized By <span className="text-primary font-semibold">{event.organizedBy || "Connect Club"}</span> VCE
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-auto">
              {/* Date Box */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-2">
                 <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-bold mb-1">
                   <Calendar className="w-4 h-4 text-primary" />
                   Date
                 </div>
                 <span className="text-white font-medium text-sm">{event.date}</span>
              </div>

              {/* Time Box */}
              {event.time && (
                <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-2">
                   <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-bold mb-1">
                     <Clock className="w-4 h-4 text-primary" />
                     Time
                   </div>
                   <span className="text-white font-medium text-sm">{event.time}</span>
                </div>
              )}

              {/* Location Box */}
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col gap-2 sm:col-span-2">
                 <div className="flex items-center gap-2 text-white/40 text-xs uppercase tracking-wider font-bold mb-1">
                   <MapPin className="w-4 h-4 text-primary" />
                   Location
                 </div>
                 <span className="text-white font-medium text-sm">{event.venue}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Content Section Split Layout */}
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Left: Detailed Information */}
          <div className="w-full lg:w-[65%] space-y-12 order-2 lg:order-1">

            {/* Certificates Banner for Past Events */}
            {event.status === "Past" && (
              <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 md:p-8 flex items-center gap-6">
                <div className="p-3 bg-primary/10 rounded-full shrink-0">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Certificates Provided</h3>
                  <p className="text-white/60 text-sm mt-1">Participants receive a certificate of participation upon completion.</p>
                </div>
              </section>
            )}
            
            {/* About this event */}
            <section className="bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden shadow-lg">
              <div className="p-6 md:p-8 border-b border-white/[0.05]">
                <h2 className="text-xl font-display font-bold text-white tracking-wide">About this event</h2>
              </div>
              <div className="p-6 md:p-8">
                <div className="prose prose-invert max-w-none text-white/70 text-sm md:text-base leading-relaxed">
                  {formatText(event.description)}
                </div>
              </div>
            </section>

            {/* Highlights (if any) */}
            {event.highlights && event.highlights.length > 0 && (
              <section className="bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/[0.05]">
                  <h2 className="text-xl font-bold text-white">Highlights</h2>
                </div>
                <div className="p-6 md:p-8">
                  <ul className="space-y-4">
                    {event.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <div className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-white/70 text-sm md:text-base leading-relaxed">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* Speakers (if any) */}
            {event.speakers && event.speakers.length > 0 && (
              <section className="bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/[0.05]">
                  <h2 className="text-xl font-bold text-white">Speakers</h2>
                </div>
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.speakers.map((speaker, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-transparent border border-primary/20 flex items-center justify-center text-white font-bold text-lg">
                          {speaker.charAt(0)}
                        </div>
                        <span className="text-white font-medium">{speaker}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Agenda (if any) */}
            {event.agenda && event.agenda.length > 0 && (
              <section className="bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/[0.05]">
                  <h2 className="text-xl font-bold text-white">Agenda</h2>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                  {event.agenda.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                      <div className="sm:w-32 text-primary font-bold text-sm tracking-wider uppercase shrink-0">
                        {item.time}
                      </div>
                      <div>
                        <h4 className="text-white font-bold mb-1">{item.title}</h4>
                        {item.description && (
                          <p className="text-white/60 text-sm leading-relaxed">{item.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* FAQs (if any) */}
            {event.faqs && event.faqs.length > 0 && (
              <section className="bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/[0.05]">
                  <h2 className="text-xl font-bold text-white">Frequently Asked Questions</h2>
                </div>
                <div className="p-6 md:p-8 space-y-6">
                  {event.faqs.map((faq, idx) => (
                    <div key={idx} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-xl">
                      <h4 className="text-white font-bold mb-2 flex items-start gap-2">
                        <span className="text-primary mt-0.5">Q.</span>
                        {faq.question}
                      </h4>
                      <div className="text-white/60 text-sm leading-relaxed pl-6">
                        {formatText(faq.answer)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Gallery / Albums (if any) */}
            {event.galleryAlbums && event.galleryAlbums.length > 0 && (
              <section className="bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden">
                <div className="p-6 md:p-8 border-b border-white/[0.05]">
                  <h2 className="text-xl font-bold text-white">Event Gallery</h2>
                </div>
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {event.galleryAlbums.map((media, idx) => {
                      const isVideo = isVideoMedia(media);
                      return (
                        <div 
                          key={idx} 
                          className="relative aspect-video rounded-xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer"
                          onClick={() => setSelectedMedia(media)}
                        >
                          {isVideo ? (
                            <>
                              <video 
                                src={media} 
                                autoPlay 
                                muted 
                                loop 
                                playsInline
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <PlayCircle className="w-12 h-12 text-white/80" />
                              </div>
                            </>
                          ) : (
                            <img 
                              src={media} 
                              alt={`Gallery media ${idx + 1}`} 
                              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

          </div>

          {/* Right: Sticky Sidebar (Venue & Entry) */}
          <div className="w-full lg:w-[35%] relative order-1 lg:order-2">
            <div className="sticky top-28 bg-[#111114] border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl">
              
              <div className="p-6 md:p-8 space-y-6">
                {/* Venue Details */}
                <div>
                  <div className="text-white/40 text-[10px] uppercase tracking-widest font-bold mb-3">Venue</div>
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-white/80 text-sm font-medium leading-relaxed">
                      {event.venue}
                    </div>
                  </div>
                </div>

                <div className="h-px w-full bg-white/[0.05]" />

                {/* Entry Price & Registration */}
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Entry</div>
                    <div className="text-white font-bold text-xl">{event.price || "Free"}</div>
                  </div>

                  {event.status === "Upcoming" ? (
                    <button 
                      onClick={handleRegister}
                      disabled={isRegistering}
                      className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-sm flex justify-center items-center gap-2 transition-all shadow-lg hover:shadow-primary/20 disabled:opacity-50"
                    >
                      {isRegistering ? <Loader2 className="w-5 h-5 animate-spin" /> : event.registrationLink ? "Register for Free" : "Explore Event"}
                    </button>
                  ) : event.status === "Ongoing" ? (
                    <div className="w-full py-4 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 font-bold text-sm flex justify-center items-center">
                      Happening Now
                    </div>
                  ) : (
                    <div className="w-full py-4 rounded-xl bg-white/[0.05] border border-white/10 text-white/40 font-bold text-sm flex justify-center items-center">
                      Event Concluded
                    </div>
                  )}
                </div>
              </div>

              {/* Special Badges (Like Pro Benefit) */}
              <div className="bg-[#16161a] p-4 border-t border-white/[0.05] flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <div className="flex flex-col">
                  <span className="text-primary text-xs font-bold">Verified Event</span>
                  <span className="text-white/40 text-[10px]">Organized by Connect Club</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Media Lightbox rendered via Portal */}
      {selectedMedia && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setSelectedMedia(null)}
        >
          <button 
            type="button"
            className="absolute top-4 right-4 md:top-6 md:right-6 p-3 bg-black/50 hover:bg-black/80 border border-white/10 text-white rounded-full transition-all z-[10000] shadow-2xl"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSelectedMedia(null);
            }}
          >
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="relative flex items-center justify-center max-w-6xl max-h-[90vh] w-auto h-auto cursor-auto"
            onClick={(e) => e.stopPropagation()} // Prevent clicking the actual media from closing
          >
            {isVideoMedia(selectedMedia) ? (
              <video 
                src={selectedMedia} 
                controls
                autoPlay
                className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
              />
            ) : (
              <img 
                src={selectedMedia} 
                alt="Expanded media" 
                className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
