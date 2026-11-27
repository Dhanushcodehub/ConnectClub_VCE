"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { auth } from "@/lib/firebase/config";
import {
  Download, Loader2, Sparkles, Wand2, ArrowLeft,
  FileText, RotateCcw, X, ChevronRight, PenLine,
  Edit3, Info, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TemplateField { key: string; label: string; placeholder: string; type?: "text" | "date" | "number" | "textarea"; }
interface Template { id: string; label: string; icon: string; description: string; fields: TemplateField[]; buildPrompt: (vals: Record<string, string>) => string; }

// ─── Templates with smart field definitions ───────────────────────────────
const TEMPLATES: Template[] = [
  {
    id: "event_permission",
    label: "Event Permission",
    icon: "🎪",
    description: "Request permission to conduct a club event",
    fields: [
      { key: "eventName", label: "Event Name", placeholder: "e.g. Battleground - Survive the System" },
      { key: "eventDate", label: "Event Date", placeholder: "e.g. 15th November 2026", type: "text" },
      { key: "venue", label: "Venue / Location", placeholder: "e.g. Main Auditorium" },
      { key: "time", label: "Time", placeholder: "e.g. 9 AM to 5 PM" },
      { key: "participants", label: "Expected Participants", placeholder: "e.g. 200 students", type: "text" },
      { key: "description", label: "Brief Description (optional)", placeholder: "What is the event about?", type: "textarea" },
    ],
    buildPrompt: (v) => `Requesting permission to conduct ${v.eventName} on ${v.eventDate} at ${v.venue} from ${v.time} with approximately ${v.participants} participants. ${v.description ? v.description : ""}`,
  },
  {
    id: "attendance_od",
    label: "Attendance On-Duty",
    icon: "📋",
    description: "Request OD exemption for student volunteers",
    fields: [
      { key: "eventName", label: "Event Name", placeholder: "e.g. Annual Technical Fest" },
      { key: "eventDates", label: "Event Dates", placeholder: "e.g. 10th to 12th October 2026" },
      { key: "role", label: "Student Role", placeholder: "e.g. organizers, volunteers, participants" },
      { key: "missedClasses", label: "Classes Missed", placeholder: "e.g. all classes on those 3 days" },
      { key: "students", label: "Student Names & Roll Numbers", placeholder: "Format each student on a new line:\nK. Dhanush – 22B91A05C4\nT. Rahul – 22B91A05C5\nS. Priya – 22B91A05C6", type: "textarea" },
    ],
    buildPrompt: (v) => {
      const studentList = v.students?.trim()
        ? `\n\nThe following students require OD exemption:\n${v.students.trim()}`
        : "";
      const count = v.students?.trim()
        ? v.students.trim().split("\n").filter(Boolean).length + " students"
        : "the students";
      return `Requesting attendance on-duty / OD exemption for ${count} who served as ${v.role} for ${v.eventName} held from ${v.eventDates}. They missed ${v.missedClasses} due to their active contribution to the event.${studentList} Please include the complete student list with their names and roll numbers in the letter body.`;
    },
  },
  {
    id: "lab_booking",
    label: "Lab / Hall Booking",
    icon: "🏛️",
    description: "Request venue or lab allocation",
    fields: [
      { key: "venueName", label: "Venue / Lab Name", placeholder: "e.g. Central Computing Lab, Seminar Hall 1" },
      { key: "purpose", label: "Purpose", placeholder: "e.g. Cloud Computing hands-on workshop" },
      { key: "date", label: "Date & Time", placeholder: "e.g. Saturday, 29th November from 10 AM to 4 PM" },
      { key: "studentCount", label: "Number of Students", placeholder: "e.g. 60 students" },
      { key: "requirements", label: "Special Requirements (optional)", placeholder: "e.g. projector, internet, power strips" },
    ],
    buildPrompt: (v) => `Requesting allocation of ${v.venueName} for conducting ${v.purpose} on ${v.date} for ${v.studentCount} students. ${v.requirements ? `Special requirements: ${v.requirements}.` : ""}`,
  },
  {
    id: "guest_speaker",
    label: "Guest Speaker Session",
    icon: "🎤",
    description: "Request permission for an industry guest talk",
    fields: [
      { key: "speakerName", label: "Speaker Name", placeholder: "e.g. Mr. John Smith" },
      { key: "speakerDesignation", label: "Speaker Designation & Company", placeholder: "e.g. Engineering Manager at Microsoft" },
      { key: "topic", label: "Talk Topic", placeholder: "e.g. AI & Machine Learning in Industry" },
      { key: "date", label: "Date & Time", placeholder: "e.g. 25th October 2026, 11 AM" },
      { key: "venue", label: "Venue", placeholder: "e.g. College Auditorium" },
      { key: "audience", label: "Target Audience", placeholder: "e.g. 3rd & 4th year CSE students" },
    ],
    buildPrompt: (v) => `Seeking permission to host an industry guest talk on "${v.topic}" by ${v.speakerName}, ${v.speakerDesignation}, scheduled for ${v.date} at ${v.venue} for ${v.audience}.`,
  },
];

// ─── Template Modal ───────────────────────────────────────────────────────────
function TemplateModal({ template, onClose, onGenerate }: {
  template: Template;
  onClose: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    const missing = template.fields.filter(f => !f.type || f.type !== "textarea").find(f => !values[f.key]?.trim());
    if (missing) {
      toast.error(`Please fill in: ${missing.label}`);
      return;
    }
    setIsGenerating(true);
    const prompt = template.buildPrompt(values);
    onGenerate(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="text-white font-bold text-base">{template.label}</h3>
              <p className="text-white/40 text-xs">{template.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fields */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Fill in your event details — AI will compose a formal letter for you</span>
          </div>
          {template.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">
                {field.label}
                {field.type !== "textarea" && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  rows={3}
                  value={values[field.key] || ""}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20 resize-none"
                />
              ) : (
                <input
                  type="text"
                  value={values[field.key] || ""}
                  onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                  placeholder={field.placeholder}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm outline-none focus:border-blue-500/50 transition-colors placeholder:text-white/20"
                  onKeyDown={e => { if (e.key === "Enter") handleGenerate(); }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/10 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            <Wand2 className="w-4 h-4" />
            Compose with AI
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Autocomplete TextArea ─────────────────────────────────────────────────
function AITextArea({
  value, onChange, placeholder, className = "", align = "left", bold = false,
  fieldName, otherContext,
}: {
  value: string; onChange: (val: string) => void; placeholder: string;
  className?: string; align?: "left" | "center" | "right" | "justify";
  bold?: boolean; fieldName: string; otherContext?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestion, setSuggestion] = useState("");
  const [showTabHint, setShowTabHint] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  // Fetch AI suggestion after user stops typing
  const fetchSuggestion = useCallback(async (text: string) => {
    if (text.trim().length < 15) { setSuggestion(""); setShowTabHint(false); return; }

    // Cancel previous request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const res = await fetch("/api/ai/autocomplete-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ text, fieldName, otherContext }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) return;
      const data = await res.json();
      if (data.suggestion?.trim()) {
        setSuggestion(data.suggestion.trim());
        setShowTabHint(true);
      } else {
        setSuggestion("");
        setShowTabHint(false);
      }
    } catch {
      // Silently ignore abort errors
    }
  }, [fieldName, otherContext]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setSuggestion("");
    setShowTabHint(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestion(e.target.value), 900);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab" && suggestion) {
      e.preventDefault();
      onChange(value + " " + suggestion);
      setSuggestion("");
      setShowTabHint(false);
    }
    if (e.key === "Escape") {
      setSuggestion("");
      setShowTabHint(false);
    }
  };

  const alignClass =
    align === "center" ? "text-center" :
    align === "right"  ? "text-right"  :
    align === "justify"? "text-justify": "text-left";

  // Shared style object ensures mirror div matches textarea font metrics exactly
  const sharedStyle: React.CSSProperties = {
    fontFamily:    "inherit",
    fontSize:      "inherit",
    lineHeight:    "inherit",
    fontWeight:    bold ? "bold" : "normal",
    wordBreak:     "break-word",
    whiteSpace:    "pre-wrap",
    overflowWrap:  "break-word",
  };

  return (
    <div className="relative">
      {/*
        Mirror div — ghost text layer, sits BEHIND the textarea.
        • value portion  → transparent  (creates correct x-offset for suggestion)
        • suggestion     → indigo/40%   (shows through the transparent textarea bg)
      */}
      {suggestion && (
        <div
          aria-hidden="true"
          className={`pointer-events-none select-none absolute inset-0 overflow-hidden ${alignClass}`}
          style={sharedStyle}
        >
          <span style={{ color: "transparent" }}>{value}</span>
          <span style={{ color: "rgba(99,102,241,0.45)" }}>{" "}{suggestion}</span>
        </div>
      )}

      {/* Textarea — z-[1] floats above mirror; bg always transparent so ghost shows through */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => { setSuggestion(""); setShowTabHint(false); }, 150)}
        placeholder={placeholder}
        className={`relative z-[1] w-full resize-none outline-none overflow-hidden bg-transparent placeholder:text-gray-400 rounded transition-colors ${alignClass} ${bold ? "font-bold" : ""} ${className}`}
        rows={1}
      />

      {/* Tab-to-accept floating badge */}
      {showTabHint && suggestion && (
        <div
          className="absolute -top-6 right-0 z-10 flex items-center gap-1 bg-indigo-600/90 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded-full shadow-lg select-none cursor-default"
          title={`Press Tab to accept: "${suggestion.slice(0, 80)}${suggestion.length > 80 ? "…" : ""}"`}
        >
          <kbd className="font-bold bg-white/20 px-1 rounded text-[9px]">Tab</kbd>
          <ChevronRight className="w-2.5 h-2.5 opacity-60" />
          <span className="max-w-[140px] truncate opacity-80">{suggestion.slice(0, 32)}{suggestion.length > 32 ? "…" : ""}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminLetterEditor() {
  const [toAddress, setToAddress] = useState("The Dean,\nStudent Affairs Cell,\nVardhaman College of Engineering,\nHyderabad.");
  const [subject, setSubject] = useState("");
  const [salutation, setSalutation] = useState("Respected Sir,");
  const [content, setContent] = useState("");
  const [signOff, setSignOff] = useState("Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB").replace(/\//g, " / "));

  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"document" | "ai">("document");
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);

  // AI Edit mode
  const [editInstruction, setEditInstruction] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showEditPanel, setShowEditPanel] = useState(false);

  const handleGenerateAI = async (promptOverride?: string) => {
    const prompt = promptOverride ?? aiPrompt;
    if (!prompt.trim()) { toast.error("Please enter a prompt for the AI."); return; }

    setIsGenerating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("User not authenticated.");

      const res = await fetch("/api/ai/generate-letter-content", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to generate content.");
      }

      const data = await res.json();
      try {
        const parsed = JSON.parse(data.content);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.content) setContent(parsed.content);
        if (parsed.signOff) setSignOff(parsed.signOff);
      } catch {
        setContent(data.content);
      }
      toast.success("Letter drafted successfully!");
      setMobileTab("document");
    } catch (err: any) {
      toast.error(err.message || "Error generating letter content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditWithAI = async () => {
    if (!editInstruction.trim()) { toast.error("Describe what you want to change."); return; }
    if (!content.trim()) { toast.error("No letter content to edit yet."); return; }

    setIsEditing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("User not authenticated.");

      const res = await fetch("/api/ai/generate-letter-content", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({
          prompt: `Edit the following letter based on this instruction: "${editInstruction}"\n\nCurrent letter subject: ${subject}\nCurrent letter content:\n${content}\nCurrent sign-off:\n${signOff}`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to edit content.");
      }

      const data = await res.json();
      try {
        const parsed = JSON.parse(data.content);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.content) setContent(parsed.content);
        if (parsed.signOff) setSignOff(parsed.signOff);
      } catch {
        setContent(data.content);
      }
      toast.success("Letter updated!");
      setEditInstruction("");
      setShowEditPanel(false);
    } catch (err: any) {
      toast.error(err.message || "Error editing letter.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("User not authenticated.");

      const res = await fetch("/api/generate-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${idToken}` },
        body: JSON.stringify({ toAddress, subject, salutation, content, signOff, date }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to download document.");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${subject.slice(0, 40) || "Permission_Letter"}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Downloaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to download.");
    } finally {
      setIsDownloading(false);
    }
  };

  const reset = () => {
    setToAddress("The Dean,\nStudent Affairs Cell,\nVardhaman College of Engineering,\nHyderabad.");
    setSubject(""); setSalutation("Respected Sir,"); setContent("");
    setSignOff("Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering");
    setDate(new Date().toLocaleDateString("en-GB").replace(/\//g, " / "));
    toast.info("Letter reset.");
  };

  const bodyContext = `Subject: ${subject}`;

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col">
      {/* Template Modal */}
      {activeTemplate && (
        <TemplateModal
          template={activeTemplate}
          onClose={() => setActiveTemplate(null)}
          onGenerate={(prompt) => { setAiPrompt(prompt); handleGenerateAI(prompt); }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-8 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5">
            <Link href="/admin/dashboard" className="p-1.5 sm:p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">Letter Editor</h1>
              <p className="text-xs text-white/40 hidden xs:block">Official permission letter composer · AI-powered</p>
            </div>
          </div>
          <button onClick={handleDownload} disabled={isDownloading} className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-all active:scale-95 disabled:opacity-50">
            {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            .docx
          </button>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {content && (
            <button onClick={() => setShowEditPanel(p => !p)} className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${showEditPanel ? "bg-purple-600/20 border-purple-500/40 text-purple-300" : "bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white"}`}>
              <Edit3 className="w-3.5 h-3.5" /> Edit with AI
            </button>
          )}
          <button onClick={reset} className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-lg text-xs font-medium transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleDownload} disabled={isDownloading} className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-blue-600/20">
            {isDownloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download .docx
          </button>
        </div>
      </div>

      {/* AI Edit Panel */}
      {showEditPanel && (
        <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/25 rounded-2xl flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Edit3 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5 sm:mt-0" />
          <input
            value={editInstruction}
            onChange={e => setEditInstruction(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleEditWithAI(); }}
            placeholder='e.g. "Make it more formal", "Add a paragraph about safety measures", "Shorten the letter"'
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/25 w-full sm:w-auto"
          />
          <button onClick={handleEditWithAI} disabled={isEditing || !editInstruction.trim()} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 shrink-0">
            {isEditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isEditing ? "Editing…" : "Apply Edit"}
          </button>
          <button onClick={() => setShowEditPanel(false)} className="p-1.5 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex bg-[#16161a] border border-white/10 rounded-xl p-1 mb-4 shrink-0">
        {(["document", "ai"] as const).map(tab => (
          <button key={tab} onClick={() => setMobileTab(tab)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${mobileTab === tab ? "bg-blue-600 text-white shadow-md" : "text-white/60 hover:text-white"}`}>
            {tab === "document" ? <FileText className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5 text-blue-300" />}
            {tab === "document" ? "Document" : "AI Assistant"}
          </button>
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start flex-1">
        {/* ── A4 Paper ── */}
        <div className={`w-full lg:w-[65%] flex justify-center pb-8 ${mobileTab === "document" ? "flex" : "hidden"} lg:flex`}>
          <div className="bg-white text-black w-full max-w-[21cm] min-h-[29.7cm] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-sm p-4 sm:p-8 md:p-14 lg:p-20 font-serif leading-relaxed text-xs sm:text-sm md:text-[11pt] border border-gray-200 relative">
            {/* Autocomplete hint banner */}
            {content.trim().length > 10 && (
              <div className="absolute top-2 right-2 flex items-center gap-1 text-[9px] text-blue-400/60 font-mono bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                <span className="font-bold border border-blue-200 rounded px-1 py-0.5 bg-white">Tab</span>
                <span>to accept AI suggestion</span>
              </div>
            )}

            {/* To */}
            <div className="mb-4 sm:mb-6">
              <span className="font-bold block mb-1 text-xs sm:text-sm">To</span>
              <AITextArea value={toAddress} onChange={setToAddress} placeholder={"The Dean,\nStudent Affairs Cell,\nVardhaman College of Engineering,\nHyderabad."} fieldName="toAddress" />
            </div>

            {/* Date */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm">Date:</span>
              <AITextArea value={date} onChange={setDate} placeholder="DD / MM / YYYY" className="w-36" bold fieldName="date" />
            </div>

            {/* Subject */}
            <div className="mb-5 sm:mb-8 flex flex-col sm:flex-row items-start gap-1 sm:gap-2">
              <span className="font-bold whitespace-nowrap text-xs sm:text-sm">Subject:</span>
              <AITextArea value={subject} onChange={setSubject} placeholder="Request for Permission to Conduct..." bold className="flex-1" fieldName="subject" />
            </div>

            {/* Salutation */}
            <div className="mb-3 sm:mb-4">
              <AITextArea value={salutation} onChange={setSalutation} placeholder="Respected Sir," fieldName="salutation" />
            </div>

            {/* Body */}
            <div className="mb-6 sm:mb-10">
              <AITextArea value={content} onChange={setContent} placeholder="We, the members of Connect Club..." align="justify" className="min-h-[160px] sm:min-h-[200px]" fieldName="letterBody" otherContext={bodyContext} />
            </div>

            {/* Sign-off */}
            <div className="mt-6 sm:mt-8">
              <AITextArea value={signOff} onChange={setSignOff} placeholder={"Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering"} className="min-h-[100px]" fieldName="signOff" />
            </div>

            {/* Mobile download */}
            <div className="lg:hidden mt-8 pt-4 border-t border-gray-200 flex justify-between items-center text-gray-500 text-[11px]">
              <span>Ready to submit?</span>
              <button onClick={handleDownload} disabled={isDownloading} className="text-blue-600 font-bold hover:underline flex items-center gap-1">
                {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Download .docx
              </button>
            </div>
          </div>
        </div>

        {/* ── AI Sidebar ── */}
        <div className={`w-full lg:w-[35%] lg:sticky lg:top-8 space-y-4 ${mobileTab === "ai" ? "block" : "hidden"} lg:block`}>

          {/* AI Assistant Card */}
          <div className="bg-gradient-to-b from-blue-500/10 via-[#111116] to-[#0c0c0e] border border-blue-500/25 rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">AI Letter Assistant</h2>
              </div>
              <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">GPT-4o</span>
            </div>

            <p className="text-xs text-white/50 mb-4 leading-relaxed">
              Pick a template or describe your need — AI will compose a full formal letter for you.
            </p>

            {/* Smart Template Buttons */}
            <div className="mb-4">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Quick Templates:</p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTemplate(t)}
                    title={t.description}
                    className="text-[11px] px-2.5 py-1 bg-white/5 hover:bg-blue-500/15 hover:border-blue-500/40 border border-white/10 rounded-full text-white/80 hover:text-white transition-all active:scale-95 flex items-center gap-1"
                  >
                    <span>{t.icon}</span>
                    <span>+ {t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Free-form prompt */}
            <div className="relative mb-3">
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={4}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-blue-500/60 transition-colors text-xs sm:text-sm resize-none placeholder:text-white/25"
                placeholder="Or describe your letter here in plain English…"
              />
            </div>

            <button
              onClick={() => handleGenerateAI()}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-400/40 rounded-xl text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm shadow-lg shadow-blue-600/20"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /><span>Drafting Letter…</span></>
              ) : (
                <><Wand2 className="w-4 h-4 mr-2" /><span>Draft Letter Content</span></>
              )}
            </button>
          </div>

          {/* Edit with AI card (mobile) */}
          {content && (
            <div className="lg:hidden bg-purple-500/10 border border-purple-500/25 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <PenLine className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Edit with AI</h3>
              </div>
              <input
                value={editInstruction}
                onChange={e => setEditInstruction(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleEditWithAI(); }}
                placeholder='e.g. "Make it shorter and more formal"'
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-xs outline-none focus:border-purple-500/50 transition-colors placeholder:text-white/25 mb-2"
              />
              <button onClick={handleEditWithAI} disabled={isEditing || !editInstruction.trim()} className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all disabled:opacity-50">
                {isEditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isEditing ? "Editing…" : "Apply AI Edit"}
              </button>
            </div>
          )}

          {/* Autocomplete tip */}
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-blue-400 text-xs font-bold">Tab</span>
              </div>
              <div>
                <h3 className="font-semibold text-white text-xs mb-1">AI Autocomplete</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  While typing in the letter, AI suggests the next sentence. Press <kbd className="bg-white/10 px-1 rounded text-white/70">Tab</kbd> to accept, <kbd className="bg-white/10 px-1 rounded text-white/70">Esc</kbd> to dismiss.
                </p>
              </div>
            </div>
          </div>

          {/* Export tip */}
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 text-white/60" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-xs mb-1">Exporting your letter</h3>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  Clicking download embeds your content into the official Connect Club Word (.docx) template with header & footer seals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
