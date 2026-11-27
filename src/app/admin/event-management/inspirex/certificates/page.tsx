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
  Type,
  Send
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { issueInspirexCertificates } from "../issue-action";

interface TemplateConfig {
  imageUrl: string;
  name: { x: number; y: number; size: number; color: string; visible: boolean };
  branch: { x: number; y: number; size: number; color: string; visible: boolean };
}

interface Participant {
  id?: string;
  name: string;
  rollNo?: string;
  email?: string;
  branch?: string;
  year?: string;
  section?: string;
  morningAttendance?: boolean;
  afternoonAttendance?: boolean;
  [key: string]: any;
}

function formatBranchYear(branch?: string, year?: string): string {
  const b = branch?.trim() || "";
  const y = year?.trim() || "";
  if (b && y) {
    if (b.toLowerCase().includes(y.toLowerCase())) {
      return b;
    }
    return `${b} - ${y}`;
  }
  return b || y || "";
}

function isColorDark(hexOrRgb: string): boolean {
  if (!hexOrRgb) return true;
  if (hexOrRgb.startsWith("#")) {
    const hex = hexOrRgb.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
  }
  return true;
}

function getRepresentativeColor(
  colors: [number, number, number][],
  isDarkText: boolean
): [number, number, number] {
  if (colors.length === 0) return isDarkText ? [255, 255, 255] : [17, 17, 24];
  
  const sorted = [...colors].sort((a, b) => {
    const lumA = 0.299 * a[0] + 0.587 * a[1] + 0.114 * a[2];
    const lumB = 0.299 * b[0] + 0.587 * b[1] + 0.114 * b[2];
    return isDarkText ? lumB - lumA : lumA - lumB;
  });

  const bestHalf = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  const avg = bestHalf.reduce(
    (acc, c) => [acc[0] + c[0], acc[1] + c[1], acc[2] + c[2]],
    [0, 0, 0]
  );
  return [
    Math.round(avg[0] / bestHalf.length),
    Math.round(avg[1] / bestHalf.length),
    Math.round(avg[2] / bestHalf.length),
  ];
}

function getAreaBackgroundColor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  h: number,
  canvasWidth: number,
  canvasHeight: number,
  textColor: string
): { topColor: string; bottomColor: string } {
  const isDark = isColorDark(textColor);
  const fallback = isDark ? "rgb(255, 255, 255)" : "rgb(17, 17, 24)";

  try {
    const halfW = w / 2;
    const halfH = h / 2;
    
    const yTop = Math.max(0, Math.min(canvasHeight - 1, Math.round(cy - halfH - 4)));
    const yBottom = Math.max(0, Math.min(canvasHeight - 1, Math.round(cy + halfH + 4)));
    
    const samplePointsX = [
      Math.round(cx - halfW * 0.4),
      Math.round(cx - halfW * 0.2),
      Math.round(cx),
      Math.round(cx + halfW * 0.2),
      Math.round(cx + halfW * 0.4),
    ].filter((x) => x >= 0 && x < canvasWidth);

    const topColors: [number, number, number][] = [];
    const bottomColors: [number, number, number][] = [];

    for (const sx of samplePointsX) {
      const pTop = ctx.getImageData(sx, yTop, 1, 1).data;
      if (pTop && pTop[3] > 128) {
        topColors.push([pTop[0], pTop[1], pTop[2]]);
      }
      const pBot = ctx.getImageData(sx, yBottom, 1, 1).data;
      if (pBot && pBot[3] > 128) {
        bottomColors.push([pBot[0], pBot[1], pBot[2]]);
      }
    }

    if (topColors.length === 0 && bottomColors.length === 0) {
      return { topColor: fallback, bottomColor: fallback };
    }

    const avgTop = getRepresentativeColor(topColors, isDark);
    const avgBot = getRepresentativeColor(bottomColors, isDark);

    return {
      topColor: `rgb(${avgTop[0]}, ${avgTop[1]}, ${avgTop[2]})`,
      bottomColor: `rgb(${avgBot[0]}, ${avgBot[1]}, ${avgBot[2]})`,
    };
  } catch {
    return { topColor: fallback, bottomColor: fallback };
  }
}

