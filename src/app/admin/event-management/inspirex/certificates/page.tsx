"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { toast } from "sonner";
import { 
  Image as ImageIcon, 
  Settings2, 
  Save, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Type
} from "lucide-react";
import Link from "next/link";

interface TemplateConfig {
  imageUrl: string;
  name: { x: number; y: number; size: number; color: string; visible: boolean };
  branch: { x: number; y: number; size: number; color: string; visible: boolean };
}

const DEFAULT_CONFIG: TemplateConfig = {
  imageUrl: "",
  name: { x: 0.5, y: 0.4, size: 56, color: "#1a1a1a", visible: true },
  branch: { x: 0.5, y: 0.5, size: 24, color: "#666666", visible: true },
};

export default function CertificateStudio() {
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Real participant data for preview
  const [participants, setParticipants] = useState<any[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const eventId = "inspirex-s2";
  const templateDocRef = doc(db, "event_templates", eventId);

  // 1. Fetch Config and Participants
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Template
        const docSnap = await getDoc(templateDocRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data() as TemplateConfig);
          if (docSnap.data().imageUrl) {
            loadImage(docSnap.data().imageUrl);
          }
        }

        // Fetch Participants
        const res = await fetch("/api/inspirex-registrations");
        const data = await res.json();
        if (data.registrations && data.registrations.length > 0) {
          setParticipants(data.registrations);
        } else {
          // Fallback if no real users yet
          setParticipants([{ name: "John Doe", branch: "Computer Science - 3rd Year" }]);
        }
      } catch (err) {
        toast.error("Failed to load studio data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // Load Fonts for Canvas
    const font = new FontFace('Cormorant Garamond', "url(https://fonts.gstatic.com/s/cormorantgaramond/v16/co3YmX5slCNuHLi8bLeY9MK7whWMhyjYqXtKky2F7i6C34s.woff2)", { style: 'italic', weight: '600' });
    font.load().then(f => (document.fonts as any).add(f)).catch(console.error);
  }, []);

  const loadImage = (url: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      renderCanvas();
    };
    img.src = url;
  };

  // 2. Render Canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (imageRef.current) {
      canvas.width = imageRef.current.naturalWidth;
      canvas.height = imageRef.current.naturalHeight;
      ctx.drawImage(imageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      // Default empty canvas
      canvas.width = 1024;
      canvas.height = 768;
      ctx.fillStyle = "#f3f4f6";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#9ca3af";
      ctx.font = "30px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Upload Template Image", canvas.width / 2, canvas.height / 2);
    }

    const currentParticipant = participants[previewIndex] || { name: "Sample Name", branch: "Sample Branch" };

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw Name
    if (config.name.visible && currentParticipant.name) {
      ctx.font = `italic 600 ${config.name.size}px 'Cormorant Garamond', serif`;
      ctx.fillStyle = config.name.color;
      ctx.fillText(currentParticipant.name, config.name.x * canvas.width, config.name.y * canvas.height);
    }

    // Draw Branch
    if (config.branch.visible && currentParticipant.branch) {
      ctx.font = `400 ${config.branch.size}px sans-serif`;
      ctx.fillStyle = config.branch.color;
      ctx.fillText(currentParticipant.branch, config.branch.x * canvas.width, config.branch.y * canvas.height);
    }
  };

  // Re-render when config or preview index changes
  useEffect(() => {
    renderCanvas();
  }, [config, previewIndex]);

  // 3. Handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    try {
      // Use FileReader to get base64 string
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ file: base64String }),
          });

          if (!res.ok) {
             const errorData = await res.json().catch(() => ({}));
             throw new Error(errorData.error || "Upload failed");
          }
          
          const data = await res.json();
          const url = data.secure_url;
          
          setConfig(prev => ({ ...prev, imageUrl: url }));
          loadImage(url);
          toast.success("Template uploaded!");
        } catch (error: any) {
          toast.error("Upload failed: " + error.message);
        } finally {
          setUploading(false);
        }
      };
      reader.onerror = () => {
        toast.error("Failed to read file on client.");
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      toast.error("Upload process failed: " + error.message);
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!config.imageUrl) {
      toast.error("Please upload a template image first");
      return;
    }
    setSaving(true);
    try {
      await setDoc(templateDocRef, config);
      toast.success("Certificate Configuration Saved!");
    } catch (error) {
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Certificate Studio</h1>
          <p className="text-white/60 text-sm">Design and map dynamic fields for {eventId}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/event-management/${eventId.split('-')[0]}`} className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors">
            Back
          </Link>
          <button 
            onClick={handleSave}
            disabled={saving || !config.imageUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Sidebar Controls */}
        <div className="w-full lg:w-80 flex flex-col gap-6 overflow-y-auto pr-2 pb-10 custom-scrollbar">
          
          {/* Template Upload */}
          <div className="bg-[#111118] border border-white/5 p-5 rounded-xl">
            <h2 className="text-sm font-bold text-primary mb-4 flex items-center gap-2 uppercase tracking-wider">
              <ImageIcon className="w-4 h-4" /> Background Template
            </h2>
            <label className="block w-full border-2 border-dashed border-primary/30 hover:border-primary/60 bg-primary/5 rounded-lg p-6 text-center cursor-pointer transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              {uploading ? (
                <div className="flex flex-col items-center gap-2 text-primary">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm">Uploading...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-white/70">
                  <ImageIcon className="w-6 h-6 mb-1 text-primary" />
                  <span className="text-sm font-medium text-white">Click to upload image</span>
                  <span className="text-xs">PNG or JPG</span>
                </div>
              )}
            </label>
          </div>

          {/* Name Controls */}
          <div className="bg-[#111118] border border-white/5 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <Type className="w-4 h-4" /> Name Field
              </h2>
              <input 
                type="checkbox" 
                checked={config.name.visible} 
                onChange={(e) => setConfig({ ...config, name: { ...config.name, visible: e.target.checked } })}
                className="accent-primary w-4 h-4"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">X Position ({config.name.x.toFixed(2)})</label>
              <input type="range" min="0" max="1" step="0.01" value={config.name.x} 
                onChange={(e) => setConfig({ ...config, name: { ...config.name, x: parseFloat(e.target.value) } })}
                className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Y Position ({config.name.y.toFixed(2)})</label>
              <input type="range" min="0" max="1" step="0.01" value={config.name.y} 
                onChange={(e) => setConfig({ ...config, name: { ...config.name, y: parseFloat(e.target.value) } })}
                className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Size ({config.name.size}px)</label>
              <input type="range" min="10" max="150" step="1" value={config.name.size} 
                onChange={(e) => setConfig({ ...config, name: { ...config.name, size: parseInt(e.target.value) } })}
                className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Color</label>
              <input type="color" value={config.name.color} 
                onChange={(e) => setConfig({ ...config, name: { ...config.name, color: e.target.value } })}
                className="w-full h-10 rounded cursor-pointer bg-transparent border border-white/10 p-1" />
            </div>
          </div>

          {/* Branch Controls */}
          <div className="bg-[#111118] border border-white/5 p-5 rounded-xl space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-wider">
                <Type className="w-4 h-4" /> Branch Field
              </h2>
              <input 
                type="checkbox" 
                checked={config.branch.visible} 
                onChange={(e) => setConfig({ ...config, branch: { ...config.branch, visible: e.target.checked } })}
                className="accent-primary w-4 h-4"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">X Position ({config.branch.x.toFixed(2)})</label>
              <input type="range" min="0" max="1" step="0.01" value={config.branch.x} 
                onChange={(e) => setConfig({ ...config, branch: { ...config.branch, x: parseFloat(e.target.value) } })}
                className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Y Position ({config.branch.y.toFixed(2)})</label>
              <input type="range" min="0" max="1" step="0.01" value={config.branch.y} 
                onChange={(e) => setConfig({ ...config, branch: { ...config.branch, y: parseFloat(e.target.value) } })}
                className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Size ({config.branch.size}px)</label>
              <input type="range" min="10" max="100" step="1" value={config.branch.size} 
                onChange={(e) => setConfig({ ...config, branch: { ...config.branch, size: parseInt(e.target.value) } })}
                className="w-full accent-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-white/50 uppercase tracking-widest font-bold">Color</label>
              <input type="color" value={config.branch.color} 
                onChange={(e) => setConfig({ ...config, branch: { ...config.branch, color: e.target.value } })}
                className="w-full h-10 rounded cursor-pointer bg-transparent border border-white/10 p-1" />
            </div>
          </div>

        </div>

        {/* Live Preview Area */}
        <div className="flex-1 bg-[#111118] border border-white/5 rounded-2xl flex flex-col items-center justify-center overflow-hidden p-6 relative min-h-[500px]">
          
          <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur border border-white/10 px-4 py-2 rounded-full">
            <button 
              onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
              disabled={previewIndex === 0}
              className="text-white/70 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-xs font-bold whitespace-nowrap">
              Preview: {participants[previewIndex]?.name || "Sample"} ({previewIndex + 1}/{Math.max(1, participants.length)})
            </div>
            <button 
              onClick={() => setPreviewIndex(Math.min(participants.length - 1, previewIndex + 1))}
              disabled={previewIndex >= participants.length - 1}
              className="text-white/70 hover:text-white disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-auto custom-scrollbar">
            <canvas 
              ref={canvasRef} 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-sm border border-white/10"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
