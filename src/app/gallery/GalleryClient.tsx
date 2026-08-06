"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, ZoomIn, Play, Film, Images } from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";

type Category = "All" | "Workshops" | "Hackathons" | "Guest Talks" | "Competitions" | "Team Moments";
type MediaType = "image" | "video";

interface MediaItem {
  id: string;
  type: MediaType;
  src: string;
  videoUrl?: string;
  category: Category;
  album?: string;
  alt: string;
  featured?: boolean;
}
const categories: Category[] = ["All", "Workshops", "Hackathons", "Guest Talks", "Competitions", "Team Moments"];

export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState<Category>("All");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [mounted, setMounted] = useState(false);
  const [galleryItems, setGalleryItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    
    // Fetch real data from Firebase
    import("firebase/firestore").then(({ collection, query, orderBy, onSnapshot }) => {
      import("@/lib/firebase/config").then(({ db }) => {
        const q = query(collection(db, "gallery_media"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedItems = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          })) as MediaItem[];
          setGalleryItems(fetchedItems);
          setLoading(false);
        });

        return () => unsubscribe();
      });
    });
  }, []);

  useEffect(() => {
    if (selectedMedia) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [selectedMedia]);

  const filteredImages = galleryItems.filter(
    (img) => activeTab === "All" || img.category === activeTab
  );

  return (
    <div className="w-full min-h-screen pt-32 pb-24 md:pt-48 md:pb-32">
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full container-grid mb-12 md:mb-16"
      >
        <motion.div variants={fadeUp} className="col-span-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">Connect Moments</span>
          </div>
          <h1 className="text-h1 font-black text-white uppercase tracking-tight mb-6">
            Gallery
          </h1>
          <p className="text-body text-white/50 max-w-2xl mb-12">
            Explore our premium media experience featuring event albums, featured highlights, and video recaps from our community events.
          </p>

          {/* Categories */}
          <div className="flex flex-wrap gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-[13px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border",
                  activeTab === tab
                    ? "bg-primary/10 text-primary border-primary shadow-[0_0_15px_rgba(0,112,243,0.3)]"
                    : "bg-[#0C0C0E] text-white/50 hover:bg-[#111114] hover:text-white border-white/5 hover:border-white/10"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* Grid Layout for Featured Support */}
      <div className="w-full container-grid">
        <motion.div 
          layout
          className="col-span-full"
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
              <p className="text-white/50 text-sm font-medium">Loading premium media...</p>
            </div>
          ) : galleryItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 border border-dashed border-white/10 rounded-3xl">
              <Images className="w-12 h-12 text-white/20 mb-4" />
              <p className="text-white/50 font-medium">No media items found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 auto-rows-[280px]">
              <AnimatePresence mode="popLayout">
                {filteredImages.map((item, index) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 30, filter: "blur(15px)" }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.8, y: 30, filter: "blur(15px)", transition: { duration: 0.2 } }}
                    transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1], delay: index * 0.05 }}
                    key={item.id}
                className={cn(
                  "relative group rounded-2xl overflow-hidden cursor-pointer bg-[#0C0C0E] border border-white/[0.06] hover:border-white/[0.2] shadow-xl hover:shadow-2xl transition-all duration-500",
                  item.featured ? "md:col-span-2 md:row-span-2" : "col-span-1 row-span-1"
                )}
                onClick={() => setSelectedMedia(item)}
              >
                <div className="absolute inset-0 bg-[#0C0C0E]">
                  <img 
                    src={item.type === "video" && item.src.match(/\.(mp4|mov|webm|avi)$/i) ? item.src.replace(/\.(mp4|mov|webm|avi)$/i, ".jpg") : item.src} 
                    alt={item.alt} 
                    className="w-full h-full object-cover transition-transform duration-[2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-[1.05]" 
                  />
                </div>
                
                {/* Cinematic Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500 ease-out" />
                
                {/* Media Type Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center gap-2 text-white/80">
                    {item.type === "video" ? (
                      <><Film className="w-3.5 h-3.5" /><span className="text-[10px] font-bold tracking-wider uppercase">Video</span></>
                    ) : (
                      <><Images className="w-3.5 h-3.5" /><span className="text-[10px] font-bold tracking-wider uppercase">Photo</span></>
                    )}
                  </div>
                </div>

                {/* Text Content */}
                <div className="absolute bottom-0 inset-x-0 p-6 flex flex-col justify-end translate-y-2 group-hover:translate-y-0 opacity-80 group-hover:opacity-100 transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] text-primary font-bold uppercase tracking-[0.2em] drop-shadow-md">
                        {item.category}
                      </span>
                      {item.album && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-white/30" />
                          <span className="text-[10px] text-white/70 font-medium uppercase tracking-wider">
                            Album: {item.album}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className={cn(
                      "font-black text-white uppercase tracking-tight drop-shadow-xl",
                      item.featured ? "text-h2" : "text-h3"
                    )}>
                      {item.alt}
                    </h3>
                  </div>
                </div>

                {/* Hover Play/Zoom Icon */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-75 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-primary/20 backdrop-blur-md flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(0,112,243,0.3)]">
                    {item.type === "video" ? (
                      <Play className="w-6 h-6 text-white ml-1" />
                    ) : (
                      <ZoomIn className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>

              </motion.div>
            ))}
          </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>

      {/* Premium Lightbox */}
      {mounted && createPortal(
        <AnimatePresence>
          {selectedMedia && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedMedia(null)}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-3xl p-4 md:p-12"
            >
              {/* Top Bar */}
              <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start pointer-events-none z-50">
                <div className="flex flex-col gap-2">
                  <span className="text-[12px] text-primary font-bold uppercase tracking-[0.2em]">
                    {selectedMedia.category} {selectedMedia.album ? `• ${selectedMedia.album}` : ""}
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">
                    {selectedMedia.alt}
                  </h2>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedMedia(null);
                  }}
                  className="pointer-events-auto p-3 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/10 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative max-w-7xl w-full flex items-center justify-center mt-16"
              >
                {selectedMedia.type === "video" && selectedMedia.videoUrl ? (
                  <video 
                    src={selectedMedia.videoUrl}
                    controls
                    autoPlay
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-[75vh] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 object-contain bg-black/20"
                  />
                ) : (
                  <img
                    src={selectedMedia.src}
                    alt={selectedMedia.alt}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-[75vh] rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] object-contain border border-white/10"
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

