"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { fadeUp, staggerContainer } from "@/lib/animations";
import { getMilestones, ConnectMilestone } from "@/lib/firebase/timeline";
import { Loader2 } from "lucide-react";

export default function TimelinePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [timelineEvents, setTimelineEvents] = useState<ConnectMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await getMilestones();
      setTimelineEvents(data);
      setLoading(false);
    }
    load();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 80%", "end 80%"],
  });

  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div className="w-full min-h-screen pt-32 pb-24 md:pt-48 md:pb-32 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
      
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full container-grid mb-24 md:mb-32 relative z-10"
      >
        <motion.div variants={fadeUp} className="col-span-full text-center max-w-3xl mx-auto flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">Our History</span>
            <span className="w-8 h-[2px] bg-primary rounded-full" />
          </div>
          <h1 className="text-h1 font-black text-white uppercase tracking-tight mb-6">
            The Journey
          </h1>
          <p className="text-body text-white/50 max-w-2xl">
            From a small group of enthusiasts to the leading tech community on campus. See how we've grown over the years.
          </p>
        </motion.div>
      </motion.div>

      <div className="w-full container-grid relative" ref={containerRef}>
        
        {/* Animated Central Line (Desktop) */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] bg-white/5 -translate-x-1/2 z-0" />
        
        {/* Glowing Progress Line */}
        <motion.div 
          className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary to-[#00f2fe] -translate-x-1/2 origin-top z-10 shadow-[0_0_20px_rgba(0,112,243,0.8)]"
          style={{ scaleY }}
        />

        <div className="col-span-full flex flex-col gap-y-24 md:gap-y-32 z-20">
          {loading ? (
            <div className="w-full py-32 flex justify-center items-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : timelineEvents.length === 0 ? (
            <div className="w-full py-32 flex justify-center items-center text-white/50">
              No milestones found.
            </div>
          ) : (
            timelineEvents.map((event, idx) => {
            const isEven = idx % 2 === 0;
            
            return (
              <motion.div 
                key={event.id} 
                className={`relative flex flex-col md:flex-row items-center w-full gap-8 md:gap-0`}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Timeline Dot (Desktop) */}
                <motion.div 
                  initial={{ 
                    borderColor: "rgba(255, 255, 255, 0.1)", 
                    boxShadow: "0 0 0px rgba(0,112,243,0)",
                    backgroundColor: "#0C0C0E"
                  }}
                  whileInView={{ 
                    borderColor: "rgba(0, 112, 243, 1)", 
                    boxShadow: "0 0 20px rgba(0,112,243,0.8)",
                    backgroundColor: "#0C0C0E"
                  }}
                  viewport={{ once: true, margin: "-40% 0px -40% 0px" }}
                  transition={{ duration: 0.5 }}
                  className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full border-[3px] z-30 overflow-hidden" 
                >
                  <motion.div 
                     initial={{ scale: 0, opacity: 0 }}
                     whileInView={{ scale: 1, opacity: 1 }}
                     viewport={{ once: true, margin: "-40% 0px -40% 0px" }}
                     transition={{ duration: 0.4, delay: 0.2 }}
                     className="w-full h-full bg-primary rounded-full shadow-[0_0_10px_rgba(0,112,243,0.8)]"
                  />
                </motion.div>

                {/* Content Block */}
                <div className={`w-full md:w-1/2 flex flex-col ${isEven ? 'md:pr-16 lg:pr-24 items-start md:items-end text-left md:text-right' : 'md:pl-16 lg:pl-24 items-start text-left md:order-2'}`}>
                  
                  {/* Mobile Timeline Header (with line design) */}
                  <div className="flex md:hidden items-center gap-4 mb-4">
                     <motion.div 
                       initial={{ scale: 0, opacity: 0 }}
                       whileInView={{ scale: 1, opacity: 1 }}
                       viewport={{ once: true, margin: "-20% 0px" }}
                       transition={{ duration: 0.5 }}
                       className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(0,112,243,0.8)] shrink-0" 
                     />
                     <div className="flex items-center gap-3">
                        <span className="text-primary font-black text-2xl tracking-tight shrink-0">{event.year}</span>
                        <span className="w-6 h-[2px] bg-primary rounded-full shrink-0" />
                        <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em]">{event.month}</span>
                     </div>
                  </div>

                  {/* Desktop Timeline Header (with line design) */}
                  <div className="hidden md:block mb-4">
                    <div className={`flex items-center gap-4 ${isEven ? 'justify-end' : 'justify-start'}`}>
                      {isEven ? (
                        <>
                          <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">{event.month}</span>
                          <span className="w-12 h-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(0,112,243,0.5)]" />
                          <span className="text-primary font-black text-4xl lg:text-5xl tracking-tighter opacity-90">{event.year}</span>
                        </>
                      ) : (
                        <>
                          <span className="text-primary font-black text-4xl lg:text-5xl tracking-tighter opacity-90">{event.year}</span>
                          <span className="w-12 h-[2px] bg-primary rounded-full shadow-[0_0_10px_rgba(0,112,243,0.5)]" />
                          <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">{event.month}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <h3 className="text-h2 md:text-h3 font-black text-white uppercase tracking-tight mb-4">
                    {event.title}
                  </h3>
                  <p className="text-body text-white/50 leading-relaxed max-w-md">
                    {event.description}
                  </p>
                </div>

                {/* Image Block */}
                <div className={`w-full md:w-1/2 ${isEven ? 'md:pl-16 lg:pl-24' : 'md:pr-16 lg:pr-24 md:order-1'}`}>
                  <div className="relative w-full aspect-[4/3] rounded-2xl border border-white/[0.06] bg-[#0C0C0E] overflow-hidden group shadow-xl hover:shadow-2xl transition-all hover:border-white/[0.15]">
                    {event.mediaType === 'video' ? (
                      <video 
                        src={event.mediaUrl}
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
                      />
                    ) : (
                      <img 
                        src={event.mediaUrl} 
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-[1.5s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                </div>

              </motion.div>
            );
          })
        )}
        </div>
      </div>
    </div>
  );
}