function drawSoftCover(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  topColor: string,
  bottomColor: string
) {
  ctx.save();

  // Create vertical gradient matching the sampled top and bottom background
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);

  ctx.fillStyle = grad;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));

  ctx.restore();
}

function coverPlaceholderAreas(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  config: TemplateConfig
) {
  const cw = canvas.width;
  const ch = canvas.height;

  // 1. Cover Name Placeholder ("John Doe")
  // Center is determined by the template default (0.5, 0.4) and the config slider
  const minNameX = Math.min(0.5 * cw, config.name.x * cw);
  const maxNameX = Math.max(0.5 * cw, config.name.x * cw);
  const minNameY = Math.min(0.4 * ch, config.name.y * ch);
  const maxNameY = Math.max(0.4 * ch, config.name.y * ch);

  const nameBoxH = Math.max(config.name.size * 1.5, ch * 0.08);
  const nameBoxW = Math.min(cw * 0.70, Math.max(config.name.size * 9, cw * 0.54));

  const nameLeft = Math.max(0, minNameX - nameBoxW / 2);
  const nameRight = Math.min(cw, maxNameX + nameBoxW / 2);
  const nameTop = Math.max(0, minNameY - nameBoxH / 2);
  const nameBottom = Math.min(ch, maxNameY + nameBoxH / 2);

  const nameW = nameRight - nameLeft;
  const nameH = nameBottom - nameTop;
  const nameCenterX = (nameLeft + nameRight) / 2;
  const nameCenterY = (nameTop + nameBottom) / 2;

  const nameBg = getAreaBackgroundColor(
    ctx,
    nameCenterX,
    nameCenterY,
    nameW,
    nameH,
    cw,
    ch,
    config.name.color
  );

  drawSoftCover(ctx, nameLeft, nameTop, nameW, nameH, nameBg.topColor, nameBg.bottomColor);

  // 2. Cover Branch Placeholder ("Computer Science - 3rd Year")
  // Center is determined by the template default (0.5, 0.5) and the config slider
  const minBranchX = Math.min(0.5 * cw, config.branch.x * cw);
  const maxBranchX = Math.max(0.5 * cw, config.branch.x * cw);
  const minBranchY = Math.min(0.5 * ch, config.branch.y * ch);
  const maxBranchY = Math.max(0.5 * ch, config.branch.y * ch);

  const branchBoxH = Math.max(config.branch.size * 1.6, ch * 0.05);
  const branchBoxW = Math.min(cw * 0.72, Math.max(config.branch.size * 22, cw * 0.56));

  const branchLeft = Math.max(0, minBranchX - branchBoxW / 2);
  const branchRight = Math.min(cw, maxBranchX + branchBoxW / 2);
  const branchTop = Math.max(0, minBranchY - branchBoxH / 2);
  const branchBottom = Math.min(ch, maxBranchY + branchBoxH / 2);

  const branchW = branchRight - branchLeft;
  const branchH = branchBottom - branchTop;
  const branchCenterX = (branchLeft + branchRight) / 2;
  const branchCenterY = (branchTop + branchBottom) / 2;

  const branchBg = getAreaBackgroundColor(
    ctx,
    branchCenterX,
    branchCenterY,
    branchW,
    branchH,
    cw,
    ch,
    config.branch.color
  );

  drawSoftCover(ctx, branchLeft, branchTop, branchW, branchH, branchBg.topColor, branchBg.bottomColor);
}

const DEFAULT_CONFIG: TemplateConfig = {
  imageUrl: "",
  name: { x: 0.5, y: 0.4, size: 56, color: "#1a1a1a", visible: true },
  branch: { x: 0.5, y: 0.5, size: 24, color: "#666666", visible: true },
};

