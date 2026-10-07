"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Loader2, AlertCircle, ArrowLeft, CheckCircle2, QrCode, X, Camera, Download, Users } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

import { useAuth } from "@/lib/contexts/AuthContext";

interface TeamRegistration {
  id: string;
  teamName: string;
  teamSize: number;
  leadName: string;
  leadRollNo: string;
  leadPhone: string;
  bgId: string;
  ticketId?: string;
  status: string;
  morningPresent?: string[];
  afternoonPresent?: string[];
  members: any[];
}

export default function BattleGroundAttendancePage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<TeamRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scannerSession, setScannerSession] = useState<"morning" | "afternoon">("morning");
  
  // Refs
  const registrationsRef = useRef(registrations);
  const lastScanRef = useRef<{text: string, time: number} | null>(null);
  const pendingTogglesRef = useRef<Set<string>>(new Set());
  const beepRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    registrationsRef.current = registrations;
  }, [registrations]);

  useEffect(() => {
    beepRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;

    const initScanner = setTimeout(() => {
      if (!isComponentMounted) return;
      
      html5QrCode = new Html5Qrcode("qr-reader");
      
      const config = { 
        fps: 10, 
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = 0.7;
          const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
          const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
          return { width: qrboxSize, height: qrboxSize };
        },
        aspectRatio: 1.0,
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        async (decodedText) => {
          const now = Date.now();
          if (lastScanRef.current && lastScanRef.current.text === decodedText && (now - lastScanRef.current.time) < 4000) {
            return;
          }
          lastScanRef.current = { text: decodedText, time: now };

          const currentRegs = registrationsRef.current;
          const reg = currentRegs.find(r => 
            r.bgId === decodedText || 
            r.id === decodedText || 
            r.leadRollNo === decodedText ||
            (r.ticketId && r.ticketId === decodedText)
          );
          
          if (reg) {
            if (beepRef.current) beepRef.current.play().catch(() => {});
            
            const currentArr = scannerSession === "morning" ? (reg.morningPresent || []) : (reg.afternoonPresent || []);
            const allMembers = [reg.leadRollNo, ...(reg.members || []).map(m => m.rollNo)].filter(Boolean);
            const isAllPresent = allMembers.every(roll => currentArr.includes(roll));

            if (isAllPresent) {
              toast.info(`Team ${reg.teamName} is already fully marked Present for ${scannerSession} session`);
            } else {
              await handleToggleAttendance(reg.id, false, scannerSession, undefined, true);
              toast.success(`Scanned: Team ${reg.teamName} marked Present for ${scannerSession}!`, {
                style: { background: '#22c55e', color: 'black', border: 'none' }
              });
            }
            
            if (html5QrCode && html5QrCode.getState() === 2) {
              html5QrCode.pause();
              setTimeout(() => {
                if (html5QrCode && html5QrCode.getState() === 3) {
                  html5QrCode.resume();
                }
              }, 2000);
            }
          } else {
            toast.error(`ID ${decodedText} not found in registrations.`);
            if (html5QrCode && html5QrCode.getState() === 2) {
              html5QrCode.pause();
              setTimeout(() => {
                if (html5QrCode && html5QrCode.getState() === 3) {
                  html5QrCode.resume();
                }
              }, 2000);
            }
          }
        },
        () => {}
      ).catch(err => {
        console.error("Error starting scanner", err);
        toast.error("Failed to start camera. Please check permissions.");
      });
    }, 100);

    return () => {
      isComponentMounted = false;
      clearTimeout(initScanner);
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          html5QrCode?.clear();
        }).catch(console.error);
      } else if (html5QrCode) {
        html5QrCode.clear();
      }
    };
  }, [isScanning]);

  useEffect(() => {
    fetchRegistrations(true);

    const refreshWhenVisible = () => {
      if (!document.hidden) fetchRegistrations(false);
    };
    const pollInterval = setInterval(() => {
      refreshWhenVisible();
    }, 10000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  async function fetchRegistrations(showLoader = false) {
    if (showLoader) setIsLoading(true);
    
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/battleground-registrations", { 
        cache: "no-store",
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch registrations");
      }
      
      if (data.success && data.data) {
        setRegistrations(prev => {
          const pendingIds = pendingTogglesRef.current;
          if (pendingIds.size === 0) return data.data;
          return data.data.map((fresh: TeamRegistration) =>
            pendingIds.has(fresh.id) && prev.find((p: TeamRegistration) => p.id === fresh.id)
              ? prev.find((p: TeamRegistration) => p.id === fresh.id)!
              : fresh
          );
        });
      }
    } catch (err: unknown) {
      console.error(err);
      if (showLoader) setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }

  async function handleToggleAttendance(
    regId: string, 
    currentStatus: boolean, 
    session: "morning" | "afternoon",
    rollNo?: string,
    markAll?: boolean
  ) {
    const updatingKey = `${regId}-${rollNo || 'all'}`;
    setUpdatingId(updatingKey);
    pendingTogglesRef.current.add(regId);
    
    // Optimistic update
    setRegistrations(prev => prev.map(reg => {
      if (reg.id !== regId) return reg;
      const arrKey = session === "morning" ? "morningPresent" : "afternoonPresent";
      let newArr = [...(reg[arrKey] || [])];
      
      if (markAll) {
        if (!currentStatus) {
          newArr = [reg.leadRollNo, ...(reg.members || []).map(m => m.rollNo)].filter(Boolean);
        } else {
          newArr = [];
        }
      } else if (rollNo) {
        if (!currentStatus) {
          if (!newArr.includes(rollNo)) newArr.push(rollNo);
        } else {
          newArr = newArr.filter(r => r !== rollNo);
        }
      }
      return { ...reg, [arrKey]: newArr };
    }));

    try {
      const token = user ? await user.getIdToken() : null;
      const res = await fetch("/api/battleground-registrations/attendance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          registrationId: regId,
          status: !currentStatus,
          session,
          rollNo,
          markAll
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update attendance");
      }
      
      toast.success("Attendance updated");
    } catch (err: unknown) {
      // Revert optimistic update
      setRegistrations(prev => prev.map(reg => {
        if (reg.id !== regId) return reg;
        const arrKey = session === "morning" ? "morningPresent" : "afternoonPresent";
        let newArr = [...(reg[arrKey] || [])];
        
        if (markAll) {
          if (currentStatus) {
            newArr = [reg.leadRollNo, ...(reg.members || []).map(m => m.rollNo)].filter(Boolean);
          } else {
            newArr = [];
          }
        } else if (rollNo) {
          if (currentStatus) {
            if (!newArr.includes(rollNo)) newArr.push(rollNo);
          } else {
            newArr = newArr.filter(r => r !== rollNo);
          }
        }
        return { ...reg, [arrKey]: newArr };
      }));
      toast.error("Error: " + (err instanceof Error ? err.message : "Unable to update attendance"));
    } finally {
      setUpdatingId(null);
      pendingTogglesRef.current.delete(regId);
    }
  }

  const downloadAttendanceCsv = () => {
    const escape = (value: string | boolean | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const rows = [
      ["Team Name", "BG ID", "Lead Name", "Lead Roll", "Lead Phone", "Team Size", "Morning Present", "Afternoon Present"],
      ...filteredRegistrations.map((reg) => [
        reg.teamName,
        reg.bgId,
        reg.leadName,
        reg.leadRollNo,
        reg.leadPhone,
        reg.teamSize,
        reg.morningPresent?.length || 0,
        reg.afternoonPresent?.length || 0,
      ]),
    ];
    const csv = rows.map((row) => row.map(escape).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "battleground-attendance.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredRegistrations = registrations.filter(reg => {
    const query = searchQuery.toLowerCase();
    return (
      reg.teamName.toLowerCase().includes(query) ||
      reg.leadRollNo.toLowerCase().includes(query) ||
      reg.bgId.toLowerCase().includes(query) ||
      reg.leadName.toLowerCase().includes(query)
    );
  });

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-[#0C0C0E] p-8 rounded-3xl border border-white/5 relative overflow-hidden flex flex-col gap-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href="/admin/event-management/battleground" className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to BattleGround
            </Link>
            <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-orange-500" />
              Team Attendance
            </h1>
            <p className="text-white/60">Mark attendance for BattleGround participating teams.</p>
          </div>
          <button
            onClick={() => setIsScanning(true)}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-4 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <QrCode className="w-6 h-6" />
            Scan QR
          </button>
          <button
            onClick={downloadAttendanceCsv}
            disabled={filteredRegistrations.length === 0}
            className="flex items-center justify-center gap-2 w-full md:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl border border-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
        </div>
        
        <div className="relative z-10">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by team name, lead name, roll no, or BG ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111114] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      </div>

      {/* QR Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0C0C0E] md:p-6 md:items-center md:justify-center">
          <div className="bg-[#111114] md:border border-white/10 md:rounded-3xl p-4 md:p-6 w-full max-w-md mx-auto flex flex-col h-full md:h-auto relative overflow-hidden shadow-2xl">
            
            <div className="flex justify-between items-center mb-6 pt-2 md:pt-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-500" />
                Scan QR Code
              </h2>
              <button 
                onClick={() => setIsScanning(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 md:h-[400px] bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-inner">
              <div id="qr-reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
              <style dangerouslySetInnerHTML={{__html: `
                #qr-reader { border: none !important; }
                #qr-reader__scan_region { background: black; }
                #qr-reader__dashboard { display: none !important; }
              `}} />
            </div>
            
            <div className="text-center text-white/50 text-sm mt-6 font-medium">
              Point camera at ticket.<br />
              <div className="flex justify-center gap-2 mt-4 p-1 bg-white/5 rounded-xl w-max mx-auto">
                <button
                  onClick={() => setScannerSession("morning")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    scannerSession === "morning" ? "bg-orange-500 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  Morning Session
                </button>
                <button
                  onClick={() => setScannerSession("afternoon")}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    scannerSession === "afternoon" ? "bg-orange-500 text-white" : "text-white/50 hover:text-white"
                  }`}
                >
                  Afternoon Session
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        {/* Desktop View: Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Team Name & ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Team Members (Attendance)</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-center">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                    Fetching data from Battleground database...
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    {searchQuery ? "No matching teams found." : "No teams found in the database yet."}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{reg.teamName}</div>
                      <div className="text-xs text-white/40 font-mono mt-0.5">{reg.bgId}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        {/* Lead */}
                        <div className="flex items-center justify-between gap-4 p-2 rounded-lg bg-orange-500/5 border border-orange-500/10">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white/90">{reg.leadName} <span className="text-[10px] text-orange-500/80 uppercase tracking-wider">(Lead)</span></span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-orange-500/10 text-orange-500 font-mono text-[10px] font-semibold border border-orange-500/20">
                              {reg.leadRollNo}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleAttendance(reg.id, (reg.morningPresent || []).includes(reg.leadRollNo), "morning", reg.leadRollNo, true)}
                              disabled={updatingId === `${reg.id}-all`}
                              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                (reg.morningPresent || []).includes(reg.leadRollNo)
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                                  : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                              }`}
                              title="Mark/Unmark all for Morning"
                            >
                              {updatingId === `${reg.id}-all` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              M
                            </button>
                            <button
                              onClick={() => handleToggleAttendance(reg.id, (reg.afternoonPresent || []).includes(reg.leadRollNo), "afternoon", reg.leadRollNo, true)}
                              disabled={updatingId === `${reg.id}-all`}
                              className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                                (reg.afternoonPresent || []).includes(reg.leadRollNo)
                                  ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                                  : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                              }`}
                              title="Mark/Unmark all for Afternoon"
                            >
                              {updatingId === `${reg.id}-all` ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                              A
                            </button>
                          </div>
                        </div>
                        {/* Members */}
                        {reg.members && reg.members.length > 0 && (
                          <div className="flex flex-col gap-1 pl-2 border-l border-white/10 ml-2">
                            {reg.members.map((m: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between gap-4 py-1.5 pr-1 hover:bg-white/[0.02] rounded px-2 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/60">{m.name || "Unknown"}</span>
                                  <span className="font-mono text-[10px] text-white/40">{m.rollNo || "Unknown"}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleToggleAttendance(reg.id, (reg.morningPresent || []).includes(m.rollNo), "morning", m.rollNo)}
                                    disabled={updatingId === `${reg.id}-${m.rollNo}`}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                                      (reg.morningPresent || []).includes(m.rollNo)
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                                    }`}
                                    title="Mark Morning"
                                  >
                                    {updatingId === `${reg.id}-${m.rollNo}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "M"}
                                  </button>
                                  <button
                                    onClick={() => handleToggleAttendance(reg.id, (reg.afternoonPresent || []).includes(m.rollNo), "afternoon", m.rollNo)}
                                    disabled={updatingId === `${reg.id}-${m.rollNo}`}
                                    className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold transition-all ${
                                      (reg.afternoonPresent || []).includes(m.rollNo)
                                        ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                                    }`}
                                    title="Mark Afternoon"
                                  >
                                    {updatingId === `${reg.id}-${m.rollNo}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "A"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-white/80 text-sm font-semibold border border-white/10">
                        {reg.teamSize}
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
