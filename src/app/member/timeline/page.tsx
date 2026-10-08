"use client";

import { useEffect, useState, useRef } from "react";
import { getMilestones, addMilestone, updateMilestone, deleteMilestone, ConnectMilestone } from "@/lib/firebase/timeline";
import { Plus, Edit2, Trash2, X, Upload, Loader2, Image as ImageIcon, Film } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function MemberTimelinePage() {
  const [milestones, setMilestones] = useState<ConnectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    year: "",
    month: "",
    title: "",
    description: "",
    order: 0,
    mediaUrl: "",
    mediaType: "image" as "image" | "video"
  });
  
  // Upload State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMilestones();
  }, [user]);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const data = await getMilestones();
      setMilestones(data);
    } catch (error) {
      console.error("Error fetching milestones:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        await deleteMilestone(id);
        fetchMilestones();
      } catch (error) {
        console.error("Error deleting milestone:", error);
        alert("Failed to delete milestone.");
      }
    }
  };

  const handleOpenModal = (milestone?: ConnectMilestone) => {
    if (milestone) {
      setEditingId(milestone.id!);
      setFormData({
        year: milestone.year,
        month: milestone.month,
        title: milestone.title,
        description: milestone.description,
        order: milestone.order,
        mediaUrl: milestone.mediaUrl,
        mediaType: milestone.mediaType
      });
    } else {
      setEditingId(null);
      setFormData({
        year: new Date().getFullYear().toString(),
        month: "",
        title: "",
        description: "",
        order: milestones.length > 0 ? milestones[milestones.length - 1].order + 10 : 0,
        mediaUrl: "",
        mediaType: "image"
      });
    }
    setFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      if (selected.type.startsWith('video/')) {
        setFormData(prev => ({ ...prev, mediaType: 'video' }));
      } else {
        setFormData(prev => ({ ...prev, mediaType: 'image' }));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalMediaUrl = formData.mediaUrl;

      // 1. Upload File if selected
      if (file) {
        setIsUploading(true);
        const uploadData = new FormData();
        uploadData.append('file', file);
        uploadData.append('type', formData.mediaType);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: uploadData
        });

        if (!res.ok) throw new Error("Upload failed");
        
        const data = await res.json();
        finalMediaUrl = data.secure_url;
        setIsUploading(false);
      }

      if (!finalMediaUrl) {
        alert("Please upload an image or video.");
        setIsSaving(false);
        return;
      }

      const payload = {
        ...formData,
        mediaUrl: finalMediaUrl
      };

      // 2. Save to Firestore
      if (editingId) {
        await updateMilestone(editingId, payload);
      } else {
        await addMilestone(payload);
      }

      handleCloseModal();
      fetchMilestones();

    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save milestone.");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="relative">
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Manage Timeline</h1>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Milestone
          </button>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-white/50 font-medium">Loading timeline...</p>
            </div>
          ) : milestones.length === 0 ? (
            <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No milestones yet</h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">Your timeline is empty. Add your first milestone to start tracking the history of Connect Club.</p>
              <button 
                onClick={() => handleOpenModal()} 
                className="bg-white/5 text-white hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                Add First Milestone
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {milestones.map((milestone, index) => (
                <div key={milestone.id} className="flex gap-6 group">
                  {/* Timeline Node & Line */}
                  <div className="flex flex-col items-center pt-2">
                    <div className="w-12 h-12 rounded-full bg-[#0c0c0e] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-primary/50 group-hover:bg-primary/10 transition-all shadow-xl z-10 relative">
                       {milestone.mediaType === 'video' ? (
                          <Film className="w-5 h-5 text-primary" />
                       ) : (
                          <ImageIcon className="w-5 h-5 text-primary" />
                       )}
                    </div>
                    {/* Vertical connecting line - hidden on the very last item */}
                    {index !== milestones.length - 1 && (
                      <div className="w-px h-full bg-gradient-to-b from-white/10 to-transparent mt-4 mb-2"></div>
                    )}
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">{milestone.month} {milestone.year}</span>
                          <span className="text-[10px] font-medium text-white/30 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">Order: {milestone.order}</span>
                        </div>
                        <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">{milestone.title}</h3>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 bg-white/5 p-1 rounded-xl border border-white/5">
                        <button 
                          onClick={() => handleOpenModal(milestone)} 
                          className="p-2 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                          <span className="hidden md:inline">Edit</span>
                        </button>
                        <div className="w-px h-4 bg-white/10"></div>
                        <button 
                          onClick={() => handleDelete(milestone.id!, milestone.title)} 
                          className="p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {milestone.description && (
                      <p className="text-white/60 text-sm leading-relaxed max-w-3xl">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5">
                <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Milestone' : 'Add Milestone'}</h2>
                <button onClick={handleCloseModal} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Year</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. 2026"
                      value={formData.year}
                      onChange={e => setFormData({...formData, year: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Month/Label</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. August"
                      value={formData.month}
                      onChange={e => setFormData({...formData, month: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Title</label>
                  <input 
                    type="text" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    placeholder="e.g. Club Founded"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Description</label>
                  <textarea 
                    required
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors resize-none"
                    placeholder="Short description of the milestone..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Order (Chronological Sorting)</label>
                  <input 
                    type="number" 
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                    value={formData.order}
                    onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Media (Photo or Video)</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-white/10 hover:border-primary/50 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-white/[0.02]"
                  >
                    {file ? (
                      <div className="text-center">
                        <p className="text-white font-medium mb-1">{file.name}</p>
                        <p className="text-white/50 text-xs">Click to change</p>
                      </div>
                    ) : formData.mediaUrl ? (
                      <div className="text-center">
                        <p className="text-primary font-medium mb-1">Current Media Uploaded</p>
                        <p className="text-white/50 text-xs">Click to upload a new one</p>
                      </div>
                    ) : (
                      <div className="text-center flex flex-col items-center">
                        <Upload className="w-8 h-8 text-white/30 mb-3" />
                        <p className="text-white/70 font-medium mb-1">Upload Photo or Video</p>
                        <p className="text-white/40 text-xs">MP4, WEBM, JPG, PNG, GIF</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                </div>
                
                <div className="pt-4 flex justify-end gap-3 mt-auto">
                  <button 
                    type="button" 
                    onClick={handleCloseModal}
                    className="px-6 py-3 rounded-xl font-medium text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center shadow-lg shadow-primary/20 disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isUploading ? "Uploading..." : "Saving..."}
                      </>
                    ) : editingId ? "Update Milestone" : "Publish Milestone"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
