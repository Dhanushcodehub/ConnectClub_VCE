"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Upload,
  X,
  Camera,
  Loader2,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type VerifyStatus = "idle" | "uploading" | "scanning" | "matched" | "mismatched";

interface RollNumberVerifyProps {
  rollNo: string;
  isVerified: boolean;
  onVerified: () => void;
}

/**
 * Normalizes a roll‑number string so we can do a reliable comparison.
 * Strips spaces, hyphens, dots, colons, and lowercases everything.
 */
function normalize(s: string): string {
  return s.replace(/[\s\-.:]/g, "").toUpperCase();
}

/**
 * Attempt to find the user's roll‑number inside the OCR text.
 * VCE roll numbers follow the pattern: 4 digits + 1‑2 letters + 2 digits + 2‑3 letters
 * e.g. 25881A05FC, 2288 1A05 FC, etc.
 */
function extractRollNumbers(text: string): string[] {
  const cleaned = text.replace(/[^A-Za-z0-9\n]/g, " ");
  // VCE / JNTUH pattern: 2-4 digits + 1-2 alpha + 2 digits + 2-3 alpha
  const re = /\b(\d{2,5}[A-Za-z]{1,2}\d{2}[A-Za-z]{2,4})\b/g;
  const matches: string[] = [];
  let m;
  while ((m = re.exec(cleaned)) !== null) {
    matches.push(m[1].toUpperCase());
  }
  return matches;
}

