"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FileSpreadsheet,
  ArrowLeft,
  Filter,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Users,
  Trash2,
  RotateCcw,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- Types ---
interface PreviewRow {
  sno: number;
  name: string;
  branch: string;
  year: string;
  section: string;
  rollNo: string;
}

interface GroupPreview {
  key: string;
  label: string;
  rowCount: number;
  filename: string;
  preview: PreviewRow[];
}

interface PreviewResult {
  groups: GroupPreview[];
  total: number;
  notFound: string[];
}

// Registration from the live API (for the editable table)
interface Registration {
  id: string;
  name: string;
  branch: string;
  rollNo: string;
  year: string;
  section: string;
}

// CSE cluster definitions (mirrors the API)
const CSE_CLUSTERS: Record<string, string[]> = {
  "Cluster 1": ["A", "B", "C"],
  "Cluster 2": ["D", "E", "F"],
  "Cluster 3": ["G", "H", "I"],
};

const ALL_BRANCHES = ["CSE", "CSD", "CSM", "ECE", "EEE", "CIVIL", "MECH", "IT", "AIDS"];
const ALL_SECTIONS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"];
const ALL_YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year"];
const SORT_OPTIONS = [
  { value: "rollNo", label: "Roll Number" },
  { value: "name", label: "Name (A–Z)" },
];

