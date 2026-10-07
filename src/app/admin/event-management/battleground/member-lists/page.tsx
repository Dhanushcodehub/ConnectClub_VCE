"use client";

import { useState, useEffect, useMemo } from "react";
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
  CheckCircle2,
  FileText
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/AuthContext";

interface PreviewRow {
  sno: number;
  name: string;
  branch: string;
  year: string;
  section: string;
  rollNo: string;
  selected?: boolean;
}

interface DocumentGroup {
  key: string;
  label: string;
  filename: string;
  rows: PreviewRow[];
}

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

function parseRollNo(rollNo: string) {
  if (!rollNo || rollNo.length < 10) return { branch: "Unknown", year: "Unknown", section: "-" };
  const r = rollNo.toUpperCase();
  
  const joinYearStr = r.substring(0, 2);
  const joinYearNum = parseInt(joinYearStr);
  let year = "Unknown";
  // Assuming 2024 is the current 1st year (24-series)
  if (joinYearNum === 24) year = "1st Year";
  else if (joinYearNum === 23) year = "2nd Year";
  else if (joinYearNum === 22) year = "3rd Year";
  else if (joinYearNum === 21) year = "4th Year";

  const branchCode = r.substring(6, 8);
  let branch = "Unknown";
  switch(branchCode) {
    case "05": branch = "CSE"; break;
    case "04": branch = "ECE"; break;
    case "12": branch = "IT"; break;
    case "66": branch = "CSM"; break;
    case "67": branch = "CSD"; break;
    case "01": branch = "CIVIL"; break;
    case "02": branch = "EEE"; break;
    case "03": branch = "MECH"; break;
    default: branch = branchCode;
  }
  
  // Do not guess section from roll number
  const section = "-";

  return { branch, year, section };
}

