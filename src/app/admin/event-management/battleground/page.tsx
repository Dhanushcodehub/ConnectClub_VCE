"use client";

import { useEffect, useState } from "react";
import { Search, Users, Loader2, AlertCircle, CheckCircle2, Eye, CreditCard, Calendar, Briefcase, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';

interface Registration {
  id: string;
  teamName: string;
  teamSize: number;
  leadName: string;
  leadRollNo: string;
  leadPhone: string;
  bgId: string;
  status: string;
  timestamp: string;
  members: any[];
}

export default function BattleGroundAdminPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) fetchRegistrations();
  }, [user]);

  async function fetchRegistrations() {
    setIsLoading(true);
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
      if (data.success && data.data) setRegistrations(data.data);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredRegistrations = registrations.filter(reg => {
    const query = searchQuery.toLowerCase();
    return (
      reg.teamName.toLowerCase().includes(query) ||
      reg.leadName.toLowerCase().includes(query) ||
      reg.leadRollNo.toLowerCase().includes(query) ||
      reg.bgId.toLowerCase().includes(query)
    );
  });

  const getTeamSize = (reg: Registration) => reg.teamSize || ((reg.members?.length || 0) + 1);
  const getTeamFee = (reg: Registration) => getTeamSize(reg) * 50;

  // Stats calculations
  const totalTeams = registrations.length;
  const verifiedTeams = registrations.filter(r => r.status === "verified").length;
  const pendingTeams = totalTeams - verifiedTeams;
  const totalMembers = registrations.reduce((sum, r) => sum + getTeamSize(r), 0);
  const revenueVerified = registrations.filter(r => r.status === "verified").reduce((sum, r) => sum + getTeamFee(r), 0);
  
  const approvalRate = totalTeams > 0 ? Math.round((verifiedTeams / totalTeams) * 100) : 0;

  // Chart 1: Daily Registrations (Last 7 Days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateStr: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), // "2 Oct"
      dateKey: d.toISOString().split('T')[0],
      count: 0
    };
  });

  registrations.forEach(reg => {
    if (reg.timestamp) {
      const regDate = new Date(reg.timestamp);
      const dateKey = regDate.toISOString().split('T')[0];
      const dayData = last7Days.find(d => d.dateKey === dateKey);
      if (dayData) {
        dayData.count++;
      }
    }
  });

  // Chart 2: Team Size Distribution
  const sizeDistMap = new Map<number, number>();
  registrations.forEach(reg => {
    const size = getTeamSize(reg);
    sizeDistMap.set(size, (sizeDistMap.get(size) || 0) + 1);
  });
  const sizeDistributionData = Array.from(sizeDistMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([size, count]) => ({
      name: `${size} Members`,
      count
    }));

  return (
    <div className="p-6 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white uppercase tracking-wider">Dashboard</h1>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-[#10121a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-cyan-400" />
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{totalTeams}</div>
            <div className="text-xs font-medium text-white/50">Total Teams</div>
            <div className="text-[10px] text-cyan-400 mt-1 flex items-center gap-1">↑ Live count</div>
          </div>
        </div>

        <div className="bg-[#10121a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-green-500" />
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{verifiedTeams}</div>
            <div className="text-xs font-medium text-white/50">Verified</div>
            <div className="text-[10px] text-green-500 mt-1">{approvalRate}% approval rate</div>
          </div>
        </div>

        <div className="bg-[#10121a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
            <Eye className="w-6 h-6 text-yellow-500" />
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{pendingTeams}</div>
            <div className="text-xs font-medium text-white/50">Pending Review</div>
            <div className="text-[10px] text-green-500 mt-1">Awaiting verification</div>
          </div>
        </div>

        <div className="bg-[#10121a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">{totalMembers}</div>
            <div className="text-xs font-medium text-white/50">Total Members</div>
            <div className="text-[10px] text-green-500 mt-1">Across all teams</div>
          </div>
        </div>

        <div className="bg-[#10121a] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
            <CreditCard className="w-6 h-6 text-pink-400" />
          </div>
          <div className="flex flex-col">
            <div className="text-2xl font-bold text-white">₹{revenueVerified}</div>
            <div className="text-xs font-medium text-white/50">Revenue Verified</div>
            <div className="text-[10px] text-green-500 mt-1">Confirmed payments</div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-500">Error fetching registrations</h3>
            <p className="text-xs text-white/70">{error}</p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="bg-[#10121a] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 border-l-4 border-cyan-400 pl-3 mb-6">
            <h2 className="text-sm font-bold text-white">Daily Registrations (Last 7 Days)</h2>
          </div>
          <div className="h-[250px] w-full mt-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                 <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last7Days}>
                  <XAxis 
                    dataKey="dateStr" 
                    stroke="#ffffff40" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    domain={[0, 'dataMax + 5']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#10121a', borderColor: '#ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#06b6d4' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#06b6d4" 
                    strokeWidth={2}
                    dot={{ fill: '#06b6d4', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-[#10121a] border border-white/5 rounded-xl p-6">
          <div className="flex items-center gap-2 border-l-4 border-cyan-400 pl-3 mb-6">
            <h2 className="text-sm font-bold text-white">Team Size Distribution</h2>
          </div>
          <div className="h-[250px] w-full mt-4">
            {isLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                 <Loader2 className="w-6 h-6 animate-spin text-fuchsia-400" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sizeDistributionData} barSize={60}>
                  <XAxis 
                    dataKey="name" 
                    stroke="#ffffff40" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis 
                    stroke="#ffffff40" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                    dx={-10}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#10121a', borderColor: '#ffffff20', borderRadius: '8px' }}
                    itemStyle={{ color: '#e879f9' }}
                    labelStyle={{ color: '#fff' }}
                    cursor={{ fill: '#ffffff05' }}
                  />
                  <Bar dataKey="count" fill="#f0abfc">
                     {sizeDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#f472b6" />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Tools Row (Optional since they have the dashboard look) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/admin/event-management/battleground/attendance"
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white group-hover:text-blue-400 transition-colors text-sm">Mark Attendance</span>
          </div>
        </Link>
        <Link 
          href="/admin/event-management/battleground/member-lists"
          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl p-4 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 group-hover:scale-110 transition-transform">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white group-hover:text-amber-400 transition-colors text-sm">Document Editor</span>
          </div>
        </Link>
        <Link 
          href="/admin/event-management/battleground/certificates"
          className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl p-4 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="font-semibold text-white group-hover:text-purple-400 transition-colors text-sm">Issue Certificates</span>
          </div>
        </Link>
      </div>

      {/* Main Table Content */}
      <div className="bg-[#10121a] border border-white/5 rounded-xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-sm font-bold text-white">Recent Registrations</h2>
          
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#171923] border border-white/5 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Desktop View: Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#0d0f14]">
                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">Team Name (Click to View)</th>
                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">Lead</th>
                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">Size</th>
                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">Fee</th>
                <th className="px-5 py-4 text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-white/50">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-500" />
                    Connecting...
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-white/50">
                    {searchQuery ? "No matching registrations found." : "No recent registrations found."}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-white flex items-center gap-2">
                        {reg.teamName}
                        <div className="w-1 h-1 rounded-full bg-cyan-400"></div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-white/80 font-medium">{reg.leadName}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-white/80 font-medium">{getTeamSize(reg)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-green-400 font-medium">₹{getTeamFee(reg)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-[#0d0f14] border ${reg.status === "verified" ? "border-green-500/20 text-green-500" : "border-yellow-500/20 text-yellow-500"}`}>
                          {reg.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
