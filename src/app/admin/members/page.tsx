"use client";

import { useEffect, useState } from "react";
import { getMembers, addMember, updateMember, deleteMember, ConnectMember, MemberTier } from "@/lib/firebase/members";
import { Plus, Edit2, Trash2, X, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";

const TIERS: MemberTier[] = ["Executive Board", "Core Team", "Volunteers", "Alumni"];
const DEPARTMENTS = ["Tech & Innovation", "PR & Outreach", "Design", "Event Management", "Other"];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<ConnectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form State
  const [formData, setFormData] = useState<Omit<ConnectMember, "id">>({
    name: "",
    position: "",
    tier: "Core Team",
    department: "",
    rollNo: "",
    linkedinUrl: "",
    instaUrl: "",
    imageUrl: "",
    order: 0,
    email: "",
    permissions: []
  });
  const [newPassword, setNewPassword] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, [user]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const data = await getMembers();
      setMembers(data);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete member "${name}"?`)) {
      try {
        await deleteMember(id);
        fetchMembers();
      } catch (error) {
        console.error("Error deleting member:", error);
        alert("Failed to delete member.");
      }
    }
  };

  const handleOpenModal = (member?: ConnectMember) => {
    if (member) {
      setEditingId(member.id!);
      setFormData({
        name: member.name,
        position: member.position,
        tier: member.tier,
        department: member.department || "",
        rollNo: member.rollNo,
        linkedinUrl: member.linkedinUrl || "",
        instaUrl: member.instaUrl || "",
        imageUrl: member.imageUrl || "",
        order: member.order,
        email: member.email || "",
        permissions: member.permissions || []
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        position: "",
        tier: "Core Team",
        department: "Tech & Innovation",
        rollNo: "",
        linkedinUrl: "",
        instaUrl: "",
        imageUrl: "",
        order: members.length > 0 ? members[members.length - 1].order + 10 : 0,
        email: "",
        permissions: []
      });
    }
    setNewPassword("");
    setUploadFile(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      let imageUrl = formData.imageUrl;
      if (uploadFile) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', uploadFile);
        uploadFormData.append('type', 'image');
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: uploadFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload image');
        }

        const uploadResult = await uploadResponse.json();
        imageUrl = uploadResult.secure_url;
      }

      const payload: any = { ...formData, imageUrl };

      // If creating a new member AND an email + password is provided,
      // Create their Firebase Auth account first.
      if (!editingId && formData.email && newPassword) {
        const res = await fetch('/api/admin/create-member', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: newPassword,
            displayName: formData.name
          })
        });

        let data;
        const textResponse = await res.text();
        try {
          data = JSON.parse(textResponse);
        } catch (e) {
          console.error("Non-JSON response from server:", textResponse);
          throw new Error("Server error (500). If you are on Vercel, please ensure your FIREBASE_PRIVATE_KEY and other Admin environment variables are correctly set in the Vercel Dashboard Settings.");
        }
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create member auth account');
        }
        
        payload.uid = data.uid;
      }

      // Save to Firestore
      if (editingId) {
        await updateMember(editingId, payload);
      } else {
        await addMember(payload);
        if (formData.email && newPassword) {
          alert(`Success! Account created.\n\nEmail: ${formData.email}\nPassword: ${newPassword}\n\nPlease share these credentials securely with the member.`);
        }
      }

      handleCloseModal();
      fetchMembers();

    } catch (error: any) {
      console.error("Save Error:", error);
      alert(error.message || "Failed to save member.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative">
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Manage Members</h1>
          <button 
            onClick={() => handleOpenModal()} 
            className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </button>
        </header>

        <div className="p-8">
          <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5 text-white/50 text-sm">
                    <th className="px-6 py-4 font-medium">Order</th>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Tier & Position</th>
                    <th className="px-6 py-4 font-medium">Department</th>
                    <th className="px-6 py-4 font-medium">Roll No</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-white/50">Loading members...</td>
                    </tr>
                  ) : members.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-white/50">No members found.</td>
                    </tr>
                  ) : (
                    members.map((member) => (
                      <tr key={member.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-medium text-white/50">{member.order}</td>
                        <td className="px-6 py-4 font-medium text-white">{member.name}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-primary text-xs font-bold uppercase tracking-wider">{member.tier}</span>
                            <span className="text-white/80">{member.position}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-white/60">{member.department || "-"}</td>
                        <td className="px-6 py-4 text-white/60">{member.rollNo}</td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleOpenModal(member)} className="p-2 text-white/50 hover:text-white transition-colors inline-flex" aria-label="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(member.id!, member.name)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors ml-2" aria-label="Delete">
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
        </div>

        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-card border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/5 shrink-0">
                <h2 className="text-xl font-bold text-white">{editingId ? 'Edit Member' : 'Add Member'}</h2>
                <button onClick={handleCloseModal} className="text-white/50 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Name</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Roll Number</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. 21X01A0501"
                      value={formData.rollNo}
                      onChange={e => setFormData({...formData, rollNo: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Hierarchy Tier</label>
                    <select 
                      required
                      className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                      value={formData.tier}
                      onChange={e => setFormData({...formData, tier: e.target.value as MemberTier})}
                    >
                      {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Position / Title</label>
                    <input 
                      type="text" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. President, Tech Lead, etc."
                      value={formData.position}
                      onChange={e => setFormData({...formData, position: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Department (Optional)</label>
                    <select 
                      className="w-full bg-[#111111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                    >
                      <option value="">-- None --</option>
                      {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Order (For sorting)</label>
                    <input 
                      type="number" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      value={formData.order}
                      onChange={e => setFormData({...formData, order: parseInt(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">LinkedIn URL (Optional)</label>
                    <input 
                      type="url" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedinUrl}
                      onChange={e => setFormData({...formData, linkedinUrl: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white/70">Instagram URL (Optional)</label>
                    <input 
                      type="url" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="https://instagram.com/..."
                      value={formData.instaUrl}
                      onChange={e => setFormData({...formData, instaUrl: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">Profile Image (Optional)</label>
                  {formData.imageUrl && !uploadFile && (
                    <div className="mb-2">
                      <img src={formData.imageUrl} alt="Profile preview" className="w-16 h-16 rounded-xl object-cover border border-white/10" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    onChange={e => {
                      if (e.target.files && e.target.files.length > 0) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                  <p className="text-xs text-white/40">Upload a square image for best results.</p>
                </div>

                {/* Optional Login Email */}
                <div className="space-y-4 pt-4 border-t border-white/10 mt-2">
                  <div>
                    <label className="text-sm font-medium text-white/70">Member Account Email</label>
                    <p className="text-xs text-white/40 mb-2">Provide an email to allow this member to log in.</p>
                    <input 
                      type="email" 
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="member@connectclub.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  
                  {!editingId && (
                    <div>
                      <label className="text-sm font-medium text-white/70">Initial Password</label>
                      <p className="text-xs text-white/40 mb-2">Set a password for the member to use when logging in for the first time.</p>
                      <input 
                        type="text" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="Set a strong password..."
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required={!!formData.email} // Require password if email is provided
                      />
                    </div>
                  )}
                </div>

                {/* Permissions Checklist */}
                <div className="space-y-4 pt-4 border-t border-white/10 mt-2">
                  <div>
                    <label className="text-sm font-medium text-white/70">Member Permissions</label>
                    <p className="text-xs text-white/40 mb-3">Select which sections this member can access in their dashboard. (Chat is accessible by default).</p>
                    <div className="grid grid-cols-2 gap-3">
                      {["events", "projects", "timeline", "gallery"].map(permission => (
                        <label key={permission} className="flex items-center space-x-3 bg-white/5 p-3 rounded-xl border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded text-primary focus:ring-primary/50 bg-black/50 border-white/20"
                            checked={formData.permissions?.includes(permission) || false}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                permissions: checked 
                                  ? [...(prev.permissions || []), permission]
                                  : (prev.permissions || []).filter(p => p !== permission)
                              }));
                            }}
                          />
                          <span className="text-sm font-medium text-white capitalize">{permission}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 flex justify-end gap-3 shrink-0">
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
                        Saving...
                      </>
                    ) : editingId ? "Update Member" : "Save Member"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
