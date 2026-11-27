"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  ShieldCheck, 
  RefreshCw, 
  Phone, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  Ticket,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell 
} from 'recharts';
import { toast } from "sonner";

interface Registration {
  id: string;
  name: string;
  rollNo: string;
  email: string;
  phone: string;
  branch?: string;
  year?: string;
  section?: string;
  status: "pending" | "approved";
  paymentStatus?: string;
  fee?: number;
  transactionId?: string;
  paymentScreenshot?: string;
  ticketId: string | null;
  registeredAt: string | null;
  approvedAt: string | null;
  isConnectClubMember: boolean;
  possibleDuplicate?: boolean;
}

export default function InspirexAdminPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "pending">("all");
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (user) fetchRegistrations();
  }, [user]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  async function fetchRegistrations(refresh = false) {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/inspirex-registrations", { 
        cache: "no-store",
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Failed to fetch registrations");
      if (data.success && data.data) {
        setRegistrations(data.data);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  const getRegistrationFee = (reg: Registration) => {
    if (reg.fee !== undefined) return reg.fee;
    if (reg.isConnectClubMember) return 0;
    return 499;
  };

  const handleUpdatePaymentStatus = async (regId: string, newStatus: "approved" | "pending") => {
    setIsUpdatingStatus(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/inspirex-registrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          id: regId,
          status: newStatus,
          paymentStatus: newStatus === "approved" ? "verified" : "pending"
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update status");
      }

      setRegistrations(prev => prev.map(r => r.id === regId ? { 
        ...r, 
        status: newStatus, 
        paymentStatus: newStatus === "approved" ? "verified" : "pending" 
      } : r));

      if (selectedReg && selectedReg.id === regId) {
        setSelectedReg(prev => prev ? { 
          ...prev, 
          status: newStatus, 
          paymentStatus: newStatus === "approved" ? "verified" : "pending" 
        } : null);
      }
      toast.success(`Registration status updated to ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stats calculations
  const totalRegistrations = registrations.length;
  const approvedRegistrations = registrations.filter(r => r.status === "approved" || r.paymentStatus === "verified").length;
  const pendingRegistrations = totalRegistrations - approvedRegistrations;
  const clubMembersCount = registrations.filter(r => r.isConnectClubMember).length;
  const revenueVerified = registrations
    .filter(r => r.status === "approved" || r.paymentStatus === "verified")
    .reduce((sum, r) => sum + getRegistrationFee(r), 0);

  const approvalRate = totalRegistrations > 0 ? Math.round((approvedRegistrations / totalRegistrations) * 100) : 0;

  // Filtered List
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      const isApproved = reg.status === "approved" || reg.paymentStatus === "verified";
      if (statusFilter === "approved" && !isApproved) return false;
      if (statusFilter === "pending" && isApproved) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        reg.name.toLowerCase().includes(query) ||
        reg.rollNo.toLowerCase().includes(query) ||
        reg.email.toLowerCase().includes(query) ||
        (reg.phone && reg.phone.includes(query)) ||
        (reg.ticketId && reg.ticketId.toLowerCase().includes(query)) ||
        (reg.branch && reg.branch.toLowerCase().includes(query)) ||
        (reg.transactionId && reg.transactionId.toLowerCase().includes(query))
      );
    });
  }, [registrations, statusFilter, searchQuery]);

  // Paginated List
  const totalPages = Math.ceil(filteredRegistrations.length / pageSize) || 1;
  const paginatedRegistrations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRegistrations.slice(start, start + pageSize);
  }, [filteredRegistrations, currentPage, pageSize]);

  // Chart 1: Daily Registrations (Last 7 Days)
  const last7Days = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        dateStr: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
        dateKey: d.toISOString().split('T')[0],
        count: 0
      };
    });

    registrations.forEach(reg => {
      if (reg.registeredAt) {
        const regDate = new Date(reg.registeredAt);
        const dateKey = regDate.toISOString().split('T')[0];
        const dayData = days.find(d => d.dateKey === dateKey);
        if (dayData) {
          dayData.count++;
        }
      }
    });

    return days;
  }, [registrations]);

  // Chart 2: Branch / Department Distribution
  const branchDistributionData = useMemo(() => {
    const branchMap = new Map<string, number>();
    registrations.forEach(reg => {
      const b = (reg.branch || "Unknown").toUpperCase().trim();
      branchMap.set(b, (branchMap.get(b) || 0) + 1);
    });
    return Array.from(branchMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([branch, count]) => ({
        name: branch,
        count
      }));
  }, [registrations]);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 sm:space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0d0f14] p-4 sm:p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 shadow-lg shadow-primary/10">
            <Ticket className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">Dashboard</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-mono font-bold uppercase border border-primary/30">
                InspireX S2
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">Live registration metrics, verified payments, and participant analytics.</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={() => fetchRegistrations(true)} 
            disabled={isLoading || isRefreshing}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white font-medium text-xs rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Refresh"}</span>
          </button>

          <Link
            href="/admin/event-management"
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium text-xs rounded-xl border border-white/10 transition-all flex items-center gap-1.5"
          >
            <span>All Events</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Top 5 KPI Metrics Cards - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Total Registrations */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-cyan-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{totalRegistrations}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Total Attendees</div>
            <div className="text-[10px] text-cyan-400 mt-1 font-semibold flex items-center gap-1 truncate">
              <span>↑</span> Live count
            </div>
          </div>
        </div>

        {/* Card 2: Approved / Verified */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{approvedRegistrations}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Approved & Verified</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-semibold truncate">
              {approvalRate}% approval rate
            </div>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-amber-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{pendingRegistrations}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Pending Review</div>
            <div className="text-[10px] text-amber-400 mt-1 font-semibold truncate">
              Awaiting verification
            </div>
          </div>
        </div>

        {/* Card 4: Club Members */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-purple-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{clubMembersCount}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Connect Members</div>
            <div className="text-[10px] text-purple-400 mt-1 font-semibold truncate">
              Free entry passes
            </div>
          </div>
        </div>

        {/* Card 5: Revenue Verified */}
        <div className="col-span-2 sm:col-span-1 bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-primary/40 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">₹{revenueVerified.toLocaleString()}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Revenue Verified</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-semibold truncate">
              Confirmed payments
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        
        {/* Chart 1: Daily Registrations */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-cyan-400 rounded-full" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Daily Registrations (Last 7 Days)</h3>
            </div>
            <span className="text-xs text-white/40">Real-time</span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="inspirexAreaGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="dateStr" 
                  stroke="#555" 
                  tick={{ fill: '#777', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#222' }}
                />
                <YAxis 
                  stroke="#555" 
                  tick={{ fill: '#777', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#222' }}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#0d0f14', 
                    borderColor: '#222', 
                    borderRadius: '0.75rem', 
                    fontSize: '12px',
                    color: '#fff' 
                  }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#06b6d4" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#inspirexAreaGlow)" 
                  name="Registrations"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Branch / Department Distribution */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-4 bg-primary rounded-full" />
              <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Department Distribution</h3>
            </div>
            <span className="text-xs text-white/40">Top Branches</span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            {branchDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#555" 
                    tick={{ fill: '#777', fontSize: 10 }}
                    tickLine={false}
                    axisLine={{ stroke: '#222' }}
                  />
                  <YAxis 
                    stroke="#555" 
                    tick={{ fill: '#777', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#222' }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#0d0f14', 
                      borderColor: '#222', 
                      borderRadius: '0.75rem', 
                      fontSize: '12px',
                      color: '#fff' 
                    }}
                    itemStyle={{ color: '#ec4899' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Attendees">
                    {branchDistributionData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#ec4899" : "#d946ef"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-white/40">
                No department data available
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Registrations List with Payment Status */}
      <div className="bg-[#10121a] border border-white/5 rounded-2xl overflow-hidden shadow-sm">
        
        {/* Table Header & Search Filter */}
        <div className="p-4 sm:p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white">Attendee Registrations & Payments</h2>
            <p className="text-xs text-white/50 mt-0.5">Click any row to inspect payment details, transaction ID, or approve verification.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Status Tabs */}
            <div className="flex items-center bg-[#090a0f] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "all" 
                    ? "bg-primary text-white shadow" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                All ({registrations.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("approved")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "approved" 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                Verified ({approvedRegistrations})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "pending" 
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                    : "text-white/60 hover:text-white"
                }`}
              >
                Pending ({pendingRegistrations})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Search attendee, roll no, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#090a0f] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-white/40 focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="p-12 text-center text-white/50 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs">Loading registrations & payment data...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <span className="text-xs font-medium">{error}</span>
            <button 
              onClick={() => fetchRegistrations()}
              className="mt-2 text-xs text-primary underline hover:text-primary/80"
            >
              Try Again
            </button>
          </div>
        ) : paginatedRegistrations.length === 0 ? (
          <div className="p-12 text-center text-white/40 text-xs">
            No registrations found matching your filter criteria.
          </div>
        ) : (
          <>
            {/* Desktop / Laptop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-[11px] font-bold text-white/40 uppercase tracking-wider bg-white/[0.01]">
                    <th className="py-3.5 px-4">ATTENDEE NAME (CLICK TO VIEW)</th>
                    <th className="py-3.5 px-4">ROLL NUMBER</th>
                    <th className="py-3.5 px-4">BRANCH & YEAR</th>
                    <th className="py-3.5 px-4">FEE</th>
                    <th className="py-3.5 px-4">PAYMENT STATUS</th>
                    <th className="py-3.5 px-4 text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {paginatedRegistrations.map((reg) => {
                    const isApproved = reg.status === "approved" || reg.paymentStatus === "verified";
                    const fee = getRegistrationFee(reg);
                    
                    return (
                      <tr 
                        key={reg.id} 
                        onClick={() => setSelectedReg(reg)}
                        className="hover:bg-white/[0.03] cursor-pointer transition-colors group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                              {reg.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                                <span>{reg.name}</span>
                                {reg.isConnectClubMember && (
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                    Club
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-white/40">{reg.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-white/80">
                          {reg.rollNo}
                        </td>

                        <td className="py-3.5 px-4 text-white/60">
                          <span className="uppercase">{reg.branch || "N/A"}</span>
                          {reg.year && <span className="text-white/40 ml-1">({reg.year})</span>}
                        </td>

                        <td className="py-3.5 px-4 font-semibold text-white">
                          {fee === 0 ? (
                            <span className="text-purple-400">FREE</span>
                          ) : (
                            <span>₹{fee}</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              VERIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              PENDING
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedReg(reg);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors inline-flex items-center gap-1"
                          >
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-white/5">
              {paginatedRegistrations.map((reg) => {
                const isApproved = reg.status === "approved" || reg.paymentStatus === "verified";
                const fee = getRegistrationFee(reg);

                return (
                  <div
                    key={reg.id}
                    onClick={() => setSelectedReg(reg)}
                    className="p-4 active:bg-white/[0.04] transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                          {reg.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-1.5">
                            <span className="truncate">{reg.name}</span>
                            {reg.isConnectClubMember && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Club
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 font-mono">{reg.rollNo}</div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                          PENDING
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5 text-white/60">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="uppercase">{reg.branch || "N/A"}</span>
                      </div>
                      <div className="font-bold text-white">
                        {fee === 0 ? (
                          <span className="text-purple-400 text-xs">FREE PASS</span>
                        ) : (
                          <span className="text-emerald-400 text-xs">Fee: ₹{fee}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {filteredRegistrations.length > 0 && (
              <div className="p-3 sm:p-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-[#0c0d12]">
                <div className="text-white/40 text-[11px]">
                  Showing <span className="text-white font-medium">{(currentPage - 1) * pageSize + 1}</span> to{" "}
                  <span className="text-white font-medium">{Math.min(currentPage * pageSize, filteredRegistrations.length)}</span> of{" "}
                  <span className="text-white font-medium">{filteredRegistrations.length}</span> registrations
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((page, idx, arr) => {
                        const prevPage = arr[idx - 1];
                        return (
                          <div key={page} className="flex items-center">
                            {prevPage && page - prevPage > 1 && (
                              <span className="px-1 text-white/30 text-xs">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all ${
                                currentPage === page
                                  ? "bg-primary text-white shadow-md shadow-primary/20 font-bold"
                                  : "bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5"
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        );
                      })}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inspection Modal for Registration & Payment Verification */}
      {selectedReg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#0f1118] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <span>{selectedReg.name}</span>
                  {selectedReg.isConnectClubMember && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Connect Club
                    </span>
                  )}
                </h3>
                <p className="text-xs text-white/50 font-mono mt-0.5">Roll No: {selectedReg.rollNo}</p>
              </div>
              <button
                onClick={() => setSelectedReg(null)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              
              {/* Payment Status Card */}
              <div className="bg-[#141724] border border-white/5 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Payment Status</span>
                  {selectedReg.status === "approved" || selectedReg.paymentStatus === "verified" ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      VERIFIED & APPROVED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Clock className="w-3.5 h-3.5 animate-pulse" />
                      PENDING REVIEW
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div>
                    <span className="text-white/40 block text-[11px]">Fee Amount:</span>
                    <span className="font-bold text-white text-sm">
                      {getRegistrationFee(selectedReg) === 0 ? "₹0 (Free Member Pass)" : `₹${getRegistrationFee(selectedReg)}`}
                    </span>
                  </div>
                  <div>
                    <span className="text-white/40 block text-[11px]">Ticket ID:</span>
                    <span className="font-mono text-white text-xs">{selectedReg.ticketId || "Pending Generation"}</span>
                  </div>
                </div>

                {/* Transaction ID if provided */}
                {selectedReg.transactionId && (
                  <div className="bg-black/40 rounded-lg p-2.5 border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 block">Transaction ID / UTR</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">{selectedReg.transactionId}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedReg.transactionId!, "utr")}
                      className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                      title="Copy UTR"
                    >
                      {copiedId === "utr" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}

                {/* Payment Screenshot if available */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-primary" />
                      Payment Proof Screenshot
                    </span>
                    {selectedReg.paymentScreenshot && (
                      <button
                        onClick={() => setZoomedImage(selectedReg.paymentScreenshot!)}
                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>View Full</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {selectedReg.paymentScreenshot ? (
                    <div 
                      onClick={() => setZoomedImage(selectedReg.paymentScreenshot!)}
                      className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group cursor-pointer hover:border-primary/40 transition-all max-h-56 flex items-center justify-center"
                    >
                      <img
                        src={selectedReg.paymentScreenshot}
                        alt="Payment Proof"
                        className="w-full h-auto max-h-56 object-contain group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                        <Eye className="w-4 h-4 text-primary" />
                        <span>Click to Zoom Screenshot</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5 text-center text-xs text-white/40">
                      No payment screenshot uploaded.
                    </div>
                  )}
                </div>
              </div>

              {/* Attendee Contact & Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white/60 uppercase tracking-wider">Attendee Details</h4>
                <div className="bg-[#141724] border border-white/5 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Email:</span>
                    <a href={`mailto:${selectedReg.email}`} className="text-primary hover:underline font-mono">
                      {selectedReg.email}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Phone:</span>
                    <a href={`tel:${selectedReg.phone}`} className="text-white/80 hover:text-white font-mono flex items-center gap-1">
                      <Phone className="w-3 h-3 text-white/40" />
                      {selectedReg.phone || "N/A"}
                    </a>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Branch & Section:</span>
                    <span className="text-white/80 uppercase">
                      {selectedReg.branch || "N/A"} {selectedReg.section ? `- Sec ${selectedReg.section}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/40">Year:</span>
                    <span className="text-white/80">{selectedReg.year || "N/A"}</span>
                  </div>
                  {selectedReg.registeredAt && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
                      <span className="text-white/40">Registered At:</span>
                      <span className="text-white/60">{new Date(selectedReg.registeredAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
              {selectedReg.status === "approved" || selectedReg.paymentStatus === "verified" ? (
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdatePaymentStatus(selectedReg.id, "pending")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  <span>Mark as Pending Review</span>
                </button>
              ) : (
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdatePaymentStatus(selectedReg.id, "approved")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Verify Payment & Approve Ticket</span>
                </button>
              )}

              <button
                onClick={() => setSelectedReg(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs border border-white/10 transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox / Zoomed Screenshot Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-10 right-0 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Close Image"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Full Payment Proof"
              className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl border border-white/10"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </div>
  );
}
