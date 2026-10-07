"use client";

import { useEffect, useState } from "react";
import { Search, Ticket, Users, Loader2, AlertCircle, CheckCircle2, Calendar, Briefcase, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import Link from "next/link";

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

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0C0C0E] p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-orange-500" />
            BattleGrounds Directory
          </h1>
          <p className="text-white/60">View live external registrations for BattleGround 2k26.</p>
        </div>

        <div className="relative z-10">
          <button 
            onClick={fetchRegistrations} 
            disabled={isLoading}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-orange-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">Total Teams</div>
            <div className="text-3xl font-bold text-white">{registrations.length}</div>
          </div>
        </div>

        <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">Total Members</div>
            <div className="text-3xl font-bold text-white">
              {registrations.reduce((acc, reg) => acc + (reg.members?.length || 0) + 1, 0)}
            </div>
          </div>
        </div>

        <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">Verified Teams</div>
            <div className="text-3xl font-bold text-white">
              {registrations.filter(r => r.status === "verified").length}
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-2">Error</h3>
            <p className="text-white/80">{error}</p>
          </div>
        </div>
      )}

      {/* Quick Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link 
          href="/admin/event-management/battleground/attendance"
          className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="font-bold text-white group-hover:text-blue-400 transition-colors">Mark Attendance</span>
          </div>
        </Link>
        <Link 
          href="/admin/event-management/battleground/member-lists"
          className="bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform">
              <Briefcase className="w-5 h-5" />
            </div>
            <span className="font-bold text-white group-hover:text-amber-400 transition-colors">Document Editor</span>
          </div>
        </Link>
        <Link 
          href="/admin/event-management/battleground/certificates"
          className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-2xl p-5 flex items-center justify-between transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="font-bold text-white group-hover:text-purple-400 transition-colors">Issue Certificates</span>
          </div>
        </Link>
      </div>

      {/* Main Content */}
      <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-white">Participants Directory</h2>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by team name, lead name, roll no, or BG ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111114] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Desktop View: Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Team Name (BG ID)</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Members</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                    Connecting to live BattleGrounds Database...
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    {searchQuery ? "No matching registrations found." : "No registrations found in the 'registrations' collection."}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex flex-col gap-1">
                        <span>{reg.teamName}</span>
                        <span className="text-xs text-white/40 font-mono">{reg.bgId}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {/* Lead */}
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/90">{reg.leadName} (Lead)</span>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-mono text-[10px] font-semibold border border-orange-500/20">
                            {reg.leadRollNo}
                          </span>
                        </div>
                        {/* Other Members */}
                        {reg.members && reg.members.length > 0 && (
                          <div className="flex flex-col gap-1 border-l-2 border-white/10 pl-2 ml-1">
                            {reg.members.map((member: any, i: number) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="text-xs text-white/70">{member.name}</span>
                                <span className="text-[9px] text-white/40 font-mono">{member.roll || member.rollNo}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right align-top">
                      <div className="flex flex-col items-end">
                        <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${reg.status === "verified" ? "text-green-400" : "text-amber-300"}`}>
                          <CheckCircle2 className="w-3 h-3" /> {reg.status}
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
