"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  getMembers, 
  addMember, 
  updateMember, 
  deleteMember, 
  ConnectMember, 
  MemberTier 
} from "@/lib/firebase/members";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  Search, 
  LayoutGrid, 
  List, 
  Shield, 
  Key, 
  Sparkles, 
  User, 
  AlertTriangle, 
  Copy, 
  Check, 
  ExternalLink,
  Users,
  Award,
  Crown,
  GraduationCap,
  HeartHandshake
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const InstagramIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

const LinkedInIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const TIERS: MemberTier[] = ["Executive Board", "Core Team", "Volunteers", "Alumni"];
const DEPARTMENTS = ["Tech & Innovation", "PR & Outreach", "Design", "Event Management", "Other"];

const AVATAR_GRADIENTS = [
  "from-purple-600 to-indigo-600 text-purple-100",
  "from-pink-600 to-rose-600 text-pink-100",
  "from-emerald-600 to-teal-600 text-emerald-100",
  "from-blue-600 to-cyan-600 text-cyan-100",
  "from-amber-600 to-orange-600 text-amber-100",
  "from-violet-600 to-fuchsia-600 text-violet-100",
];

function getAvatarStyle(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function getTierBadgeStyle(tier: MemberTier) {
  switch (tier) {
    case "Executive Board":
      return "bg-amber-500/15 text-amber-300 border-amber-500/30";
    case "Core Team":
      return "bg-purple-500/15 text-purple-300 border-purple-500/30";
    case "Volunteers":
      return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    case "Alumni":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    default:
      return "bg-white/10 text-white/70 border-white/10";
  }
}

function getTierIcon(tier: MemberTier) {
  switch (tier) {
    case "Executive Board":
      return <Crown className="w-3.5 h-3.5" />;
    case "Core Team":
      return <Award className="w-3.5 h-3.5" />;
    case "Volunteers":
      return <HeartHandshake className="w-3.5 h-3.5" />;
    case "Alumni":
      return <GraduationCap className="w-3.5 h-3.5" />;
    default:
      return <User className="w-3.5 h-3.5" />;
  }
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<ConnectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("All");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteModalMember, setDeleteModalMember] = useState<ConnectMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
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
  const [copiedRoll, setCopiedRoll] = useState<string | null>(null);

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
      toast.error("Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  // Counts for Metric Badges
  const stats = useMemo(() => {
    return {
      total: members.length,
      executive: members.filter(m => m.tier === "Executive Board").length,
      core: members.filter(m => m.tier === "Core Team").length,
      volunteers: members.filter(m => m.tier === "Volunteers").length,
      alumni: members.filter(m => m.tier === "Alumni").length,
    };
  }, [members]);

  // Filtered Members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Tier filter
      if (selectedTier !== "All" && member.tier !== selectedTier) {
        return false;
      }
      // Department filter
      if (selectedDepartment !== "All" && (member.department || "Other") !== selectedDepartment) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const name = (member.name || "").toLowerCase();
        const rollNo = (member.rollNo || "").toLowerCase();
        const position = (member.position || "").toLowerCase();
        const dept = (member.department || "").toLowerCase();
        const email = (member.email || "").toLowerCase();
        return name.includes(q) || rollNo.includes(q) || position.includes(q) || dept.includes(q) || email.includes(q);
      }
      return true;
    });
  }, [members, selectedTier, selectedDepartment, searchQuery]);

  const confirmDelete = async () => {
    if (!deleteModalMember?.id) return;
    setIsDeleting(true);
    try {
      await deleteMember(deleteModalMember.id);
      toast.success(`Removed "${deleteModalMember.name}" from members`);
      setDeleteModalMember(null);
      fetchMembers();
    } catch (error) {
      console.error("Error deleting member:", error);
      toast.error("Failed to delete member.");
    } finally {
      setIsDeleting(false);
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

  const handleCopyRoll = (roll: string) => {
    navigator.clipboard.writeText(roll);
    setCopiedRoll(roll);
    toast.success(`Copied roll number: ${roll}`);
    setTimeout(() => setCopiedRoll(null), 2000);
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
        const token = await user?.getIdToken();
        const res = await fetch('/api/admin/create-member', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
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
          throw new Error("Server error (500). Please check Firebase Admin configuration.");
        }
        
        if (!res.ok) {
          throw new Error(data.error || 'Failed to create member auth account');
        }
        
        payload.uid = data.uid;
      }

      // Save to Firestore
      if (editingId) {
        await updateMember(editingId, payload);
        toast.success(`Updated ${formData.name}`);
      } else {
        await addMember(payload);
        toast.success(`Added ${formData.name}`);
        if (formData.email && newPassword) {
          toast.info(`Account created for ${formData.email}`);
        }
      }

      handleCloseModal();
      fetchMembers();

    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error.message || "Failed to save member.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full pb-16 bg-transparent">
      {/* Top Header */}
      <header className="px-5 md:px-8 py-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-[#08080b]/90 backdrop-blur-xl sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black font-heading text-white tracking-tight">
              Manage Members
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
              <Users className="w-3.5 h-3.5" />
              {members.length} {members.length === 1 ? "Member" : "Members"}
            </span>
          </div>
          <p className="text-xs md:text-sm text-white/50 mt-0.5">
            Team directory, organizational tiers, leadership roles, and permissions
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2.5">

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-white flex items-center gap-1.5 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </header>

      <div className="p-4 md:p-8 space-y-6 max-w-7xl w-full mx-auto">
        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          <div 
            onClick={() => setSelectedTier("Executive Board")}
            className={cn(
              "p-4 rounded-2xl border transition-all cursor-pointer group",
              selectedTier === "Executive Board" 
                ? "bg-amber-500/10 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
                : "bg-[#0c0c0e]/80 border-white/5 hover:border-amber-500/30 hover:bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between text-amber-400 mb-2">
              <span className="text-xs font-semibold tracking-wide">Executive Board</span>
              <Crown className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black font-heading text-white">{stats.executive}</div>
          </div>

          <div 
            onClick={() => setSelectedTier("Core Team")}
            className={cn(
              "p-4 rounded-2xl border transition-all cursor-pointer group",
              selectedTier === "Core Team" 
                ? "bg-purple-500/10 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.1)]" 
                : "bg-[#0c0c0e]/80 border-white/5 hover:border-purple-500/30 hover:bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-semibold tracking-wide">Core Team</span>
              <Award className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black font-heading text-white">{stats.core}</div>
          </div>

          <div 
            onClick={() => setSelectedTier("Volunteers")}
            className={cn(
              "p-4 rounded-2xl border transition-all cursor-pointer group",
              selectedTier === "Volunteers" 
                ? "bg-blue-500/10 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                : "bg-[#0c0c0e]/80 border-white/5 hover:border-blue-500/30 hover:bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between text-blue-400 mb-2">
              <span className="text-xs font-semibold tracking-wide">Volunteers</span>
              <HeartHandshake className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black font-heading text-white">{stats.volunteers}</div>
          </div>

          <div 
            onClick={() => setSelectedTier("Alumni")}
            className={cn(
              "p-4 rounded-2xl border transition-all cursor-pointer group",
              selectedTier === "Alumni" 
                ? "bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]" 
                : "bg-[#0c0c0e]/80 border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.02]"
            )}
          >
            <div className="flex items-center justify-between text-emerald-400 mb-2">
              <span className="text-xs font-semibold tracking-wide">Alumni</span>
              <GraduationCap className="w-4 h-4 opacity-80 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black font-heading text-white">{stats.alumni}</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 rounded-2xl bg-[#0c0c0e]/80 border border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search member by name, roll no, role, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50 focus:bg-white/[0.07] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Tier Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {["All", ...TIERS].map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap",
                  selectedTier === tier
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-white/[0.03] text-white/60 hover:text-white hover:bg-white/[0.08] border border-white/5"
                )}
              >
                {tier}
              </button>
            ))}

            {/* Department Filter */}
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="bg-[#121217] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-primary transition-colors appearance-none ml-1 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Area: Grid vs Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-white/50 text-xs">Loading member directory...</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#0c0c0e]/60 border border-white/5 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">No members found</h3>
            <p className="text-xs text-white/40 max-w-sm">
              {searchQuery || selectedTier !== "All" || selectedDepartment !== "All"
                ? "No members match the current filter or search criteria."
                : "No members added yet. Click 'Add Member' above to create one."}
            </p>
            {(searchQuery || selectedTier !== "All" || selectedDepartment !== "All") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTier("All");
                  setSelectedDepartment("All");
                }}
                className="mt-2 px-3 py-1.5 rounded-xl text-xs bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          /* Cards / Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {filteredMembers.map((member) => {
              const tierBadge = getTierBadgeStyle(member.tier);
              const tierIcon = getTierIcon(member.tier);
              const avatarStyle = getAvatarStyle(member.name);

              return (
                <div
                  key={member.id}
                  className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors shadow-lg flex flex-col h-full group relative overflow-hidden"
                >
                  {/* Subtle top gradient */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Top Bar: Tier Badge, Order, and Actions */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider flex items-center gap-1.5",
                        tierBadge
                      )}>
                        {tierIcon}
                        <span>{member.tier}</span>
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 p-1 rounded-xl border border-white/5">
                        <span className="text-[10px] font-mono font-medium text-white/40 px-2 py-0.5 rounded-md">
                          #{member.order}
                        </span>
                        <div className="w-px h-3 bg-white/10 mx-0.5"></div>
                        <button
                          onClick={() => handleOpenModal(member)}
                          className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          title="Edit member"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteModalMember(member)}
                          className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Member Identity & Avatar */}
                    <div className="flex items-center gap-3.5 mb-3">
                      {member.imageUrl ? (
                        <img
                          src={member.imageUrl}
                          alt={member.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md group-hover:scale-105 transition-transform shrink-0"
                        />
                      ) : (
                        <div
                          className={cn(
                            "w-14 h-14 rounded-2xl bg-gradient-to-tr flex items-center justify-center font-bold text-lg shrink-0 shadow-md group-hover:scale-105 transition-transform",
                            avatarStyle
                          )}
                        >
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-white text-base truncate tracking-tight">
                          {member.name}
                        </h3>
                        <p className="text-xs text-primary font-medium truncate mt-0.5">
                          {member.position}
                        </p>
                        {member.department && (
                          <p className="text-[11px] text-white/50 truncate">
                            {member.department}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Member Details Pills */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/40">Roll No</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-white/90 bg-white/5 px-2 py-0.5 rounded text-[11px]">
                            {member.rollNo}
                          </span>
                          <button
                            onClick={() => handleCopyRoll(member.rollNo)}
                            className="text-white/40 hover:text-white"
                            title="Copy roll number"
                          >
                            {copiedRoll === member.rollNo ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {member.email && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/40">Account</span>
                          <span className="text-[11px] text-white/60 truncate max-w-[150px]">
                            {member.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Social links and permissions indicator */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {member.linkedinUrl && (
                        <a
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-[#0077b5]/20 hover:text-[#0077b5] text-white/50 transition-colors"
                          title="LinkedIn Profile"
                        >
                          <LinkedInIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {member.instaUrl && (
                        <a
                          href={member.instaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-pink-500/20 hover:text-pink-400 text-white/50 transition-colors"
                          title="Instagram Profile"
                        >
                          <InstagramIcon className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {!member.linkedinUrl && !member.instaUrl && (
                        <span className="text-[11px] text-white/30 italic">No social links</span>
                      )}
                    </div>

                    {member.permissions && member.permissions.length > 0 && (
                      <span className="text-[10px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                        {member.permissions.length} perms
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Member Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0e12] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02] shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <User className="w-4 h-4" />
                  </div>
                  <h2 className="text-lg font-bold text-white">
                    {editingId ? "Edit Member" : "Add New Member"}
                  </h2>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 flex flex-col gap-5 scrollbar-thin scrollbar-thumb-white/10">
                {/* Basic Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Full Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Roll Number *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors uppercase font-mono"
                      placeholder="e.g. 21X01A0501"
                      value={formData.rollNo}
                      onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                    />
                  </div>
                </div>

                {/* Hierarchy Tier & Position */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Hierarchy Tier *</label>
                    <select
                      required
                      className="w-full bg-[#141419] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                      value={formData.tier}
                      onChange={(e) => setFormData({ ...formData, tier: e.target.value as MemberTier })}
                    >
                      {TIERS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Position / Title *</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="e.g. President, Tech Lead, Volunteer"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    />
                  </div>
                </div>

                {/* Department & Display Order */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Department (Optional)</label>
                    <select
                      className="w-full bg-[#141419] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors appearance-none"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      <option value="">-- None --</option>
                      {DEPARTMENTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Display Order</label>
                    <input
                      type="number"
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                    <p className="text-[10px] text-white/40">Lower numbers appear first in lists.</p>
                  </div>
                </div>

                {/* Social Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">LinkedIn URL</label>
                    <input
                      type="url"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="https://linkedin.com/in/..."
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-white/70">Instagram URL</label>
                    <input
                      type="url"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                      placeholder="https://instagram.com/..."
                      value={formData.instaUrl}
                      onChange={(e) => setFormData({ ...formData, instaUrl: e.target.value })}
                    />
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="space-y-2 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <label className="text-xs font-semibold text-white/70">Profile Photo</label>
                  <div className="flex items-center gap-4">
                    {formData.imageUrl && !uploadFile && (
                      <img
                        src={formData.imageUrl}
                        alt="Profile preview"
                        className="w-14 h-14 rounded-2xl object-cover border border-white/10"
                      />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/20 file:text-primary hover:file:bg-primary/30"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setUploadFile(e.target.files[0]);
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Login Credentials */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                    <Key className="w-3.5 h-3.5 text-primary" />
                    <span>Member Dashboard Credentials</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-white/70">Account Email</label>
                      <input
                        type="email"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="member@connectclub.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>

                    {!editingId && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-white/70">Initial Password</label>
                        <input
                          type="text"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-primary transition-colors"
                          placeholder="Set temporary password..."
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required={!!formData.email}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Member Permissions */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white/90">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>Dashboard Permissions</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/40 mb-2 font-bold">
                        General Portal Sections
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {["events", "projects", "timeline", "gallery", "letter_editor"].map((permission) => (
                          <label
                            key={permission}
                            className="flex items-center gap-2 bg-white/5 p-2.5 rounded-xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded text-primary focus:ring-primary/50 bg-black/50 border-white/20"
                              checked={formData.permissions?.includes(permission) || false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData((prev) => ({
                                  ...prev,
                                  permissions: checked
                                    ? [...(prev.permissions || []), permission]
                                    : (prev.permissions || []).filter((p) => p !== permission),
                                }));
                              }}
                            />
                            <span className="text-xs font-medium text-white capitalize">
                              {permission.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-blue-400 mb-2 font-bold">
                        InspireX Event Tools
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "inspirex_feedback", label: "Feedback" },
                          { id: "inspirex_attendance", label: "Attendance" },
                          { id: "inspirex_members_list", label: "Lists" },
                          { id: "inspirex_certificates", label: "Certificates" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 bg-blue-900/10 p-2.5 rounded-xl border border-blue-500/20 cursor-pointer hover:bg-blue-900/20 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded text-blue-500 focus:ring-blue-500/50 bg-black/50 border-blue-500/30"
                              checked={formData.permissions?.includes(perm.id) || false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData((prev) => ({
                                  ...prev,
                                  permissions: checked
                                    ? [...(prev.permissions || []), perm.id]
                                    : (prev.permissions || []).filter((p) => p !== perm.id),
                                }));
                              }}
                            />
                            <span className="text-xs font-medium text-blue-100">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-orange-400 mb-2 font-bold mt-4">
                        Battleground Event Tools
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: "battleground_attendance", label: "Attendance" },
                          { id: "battleground_members_list", label: "Lists" },
                          { id: "battleground_certificates", label: "Certificates" },
                        ].map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 bg-orange-900/10 p-2.5 rounded-xl border border-orange-500/20 cursor-pointer hover:bg-orange-900/20 transition-colors"
                          >
                            <input
                              type="checkbox"
                              className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500/50 bg-black/50 border-orange-500/30"
                              checked={formData.permissions?.includes(perm.id) || false}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData((prev) => ({
                                  ...prev,
                                  permissions: checked
                                    ? [...(prev.permissions || []), perm.id]
                                    : (prev.permissions || []).filter((p) => p !== perm.id),
                                }));
                              }}
                            />
                            <span className="text-xs font-medium text-orange-100">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4 flex justify-end gap-3 shrink-0 border-t border-white/5">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-white/70 hover:bg-white/5 transition-colors disabled:opacity-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors flex items-center shadow-lg shadow-primary/20 disabled:opacity-50"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Saving...
                      </>
                    ) : editingId ? (
                      "Update Member"
                    ) : (
                      "Save Member"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteModalMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0e0e12] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Remove Member?</h3>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Are you sure you want to remove{" "}
                  <span className="font-semibold text-white">{deleteModalMember.name}</span> (
                  {deleteModalMember.position} • {deleteModalMember.rollNo}) from the team directory?
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteModalMember(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isDeleting ? "Deleting..." : "Remove Member"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
