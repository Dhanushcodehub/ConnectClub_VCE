"use client";

import { useState } from "react";
import { UploadCloud, X, Loader2, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MediaUploaderProps {
  onUpload: (url: string) => void;
  className?: string;
  defaultMedia?: string;
}

export default function MediaUploader({ onUpload, className, defaultMedia }: MediaUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(defaultMedia || null);
  const [error, setError] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      setPreview(manualUrl.trim());
      onUpload(manualUrl.trim());
      setManualUrl("");
    }
  };

  const isVideoMedia = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes(".mp4") || lowerUrl.includes(".webm") || lowerUrl.includes(".ogg") || lowerUrl.includes("video") || lowerUrl.includes("alt=media");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Please upload an image or video file.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", file.type.startsWith("video/") ? "video" : "image");

    try {
      // Simulate progress for better UX since fetch doesn't support native upload progress easily
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
      }, 500);

      const res = await fetch(`/api/upload`, {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to upload file");
      }

      const data = await res.json();
      setProgress(100);
      setPreview(data.secure_url);
      onUpload(data.secure_url);
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const isVideo = preview ? (preview.includes(".mp4") || preview.includes(".webm") || preview.includes(".ogg") || (preview.includes("token=") && !preview.includes("image"))) : false;

  return (
    <div className={cn("flex flex-col border-2 border-dashed border-white/20 rounded-xl overflow-hidden hover:border-primary/50 transition-colors bg-white/5", className)}>
      
      {preview && !isUploading ? (
        <div className="relative flex-1 w-full group">
          {isVideo ? (
             <video src={preview} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : (
             <img src={preview} alt="Upload preview" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button 
              type="button"
              onClick={() => {
                setPreview(null);
                onUpload(""); 
              }}
              className="p-2 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        <label className="relative flex-1 flex flex-col items-center justify-center w-full cursor-pointer p-4 group">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
              <div className="text-xs font-medium text-white/80">{progress}%</div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <UploadCloud className="w-6 h-6 text-white/40 mb-2 group-hover:text-primary transition-colors" />
              <p className="text-xs font-medium text-white/60 group-hover:text-white/80">Click to upload media</p>
            </div>
          )}
          <input 
            type="file" 
            className="hidden" 
            accept="image/*,video/*" 
            onChange={handleFileChange}
            disabled={isUploading}
          />
        </label>
      )}

      {!preview && !isUploading && (
        <div className="border-t border-white/10 bg-black/20 p-2 relative z-20">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="url"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              placeholder="Or paste URL..."
              className="flex-1 bg-transparent border-none px-2 py-1 text-xs text-white placeholder-white/30 focus:outline-none"
            />
            <button 
              type="submit" 
              disabled={!manualUrl.trim()}
              className="bg-white/10 text-white px-3 py-1 rounded-md text-xs font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Link
            </button>
          </form>
        </div>
      )}

      {error && (
        <div className="absolute top-2 left-2 right-2 p-2 bg-red-500/90 text-white text-[10px] text-center rounded-md backdrop-blur-md z-30">
          {error}
        </div>
      )}
    </div>
  );
}
