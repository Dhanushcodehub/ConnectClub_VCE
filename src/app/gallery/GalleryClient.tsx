"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  X,
  ZoomIn,
  Play,
  Film,
  Images,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { fadeUp, staggerContainer } from "@/lib/animations";

type Category =
  | "All"
  | "Workshops"
  | "Hackathons"
  | "Guest Talks"
  | "Competitions"
  | "Team Moments";
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

const categories: Category[] = [
  "All",
  "Workshops",
  "Hackathons",
  "Guest Talks",
  "Competitions",
  "Team Moments",
];

/* ─── Marquee Row Component ────────────────────────────────────────────────── */
function MarqueeRow({
  items,
  direction = "left",
  speed = 35,
  onItemClick,
}: {
  items: MediaItem[];
  direction?: "left" | "right";
  speed?: number;
  onItemClick: (item: MediaItem) => void;
}) {
  if (items.length === 0) return null;

  // Duplicate items enough times to fill the screen seamlessly
  const repeated = [...items, ...items, ...items, ...items];
  const dur = items.length * speed;

  return (
    <div className="relative w-full overflow-hidden group/row">
      {/* Fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 md:w-32 z-10 bg-gradient-to-r from-[#0A0B14] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 md:w-32 z-10 bg-gradient-to-l from-[#0A0B14] to-transparent" />

      <div
        className={cn(
          "flex gap-3 md:gap-4 w-max",
          direction === "left" ? "animate-marquee-left" : "animate-marquee-right"
        )}
        style={{
          animationDuration: `${dur}s`,
        }}
      >
        {repeated.map((item, i) => (
          <div
            key={`${item.id}-${i}`}
            onClick={() => onItemClick(item)}
            className="relative group shrink-0 cursor-pointer overflow-hidden rounded-xl md:rounded-2xl border border-white/[0.06] hover:border-white/25 bg-[#0C0C0E] transition-all duration-500 h-[180px] sm:h-[220px] md:h-[260px] lg:h-[300px] w-[260px] sm:w-[300px] md:w-[360px] lg:w-[420px]"
          >
            {/* Image */}
            <div className="absolute inset-0">
              <Image
                src={
                  item.type === "video" &&
                  item.src.match(/\.(mp4|mov|webm|avi)$/i)
                    ? item.src.replace(/\.(mp4|mov|webm|avi)$/i, ".jpg")
                    : item.src
                }
                alt={item.alt}
                fill
                sizes="420px"
                className="object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:scale-110"
              />
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-500" />

            {/* Media Type Badge */}
            <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
              <div className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 text-white/90">
                {item.type === "video" ? (
                  <>
                    <Film className="w-3 h-3" />
                    <span className="text-[9px] font-bold tracking-wider uppercase">
                      Video
                    </span>
                  </>
                ) : (
                  <>
                    <Images className="w-3 h-3" />
                    <span className="text-[9px] font-bold tracking-wider uppercase">
                      Photo
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Bottom text */}
            <div className="absolute bottom-0 inset-x-0 p-4 md:p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              <span className="text-[9px] md:text-[10px] text-primary font-bold uppercase tracking-[0.15em] mb-1 block opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                {item.category}
                {item.album && ` · ${item.album}`}
              </span>
              <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight leading-tight drop-shadow-lg line-clamp-2">
                {item.alt}
              </h3>
            </div>

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 ease-out pointer-events-none">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/25 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {item.type === "video" ? (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                ) : (
                  <ZoomIn className="w-5 h-5 text-white" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Gallery Page ─────────────────────────────────────────────────────────── */
export default function GalleryPage() {
  const [activeTab, setActiveTab] = useState<Category>("All");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [galleryItems, setGalleryItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);

    import("firebase/firestore").then(
      ({ collection, query, orderBy, onSnapshot }) => {
        import("@/lib/firebase/config").then(({ db }) => {
          const q = query(
            collection(db, "gallery_media"),
            orderBy("createdAt", "desc")
          );
          const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedItems = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as MediaItem[];
            setGalleryItems(fetchedItems);
            setLoading(false);
          });

          return () => unsubscribe();
        });
      }
    );
  }, []);

  /* Body scroll lock */
  useEffect(() => {
    if (selectedMedia) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [selectedMedia]);

  const filteredImages = galleryItems.filter(
    (img) => activeTab === "All" || img.category === activeTab
  );

  /* Split items into 3 rows */
  const row1: MediaItem[] = [];
  const row2: MediaItem[] = [];
  const row3: MediaItem[] = [];
  filteredImages.forEach((item, i) => {
    if (i % 3 === 0) row1.push(item);
    else if (i % 3 === 1) row2.push(item);
    else row3.push(item);
  });

  /* Lightbox */
  const openLightbox = useCallback(
    (item: MediaItem) => {
      const idx = filteredImages.findIndex((i) => i.id === item.id);
      setSelectedIdx(idx);
      setSelectedMedia(item);
    },
    [filteredImages]
  );

  const navigateLightbox = useCallback(
    (dir: 1 | -1) => {
      const next =
        (selectedIdx + dir + filteredImages.length) % filteredImages.length;
      setSelectedIdx(next);
      setSelectedMedia(filteredImages[next]);
    },
    [selectedIdx, filteredImages]
  );

  useEffect(() => {
    if (!selectedMedia) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMedia(null);
      if (e.key === "ArrowRight") navigateLightbox(1);
      if (e.key === "ArrowLeft") navigateLightbox(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedMedia, navigateLightbox]);

  return (
    <div className="w-full min-h-screen pt-32 pb-24 md:pt-48 md:pb-32">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="w-full container-grid mb-14 md:mb-20"
      >
        <motion.div variants={fadeUp} className="col-span-full">
          <div className="flex items-center gap-3 mb-4">
            <span className="w-8 h-[2px] bg-primary rounded-full" />
            <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">
              Connect Moments
            </span>
          </div>
          <h1 className="text-h1 font-black text-white uppercase tracking-tight mb-6">
            Gallery
          </h1>
          <p className="text-body text-white/50 max-w-2xl mb-12">
            Relive our best moments — from high-energy hackathons and expert
            talks to hands-on workshops and unforgettable team celebrations.
          </p>

          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2.5 pb-2 scrollbar-hide">
            {categories.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative px-5 py-2 rounded-full text-[12px] font-bold uppercase tracking-wider transition-all duration-300 border whitespace-nowrap",
                  activeTab === tab
                    ? "bg-primary text-white border-primary shadow-[0_0_20px_rgba(147,51,234,0.4)]"
                    : "bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white/80 border-white/[0.07] hover:border-white/15"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </motion.div>
      </motion.div>

      {/* ── Marquee Gallery Rows ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 space-y-4">
          <div className="w-12 h-12 rounded-full border-4 border-white/10 border-t-primary animate-spin" />
          <p className="text-white/50 text-sm font-medium">
            Loading gallery...
          </p>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 border border-dashed border-white/10 rounded-3xl mx-6 md:mx-12">
          <Images className="w-14 h-14 text-white/15 mb-5" />
          <p className="text-white/40 font-medium text-lg">
            No media in this category yet.
          </p>
          <p className="text-white/25 text-sm mt-1">
            Check back soon for updates.
          </p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col gap-3 md:gap-4 w-full overflow-hidden"
        >
          {/* Row 1 → scrolls left */}
          <MarqueeRow
            items={row1.length > 0 ? row1 : filteredImages}
            direction="left"
            speed={30}
            onItemClick={openLightbox}
          />

          {/* Row 2 → scrolls right (reverse) */}
          <MarqueeRow
            items={row2.length > 0 ? row2 : filteredImages}
            direction="right"
            speed={35}
            onItemClick={openLightbox}
          />

          {/* Row 3 → scrolls left */}
          <MarqueeRow
            items={row3.length > 0 ? row3 : filteredImages}
            direction="left"
            speed={32}
            onItemClick={openLightbox}
          />
        </motion.div>
      )}

      {/* ── Premium Lightbox ────────────────────────────────────────────── */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {selectedMedia && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setSelectedMedia(null)}
                className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/96 backdrop-blur-2xl"
              >
                {/* Top bar */}
                <div className="absolute top-0 inset-x-0 p-5 md:p-8 flex justify-between items-start z-50">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-primary font-bold uppercase tracking-[0.18em]">
                      {selectedMedia.category}
                      {selectedMedia.album
                        ? ` · ${selectedMedia.album}`
                        : ""}
                    </span>
                    <h2 className="text-lg md:text-2xl font-black text-white uppercase tracking-tight">
                      {selectedMedia.alt}
                    </h2>
                    <span className="text-[11px] text-white/30 font-medium">
                      {selectedIdx + 1} / {filteredImages.length}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMedia(null);
                    }}
                    className="p-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white transition-all border border-white/10 hover:border-white/20 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Nav arrows */}
                {filteredImages.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateLightbox(-1);
                      }}
                      className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/60 hover:text-white border border-white/10 hover:border-white/25 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateLightbox(1);
                      }}
                      className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-50 w-12 h-12 rounded-full bg-white/[0.06] hover:bg-white/[0.14] text-white/60 hover:text-white border border-white/10 hover:border-white/25 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Media content */}
                <motion.div
                  key={selectedMedia.id}
                  initial={{ scale: 0.92, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: 16 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative w-[90vw] max-w-5xl flex items-center justify-center"
                >
                  {selectedMedia.type === "video" &&
                  selectedMedia.videoUrl ? (
                    <video
                      src={selectedMedia.videoUrl}
                      controls
                      autoPlay
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-h-[80vh] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] border border-white/10 object-contain bg-black"
                    />
                  ) : (
                    <img
                      src={selectedMedia.src}
                      alt={selectedMedia.alt}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full max-h-[80vh] rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] object-contain border border-white/10"
                    />
                  )}
                </motion.div>

                {/* Thumbnail strip */}
                {filteredImages.length > 1 && (
                  <div className="absolute bottom-0 inset-x-0 py-4 px-4 flex justify-center z-50">
                    <div className="flex gap-1.5 overflow-x-auto max-w-[80vw] scrollbar-hide py-1 px-1">
                      {filteredImages.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIdx(idx);
                            setSelectedMedia(item);
                          }}
                          className={cn(
                            "w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-300 cursor-pointer",
                            idx === selectedIdx
                              ? "border-primary shadow-[0_0_12px_rgba(147,51,234,0.5)] scale-110"
                              : "border-transparent opacity-40 hover:opacity-80 hover:border-white/20"
                          )}
                        >
                          <img
                            src={item.src}
                            alt={item.alt}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
