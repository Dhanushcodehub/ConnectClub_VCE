"use client";

import { useState, useRef, useCallback, useEffect } from "react";
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
 * Fix the characters OCR most commonly confuses before comparing, so a
 * legible ID card doesn't fail verification over a misread glyph:
 * O/Q↔0, I/L/T↔1, S↔5, B↔8, Z↔2 inside the digit positions.
 */
function ocrNormalize(s: string): string {
  return normalize(s)
    .replace(/O/g, "0")
    .replace(/Q/g, "0")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/S/g, "5")
    .replace(/B/g, "8")
    .replace(/Z/g, "2");
}

/**
 * A normalized string matches the target when equal either before or after
 * OCR-confusion correction (two-way, since either side may be misread).
 */
function rollsMatch(detected: string, target: string): boolean {
  const a = normalize(detected);
  const b = normalize(target);
  return a === b || ocrNormalize(a) === ocrNormalize(b);
}

/**
 * Attempt to find roll numbers inside the OCR text.
 * Covers:
 * 1. Vardhaman / JNTUH patterns (e.g. 22881A0501, 23885A0412, 22881A05FC)
 * 2. OU / Osmania 10-12 digit numbers (e.g. 160223733001)
 * 3. General college roll number tokens (9-12 alphanumeric characters)
 */
function extractRollNumbers(text: string): string[] {
  const cleaned = text.replace(/[^A-Za-z0-9\n]/g, " ");
  // JNTUH / Vardhaman: 2-5 digits + 1-2 alpha + 2 digits + 2-3 alphanumeric
  // OU: 10-12 consecutive digits
  // General: 9-12 alphanumeric token
  const patterns = [
    /\b(\d{2,5}[A-Za-z]{1,2}\d{2}[A-Za-z0-9]{2,4})\b/g,
    /\b(\d{10,12})\b/g,
    /\b([0-9A-Za-z]{9,12})\b/g
  ];
  
  const matches = new Set<string>();
  for (const re of patterns) {
    let m;
    while ((m = re.exec(cleaned)) !== null) {
      matches.add(m[1].toUpperCase());
    }
  }
  return Array.from(matches);
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
  const objectUrlRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setStatus("idle");
    setPreview(null);
    setDetectedRoll(null);
    setOcrProgress(0);
    setErrorMsg("");
  }, []);

  // Release the blob URL when the component unmounts.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Please upload an image file (JPEG, PNG, etc.).");
        return;
      }

      // Preview. revokeObjectURL on unmount/removal so blob memory is freed.
      const url = URL.createObjectURL(file);
      objectUrlRef.current = url;
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

        // 1. Check direct normalized substring match (handles spaced, hyphenated, or formatted text)
        const normTarget = normalize(rollNo);
        const ocrTarget = ocrNormalize(rollNo);
        const normText = normalize(text);
        const ocrText = ocrNormalize(text);

        const directMatch = (normTarget && normText.includes(normTarget)) ||
                            (ocrTarget && ocrText.includes(ocrTarget));

        // 2. Also check extracted tokens with OCR confusion tolerance
        const found = extractRollNumbers(text);
        const tokenMatch = found.find((r) => rollsMatch(r, rollNo));

        const matchedRoll = directMatch ? rollNo.toUpperCase() : tokenMatch;

        if (matchedRoll) {
          setDetectedRoll(matchedRoll);
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
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800 border border-zinc-700">
        <ShieldAlert className="w-3 h-3 text-zinc-400" />
        <span className="text-[10px] font-semibold text-zinc-300 tracking-wide">
          Enter full roll no.
        </span>
      </span>
    );
  }

  /* ── Verified badge (compact green pill, inline with label) ──────────── */
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-600 shadow-sm">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
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
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950 hover:bg-amber-900 border border-amber-600 hover:border-amber-500 text-amber-200 hover:text-white transition-all cursor-pointer group shadow-sm"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          Verify ID Card
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
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-md bg-[#121217] border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-purple-950 border border-purple-700 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-purple-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Verify Roll Number
                    </h3>
                    <p className="text-[11px] text-zinc-300">
                      Upload your official college ID card
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors border border-zinc-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5">
                {/* Info: Roll number being verified */}
                <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 mb-4">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Target Roll No:
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
                        className="group relative flex flex-col items-center justify-center py-10 px-4 rounded-xl border-2 border-dashed border-zinc-700 hover:border-primary bg-zinc-900/60 hover:bg-zinc-900 transition-all cursor-pointer shadow-inner"
                      >
                        <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 group-hover:border-primary flex items-center justify-center mb-3 transition-colors shadow-sm">
                          <Upload className="w-5 h-5 text-zinc-300 group-hover:text-primary transition-colors" />
                        </div>
                        <p className="text-[13px] font-bold text-zinc-100 group-hover:text-white mb-1 transition-colors">
                          Drop your ID card photo here
                        </p>
                        <p className="text-[11px] text-zinc-400 font-medium">
                          or click to browse from device · JPG, PNG
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
                        <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border border-zinc-700 mb-4 bg-black">
                          <img
                            src={preview}
                            alt="ID Card"
                            className="w-full h-full object-contain"
                          />
                          {/* Scanning overlay */}
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                            <div className="relative w-10 h-10 mb-3">
                              <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            </div>
                            <p className="text-[12px] font-bold text-white mb-1">
                              {status === "uploading"
                                ? "Preparing image..."
                                : "Scanning for roll number with OCR..."}
                            </p>
                            {status === "scanning" && (
                              <div className="w-40 h-1.5 rounded-full bg-zinc-800 border border-zinc-700 mt-2 overflow-hidden">
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
                        <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border-2 border-emerald-500 mb-4 bg-black">
                          <img
                            src={preview}
                            alt="ID Card"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mb-3 shadow-md">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        </div>
                        <p className="text-base font-bold text-emerald-400 mb-1">
                          Roll Number Verified!
                        </p>
                        <div className="flex items-center gap-2 text-xs text-zinc-300">
                          <span>Detected on card:</span>
                          <span className="font-mono font-bold text-white bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">
                            {detectedRoll}
                          </span>
                          <span className="text-emerald-400 font-bold">✓ Match</span>
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
                        <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden border-2 border-red-500 mb-4 bg-black">
                          <img
                            src={preview}
                            alt="ID Card"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="flex flex-col items-center py-2">
                        <div className="w-12 h-12 rounded-full bg-red-950 border border-red-500 flex items-center justify-center mb-3 shadow-md">
                          <XCircle className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-base font-bold text-red-400 mb-1.5">
                          Verification Failed
                        </p>
                        <p className="text-xs text-zinc-300 text-center leading-relaxed max-w-xs mb-4">
                          {errorMsg}
                        </p>
                        <button
                          type="button"
                          onClick={reset}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-all border border-zinc-600 shadow-sm"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
                          Try Again
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer — only on matched state */}
              {status === "matched" && (
                <div className="px-5 py-3.5 border-t border-zinc-800 flex justify-end bg-zinc-900/50">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-primary hover:bg-purple-600 text-white text-xs font-bold transition-colors shadow-md"
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
