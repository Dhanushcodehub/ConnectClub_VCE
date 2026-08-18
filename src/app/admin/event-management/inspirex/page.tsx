"use client";

import { useEffect, useState } from "react";
import { Search, Ticket, Users, FileCheck, Loader2, AlertCircle, ShieldCheck } from "lucide-react";

interface Registration {
  id: string;
  name: string;
  branch: string;
  rollNo: string;
  year: string;
  email: string;
  registeredAt: string | null;
  isConnectClubMember?: boolean;
}

export default function InspirexAdminPage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inspirex-registrations", { cache: "no-store" });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch registrations");
      }
      
      if (data.success && data.data) {
        setRegistrations(data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter(reg => {
    const query = searchQuery.toLowerCase();
    return (
      reg.name.toLowerCase().includes(query) ||
      reg.rollNo.toLowerCase().includes(query) ||
      reg.branch.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#0C0C0E] p-8 rounded-3xl border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <Ticket className="w-8 h-8 text-primary" />
            InspireX Registrations
          </h1>
          <p className="text-white/60">Manage and view participants from the external InspireX database.</p>
        </div>
        
        <button 
          onClick={() => alert("Certificate Generation phase coming soon! This will match these Roll Numbers with Connect Club users.")}
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 relative z-10"
        >
          <FileCheck className="w-5 h-5" />
          Issue Certificates
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">Total Registrations</div>
            <div className="text-3xl font-bold text-white">{registrations.length}</div>
          </div>
        </div>

        <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl p-6 flex items-center gap-6">
          <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-7 h-7 text-green-500" />
          </div>
          <div>
            <div className="text-sm font-medium text-white/50 uppercase tracking-wider mb-1">CC Members</div>
            <div className="text-3xl font-bold text-white flex items-end gap-2">
              {registrations.filter(r => r.isConnectClubMember).length}
              <span className="text-sm text-white/40 font-normal mb-1">/ {registrations.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-bold text-red-500 mb-2">Connection Error</h3>
            <p className="text-white/80">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-[#0C0C0E] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-xl font-bold text-white">Participants Directory</h2>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by name, roll no, or branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111114] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Roll No</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Branch & Year</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Registered</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/50">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                    Fetching data from InspireX database...
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-white/50">
                    {searchQuery ? "No matching registrations found." : "No registrations found in the database yet."}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white flex items-center gap-2">
                        {reg.name}
                        {reg.isConnectClubMember && (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0" title="Connect Club Member">
                            <ShieldCheck className="w-3 h-3" />
                            Member
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-primary/10 text-primary font-mono text-xs font-semibold border border-primary/20">
                        {reg.rollNo}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-white/80">{reg.branch}</div>
                      <div className="text-xs text-white/40 mt-0.5">{reg.year}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {reg.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">
                      {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString() : "Unknown"}
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
