"use client";

import { useState, useRef, useEffect } from "react";
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/lib/contexts/AuthContext";
import imageCompression from 'browser-image-compression';
import { UploadCloud, X, Image as ImageIcon, Images, Film, Loader2, Trash2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

const categories = ["Workshops", "Hackathons", "Guest Talks", "Competitions", "Team Moments"];

export default function MemberGalleryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Form State
  const [category, setCategory] = useState(categories[0]);
  const [album, setAlbum] = useState("");
  const [alt, setAlt] = useState("");
  const [featured, setFeatured] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch Items
  const fetchItems = async () => {
    try {
      const q = query(collection(db, "gallery_media"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (error) {
      console.error("Error fetching gallery items:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchItems();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreview(objectUrl);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      
      const objectUrl = URL.createObjectURL(droppedFile);
      setPreview(objectUrl);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setAlbum("");
    setAlt("");
    setFeatured(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const [debugLog, setDebugLog] = useState<string>("");

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) {
      setDebugLog("No file or user.");
      return;
    }

    setUploading(true);
    setProgress(0);
    setDebugLog("Starting upload process...");

    try {
      const isVideo = file.type.startsWith('video/');
      const fileType: "image" | "video" = isVideo ? "video" : "image";
      
      let uploadFile = file;

      setDebugLog("Checking compression...");
      // Compress if Image
      if (!isVideo) {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1920,
          useWebWorker: false,
        };
        try {
          setDebugLog("Compressing image...");
          uploadFile = await imageCompression(file, options);
          setDebugLog("Compression complete.");
        } catch (error: any) {
          console.error("Compression error:", error);
          setDebugLog(`Compression error: ${error.message}`);
        }
      }

      setDebugLog("Starting secure upload to Cloudinary...");
      
      try {
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('type', fileType);

        // Upload to our secure API route
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Backend Error Details:", errorData.details);
          throw new Error(errorData.details || errorData.error || 'Upload failed');
        }

        const uploadResult = await response.json();
        const downloadURL = uploadResult.secure_url;
        
        setProgress(100);
        setDebugLog('Upload complete. Saving to database...');
        
        const mediaData: any = {
          type: fileType,
          src: downloadURL,
          category,
          alt: alt || "Gallery Media",
          featured,
          createdAt: serverTimestamp(),
          publicId: uploadResult.public_id // Save public_id instead of storagePath
        };

        if (isVideo) {
          mediaData.videoUrl = downloadURL;
          mediaData.src = downloadURL.replace(/\.(mp4|mov|webm|avi)$/i, ".jpg");
        }

        if (album.trim()) {
          mediaData.album = album.trim();
        }

        await addDoc(collection(db, "gallery_media"), mediaData);
        
        setUploading(false);
        resetForm();
        fetchItems();
        setDebugLog('');
        alert("Upload successful!");
      } catch (error: any) {
        console.error("Upload failed:", error);
        setUploading(false);
        setDebugLog(`Upload failed: ${error.message}`);
        alert(`Failed to upload file: ${error.message}`);
      }


    } catch (error) {
      console.error("Error during upload process:", error);
      setUploading(false);
      alert("An error occurred during upload.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this media item?")) {
      try {
        await deleteDoc(doc(db, "gallery_media", id));
        fetchItems();
      } catch (error) {
        console.error("Error deleting item:", error);
        alert("Failed to delete item.");
      }
    }
  };

  return (
    <div className="pb-12">
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-20">
        <h1 className="text-2xl font-bold text-white">Gallery Management</h1>
      </header>

      <div className="p-8 max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Upload Form - 1 Column on Desktop */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card border border-white/5 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-primary" />
              Upload New Media
            </h2>

            <form onSubmit={handleUpload} className="space-y-5">
              
              {/* Drag & Drop Area */}
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                  preview ? "border-primary/50 bg-primary/5" : "border-white/10 hover:border-white/30 hover:bg-white/[0.02]"
                )}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*,video/*" 
                  className="hidden" 
                />
                
                {preview ? (
                  <div className="relative w-full aspect-video rounded-lg overflow-hidden group">
                    {file?.type.startsWith('video/') ? (
                      <video src={preview} className="w-full h-full object-cover" />
                    ) : (
                      <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white font-medium text-sm">Click to change file</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                      <UploadCloud className="w-8 h-8 text-white/40" />
                    </div>
                    <p className="text-white font-medium mb-1">Click or drag file to this area to upload</p>
                    <p className="text-xs text-white/40">Supports JPG, PNG, WEBP and MP4 (Max 50MB)</p>
                  </>
                )}
              </div>

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-white/60">
                    <span>Uploading...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="text-[10px] text-yellow-500 font-mono mt-1 break-words">
                    Debug: {debugLog}
                  </div>
                </div>
              )}

              {/* Meta fields */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div>
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2 block">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={uploading}
                    className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all appearance-none"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2 block">Album Name (Optional)</label>
                  <input 
                    type="text" 
                    value={album}
                    onChange={(e) => setAlbum(e.target.value)}
                    disabled={uploading}
                    placeholder="e.g. InspireX 2023"
                    className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-white/60 uppercase tracking-wider mb-2 block">Alt Text</label>
                  <input 
                    type="text" 
                    value={alt}
                    onChange={(e) => setAlt(e.target.value)}
                    disabled={uploading}
                    placeholder="Describe the image"
                    className="w-full bg-[#0C0C0E]/60 border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50 transition-all"
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    disabled={uploading}
                    className="w-5 h-5 rounded border border-white/20 bg-white/5 checked:bg-primary checked:border-primary focus:ring-primary focus:ring-offset-black transition-all cursor-pointer"
                  />
                  <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Mark as Featured</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!file || uploading}
                className="w-full py-3.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Upload Media
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Media - 2 Columns on Desktop */}
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-card border border-white/5 rounded-3xl p-6 min-h-[600px]">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Images className="w-5 h-5 text-primary" />
              Manage Gallery Items
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/40">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>Loading gallery items...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-white/10 rounded-2xl text-white/40">
                <Images className="w-12 h-12 mb-4 opacity-20" />
                <p>No media uploaded yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {items.map((item) => (
                  <div key={item.id} className="group relative aspect-square rounded-xl overflow-hidden bg-black border border-white/10">
                    {item.type === "video" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                        <Film className="w-10 h-10 text-white/20 mb-2" />
                        <span className="text-xs text-white/40 font-medium">Video File</span>
                      </div>
                    ) : (
                      <img src={item.src} alt={item.alt} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-[10px] font-bold text-white tracking-wider uppercase border border-white/10">
                          {item.category}
                        </span>
                        {item.featured && (
                          <span className="px-2 py-0.5 rounded-md bg-primary/80 backdrop-blur-md text-[10px] font-bold text-white tracking-wider uppercase">
                            Featured
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-red-500/80 hover:bg-red-500 text-white backdrop-blur-md transition-colors translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-2 left-2 right-2">
                        {item.album && <p className="text-[10px] text-primary font-bold tracking-wider uppercase truncate">{item.album}</p>}
                        <p className="text-xs text-white font-medium truncate">{item.alt}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
