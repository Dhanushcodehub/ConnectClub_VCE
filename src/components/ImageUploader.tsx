"use client";

import { useState } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  className?: string;
  defaultImage?: string;
}

export default function ImageUploader({ onUpload, className, defaultImage }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(defaultImage || null);
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      // Compress and convert to Base64 Data URL to completely bypass Firebase Storage
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality to ensure it fits well under Firestore's 1MB limit
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          
          // Verify size (Firestore limit is 1MB, let's keep it under 800KB just in case)
          const sizeInBytes = Math.round((dataUrl.length * 3) / 4);
          if (sizeInBytes > 800 * 1024) {
            setError("Image is too complex/large even after compression. Please use a simpler image or paste a URL.");
            setIsUploading(false);
            return;
          }

          setProgress(100);
          setPreview(dataUrl);
          onUpload(dataUrl);
          setIsUploading(false);
        };
      };
      
      reader.onerror = () => {
        throw new Error("Failed to read file");
      };
    } catch (err: any) {
      console.error("Compression failed:", err);
      setError(`Upload failed: ${err.message || "Unknown error"}`);
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-3 w-full">
      <div className={cn("relative group border-2 border-dashed border-white/10 rounded-xl overflow-hidden hover:border-primary/40 transition-all bg-white/[0.02] flex flex-col justify-center", className || "h-48")}>
        
        {preview && !isUploading ? (
          <div className="relative w-full h-full">
            <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button 
                type="button"
                onClick={() => {
                  setPreview(null);
                  onUpload(""); // clear it
                }}
                className="p-3 bg-red-500/90 text-white rounded-full hover:scale-110 hover:bg-red-500 transition-all shadow-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-6">
            {isUploading ? (
              <div className="flex flex-col items-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
                <div className="text-sm font-medium text-white/80">{progress}%</div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3 group-hover:bg-primary/10 transition-colors">
                  <UploadCloud className="w-6 h-6 text-white/40 group-hover:text-primary transition-colors" />
                </div>
                <p className="text-sm font-medium text-white/80 mb-1">Click to upload image</p>
                <p className="text-xs text-white/40">PNG, JPG up to 5MB</p>
              </div>
            )}
            <input 
              type="file" 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </label>
        )}

        {error && (
          <div className="absolute top-2 left-2 right-2 p-2 bg-red-500/90 text-white text-xs text-center rounded-lg backdrop-blur-md shadow-lg">
            {error}
          </div>
        )}
      </div>

      {!preview && !isUploading && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualSubmit(e);
              }
            }}
            placeholder="Or paste an image URL..."
            className="flex-1 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
          />
          <button 
            type="button" 
            onClick={handleManualSubmit}
            className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/20 px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 flex items-center justify-center"
          >
            Set URL
          </button>
        </div>
      )}
    </div>
  );
}
