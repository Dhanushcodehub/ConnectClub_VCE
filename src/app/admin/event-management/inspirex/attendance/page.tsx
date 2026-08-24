"use client";

import { useEffect, useState, useRef } from "react";
import { Search, Loader2, AlertCircle, ArrowLeft, Sun, Moon, CheckCircle2, QrCode, X, Camera } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";

interface Registration {
  id: string;
  name: string;
  branch: string;
  rollNo: string;
  year: string;
  email: string;
  registeredAt: string | null;
  isConnectClubMember?: boolean;
  morningAttendance: boolean;
  afternoonAttendance: boolean;
}

export default function InspirexAttendancePage() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Scanner State
  const [isScanning, setIsScanning] = useState(false);
  const [scanSession, setScanSession] = useState<"morning" | "afternoon">("morning");
  
  // Audio for scan beep
  const beepRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize beep sound
    beepRef.current = new Audio("https://actions.google.com/sounds/v1/alarms/beep_short.ogg");
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    let html5QrCode: Html5Qrcode | null = null;
    let isComponentMounted = true;

    // Small delay to ensure the modal DOM is fully rendered
    const initScanner = setTimeout(() => {
      if (!isComponentMounted) return;
      
      html5QrCode = new Html5Qrcode("qr-reader");
      
      const config = { 
        fps: 10, 
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdgePercentage = 0.7; // 70% of the smallest edge
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
          // Success callback
          const reg = registrations.find(r => r.rollNo === decodedText || r.id === decodedText);
          
          if (reg) {
            if (beepRef.current) beepRef.current.play().catch(e => console.log(e));
            
            const isAlreadyPresent = scanSession === "morning" ? reg.morningAttendance : reg.afternoonAttendance;
            if (isAlreadyPresent) {
              toast.info(`${reg.name} is already marked Present for ${scanSession}`);
            } else {
              await handleToggleAttendance(reg.id, scanSession, false);
              toast.success(`Scanned: ${reg.name} marked Present!`, {
                style: { background: '#22c55e', color: 'black', border: 'none' }
              });
            }
            
            // Pause scanner to prevent double scanning
            if (html5QrCode && html5QrCode.getState() === 2) {
              html5QrCode.pause();
              setTimeout(() => {
                if (html5QrCode && html5QrCode.getState() === 3) {
                  html5QrCode.resume();
                }
              }, 2000);
            }
          } else {
            toast.error(`Roll Number ${decodedText} not found in registrations.`);
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
        (error) => {
          // Ignore normal scanning frame errors
        }
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
  }, [isScanning, scanSession, registrations]);

  useEffect(() => {
    fetchRegistrations(true);

    // Set up polling for real-time sync across multiple admins (every 3 seconds)
    const pollInterval = setInterval(() => {
      fetchRegistrations(false);
    }, 3000);

    return () => clearInterval(pollInterval);
  }, []);

  const fetchRegistrations = async (showLoader = false) => {
    if (showLoader) setIsLoading(true);
    
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
      if (showLoader) setError(err.message || "An unexpected error occurred.");
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  const handleToggleAttendance = async (regId: string, session: "morning" | "afternoon", currentStatus: boolean) => {
    setUpdatingId(regId + session);
    
    // Optimistic update
    setRegistrations(prev => prev.map(reg => 
      reg.id === regId 
        ? { ...reg, [session === "morning" ? "morningAttendance" : "afternoonAttendance"]: !currentStatus }
        : reg
    ));

    try {
      const res = await fetch("/api/inspirex-registrations/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationId: regId,
          session,
          status: !currentStatus
        })
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update attendance");
      }
      
      toast.success(`${session === "morning" ? "Morning" : "Afternoon"} attendance updated`);
    } catch (err: any) {
      // Revert optimistic update
      setRegistrations(prev => prev.map(reg => 
        reg.id === regId 
          ? { ...reg, [session === "morning" ? "morningAttendance" : "afternoonAttendance"]: currentStatus }
          : reg
      ));
      toast.error("Error: " + err.message);
    } finally {
      setUpdatingId(null);
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
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="relative z-10">
          <Link href="/admin/event-management/inspirex" className="inline-flex items-center text-sm font-medium text-white/50 hover:text-white mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to InspireX
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                Attendance System
              </h1>
              <p className="text-white/60">Mark morning and afternoon attendance for participants.</p>
            </div>
            <button
              onClick={() => setIsScanning(true)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl transition-colors"
            >
              <QrCode className="w-5 h-5" />
              Scan QR
            </button>
          </div>
        </div>
        
        <div className="relative z-10 w-full mt-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            placeholder="Search by name, roll no, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111114] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-500/50 transition-colors"
          />
        </div>
      </div>

      {/* QR Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#0C0C0E] md:p-6 md:items-center md:justify-center">
          <div className="bg-[#111114] md:border border-white/10 md:rounded-3xl p-4 md:p-6 w-full max-w-md mx-auto flex flex-col h-full md:h-auto relative overflow-hidden shadow-2xl">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-6 pt-2 md:pt-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-green-400" />
                Scan QR Code
              </h2>
              <button 
                onClick={() => setIsScanning(false)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Toggles */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setScanSession("morning")}
                className={`flex-1 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base transition-colors ${scanSession === "morning" ? "bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.3)]" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
              >
                Morning
              </button>
              <button
                onClick={() => setScanSession("afternoon")}
                className={`flex-1 py-3 md:py-4 rounded-xl font-bold text-sm md:text-base transition-colors ${scanSession === "afternoon" ? "bg-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.3)]" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"}`}
              >
                Afternoon
              </button>
            </div>
            
            {/* Camera Viewport */}
            <div className="flex-1 md:h-[400px] bg-black rounded-2xl overflow-hidden relative flex items-center justify-center border border-white/10 shadow-inner">
              <div id="qr-reader" className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"></div>
              
              {/* Custom CSS overrides for html5-qrcode injected elements */}
              <style dangerouslySetInnerHTML={{__html: `
                #qr-reader { border: none !important; }
                #qr-reader__scan_region { background: black; }
                #qr-reader__dashboard { display: none !important; } /* Hide the default UI completely */
              `}} />
            </div>
            
            <p className="text-center text-white/50 text-sm mt-6 font-medium">
              Point camera at ticket.<br />Scanning for <strong className="text-white">{scanSession === "morning" ? "Morning Session" : "Afternoon Session"}</strong>
            </p>
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
        {/* Mobile View: Card List */}
        <div className="block md:hidden divide-y divide-white/5">
          {isLoading ? (
            <div className="p-12 text-center text-white/50">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-400" />
              Fetching data...
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="p-12 text-center text-white/50">
              {searchQuery ? "No matching registrations found." : "No registrations found in the database yet."}
            </div>
          ) : (
            filteredRegistrations.map((reg) => (
              <div key={reg.id} className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white text-base truncate">{reg.name}</div>
                    <div className="text-sm text-white/50 truncate mt-0.5">{reg.branch}</div>
                  </div>
                  <div className="px-2.5 py-1 bg-white/5 rounded-md text-white/80 font-mono text-xs font-bold border border-white/10 whitespace-nowrap">
                    {reg.rollNo}
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleToggleAttendance(reg.id, "morning", reg.morningAttendance)}
                    disabled={updatingId === reg.id + "morning"}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                      reg.morningAttendance
                        ? "bg-green-500/20 text-green-400 border border-green-500/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]"
                        : "bg-white/5 text-white/50 border border-white/10"
                    }`}
                  >
                    {updatingId === reg.id + "morning" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sun className="w-3.5 h-3.5" />
                    )}
                    {reg.morningAttendance ? "Present" : "Mark AM"}
                  </button>
                  <button
                    onClick={() => handleToggleAttendance(reg.id, "afternoon", reg.afternoonAttendance)}
                    disabled={updatingId === reg.id + "afternoon"}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                      reg.afternoonAttendance
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                        : "bg-white/5 text-white/50 border border-white/10"
                    }`}
                  >
                    {updatingId === reg.id + "afternoon" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Moon className="w-3.5 h-3.5" />
                    )}
                    {reg.afternoonAttendance ? "Present" : "Mark PM"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Student Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider">Roll No</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-center">Morning Session</th>
                <th className="px-6 py-4 text-xs font-semibold text-white/50 uppercase tracking-wider text-center">Afternoon Session</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-400" />
                    Fetching data from InspireX database...
                  </td>
                </tr>
              ) : filteredRegistrations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-white/50">
                    {searchQuery ? "No matching registrations found." : "No registrations found in the database yet."}
                  </td>
                </tr>
              ) : (
                filteredRegistrations.map((reg) => (
                  <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{reg.name}</div>
                      <div className="text-xs text-white/40 mt-0.5">{reg.branch}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-white/5 text-white/80 font-mono text-xs font-semibold border border-white/10">
                        {reg.rollNo}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleAttendance(reg.id, "morning", reg.morningAttendance)}
                        disabled={updatingId === reg.id + "morning"}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          reg.morningAttendance
                            ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {updatingId === reg.id + "morning" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sun className="w-4 h-4" />
                        )}
                        {reg.morningAttendance ? "Present" : "Mark"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleToggleAttendance(reg.id, "afternoon", reg.afternoonAttendance)}
                        disabled={updatingId === reg.id + "afternoon"}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          reg.afternoonAttendance
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30"
                            : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {updatingId === reg.id + "afternoon" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Moon className="w-4 h-4" />
                        )}
                        {reg.afternoonAttendance ? "Present" : "Mark"}
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
  );
}