export default function MemberListsPage() {
  // --- Filter state ---
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState("All");
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("rollNo");
  const [rollNumbersText, setRollNumbersText] = useState("");

  // --- Preview/generate state ---
  const [previewData, setPreviewData] = useState<PreviewResult | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // --- Editable rows per group ---
  const [editableRows, setEditableRows] = useState<Record<string, PreviewRow[]>>({});
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // --- Fetch full registration list once for editing ---
  const fetchAllRegistrations = useCallback(async () => {
    if (allRegistrations.length > 0) return;
    setLoadingAll(true);
    try {
      const res = await fetch("/api/inspirex-registrations");
      const data = await res.json();
      if (data.success) setAllRegistrations(data.data);
    } catch {
      toast.error("Failed to fetch registrations.");
    } finally {
      setLoadingAll(false);
    }
  }, [allRegistrations.length]);

  // --- Toggle branch selection ---
  const toggleBranch = (b: string) =>
    setSelectedBranches((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );

  const toggleSection = (s: string) =>
    setSelectedSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const toggleGroupExpand = (key: string) =>
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  // --- Build query payload ---
  const buildPayload = () => {
    const rollNumbers = rollNumbersText
      .split(/[\n,]+/)
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean);

    return {
      branches: selectedBranches,
      year: selectedYear,
      sections: selectedSections,
      rollNumbers: rollNumbers.length ? rollNumbers : undefined,
      sortBy,
    };
  };

  // --- Preview ---
  const handlePreview = async () => {
    setIsPreviewing(true);
    setPreviewData(null);
    setEditableRows({});
    try {
      const res = await fetch("/api/generate-member-list?preview=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreviewData(data);
      // Init editable rows from preview
      const initial: Record<string, PreviewRow[]> = {};
      data.groups.forEach((g: GroupPreview) => {
        initial[g.key] = g.preview;
      });
      setEditableRows(initial);
      // Pre-load all regs for editing
      fetchAllRegistrations();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsPreviewing(false);
    }
  };

  // --- Generate & Download ---
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-member-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Generation failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "member_lists.zip";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Member lists downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Editable row helpers ---
  const removeRow = (groupKey: string, rowIdx: number) => {
    setEditableRows((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey].filter((_, i) => i !== rowIdx).map((r, i) => ({ ...r, sno: i + 1 })),
    }));
  };

  const updateRow = (groupKey: string, rowIdx: number, field: keyof PreviewRow, value: string) => {
    setEditableRows((prev) => {
      const rows = [...prev[groupKey]];
      rows[rowIdx] = { ...rows[rowIdx], [field]: value };
      return { ...prev, [groupKey]: rows };
    });
  };

  const addRowToGroup = (groupKey: string) => {
    setEditableRows((prev) => {
      const rows = prev[groupKey] || [];
      const newRow: PreviewRow = {
        sno: rows.length + 1,
        name: "",
        branch: "",
        year: "",
        section: "",
        rollNo: "",
      };
      return { ...prev, [groupKey]: [...rows, newRow] };
    });
  };

  const resetGroup = (groupKey: string) => {
    if (!previewData) return;
    const original = previewData.groups.find((g) => g.key === groupKey);
    if (original) {
      setEditableRows((prev) => ({ ...prev, [groupKey]: original.preview }));
    }
  };

  // ---- RENDER ----
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/event-management/inspirex"
              className="p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-amber-400" />
                Branch-wise Member Lists
              </h1>
              <p className="text-sm text-white/50 mt-1">
                Generate formatted .docx attendance lists per branch/cluster using the Connect Club letterhead template.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6 space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-amber-400" /> Filter Options
        </h2>

        {/* Branch Multi-select */}
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
            Branch (leave empty = all)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_BRANCHES.map((b) => (
              <button
                key={b}
                onClick={() => toggleBranch(b)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                  selectedBranches.includes(b)
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* Year + Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-[#111114] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-colors"
            >
              <option value="All">All Years</option>
              {ALL_YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-[#111114] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white focus:outline-none focus:border-amber-500/40 transition-colors"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Section filter */}
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
            Section (leave empty = all)
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSection(s)}
                className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
                  selectedSections.includes(s)
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Roll number paste box */}
        <div>
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-2">
            Specific Roll Numbers (optional — paste to restrict to an exact roster)
          </label>
          <textarea
            value={rollNumbersText}
            onChange={(e) => setRollNumbersText(e.target.value)}
            placeholder={"230R1A0501\n230R1A0502\n230R1A0503\n..."}
            rows={4}
            className="w-full bg-[#111114] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder:text-white/20 font-mono focus:outline-none focus:border-amber-500/40 transition-colors resize-none"
          />
          <p className="text-xs text-white/30 mt-1">Separate by newline or comma. Duplicates are auto-removed.</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handlePreview}
            disabled={isPreviewing}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#111114] border border-white/10 hover:border-white/20 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm"
          >
            {isPreviewing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4 text-amber-400" />
            )}
            {isPreviewing ? "Generating Preview…" : "Preview Groups"}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !previewData || previewData.total === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isGenerating ? "Generating…" : "Generate & Download .zip"}
          </button>
        </div>
      </div>

      {/* Not-Found Warning */}
      {previewData && previewData.notFound.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-400 mb-1">
              {previewData.notFound.length} roll number(s) not found in database:
            </p>
            <p className="text-xs text-white/60 font-mono">
              {previewData.notFound.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Empty result */}
      {previewData && previewData.total === 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
          <p className="text-white font-semibold">No matching registrations found</p>
          <p className="text-sm text-white/50 mt-1">Try changing your filters.</p>
        </div>
      )}

      {/* Groups Preview + Edit */}
      {previewData && previewData.groups.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Preview — {previewData.groups.length} group(s) · {previewData.total} total registrations
            </h2>
          </div>

          {previewData.groups.map((group) => {
            const rows = editableRows[group.key] || group.preview;
            const isExpanded = expandedGroups.has(group.key);

            return (
              <div
                key={group.key}
                className="bg-[#0c0c0e] border border-white/5 rounded-2xl overflow-hidden"
              >
                {/* Group header */}
                <div
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => toggleGroupExpand(group.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-bold text-white">{group.label}</p>
                      <p className="text-xs text-white/40">
                        {rows.length} rows · {group.filename}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-full text-xs font-bold">
                      {rows.length} students
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                  </div>
                </div>

                {/* Editable table */}
                {isExpanded && (
                  <div className="border-t border-white/5">
                    <div className="px-4 py-2 flex items-center justify-between bg-white/[0.01]">
                      <p className="text-xs text-white/40">
                        Showing all rows — edit, add, or remove before downloading.
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => addRowToGroup(group.key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Row
                        </button>
                        <button
                          onClick={() => resetGroup(group.key)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 transition-colors"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-white/5 bg-white/[0.02]">
                            {["S.NO", "STUDENT NAME", "DEPARTMENT", "YEAR", "SECTION", "ROLL NUMBER", ""].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-wider whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                              <td className="px-4 py-2 text-white/40 font-mono text-xs w-12">{idx + 1}</td>
                              <td className="px-4 py-2">
                                <input
                                  value={row.name}
                                  onChange={(e) => updateRow(group.key, idx, "name", e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-500/50 text-white text-sm outline-none w-full transition-colors py-0.5"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  value={row.branch}
                                  onChange={(e) => updateRow(group.key, idx, "branch", e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-500/50 text-white/80 text-sm outline-none w-20 transition-colors py-0.5"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  value={row.year}
                                  onChange={(e) => updateRow(group.key, idx, "year", e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-500/50 text-white/80 text-sm outline-none w-20 transition-colors py-0.5"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <select
                                  value={row.section}
                                  onChange={(e) => updateRow(group.key, idx, "section", e.target.value)}
                                  className="bg-[#111114] border border-white/10 rounded-md text-white/80 text-xs py-1 px-2 outline-none focus:border-amber-500/40"
                                >
                                  <option value="–">–</option>
                                  {ALL_SECTIONS.map((s) => (
                                    <option key={s}>{s}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-2">
                                <input
                                  value={row.rollNo}
                                  onChange={(e) => updateRow(group.key, idx, "rollNo", e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-amber-500/50 text-white/80 font-mono text-xs outline-none w-32 transition-colors py-0.5"
                                />
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => removeRow(group.key, idx)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-red-400 transition-all"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CSE Cluster Legend */}
      <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-3">CSE Cluster Reference</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {Object.entries(CSE_CLUSTERS).map(([cluster, sections]) => (
            <div key={cluster} className="bg-white/[0.03] rounded-xl p-3 border border-white/5">
              <p className="text-sm font-bold text-white mb-1">{cluster}</p>
              <p className="text-xs text-white/50">Sections: {sections.join(", ")}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