export function RollNumberVerify({
  rollNo,
  isVerified,
  onVerified,
}: RollNumberVerifyProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [status, setStatus] = useState<VerifyStatus>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [detectedRoll, setDetectedRoll] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setStatus("idle");
    setPreview(null);
    setDetectedRoll(null);
    setOcrProgress(0);
    setErrorMsg("");
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please upload an image file (JPEG, PNG, etc.).");
        return;
      }

      // Preview
      const url = URL.createObjectURL(file);
      setPreview(url);
      setStatus("uploading");
      setErrorMsg("");

      // Small delay to let the user see the preview render
      await new Promise((r) => setTimeout(r, 400));
      setStatus("scanning");

      try {
        const Tesseract = await import("tesseract.js");
        const {
          data: { text },
        } = await Tesseract.recognize(file, "eng", {
          logger: (info: { status: string; progress: number }) => {
            if (info.status === "recognizing text") {
              setOcrProgress(Math.round(info.progress * 100));
            }
          },
        });

        // Attempt to find the roll number
        const found = extractRollNumbers(text);
        const normalizedRoll = normalize(rollNo);

        const match = found.find((r) => normalize(r) === normalizedRoll);

        if (match) {
          setDetectedRoll(match);
          setStatus("matched");
          onVerified();
        } else {
          setDetectedRoll(found.length > 0 ? found[0] : null);
          setStatus("mismatched");
          setErrorMsg(
            found.length > 0
              ? `Detected "${found[0]}" which doesn't match your roll number "${rollNo}".`
              : "Could not detect any roll number from the ID card. Please upload a clearer image."
          );
        }
      } catch {
        setStatus("mismatched");
        setErrorMsg("OCR processing failed. Please try again with a clearer image.");
      }
    },
    [rollNo, onVerified]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  if (!rollNo) return null;

  /**
   * VCE / JNTUH roll numbers are exactly 10 characters.
   * e.g. 25881A05FC
   */
  const isRollComplete = rollNo.replace(/[\s\-.]/g, "").length >= 10;

  /* ── Incomplete roll number hint (always takes priority) ─────────────── */
  if (!isRollComplete) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
        <ShieldAlert className="w-3 h-3 text-white/25" />
        <span className="text-[10px] font-medium text-white/30 tracking-wide">
          Enter full roll no.
        </span>
      </span>
    );
  }

  /* ── Verified badge (compact green pill, inline with label) ──────────── */
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
          Verified
        </span>
      </span>
    );
  }

  return (
    <>
      {/* ── Verify trigger — obvious clickable pill button ─────────────── */}
      <button
        type="button"
        onClick={() => {
          reset();
          setIsModalOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 hover:border-amber-500/40 text-amber-400 hover:text-amber-300 transition-all cursor-pointer group"
      >
        <ShieldAlert className="w-3 h-3" />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          Verify
        </span>
      </button>

      {/* ── Verification Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md bg-[#111114] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Verify Roll Number
                    </h3>
                    <p className="text-[11px] text-white/40">
                      Upload your college ID card
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5">
                {/* Info: Roll number being verified */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] mb-4">
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">
                    Roll No:
                  </span>
                  <span className="text-[13px] font-bold text-white font-mono tracking-wide">
                    {rollNo}
                  </span>
                </div>

                {/* Upload / Preview Area */}
                <AnimatePresence mode="wait">
                  {status === "idle" && (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className="group relative flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed border-white/[0.08] hover:border-primary/40 bg-white/[0.01] hover:bg-primary/[0.03] transition-all cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-xl bg-white/[0.04] group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
                          <Upload className="w-5 h-5 text-white/30 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-[13px] font-medium text-white/60 group-hover:text-white/80 mb-1 transition-colors">
                          Drop your ID card image here
                        </p>
                        <p className="text-[11px] text-white/30">
                          or click to browse · JPG, PNG
                        </p>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileSelect(f);
                        }}
                      />
                    </motion.div>
                  )}

                  {(status === "uploading" || status === "scanning") && (
                    <motion.div
                      key="scanning"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      {/* Preview */}
                      {preview && (
                        <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border border-white/[0.06] mb-4">
                          <img
                            src={preview}
                            alt="ID Card"
                            className="w-full h-full object-contain bg-black/30"
                          />
                          {/* Scanning overlay */}
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
                            <div className="relative w-10 h-10 mb-3">
                              <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                            <p className="text-[12px] font-medium text-white/70 mb-1">
                              {status === "uploading"
                                ? "Preparing image..."
                                : "Scanning for roll number..."}
                            </p>
                            {status === "scanning" && (
                              <div className="w-36 h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden">
                                <motion.div
                                  className="h-full bg-primary rounded-full"
                                  initial={{ width: "0%" }}
                                  animate={{ width: `${ocrProgress}%` }}
                                  transition={{ duration: 0.2 }}
                                />
                              </div>
                            )}
                          </div>
                          {/* Scan line animation */}
                          <motion.div
                            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
                            initial={{ top: "0%" }}
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{
                              duration: 2.5,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}

                  {status === "matched" && (
                    <motion.div
                      key="matched"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      {preview && (
                        <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border-2 border-emerald-500/30 mb-4">
                          <img
                            src={preview}
                            alt="ID Card"
                            className="w-full h-full object-contain bg-black/30"
                          />
                          <div className="absolute inset-0 bg-emerald-500/5" />
                        </div>
                      )}

                      <div className="flex flex-col items-center py-2">
                        <div className="w-11 h-11 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-sm font-bold text-emerald-400 mb-1">
                          Roll Number Verified!
                        </p>
                        <div className="flex items-center gap-2 text-[12px] text-white/50">
                          <span>Detected:</span>
                          <span className="font-mono font-bold text-white">
                            {detectedRoll}
                          </span>
                          <span className="text-emerald-400">✓ Match</span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {status === "mismatched" && (
                    <motion.div
                      key="mismatched"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      {preview && (
                        <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border-2 border-red-500/30 mb-4">
                          <img
                            src={preview}
                            alt="ID Card"
                            className="w-full h-full object-contain bg-black/30"
                          />
                          <div className="absolute inset-0 bg-red-500/5" />
                        </div>
                      )}

                      <div className="flex flex-col items-center py-2">
                        <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center mb-3">
                          <XCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm font-bold text-red-400 mb-1.5">
                          Verification Failed
                        </p>
                        <p className="text-[12px] text-white/40 text-center leading-relaxed max-w-xs mb-4">
                          {errorMsg}
                        </p>
                        <button
                          type="button"
                          onClick={reset}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white text-[12px] font-medium transition-all border border-white/[0.06]"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Try Again
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer — only on matched state */}
              {status === "matched" && (
                <div className="px-5 py-3.5 border-t border-white/[0.06] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-[12px] font-bold transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
