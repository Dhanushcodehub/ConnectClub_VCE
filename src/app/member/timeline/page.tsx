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

        <div className="p-8">
          <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-white/50 text-sm">
                  <th className="px-6 py-4 font-medium">Order</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Title</th>
                  <th className="px-6 py-4 font-medium">Media</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-white/50">Loading milestones...</td>
                  </tr>
                ) : milestones.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-white/50">No milestones found.</td>
                  </tr>
                ) : (
                  milestones.map((milestone) => (
                    <tr key={milestone.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white/50">{milestone.order}</td>
                      <td className="px-6 py-4 text-white/80 font-medium">
                        {milestone.month} {milestone.year}
                      </td>
                      <td className="px-6 py-4">{milestone.title}</td>
                      <td className="px-6 py-4">
                         {milestone.mediaType === 'video' ? (
                            <Film className="w-5 h-5 text-primary" />
                         ) : (
                            <ImageIcon className="w-5 h-5 text-primary" />
                         )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleOpenModal(milestone)} className="p-2 text-white/50 hover:text-white transition-colors inline-flex" aria-label="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(milestone.id!, milestone.title)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors ml-2" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