export default function CertificateStudio() {
  const { user } = useAuth();
  const [config, setConfig] = useState<TemplateConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [issuing, setIssuing] = useState(false);
  
  // Real participant data for preview
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const eventId = "inspirex-s2";
  const templateDocRef = doc(db, "event_templates", eventId);

  // 1. Fetch Config and Participants
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fetch Template
        const docSnap = await getDoc(templateDocRef);
        if (docSnap.exists() && isMounted) {
          const tplData = docSnap.data() as TemplateConfig;
          setConfig(tplData);
          if (tplData.imageUrl) {
            loadImage(tplData.imageUrl);
          }
        }

        // Fetch Participants
        const token = await user?.getIdToken();
        const res = await fetch("/api/inspirex-registrations", {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load registrations");
        }

        if (isMounted) {
          const allRegistrations: Participant[] = Array.isArray(data.data) ? data.data : [];
          const attendedParticipants = allRegistrations.filter(
            (reg) => reg.morningAttendance === true || reg.afternoonAttendance === true
          );
          setParticipants(attendedParticipants);
          setPreviewIndex(0);
        }
      } catch (err) {
        toast.error("Failed to load studio data");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Load Fonts for Canvas reliably using Google Fonts CSS
  useEffect(() => {
    const fontLinkId = 'cormorant-garamond-font';
    if (!document.getElementById(fontLinkId)) {
      const link = document.createElement('link');
      link.id = fontLinkId;
      link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@1,600&display=swap';
      link.rel = 'stylesheet';
      document.head.appendChild(link);

      // Force browser to load the font by applying it to a hidden element
      const div = document.createElement('div');
      div.style.fontFamily = "'Cormorant Garamond', serif";
      div.style.fontStyle = 'italic';
      div.style.fontWeight = '600';
      div.style.position = 'absolute';
      div.style.visibility = 'hidden';
      div.innerText = 'preload';
      document.body.appendChild(div);
      
      document.fonts.ready.then(() => {
        renderCanvas();
      }).catch(console.error);
    }
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

      // Cleanly remove/cover baked-in placeholder text ("John Doe" and "Computer Science - 3rd Year")
      coverPlaceholderAreas(ctx, canvas, config);
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

    const currentParticipant = participants[previewIndex];
    if (!currentParticipant) return;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Draw Name
    if (config.name.visible && currentParticipant.name) {
      ctx.font = `italic 600 ${config.name.size}px 'Cormorant Garamond', serif`;
      ctx.fillStyle = config.name.color;
      ctx.fillText(currentParticipant.name, config.name.x * canvas.width, config.name.y * canvas.height);
    }

    // Draw Branch / Year
    const branchInfo = formatBranchYear(currentParticipant.branch, currentParticipant.year);
    if (config.branch.visible && branchInfo) {
      ctx.font = `400 ${config.branch.size}px sans-serif`;
      ctx.fillStyle = config.branch.color;
      ctx.fillText(branchInfo, config.branch.x * canvas.width, config.branch.y * canvas.height);
    }
  };

  // Re-render when config, preview index, or participants change
  useEffect(() => {
    renderCanvas();
  }, [config, previewIndex, participants]);

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

  const handleIssueCertificates = async () => {
    if (!config.imageUrl) {
      toast.error("Please save a template first");
      return;
    }
    
    if (!window.confirm(`Issue certificates to ${participants.length} participants?`)) {
      return;
    }

    setIssuing(true);
    try {
      const result = await issueInspirexCertificates();
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error("Error issuing certificates: " + error.message);
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white">Certificate Studio</h1>
          <p className="text-white/60 text-sm">Design and issue certificates for {eventId}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <button 
            onClick={handleIssueCertificates}
            disabled={issuing || !config.imageUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {issuing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Issue Certificates
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
          
          {participants.length > 0 ? (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-3 bg-black/50 backdrop-blur border border-white/10 px-4 py-2 rounded-full">
              <button 
                onClick={() => setPreviewIndex((prev) => Math.max(0, prev - 1))}
                disabled={previewIndex === 0}
                className="text-white/70 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Previous participant"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-xs font-bold whitespace-nowrap text-white">
                Preview: {participants[previewIndex]?.name} ({previewIndex + 1}/{participants.length})
              </div>
              <button 
                onClick={() => setPreviewIndex((prev) => Math.min(participants.length - 1, prev + 1))}
                disabled={previewIndex >= participants.length - 1}
                className="text-white/70 hover:text-white disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                aria-label="Next participant"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur border border-amber-500/30 text-amber-300 px-4 py-2 rounded-full text-xs font-medium">
              No attended participants found for InspireX.
            </div>
          )}

          {participants.length === 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-black/75 backdrop-blur border border-amber-500/30 text-amber-300 text-xs px-4 py-2 rounded-full shadow-lg pointer-events-none whitespace-nowrap">
              No attended participants found for InspireX.
            </div>
          )}

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
