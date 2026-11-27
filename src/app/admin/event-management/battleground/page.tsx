"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Search, 
  Users, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  CreditCard, 
  RefreshCw, 
  Phone, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
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

interface Member {
  name: string;
  rollNo?: string;
  roll?: string;
  branch?: string;
  year?: string;
  section?: string;
}

interface Registration {
  id: string;
  teamName: string;
  teamSize: number;
  leadName: string;
  leadRollNo: string;
  leadPhone: string;
  leadBranch?: string;
  leadYear?: string;
  leadSection?: string;
  bgId: string;
  status: string;
  paymentStatus?: string;
  fee?: number;
  transactionId?: string;
  paymentScreenshot?: string;
  upiId?: string;
  timestamp: string;
  members: Member[];
}

export default function BattleGroundAdminPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "verified" | "pending">("all");
  const [selectedTeam, setSelectedTeam] = useState<Registration | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
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
      const res = await fetch("/api/battleground-registrations", { 
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

  const getTeamSize = (reg: Registration) => {
    return reg.teamSize || ((reg.members?.length || 0) + 1);
  };

  const getTeamFee = (reg: Registration) => {
    if (reg.fee) return reg.fee;
    return getTeamSize(reg) * 50;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdatePaymentStatus = async (regId: string, newStatus: "verified" | "pending") => {
    setIsUpdatingStatus(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/battleground-registrations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          id: regId,
          status: newStatus,
          paymentStatus: newStatus
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update status");
      }

      setRegistrations(prev => prev.map(r => r.id === regId ? { 
        ...r, 
        status: newStatus, 
        paymentStatus: newStatus 
      } : r));

      if (selectedTeam && selectedTeam.id === regId) {
        setSelectedTeam(prev => prev ? { 
          ...prev, 
          status: newStatus, 
          paymentStatus: newStatus 
        } : null);
      }
      toast.success(`Payment status marked as ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Top Metric Cards Calculations
  const totalTeams = registrations.length;
  const verifiedTeams = registrations.filter(r => (r.status || r.paymentStatus) === "verified").length;
  const pendingTeams = totalTeams - verifiedTeams;
  const totalMembers = registrations.reduce((sum, r) => sum + getTeamSize(r), 0);
  const revenueVerified = registrations
    .filter(r => (r.status || r.paymentStatus) === "verified")
    .reduce((sum, r) => sum + getTeamFee(r), 0);

  const approvalRate = totalTeams > 0 ? Math.round((verifiedTeams / totalTeams) * 100) : 0;

  // Filtered List
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      const isVerified = (reg.status || reg.paymentStatus) === "verified";
      if (statusFilter === "verified" && !isVerified) return false;
      if (statusFilter === "pending" && isVerified) return false;

      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        reg.teamName.toLowerCase().includes(query) ||
        reg.leadName.toLowerCase().includes(query) ||
        reg.leadRollNo.toLowerCase().includes(query) ||
        (reg.bgId && reg.bgId.toLowerCase().includes(query)) ||
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
      if (reg.timestamp) {
        const regDate = new Date(reg.timestamp);
        const dateKey = regDate.toISOString().split('T')[0];
        const dayData = days.find(d => d.dateKey === dateKey);
        if (dayData) {
          dayData.count++;
        }
      }
    });

    return days;
  }, [registrations]);

  // Chart 2: Team Size Distribution
  const teamSizeDistribution = useMemo(() => {
    const counts: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    registrations.forEach(reg => {
      const size = getTeamSize(reg);
      if (size >= 2 && size <= 6) {
        counts[size] = (counts[size] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .filter(([_, count]) => count > 0)
      .map(([size, count]) => ({
        size: `${size} Members`,
        count
      }));
  }, [registrations]);

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-[1440px] mx-auto space-y-5 sm:space-y-6">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#0d0f14] p-4 sm:p-6 rounded-2xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/10">
            <Sparkles className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">Dashboard</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 font-mono font-bold uppercase border border-cyan-500/30">
                Battlegrounds
              </span>
            </div>
            <p className="text-xs text-white/50 mt-0.5">Live registration metrics, verified payments, and team analytics.</p>
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 w-full sm:w-auto justify-end">
          <button 
            onClick={() => fetchRegistrations(true)} 
            disabled={isLoading || isRefreshing}
            className="flex-1 sm:flex-none px-3.5 py-2 bg-white/5 hover:bg-white/10 active:scale-95 text-white/80 hover:text-white font-medium text-xs rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
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
        {/* Card 1: Total Teams */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-cyan-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{totalTeams}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Total Teams</div>
            <div className="text-[10px] text-cyan-400 mt-1 font-semibold flex items-center gap-1 truncate">
              <span>↑</span> Live count
            </div>
          </div>
        </div>

        {/* Card 2: Verified */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-emerald-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{verifiedTeams}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Verified</div>
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
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{pendingTeams}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Pending Review</div>
            <div className="text-[10px] text-amber-400 mt-1 font-semibold truncate">
              Awaiting verification
            </div>
          </div>
        </div>

        {/* Card 4: Total Members */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-purple-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl sm:text-2xl font-extrabold text-white leading-tight truncate">{totalMembers}</div>
            <div className="text-xs font-semibold text-white/50 truncate">Total Members</div>
            <div className="text-[10px] text-purple-400 mt-1 font-semibold truncate">
              Across all teams
            </div>
          </div>
        </div>

        {/* Card 5: Revenue Verified */}
        <div className="col-span-2 sm:col-span-1 bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 hover:border-pink-500/30 transition-all shadow-sm">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center shrink-0">
            <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 text-pink-400" />
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
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-cyan-400 rounded-full" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Daily Registrations (Last 7 Days)</h3>
              </div>
              <p className="text-[11px] text-white/40 ml-3.5 mt-0.5">Registration momentum trend</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">Live</span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={last7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="cyanAreaGlow" x1="0" y1="0" x2="0" y2="1">
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
                  fill="url(#cyanAreaGlow)" 
                  name="Teams"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Team Size Distribution */}
        <div className="bg-[#10121a] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 bg-pink-500 rounded-full" />
                <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">Team Size Distribution</h3>
              </div>
              <p className="text-[11px] text-white/40 ml-3.5 mt-0.5">Number of teams by member count</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 font-mono border border-pink-500/20">Breakdown</span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            {teamSizeDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-white/40">
                No team size data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamSizeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="size" 
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
                    itemStyle={{ color: '#ec4899' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Teams">
                    {teamSizeDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#ec4899" : "#f43f5e"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Recent Registrations & Payment Status Section */}
      <div className="bg-[#10121a] border border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        
        {/* Toolbar & Filter Bar */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3.5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-white">Recent Registrations</h2>
            <span className="text-xs px-2 py-0.5 bg-white/5 text-white/60 rounded-full font-mono font-semibold">
              {filteredRegistrations.length}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Status Filter Tabs */}
            <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "all" ? "bg-cyan-500 text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                All ({totalTeams})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("verified")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "verified" ? "bg-emerald-500 text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                Verified ({verifiedTeams})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("pending")}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === "pending" ? "bg-amber-500 text-black shadow-sm" : "text-white/60 hover:text-white"
                }`}
              >
                Pending ({pendingTeams})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
              <input
                type="text"
                placeholder="Search team, lead, roll, UTR..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#171923] border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-white/5">
          {isLoading ? (
            <div className="p-8 text-center text-white/50 text-xs">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-cyan-400" />
              Loading registrations...
            </div>
          ) : paginatedRegistrations.length === 0 ? (
            <div className="p-8 text-center text-white/40 text-xs">
              {searchQuery ? "No matching registrations found." : "No registrations found."}
            </div>
          ) : (
            paginatedRegistrations.map((reg) => {
              const isVerified = (reg.status || reg.paymentStatus) === "verified";
              const fee = getTeamFee(reg);
              return (
                <div 
                  key={reg.id} 
                  onClick={() => setSelectedTeam(reg)}
                  className="p-4 hover:bg-white/[0.02] active:bg-white/5 transition-colors cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span className="truncate">{reg.teamName}</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      </div>
                      <p className="text-[11px] text-white/40 font-mono mt-0.5">{reg.bgId || reg.id.slice(0, 8)}</p>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      isVerified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}>
                      {isVerified ? "VERIFIED" : "PENDING"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/70 pt-1">
                    <div>
                      <span className="text-white/40 text-[11px]">Lead: </span>
                      <span className="font-medium text-white/90">{reg.leadName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-white/40 font-mono text-[11px]">{getTeamSize(reg)} mem</span>
                      <span className="text-emerald-400 font-bold">₹{fee}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#0d0f14]">
                <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">TEAM NAME (CLICK TO VIEW)</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">LEAD</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">SIZE</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider">FEE</th>
                <th className="px-5 py-3.5 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-white/50">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-400" />
                    Connecting to live database...
                  </td>
                </tr>
              ) : paginatedRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-white/50 text-xs">
                    {searchQuery ? "No matching registrations found." : "No registrations found."}
                  </td>
                </tr>
              ) : (
                paginatedRegistrations.map((reg) => {
                  const isVerified = (reg.status || reg.paymentStatus) === "verified";
                  const fee = getTeamFee(reg);
                  return (
                    <tr 
                      key={reg.id} 
                      onClick={() => setSelectedTeam(reg)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white flex items-center gap-2 group-hover:text-cyan-400 transition-colors">
                          <span>{reg.teamName}</span>
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                        </div>
                        <span className="text-[10px] text-white/40 font-mono">{reg.bgId || reg.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-white/80 font-medium">{reg.leadName}</span>
                        <div className="text-[10px] text-white/40 font-mono">{reg.leadRollNo}</div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-white/80 font-medium font-mono">{getTeamSize(reg)}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-emerald-400 font-bold font-mono">₹{fee}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border inline-block ${
                          isVerified ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                        }`}>
                          {isVerified ? "VERIFIED" : "PENDING"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Pagination Bar */}
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
                              ? "bg-cyan-500 text-black shadow-md shadow-cyan-500/20 font-bold"
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

      </div>

      {/* Team Details & Payment Inspection Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="bg-[#0f1118] border border-white/10 rounded-2xl sm:rounded-3xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-4 sticky top-0 bg-[#0f1118] z-10">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg sm:text-xl font-bold text-white truncate">{selectedTeam.teamName}</h3>
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono text-white/50">{selectedTeam.bgId || selectedTeam.id}</span>
                  <button 
                    onClick={() => copyToClipboard(selectedTeam.bgId || selectedTeam.id, 'id')}
                    className="text-white/40 hover:text-white p-0.5"
                    title="Copy ID"
                  >
                    {copiedId === 'id' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedTeam(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4 text-sm overflow-y-auto custom-scrollbar">
              
              {/* Payment Status Card */}
              <div className="bg-[#151824] border border-white/5 rounded-2xl p-4 sm:p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Payment Status</span>
                  <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                    (selectedTeam.status || selectedTeam.paymentStatus) === "verified"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}>
                    {(selectedTeam.status || selectedTeam.paymentStatus) === "verified" ? "Verified" : "Pending Review"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-white/40 block">Amount Payable</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">₹{getTeamFee(selectedTeam)}</span>
                  </div>

                  <div className="bg-black/30 p-3 rounded-xl border border-white/5">
                    <span className="text-[11px] text-white/40 block">Team Members</span>
                    <span className="text-lg font-bold text-white font-mono">{getTeamSize(selectedTeam)}</span>
                  </div>
                </div>

                {/* UTR / Transaction ID */}
                {selectedTeam.transactionId && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider block">Transaction / UTR</span>
                      <span className="text-xs font-mono text-cyan-400 font-bold">{selectedTeam.transactionId}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(selectedTeam.transactionId!, 'utr')}
                      className="text-xs text-white/60 hover:text-white flex items-center gap-1 p-1 rounded bg-white/5"
                    >
                      {copiedId === 'utr' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                )}

                {/* Payment Screenshot Photo */}
                <div className="pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white/50 uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                      Payment Verification Screenshot
                    </span>
                    {selectedTeam.paymentScreenshot && (
                      <button
                        onClick={() => setZoomedImage(selectedTeam.paymentScreenshot!)}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>View Full</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {selectedTeam.paymentScreenshot ? (
                    <div 
                      onClick={() => setZoomedImage(selectedTeam.paymentScreenshot!)}
                      className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 group cursor-pointer hover:border-cyan-500/40 transition-all max-h-56 flex items-center justify-center"
                    >
                      <img
                        src={selectedTeam.paymentScreenshot}
                        alt="Payment Proof Screenshot"
                        className="w-full h-auto max-h-56 object-contain group-hover:scale-[1.02] transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold gap-1.5 backdrop-blur-[2px]">
                        <Eye className="w-4 h-4 text-cyan-400" />
                        <span>Click to Zoom Screenshot</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5 text-center text-xs text-white/40">
                      No screenshot uploaded for this registration.
                    </div>
                  )}
                </div>

              </div>

              {/* Lead Details */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">Team Lead</h4>
                <div className="bg-[#151824] border border-white/5 rounded-xl p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{selectedTeam.leadName}</span>
                    <span className="text-xs font-mono text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {selectedTeam.leadRollNo}
                    </span>
                  </div>
                  {selectedTeam.leadPhone && (
                    <div className="flex items-center justify-between text-xs text-white/60 pt-1">
                      <span>{selectedTeam.leadPhone}</span>
                      <a 
                        href={`tel:${selectedTeam.leadPhone}`}
                        className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Phone className="w-3 h-3" /> Call Lead
                      </a>
                    </div>
                  )}
                  {(selectedTeam.leadBranch || selectedTeam.leadSection) && (
                    <p className="text-[11px] text-white/40">
                      {selectedTeam.leadBranch} {selectedTeam.leadYear ? `• ${selectedTeam.leadYear}` : ''} {selectedTeam.leadSection ? `• Sec ${selectedTeam.leadSection}` : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* Co-Members List */}
              {selectedTeam.members && selectedTeam.members.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider">
                    Co-Members ({selectedTeam.members.length})
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedTeam.members.map((m, idx) => (
                      <div 
                        key={idx}
                        className="bg-[#151824] border border-white/5 rounded-xl p-3 flex items-center justify-between"
                      >
                        <span className="text-xs text-white/90 font-medium">{m.name || `Member ${idx + 2}`}</span>
                        <span className="text-[11px] font-mono text-white/40">{m.rollNo || m.roll || '-'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registration Timestamp */}
              <div className="text-[11px] text-white/30 text-center pt-2">
                Registered on {new Date(selectedTeam.timestamp).toLocaleString()}
              </div>

            </div>

            {/* Modal Footer: Action to verify or toggle status */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-white/[0.02] flex items-center gap-2">
              {(selectedTeam.status || selectedTeam.paymentStatus) === "verified" ? (
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdatePaymentStatus(selectedTeam.id, "pending")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                  <span>Mark as Pending Review</span>
                </button>
              ) : (
                <button
                  disabled={isUpdatingStatus}
                  onClick={() => handleUpdatePaymentStatus(selectedTeam.id, "verified")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {isUpdatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>Verify Payment & Approve</span>
                </button>
              )}

              <button
                onClick={() => setSelectedTeam(null)}
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

      {/* Global Scrollbar Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}} />

    </div>
  );
}