export default function BattlegroundMemberListsPage() {
  const { user, role } = useAuth();
  const [documents, setDocuments] = useState<DocumentGroup[]>([]);
  const [selectedDocKey, setSelectedDocKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [para1, setPara1] = useState("Connect Club, Vardhaman College of Engineering is organizing \"Battlegrounds\", a premier technical event, to be held on 8th October 2026 from 9:00 AM to 4:00 PM at Vardhaman College of Engineering.");
  const [para2, setPara2] = useState("We kindly request that permission be granted to mark attendance for the below-listed students for their participation in this event.");
  
  const [columns, setColumns] = useState({
    sno: true,
    rollNo: true,
    name: true,
    branch: true,
    year: false,
    section: true,
    signature: false
  });

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const token = await user?.getIdToken();
        const res = await fetch("/api/battleground-registrations", {
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          }
        });
        
        if (!res.ok) throw new Error("Failed to fetch registrations");
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to fetch registrations");

        const allRegistrations: any[] = data.data || [];
        
        let allParticipants: any[] = [];
        
        allRegistrations.forEach(reg => {
          if (reg.leadName && reg.leadRollNo) {
            const parsed = parseRollNo(reg.leadRollNo);
            allParticipants.push({
              name: reg.leadName,
              rollNo: reg.leadRollNo,
              branch: reg.leadBranch || parsed.branch,
              year: reg.leadYear || parsed.year,
              section: reg.leadSection || parsed.section,
              teamName: reg.teamName,
            });
          }
          if (reg.members && Array.isArray(reg.members)) {
            reg.members.forEach((m: any) => {
              if (m.name && (m.roll || m.rollNo)) {
                const roll = m.roll || m.rollNo;
                const parsed = parseRollNo(roll);
                allParticipants.push({
                  name: m.name,
                  rollNo: roll,
                  branch: m.branch || parsed.branch,
                  year: m.year || parsed.year,
                  section: m.section || parsed.section,
                  teamName: reg.teamName,
                });
              }
            });
          }
        });

        const groups: Record<string, { label: string; rows: any[]; filename: string }> = {};

        const yearOrder: Record<string, number> = {
          "1st Year": 1, "2nd Year": 2, "3rd Year": 3, "4th Year": 4
        };
        
        const sorted = [...allParticipants].sort((a, b) => {
          const yA = yearOrder[a.year] || 99;
          const yB = yearOrder[b.year] || 99;
          if (yA !== yB) return yA - yB;
          const sA = (a.section || "").toUpperCase();
          const sB = (b.section || "").toUpperCase();
          if (sA !== sB) return sA.localeCompare(sB);
          return (a.rollNo || "").localeCompare(b.rollNo || "");
        });

        for (const reg of sorted) {
          const branch = (reg.branch || "Unknown").toUpperCase().trim();
          const section = (reg.section || "").toUpperCase().trim();
          
          if (branch === "CSE" || branch.includes("CSE")) {
            const cluster = getCSECluster(section);
            if (cluster) {
              const key = `CSE_${cluster}`;
              const label = `CSE – ${cluster}`;
              const clusterNum = cluster.replace("Cluster ", "");
              const sections = CSE_CLUSTERS[cluster].join("");
              if (!groups[key]) {
                groups[key] = {
                  label,
                  rows: [],
                  filename: `CSE_CLUSTER_${clusterNum}_${sections}_LIST.docx`,
                };
              }
              groups[key].rows.push(reg);
            } else {
              const key = "CSE";
              if (!groups[key]) {
                groups[key] = {
                  label: "CSE",
                  rows: [],
                  filename: `CSE_LIST.docx`,
                };
              }
              groups[key].rows.push(reg);
            }
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

        const docList: DocumentGroup[] = Object.entries(groups).map(([key, g]) => ({
          key,
          label: g.label,
          filename: g.filename,
          rows: g.rows.map((r, i) => ({
            sno: i + 1,
            name: r.name,
            branch: (r.branch || "").toUpperCase().trim(),
            year: r.year,
            section: r.section || "–",
            rollNo: r.rollNo,
            selected: true
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
    if (user) fetchData();
  }, [user]);

  const selectedDoc = useMemo(() => {
    return documents.find(d => d.key === selectedDocKey) || null;
  }, [documents, selectedDocKey]);

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
          sno: 0,
          name: "",
          branch: doc.label.includes("CSE") ? "CSE" : doc.label,
          year: "1st Year",
          section: "–",
          rollNo: ""
        };
        
        if (afterIdx !== undefined) newRows.splice(afterIdx + 1, 0, newRow);
        else newRows.push(newRow);
        
        return { ...doc, rows: newRows.map((r, i) => ({ ...r, sno: i + 1 })) };
      })
    );
  };

  const removeRow = (docKey: string, rowIdx: number) => {
    setDocuments(prevDocs => 
      prevDocs.map(doc => {
        if (doc.key !== docKey) return doc;
        const newRows = doc.rows.filter((_, i) => i !== rowIdx);
        return { ...doc, rows: newRows.map((r, i) => ({ ...r, sno: i + 1 })) };
      })
    );
  };

  const downloadDocument = async (doc: DocumentGroup) => {
    setIsGenerating(true);
    try {
      const payloadDocs = [{
        ...doc,
        rows: doc.rows.filter(r => r.selected !== false)
      }];
      
      const token = await user?.getIdToken();
      const res = await fetch("/api/generate-member-list", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
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

      const token = await user?.getIdToken();
      const res = await fetch("/api/generate-member-list", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ documents: payloadDocs, columns, para1, para2 }),
      });
      if (!res.ok) throw new Error("Generation failed");
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "battleground_member_lists.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded all lists");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-4" />
        <p className="text-white/60 font-medium tracking-wider text-sm uppercase">Assembling Documents...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-theme(spacing.16))] flex flex-col bg-[#0c0c0e] overflow-hidden">
      <div className="h-16 shrink-0 border-b border-white/5 px-6 flex items-center justify-between bg-[#0c0c0e]/80 backdrop-blur-md z-20">
         <div className="flex items-center gap-4">
            <Link
              href="/admin/event-management/battleground"
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.2)]">
                  <FileText className="w-4 h-4 text-black" />
               </div>
               <div>
                 <h1 className="text-lg font-bold text-white leading-tight">Document Editor</h1>
                 <p className="text-[10px] uppercase tracking-widest text-white/40">Battleground Attendance Lists</p>
               </div>
            </div>
         </div>

         <div className="flex items-center gap-3">
             <button
                onClick={downloadAll}
                disabled={isGenerating || documents.length === 0}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download All (.zip)
             </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 shrink-0 border-r border-white/5 bg-[#0c0c0e] flex flex-col relative z-10">
          <div className="p-4 border-b border-white/5">
            <h2 className="text-xs font-bold text-white/40 uppercase tracking-wider">Generated Documents ({documents.length})</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
             {documents.map(doc => (
                <button
                  key={doc.key}
                  onClick={() => setSelectedDocKey(doc.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                    selectedDocKey === doc.key 
                      ? "bg-orange-500/10 border border-orange-500/20" 
                      : "border border-transparent hover:bg-white/[0.02]"
                  }`}
                >
                   <div>
                      <p className={`text-sm font-bold ${selectedDocKey === doc.key ? "text-orange-400" : "text-white"}`}>
                        {doc.label}
                      </p>
                      <p className="text-xs text-white/40 mt-0.5">{doc.rows.length} records</p>
                   </div>
                   {selectedDocKey === doc.key && (
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                   )}
                </button>
             ))}
          </div>
        </div>

        <div className="flex-1 bg-[#111114] relative flex flex-col overflow-hidden" 
             style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px)", backgroundSize: "30px 30px" }}>
            
            <div className="absolute top-6 right-8 z-20 flex items-center gap-2 bg-[#0c0c0e]/90 backdrop-blur-md border border-white/10 rounded-full px-2 py-1.5 shadow-2xl">
               <button onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <ZoomOut className="w-4 h-4" />
               </button>
               <span className="text-xs font-mono font-medium text-white/80 w-12 text-center">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(z + 0.1, 2))} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <ZoomIn className="w-4 h-4" />
               </button>
               <div className="w-px h-4 bg-white/10 mx-1" />
               <button onClick={() => setZoom(1)} className="p-1.5 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                  <Maximize className="w-4 h-4" />
               </button>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar flex justify-center items-start py-12 px-8 relative" id="workspace-scroll-area">
                {selectedDoc && (
                   <div 
                     className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-200 origin-top flex flex-col"
                     style={{ 
                        width: "210mm", 
                        minHeight: "297mm", 
                        transform: `scale(${zoom})`,
                        marginBottom: "100px"
                     }}
                   >
                      <div className="w-full flex items-start justify-center pt-10 pb-6 px-12 text-black">
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

                      <div className="flex-1 p-16 pt-0">
                          <div className="w-full h-8 -mt-4 mb-6 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity group relative z-20">
                             <div className="h-px w-full bg-blue-400/50 absolute top-4 z-0" />
                             <div className="flex gap-4">
                               <button onClick={() => addRow(selectedDoc.key, -1)} className="relative z-10 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 transition-transform">
                                  <Plus className="w-3 h-3" />
                               </button>
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
                                               <div className="absolute -left-[56px] top-1/2 -translate-y-1/2 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex">
                                                  <button onClick={() => removeRow(selectedDoc.key, idx)} className="w-6 h-6 bg-white border border-gray-200 shadow-sm rounded flex items-center justify-center text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Delete Row">
                                                     <Trash2 className="w-3 h-3" />
                                                  </button>
                                               </div>
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
            
            {selectedDoc && (
               <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-3 bg-[#0c0c0e]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                  <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                     <FileSpreadsheet className="w-5 h-5 text-orange-400" />
                     <div className="text-left">
                        <p className="text-sm font-bold text-white">{selectedDoc.label}</p>
                        <p className="text-[10px] text-white/50">{selectedDoc.rows.length} rows</p>
                     </div>
                  </div>
                  <button
                    onClick={() => downloadDocument(selectedDoc)}
                    disabled={isGenerating || selectedDoc.rows.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-all disabled:opacity-40 text-sm"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Download this .docx
                  </button>
               </div>
            )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}} />
    </div>
  );
}
