"use client";

import { useState, useRef, useEffect } from "react";
import { auth } from "@/lib/firebase/config";
import { 
  Download, 
  Loader2, 
  Sparkles, 
  Wand2, 
  ArrowLeft, 
  FileText, 
  Layers, 
  RotateCcw,
  Check
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function AutoTextArea({ 
  value, 
  onChange, 
  placeholder, 
  className = "", 
  align = "left", 
  bold = false 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  placeholder: string; 
  className?: string;
  align?: "left" | "center" | "right" | "justify";
  bold?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  let alignClass = "text-left";
  if (align === "center") alignClass = "text-center";
  if (align === "right") alignClass = "text-right";
  if (align === "justify") alignClass = "text-justify";

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full resize-none outline-none bg-transparent overflow-hidden placeholder:text-gray-400 focus:bg-blue-50/40 rounded px-1 -mx-1 transition-colors ${alignClass} ${bold ? "font-bold" : ""} ${className}`}
      rows={1}
    />
  );
}

const PROMPT_SUGGESTIONS = [
  {
    label: "Event Permission",
    prompt: "Requesting permission to conduct a 24-hour hackathon called Battleground on 15th November in the main auditorium from 9 AM to 5 PM with 200 participants."
  },
  {
    label: "Attendance On-Duty",
    prompt: "Requesting attendance on-duty / OD exemption for 45 student volunteers who actively organized the annual technical fest from 10th to 12th October."
  },
  {
    label: "Lab / Hall Booking",
    prompt: "Requesting allocation and access to the Central Computing Lab and Seminar Hall 1 for conducting hands-on Cloud Computing workshops this Saturday."
  },
  {
    label: "Guest Speaker Session",
    prompt: "Seeking permission to host an industry guest talk on AI & Machine Learning by an engineering manager from Microsoft on 25th October in the auditorium."
  }
];

export default function MemberLetterEditor() {
  const [toAddress, setToAddress] = useState("The Dean,\nStudent Affairs Cell,\nVardhaman College of Engineering,\nHyderabad.");
  const [subject, setSubject] = useState("");
  const [salutation, setSalutation] = useState("Respected Sir,");
  const [content, setContent] = useState("");
  const [signOff, setSignOff] = useState("Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering\n\nEvent: Battle Ground - Survive the System\nDate: 1st October 2026");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB").replace(/\//g, ' / '));
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"document" | "ai">("document");

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a prompt for the AI.");
      return;
    }

    setIsGenerating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("User not authenticated.");

      const response = await fetch("/api/ai/generate-letter-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          prompt: aiPrompt,
        }),
      });

      if (!response.ok) {
        let errMessage = "Failed to generate content.";
        try {
          const errData = await response.json();
          errMessage = errData?.error || errData?.details || response.statusText || errMessage;
        } catch (e) {}
        throw new Error(errMessage);
      }

      const data = await response.json();
      try {
        const parsed = JSON.parse(data.content);
        if (parsed.subject) setSubject(parsed.subject);
        if (parsed.content) setContent(parsed.content);
        if (parsed.signOff) setSignOff(parsed.signOff);
        toast.success("Letter drafted successfully!");
      } catch (e) {
        setContent(data.content);
        toast.success("Letter drafted successfully!");
      }

      // Automatically switch to document view on mobile so user sees the result immediately
      setMobileTab("document");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Error generating letter content.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error("User not authenticated.");

      const response = await fetch("/api/generate-letter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          toAddress,
          subject,
          salutation,
          content,
          signOff,
          date,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to download document.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Permission_Letter.docx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Downloaded successfully!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to download.");
    } finally {
      setIsDownloading(false);
    }
  };

  const resetToDefault = () => {
    setToAddress("The Dean,\nStudent Affairs Cell,\nVardhaman College of Engineering,\nHyderabad.");
    setSubject("");
    setSalutation("Respected Sir,");
    setContent("");
    setSignOff("Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering\n\nEvent: Battle Ground - Survive the System\nDate: 1st October 2026");
    setDate(new Date().toLocaleDateString("en-GB").replace(/\//g, ' / '));
    toast.info("Reset letter to template defaults.");
  };

  return (
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-8 shrink-0">
        <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/member/dashboard"
              className="p-1.5 sm:p-2 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-white/60 hover:text-white shrink-0"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight truncate">Letter Editor</h1>
              <p className="text-xs sm:text-sm text-white/50 truncate hidden xs:block">Official permission letters simulator</p>
            </div>
          </div>

          {/* Mobile Download Button (when header is compact) */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white rounded-lg transition-all font-semibold text-xs shrink-0 shadow-lg shadow-blue-600/20"
          >
            {isDownloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>.docx</span>
          </button>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            onClick={resetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 rounded-lg transition-colors text-xs font-medium"
            title="Reset letter fields"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white rounded-lg transition-all font-medium text-sm shadow-lg shadow-blue-600/20"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download .docx
          </button>
        </div>
      </div>

      {/* Mobile Tab Switcher (< lg) */}
      <div className="lg:hidden flex bg-[#16161a] border border-white/10 rounded-xl p-1 mb-4 shrink-0 shadow-sm">
        <button
          type="button"
          onClick={() => setMobileTab("document")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
            mobileTab === "document"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-white/60 hover:text-white"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Document Paper</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("ai")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all relative ${
            mobileTab === "ai"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          <span>AI Assistant</span>
          <span className="text-[10px] bg-blue-400/20 text-blue-300 px-1.5 py-0.2 rounded-full font-bold">PRO</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start flex-1">
        {/* Document Simulator (A4 Paper) */}
        <div 
          className={`
            w-full lg:w-[65%] flex justify-center pb-8
            ${mobileTab === "document" ? "flex" : "hidden"}
            lg:flex
          `}
        >
          <div className="bg-white text-black w-full max-w-[21cm] min-h-[auto] md:min-h-[29.7cm] shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-sm p-4 sm:p-8 md:p-14 lg:p-20 font-serif leading-relaxed text-xs sm:text-sm md:text-[11pt] border border-gray-200">
            
            {/* To Address */}
            <div className="mb-4 sm:mb-6">
              <span className="font-bold block mb-1 text-xs sm:text-sm md:text-[12pt]">To</span>
              <AutoTextArea
                value={toAddress}
                onChange={setToAddress}
                placeholder="The Dean,&#10;Student Affairs Cell,&#10;Vardhaman College of Engineering,&#10;Hyderabad."
              />
            </div>

            {/* Date */}
            <div className="mb-4 sm:mb-6 flex items-center gap-2">
              <span className="font-bold text-xs sm:text-sm md:text-[12pt]">Date:</span>
              <AutoTextArea
                value={date}
                onChange={setDate}
                placeholder="DD / MM / YYYY"
                className="w-36"
                bold={true}
              />
            </div>

            {/* Subject */}
            <div className="mb-5 sm:mb-8 flex flex-col sm:flex-row items-start gap-1 sm:gap-2">
              <span className="font-bold whitespace-nowrap text-xs sm:text-sm md:text-[12pt]">Subject:</span>
              <AutoTextArea
                value={subject}
                onChange={setSubject}
                placeholder="Request for Permission to Conduct..."
                bold={true}
                className="flex-1"
              />
            </div>

            {/* Salutation */}
            <div className="mb-3 sm:mb-4">
              <AutoTextArea
                value={salutation}
                onChange={setSalutation}
                placeholder="Respected Sir,"
              />
            </div>

            {/* Body */}
            <div className="mb-6 sm:mb-10">
              <AutoTextArea
                value={content}
                onChange={setContent}
                placeholder="We, the members of Connect Club..."
                align="justify"
                className="min-h-[140px] sm:min-h-[180px]"
              />
            </div>

            {/* Sign-off */}
            <div className="mt-6 sm:mt-8 flex justify-start">
              <div className="w-full">
                <AutoTextArea
                  value={signOff}
                  onChange={setSignOff}
                  placeholder="Thank you for your consideration.&#10;&#10;Yours sincerely,&#10;Connect Club&#10;Vardhaman College of Engineering&#10;&#10;Event: Battle Ground&#10;Date: 1st October 2026"
                  align="left"
                  className="min-h-[140px]"
                />
              </div>
            </div>

            {/* Mobile Bottom Download Prompt inside paper view */}
            <div className="lg:hidden mt-8 pt-4 border-t border-gray-200 flex items-center justify-between text-gray-500 text-[11px]">
              <span>Ready to submit?</span>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isDownloading}
                className="text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                {isDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                Download Word (.docx)
              </button>
            </div>
            
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div 
          className={`
            w-full lg:w-[35%] lg:sticky lg:top-8 space-y-4 sm:space-y-6
            ${mobileTab === "ai" ? "block" : "hidden"}
            lg:block
          `}
        >
          <div className="bg-gradient-to-b from-blue-500/10 via-[#111116] to-[#0c0c0e] border border-blue-500/25 rounded-2xl p-4 sm:p-6 shadow-xl shadow-blue-950/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white">AI Letter Assistant</h2>
              </div>
              <span className="text-[10px] text-blue-400 font-mono uppercase tracking-wider bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                GPT-4o Powered
              </span>
            </div>
            
            <p className="text-xs sm:text-sm text-white/60 mb-3 leading-relaxed">
              Describe your letter purpose, and AI will automatically generate a formal Subject, Body Paragraph, and Sign-off into your paper.
            </p>

            {/* Quick Prompt Chips */}
            <div className="mb-3">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wider mb-2">Quick Templates:</p>
              <div className="flex flex-wrap gap-1.5">
                {PROMPT_SUGGESTIONS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAiPrompt(item.prompt)}
                    className="text-[11px] px-2.5 py-1 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 border border-white/10 rounded-full text-white/80 transition-all text-left truncate max-w-full active:scale-95"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-blue-500/60 transition-colors custom-scrollbar mb-3 text-xs sm:text-sm resize-none placeholder:text-white/30"
              placeholder="e.g. Requesting permission to conduct a 24-hour hackathon called Battleground on 15th November in the main auditorium..."
            />

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 active:scale-95 border border-blue-400/40 rounded-xl text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-xs sm:text-sm shadow-lg shadow-blue-600/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  <span>Drafting Letter...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  <span>Draft Letter Content</span>
                </>
              )}
            </button>
          </div>
          
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-4 sm:p-6">
             <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                 <Download className="w-4 h-4 text-white/60" />
               </div>
               <div>
                 <h3 className="font-semibold text-white text-xs sm:text-sm mb-1">Exporting your letter</h3>
                 <p className="text-[11px] sm:text-xs text-white/50 leading-relaxed">
                   When you click download, your content will be embedded into the official Connect Club Word (.docx) template with standard header and footer seals.
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
