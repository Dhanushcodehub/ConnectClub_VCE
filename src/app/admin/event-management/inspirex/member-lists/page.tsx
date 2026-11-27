"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileSpreadsheet,
  ArrowLeft,
  Download,
  Loader2,
  Trash2,
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Save,
  CheckCircle2,
  FileText,
  Layers,
  Eye,
  ChevronDown
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/AuthContext";

// --- Types ---
interface PreviewRow {
  sno: number;
  name: string;
  branch: string;
  year: string;
  section: string;
  rollNo: string;
  selected?: boolean; // For excluding specific rows
}

interface DocumentGroup {
  key: string;
  label: string;
  filename: string;
  rows: PreviewRow[];
}

interface Registration {
  id: string;
  name: string;
  branch: string;
  rollNo: string;
  year: string;
  section: string;
}

// CSE cluster definitions
const CSE_CLUSTERS: Record<string, string[]> = {
  "Cluster 1": ["A", "B", "C"],
  "Cluster 2": ["D", "E", "F"],
  "Cluster 3": ["G", "H", "I"],
  "Cluster 4": ["J", "K", "L"],
  "Cluster 5": ["M", "N", "O"],
  "Cluster 6": ["P", "Q", "R"],
};

function getCSECluster(section: string) {
  for (const [cluster, sections] of Object.entries(CSE_CLUSTERS)) {
    if (sections.includes(section)) return cluster;
  }
  return null;
}

