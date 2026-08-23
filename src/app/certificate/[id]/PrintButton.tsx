"use client";

import React, { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export default function PrintButton({ config, userName, userBranch }: { config: any, userName: string, userBranch: string }) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    
    try {
      // 1. Create offscreen canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not get canvas context");

      // 2. Load the template image (need crossOrigin for Firebase Storage)
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = config.imageUrl;
      });

      // 3. Set dimensions to match original template
      canvas.width = img.naturalWidth || 1024;
      canvas.height = img.naturalHeight || 768;

      // 4. Draw Background
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Load fonts
      await (document as any).fonts.ready;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 5. Draw Name
      if (config.name?.visible && userName) {
        ctx.font = `italic 600 ${config.name.size}px 'Cormorant Garamond', Georgia, serif`;
        ctx.fillStyle = config.name.color;
        ctx.fillText(userName, config.name.x * canvas.width, config.name.y * canvas.height);
      }

      // 6. Draw Branch
      if (config.branch?.visible && userBranch) {
        ctx.font = `400 ${config.branch.size}px sans-serif`;
        ctx.fillStyle = config.branch.color;
        ctx.fillText(userBranch, config.branch.x * canvas.width, config.branch.y * canvas.height);
      }

      // 7. Convert to Blob and Download
      canvas.toBlob((blob) => {
        if (!blob) throw new Error("Canvas toBlob failed");
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Certificate_${userName.replace(/\s+/g, '_')}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        setDownloading(false);
      }, 'image/png', 1.0);

    } catch (err) {
      console.error(err);
      alert("Failed to download certificate. Please try again.");
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My Certificate',
          text: `Check out my certificate for participating in the event!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.log("Share failed or was cancelled.", err);
    }
  };

  return (
    <>
      <button 
        onClick={handleDownload}
        disabled={downloading}
        className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        {downloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
        {downloading ? "Downloading..." : "Download PNG"}
      </button>

      <button
        onClick={handleShare}
        className="px-6 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-colors flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share
      </button>
    </>
  );
}