export default function MemberListsPage() {
  const { user, role } = useAuth();
  const [documents, setDocuments] = useState<DocumentGroup[]>([]);
  const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [mobileTab, setMobileTab] = useState<"list" | "preview">("preview");

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setZoom(0.45);
    }
  }, []);
  const [para1, setPara1] = useState("Connect Club, Vardhaman College of Engineering is organizing \"InspireX Season 2\", a premier tech and design event, to be held at Vardhaman College of Engineering.");
  const [para2, setPara2] = useState("We kindly request that permission be granted to mark attendance for the below-listed students for their participation in this event.");
  
  const [columns, setColumns] = useState({
    sno: true,
    rollNo: true,
    name: true,
    branch: true,
    year: true,
    section: true,
    signature: false
  });

  // --- Fetch and Group Data on Load ---
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const token = await user?.getIdToken();
        const res = await fetch("/api/inspirex-registrations", {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        
        if (!res.ok) {
          const text = await res.text();
          let errData;
          try { errData = JSON.parse(text); } catch(e) {}
          throw new Error(errData?.error || `HTTP ${res.status}: ${text.substring(0, 50)}`);
        }
        
        const data = await res.json();
        
        if (!data.success) throw new Error(data.error || "Failed to fetch registrations");

        const allRegistrations: any[] = data.data;
        const groups: Record<string, { label: string; rows: any[]; filename: string }> = {};

        // Segregate by Year, then Sort by roll number
        const yearOrder: Record<string, number> = {
          "1st Year": 1,
          "2nd Year": 2,
          "3rd Year": 3,
          "4th Year": 4
        };
        
        const sorted = [...allRegistrations].sort((a, b) => {
          const yA = yearOrder[a.year] || 99;
          const yB = yearOrder[b.year] || 99;
          if (yA !== yB) return yA - yB;
          const sA = (a.section || "").toUpperCase();
          const sB = (b.section || "").toUpperCase();
          if (sA !== sB) return sA.localeCompare(sB);
          return (a.rollNo || "").localeCompare(b.rollNo || "");
        });

        // Grouping logic
        for (const reg of sorted) {
          const branch = (reg.branch || "Unknown").toUpperCase().trim();
          const section = (reg.section || "").toUpperCase().trim();
          
          if (branch === "CSE" || branch.includes("CSE")) {
            const cluster = getCSECluster(section);
            const key = cluster ? `CSE_${cluster}` : "CSE_Unknown";
            const label = cluster ? `CSE – ${cluster}` : "CSE – Unknown Section";
            const clusterNum = cluster ? cluster.replace("Cluster ", "") : "X";
            const sections = cluster ? CSE_CLUSTERS[cluster].join("") : "X";
            if (!groups[key]) {
              groups[key] = {
                label,
                rows: [],
                filename: `CSE_CLUSTER_${clusterNum}_${sections}_LIST.docx`,
              };
            }
            groups[key].rows.push(reg);
          } else {
            const key = branch;
            if (!groups[key]) {
              groups[key] = {
                label: branch,
                rows: [],
                filename: `${branch}_LIST.docx`,
              };
            }
            groups[key].rows.push(reg);
          }
        }

        // Map to DocumentGroup
        const docList: DocumentGroup[] = Object.entries(groups).map(([key, g]) => ({
          key,
          label: g.label,
          filename: g.filename,
          rows: g.rows.map((r, i) => ({
            sno: i + 1,
            name: r.name,
            branch: branchFormatter(r.branch),
            year: r.year,
            section: r.section || "–",
            rollNo: r.rollNo,
            selected: true // By default, all rows are selected
          }))
        }));

        setDocuments(docList);
        if (docList.length > 0) {
          setSelectedDocKey(docList[0].key);
        }

      } catch (err: any) {
        console.error(err);
        toast.error(err.message || "Error loading registration data");
      } finally {
        setIsLoading(false);
      }
    }
    if (user) {
      fetchData();
    }
  }, [user]);

  // Format branches for display in the table
  const branchFormatter = (b: string) => {
      const u = (b || "").toUpperCase().trim();
      return u;
  };

  const selectedDoc = useMemo(() => {
    return documents.find(d => d.key === selectedDocKey) || null;
  }, [documents, selectedDocKey]);

  // --- Editing Handlers ---
  const handleCellEdit = (docKey: string, rowIdx: number, field: keyof PreviewRow, value: string) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => {
        if (doc.key !== docKey) return doc;
        const newRows = [...doc.rows];
        newRows[rowIdx] = { ...newRows[rowIdx], [field]: value };
        return { ...doc, rows: newRows };
      })
    );
  };

  const addRow = (docKey: string, afterIdx?: number) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => {
        if (doc.key !== docKey) return doc;
        const newRows = [...doc.rows];
        const newRow: PreviewRow = {
          sno: 0, // Recalculated below
          name: "",
          branch: doc.label.includes("CSE") ? "CSE" : doc.label,
          year: "1st Year",
          section: "–",
          rollNo: ""
        };
        
        if (afterIdx !== undefined) {
           newRows.splice(afterIdx + 1, 0, newRow);
        } else {
           newRows.push(newRow);
        }
        
        // Recalculate SNO
        return { 
          ...doc, 
          rows: newRows.map((r, i) => ({ ...r, sno: i + 1 })) 
        };
      })
    );
  };

  const removeRow = (docKey: string, rowIdx: number) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => {
        if (doc.key !== docKey) return doc;
        const newRows = doc.rows.filter((_, i) => i !== rowIdx);
        // Recalculate SNO
        return { 
          ...doc, 
          rows: newRows.map((r, i) => ({ ...r, sno: i + 1 })) 
        };
      })
    );
  };


  // --- Generation ---
  const downloadDocument = async (doc: DocumentGroup) => {
    setIsGenerating(true);
    try {
      const payloadDocs = [{
        ...doc,
        rows: doc.rows.filter(r => r.selected !== false) // Only selected rows
      }];
      
      const res = await fetch("/api/generate-member-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: payloadDocs, columns, para1, para2 }),
      });
      if (!res.ok) throw new Error("Generation failed");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${doc.filename}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAll = async () => {
    if (documents.length === 0) return;
    setIsGenerating(true);
    try {
      const payloadDocs = documents.map(doc => ({
        ...doc,
        rows: doc.rows.filter(r => r.selected !== false)
      }));

      const res = await fetch("/api/generate-member-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: payloadDocs, columns, para1, para2 }),
      });
      if (!res.ok) throw new Error("Generation failed");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "member_lists.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded all lists");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };


  // --- Render Helpers ---
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.1, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3));
  const resetZoom = () => setZoom(typeof window !== "undefined" && window.innerWidth < 768 ? 0.45 : 1);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p className="text-white/60 font-medium tracking-wider text-sm uppercase">Assembling Documents...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col bg-[#0c0c0e] overflow-hidden">
      
      {/* Top Navigation Bar */}
      <div className="h-14 sm:h-16 shrink-0 border-b border-white/5 px-3 sm:px-6 flex items-center justify-between bg-[#0c0c0e]/90 backdrop-blur-md z-20 gap-2">
         <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              href={role === "admin" ? "/admin/event-management/inspirex" : "/member/dashboard"}
              className="p-1.5 sm:p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
               <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)] shrink-0">
                  <FileText className="w-4 h-4 text-black" />
               </div>
               <div className="min-w-0">
                 <h1 className="text-sm sm:text-lg font-bold text-white leading-tight truncate">Document Editor</h1>
                 <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-white/40 truncate hidden sm:block">InspireX Attendance Lists</p>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-2 shrink-0">
             {/* Mobile View Switcher */}
             <div className="flex md:hidden bg-white/5 border border-white/10 rounded-lg p-0.5">
               <button
                 type="button"
                 onClick={() => setMobileTab("list")}
                 className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                   mobileTab === "list" ? "bg-amber-500 text-black font-bold shadow-sm" : "text-white/60 hover:text-white"
                 }`}
               >
                 <Layers className="w-3.5 h-3.5" />
                 <span>Lists</span>
               </button>
               <button
                 type="button"
                 onClick={() => setMobileTab("preview")}
                 className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                   mobileTab === "preview" ? "bg-amber-500 text-black font-bold shadow-sm" : "text-white/60 hover:text-white"
                 }`}
               >
                 <Eye className="w-3.5 h-3.5" />
                 <span>Preview</span>
               </button>
             </div>

             <button
                onClick={downloadAll}
                disabled={isGenerating || documents.length === 0}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm shrink-0 shadow-lg shadow-amber-500/10 active:scale-95"
              >
                {isGenerating ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">Download All (.zip)</span>
                <span className="sm:hidden">Zip</span>
             </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Document List */}
        <div 
          className={`
            border-r border-white/5 bg-[#0c0c0e] flex flex-col z-10
            ${mobileTab === "list" ? "w-full flex" : "hidden"}
            md:flex md:w-72 md:shrink-0
          `}
        >
          <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Generated Documents ({documents.length})</h2>
            <span className="text-[10px] text-white/40 md:hidden">Tap to preview</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 custom-scrollbar">
             {documents.map(doc => (
                <button
                  key={doc.key}
                  onClick={() => {
                    setSelectedDocKey(doc.key);
                    setMobileTab("preview");
                  }}
                  className={`w-full text-left px-3.5 sm:px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                    selectedDocKey === doc.key 
                      ? "bg-amber-500/10 border border-amber-500/20" 
                      : "border border-white/5 hover:border-white/10 hover:bg-white/[0.02]"
                  }`}
                >
                   <div className="min-w-0 pr-2">
                      <p className={`text-sm font-bold truncate ${selectedDocKey === doc.key ? "text-amber-400" : "text-white"}`}>
                        {doc.label}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">{doc.rows.length} records</p>
                   </div>
                   <div className="flex items-center gap-1.5 shrink-0">
                     {selectedDocKey === doc.key ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                     ) : (
                        <span className="text-[11px] text-white/30 group-hover:text-white/60 md:hidden">View →</span>
                     )}
                   </div>
                </button>
             ))}
          </div>
        </div>

        {/* Main Workspace - Simulator */}
        <div 
          className={`
            flex-1 bg-[#111114] relative flex flex-col overflow-hidden
            ${mobileTab === "preview" ? "flex" : "hidden"}
            md:flex
          `}
          style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)", backgroundSize: "30px 30px" }}
        >
            {/* Mobile quick document switcher bar */}
            <div className="md:hidden flex items-center justify-between px-3 py-2 bg-[#0c0c0e]/90 border-b border-white/5 z-20">
               <div className="flex items-center gap-2 min-w-0 flex-1">
                 <button
                   onClick={() => setMobileTab("list")}
                   className="text-xs text-amber-400 font-semibold flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg shrink-0"
                 >
                   <Layers className="w-3.5 h-3.5" />
                   <span>Lists</span>
                 </button>
                 {selectedDoc && (
                   <div className="relative flex-1 min-w-0">
                     <select
                       value={selectedDocKey || ""}
                       onChange={(e) => setSelectedDocKey(e.target.value)}
                       className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white appearance-none pr-6 truncate font-medium focus:outline-none"
                     >
                       {documents.map((d) => (
                         <option key={d.key} value={d.key} className="bg-[#111114] text-white">
                           {d.label} ({d.rows.length})
                         </option>
                       ))}
                     </select>
                     <ChevronDown className="w-3.5 h-3.5 text-white/40 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                   </div>
                 )}
               </div>
            </div>

            {/* Toolbar */}
            <div className="absolute top-12 sm:top-6 right-3 sm:right-8 z-20 flex items-center gap-1 sm:gap-2 bg-[#0c0c0e]/90 backdrop-blur-md border border-white/10 rounded-full px-1.5 sm:px-2 py-1 sm:py-1.5 shadow-2xl scale-90 sm:scale-100">
               <button onClick={handleZoomOut} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Zoom Out">
                  <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <span className="text-[11px] sm:text-xs font-mono font-medium text-white/80 w-10 sm:w-12 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={handleZoomIn} className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors" title="Zoom In">
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
               <div className="w-px h-3 sm:h-4 bg-white/10 mx-0.5 sm:mx-1" />
               <button 
                 onClick={resetZoom} 
                 className="p-1 sm:p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                 title="Fit / Reset"
               >
                  <Maximize className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
               </button>
            </div>

            {/* Document Container */}
            <div className="flex-1 overflow-auto custom-scrollbar flex justify-center items-start py-6 sm:py-12 px-2 sm:px-8 relative" id="workspace-scroll-area">
                {selectedDoc && (
                   <div 
                     className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-200 origin-top flex flex-col"
                     style={{ 
                        width: "210mm", 
                        minHeight: "297mm", 
                        transform: `scale(${zoom})`,
                        marginBottom: "100px" // give room at the bottom when scaled
                     }}
                   >
                      {/* Actual Letterhead Visual */}
                      <div className="w-full flex items-start justify-center pt-10 pb-6 px-12 text-black">
                          {/* Center Text */}
                          <div className="flex-1 text-center font-serif text-black flex flex-col items-center px-4" style={{ fontFamily: "Arial, sans-serif" }}>
                              <textarea 
                                value={para1}
                                onChange={(e) => setPara1(e.target.value)}
                                className="w-[120%] text-[13px] leading-tight text-center font-medium mb-3 bg-transparent hover:bg-gray-100/50 outline-none resize-none overflow-hidden focus:bg-gray-100/50 text-black"
                                rows={3}
                              />
                              <textarea 
                                value={para2}
                                onChange={(e) => setPara2(e.target.value)}
                                className="w-[120%] text-[13px] leading-tight text-center font-medium mb-4 bg-transparent hover:bg-gray-100/50 outline-none resize-none overflow-hidden focus:bg-gray-100/50 text-black"
                                rows={2}
                              />
                          </div>
                      </div>

                      {/* Document Body */}
                      <div className="flex-1 p-16 pt-0">
                          
                          {/* Add Row Top Control & Column Toggles */}
                          <div className="w-full h-8 -mt-4 mb-6 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity group relative z-20">
                             <div className="h-px w-full bg-blue-400/50 absolute top-4 z-0" />
                             <div className="flex gap-4">
                               <button onClick={() => addRow(selectedDoc.key, -1)} className="relative z-10 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform">
                                  <Plus className="w-3 h-3" />
                               </button>
                               {/* Column Toggles */}
                               <div className="relative z-10 flex gap-2 bg-white px-3 py-1 rounded-full shadow-md text-[10px] border border-gray-200">
                                 {Object.entries(columns).map(([col, isActive]) => (
                                   <label key={col} className="flex items-center gap-1 cursor-pointer">
                                     <input type="checkbox" checked={isActive} onChange={() => setColumns(p => ({ ...p, [col]: !isActive }))} className="w-2 h-2" />
                                     <span className="capitalize text-gray-600">{col}</span>
                                   </label>
                                 ))}
                               </div>
                             </div>
                          </div>

                          {["1st Year", "2nd Year", "3rd Year", "4th Year", "Unknown"].map((year) => {
                             const rowsWithIndex = selectedDoc.rows.map((r, i) => ({ ...r, originalIndex: i })).filter(r => (r.year || "Unknown") === year);
                             if (rowsWithIndex.length === 0) return null;
                             
                             return (
                               <div key={year} className="mb-8">
                                 <h4 className="text-center font-bold mb-3 text-[16px] uppercase text-black" style={{ fontFamily: "Arial, sans-serif" }}>
                                   {selectedDoc.label.replace("CSE – ", "CSE - ")} - {year}
                                 </h4>
                                 <table className="w-full border-collapse border border-black table-fixed text-black" style={{ fontFamily: "Arial, sans-serif" }}>
                                   <thead>
                                      <tr>
                                        <th className="w-8 border border-black opacity-0 hover:opacity-100 p-0 text-center relative">
                                           <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
                                             <span className="text-[8px] text-gray-500">Toggle</span>
                                           </div>
                                        </th>
                                        {columns.sno && <th className="border border-black px-1 py-2 w-[8%] text-xs">S.N<br/>O</th>}
                                        {columns.name && <th className="border border-black px-2 py-2 w-[25%] text-xs text-left">STUDENT NAME</th>}
                                        {columns.branch && <th className="border border-black px-1 py-2 w-[12%] text-xs">DEPARTM<br/>ENT</th>}
                                        {columns.year && <th className="border border-black px-1 py-2 w-[12%] text-xs">YEAR</th>}
                                        {columns.section && <th className="border border-black px-1 py-2 w-[10%] text-xs">SECTION</th>}
                                        {columns.rollNo && <th className="border border-black px-2 py-2 w-[18%] text-xs">ROLL NUMBER</th>}
                                        {columns.signature && <th className="border border-black px-2 py-2 w-[15%] text-xs">SIGNATURE</th>}
                                      </tr>
                                   </thead>
                                   <tbody>
                                      {rowsWithIndex.map((row, localIndex) => {
                                         const idx = row.originalIndex;
                                         const sno = localIndex + 1;
                                         return (
                                         <tr key={idx} className={`relative group hover:bg-blue-50/30 transition-colors ${row.selected === false ? 'opacity-30' : ''}`}>
                                            <td className="w-8 border border-black p-0 text-center hover:bg-gray-100">
                                              <input 
                                                type="checkbox" 
                                                checked={row.selected !== false} 
                                                onChange={() => handleCellEdit(selectedDoc.key, idx, "selected", row.selected === false ? true as any : false as any)}
                                                className="w-3 h-3 cursor-pointer"
                                              />
                                            </td>
                                            {columns.sno && <td className="border border-black px-1 py-1.5 text-center text-[12px] font-medium">{sno}.</td>}
                                            
                                            {columns.name && (
                                            <td className="border border-black p-0">
                                               <input 
                                                 value={row.name} 
                                                 onChange={e => handleCellEdit(selectedDoc.key, idx, "name", e.target.value)}
                                                 className="w-full h-full px-2 py-1.5 text-center outline-none bg-transparent hover:bg-blue-100/50 focus:bg-blue-100/50 text-[12px] transition-colors"
                                               />
                                            </td>
                                            )}
      
                                            {columns.branch && (
                                            <td className="border border-black p-0">
                                               <input 
                                                 value={row.branch} 
                                                 onChange={e => handleCellEdit(selectedDoc.key, idx, "branch", e.target.value)}
                                                 className="w-full h-full px-1 py-1.5 text-center outline-none bg-transparent hover:bg-blue-100/50 focus:bg-blue-100/50 text-[12px] transition-colors uppercase"
                                               />
                                            </td>
                                            )}
      
                                            {columns.year && (
                                            <td className="border border-black p-0">
                                               <input 
                                                 value={row.year} 
                                                 onChange={e => handleCellEdit(selectedDoc.key, idx, "year", e.target.value)}
                                                 className="w-full h-full px-1 py-1.5 text-center outline-none bg-transparent hover:bg-blue-100/50 focus:bg-blue-100/50 text-[12px] transition-colors whitespace-nowrap"
                                               />
                                            </td>
                                            )}
      
                                            {columns.section && (
                                            <td className="border border-black p-0">
                                               <input 
                                                 value={row.section} 
                                                 onChange={e => handleCellEdit(selectedDoc.key, idx, "section", e.target.value)}
                                                 className="w-full h-full px-1 py-1.5 text-center outline-none bg-transparent hover:bg-blue-100/50 focus:bg-blue-100/50 text-[12px] transition-colors uppercase"
                                               />
                                            </td>
                                            )}
      
                                            {columns.rollNo && (
                                            <td className="border border-black p-0 relative">
                                               <input 
                                                 value={row.rollNo} 
                                                 onChange={e => handleCellEdit(selectedDoc.key, idx, "rollNo", e.target.value)}
                                                 className="w-full h-full px-2 py-1.5 text-center outline-none bg-transparent hover:bg-blue-100/50 focus:bg-blue-100/50 text-[12px] transition-colors uppercase font-mono tracking-tight"
                                               />
                                               {/* Floating Action Menu for Row */}
                                               <div className="absolute -left-[56px] top-1/2 -translate-y-1/2 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex">
                                                  <button onClick={() => removeRow(selectedDoc.key, idx)} className="w-6 h-6 bg-white border border-gray-200 shadow-sm rounded flex items-center justify-center text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Delete Row">
                                                     <Trash2 className="w-3 h-3" />
                                                  </button>
                                               </div>
                                               {/* Add Row Bottom Control */}
                                               <div className="absolute -bottom-[12px] right-2 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                   <button onClick={() => addRow(selectedDoc.key, idx)} className="relative z-10 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white shadow hover:scale-110 transition-transform" title="Add Row Below">
                                                     <Plus className="w-3 h-3" />
                                                   </button>
                                               </div>
                                            </td>
                                            )}
      
                                            {columns.signature && <td className="border border-black px-2 py-1.5"></td>}
                                         </tr>
                                      )})}
                                   </tbody>
                                 </table>
                               </div>
                             );
                          })}

                          <div className="mt-20 mb-8 flex items-center justify-between px-8 text-black" style={{ fontFamily: "Arial, sans-serif" }}>
                              <div className="text-center">
                                <p className="text-[13px] font-bold">Signature of Dean (SAC)</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[13px] font-bold">Signature of Secretary<br/>(Connect Club)</p>
                              </div>
                              <div className="text-center">
                                <p className="text-[13px] font-bold">Signature of HOD</p>
                              </div>
                          </div>
                      </div>

                   </div>
                )}
            </div>
            
            {/* Bottom floating action for current document */}
            {selectedDoc && (
               <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 bg-[#0c0c0e]/95 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-[95vw] sm:max-w-none">
                  <div className="flex items-center gap-2 pr-2 sm:pr-4 border-r border-white/10 min-w-0">
                     <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
                     <div className="text-left min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-white truncate max-w-[120px] sm:max-w-none">{selectedDoc.label}</p>
                        <p className="text-[9px] sm:text-[10px] text-white/50">{selectedDoc.rows.length} rows</p>
                     </div>
                  </div>
                  <button
                    onClick={() => downloadDocument(selectedDoc)}
                    disabled={isGenerating || selectedDoc.rows.length === 0}
                    className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-lg sm:rounded-xl transition-all disabled:opacity-40 text-xs sm:text-sm shrink-0 whitespace-nowrap active:scale-95"
                  >
                    {isGenerating ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                    <span className="hidden sm:inline">Download this .docx</span>
                    <span className="sm:hidden">Download</span>
                  </button>
               </div>
            )}
        </div>
      </div>
      
      {/* Global styles for custom scrollbar within this page */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
}
