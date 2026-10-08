"use client";

import { useState, useRef, useEffect } from "react";
import { auth } from "@/lib/firebase/config";
import { Download, Loader2, Sparkles, Wand2 } from "lucide-react";
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
      className={`w-full resize-none outline-none bg-transparent overflow-hidden placeholder:text-gray-400 ${alignClass} ${bold ? "font-bold" : ""} ${className}`}
      rows={1}
    />
  );
}

export default function LetterEditor() {
  const [toAddress, setToAddress] = useState("The Dean,\nStudent Affairs Cell,\nVardhaman College of Engineering,\nHyderabad.");
  const [subject, setSubject] = useState("");
  const [salutation, setSalutation] = useState("Respected Sir,");
  const [content, setContent] = useState("");
  const [signOff, setSignOff] = useState("Thank you for your consideration.\n\nYours sincerely,\nConnect Club\nVardhaman College of Engineering\n\nEvent: Battle Ground - Survive the System\nDate: 1st October 2026");
  const [date, setDate] = useState(new Date().toLocaleDateString("en-GB").replace(/\//g, ' / '));
  
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

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
        toast.success("Letter content generated!");
      } catch (e) {
        // Fallback in case the model didn't return strict JSON
        setContent(data.content);
        toast.success("Letter content generated! (Plain text)");
      }
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

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Letter Editor</h1>
          <p className="text-white/60">Simulate and edit formal permission letters like a real document.</p>
        </div>
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Download .docx
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Document Simulator (A4 Paper) */}
        <div className="w-full lg:w-[65%] flex justify-center overflow-x-auto pb-4">
          <div className="bg-white text-black w-full min-w-[320px] max-w-[21cm] min-h-[auto] md:min-h-[29.7cm] shadow-2xl rounded-sm p-6 sm:p-10 md:p-16 lg:p-20 font-serif leading-relaxed text-[12px] sm:text-[14px] md:text-[11pt]">
            
            {/* To Address */}
            <div className="mb-4 md:mb-6">
              <span className="font-bold block mb-1 text-[13px] sm:text-[15px] md:text-[12pt]">To</span>
              <AutoTextArea
                value={toAddress}
                onChange={setToAddress}
                placeholder="The Dean,&#10;Student Affairs Cell,&#10;Vardhaman College of Engineering,&#10;Hyderabad."
              />
            </div>

            {/* Date */}
            <div className="mb-4 md:mb-6 flex items-center gap-2">
              <span className="font-bold text-[13px] sm:text-[15px] md:text-[12pt]">Date:</span>
              <AutoTextArea
                value={date}
                onChange={setDate}
                placeholder="DD / MM / YYYY"
                className="w-32"
                bold={true}
              />
            </div>

            {/* Subject */}
            <div className="mb-6 md:mb-8 flex items-start">
              <span className="font-bold mr-2 whitespace-nowrap text-[13px] sm:text-[15px] md:text-[12pt]">Subject:</span>
              <AutoTextArea
                value={subject}
                onChange={setSubject}
                placeholder="Request for Permission to Conduct..."
                bold={true}
                className="flex-1"
              />
            </div>

            {/* Salutation */}
            <div className="mb-4">
              <AutoTextArea
                value={salutation}
                onChange={setSalutation}
                placeholder="Respected Sir,"
              />
            </div>

            {/* Body */}
            <div className="mb-6 md:mb-10">
              <AutoTextArea
                value={content}
                onChange={setContent}
                placeholder="We, the members of Connect Club..."
                align="justify"
                className="min-h-[150px]"
              />
            </div>

            {/* Sign-off */}
            <div className="mt-6 md:mt-8 flex justify-start">
              <div className="w-full">
                <AutoTextArea
                  value={signOff}
                  onChange={setSignOff}
                  placeholder="Thank you for your consideration.&#10;&#10;Yours sincerely,&#10;Connect Club&#10;Vardhaman College of Engineering&#10;&#10;Event: Battle Ground&#10;Date: 1st October 2026"
                  align="left"
                  className="min-h-[150px]"
                />
              </div>
            </div>
            
          </div>
        </div>

        {/* AI Assistant Sidebar */}
        <div className="w-full lg:w-[35%] sticky top-8 space-y-6">
          <div className="bg-gradient-to-b from-blue-500/10 to-transparent border border-blue-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-bold text-white">AI Letter Assistant</h2>
            </div>
            <p className="text-sm text-white/60 mb-4">
              Describe what the letter is about, and AI will generate a formal body paragraph directly into your document.
            </p>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={5}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500/50 transition-colors custom-scrollbar mb-4 text-sm resize-none"
              placeholder="e.g. A letter requesting permission to conduct a 24-hour hackathon called Battleground on 15th November in the main auditorium..."
            />
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating || !aiPrompt.trim()}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-5 h-5 mr-2" />
              )}
              {isGenerating ? "Drafting..." : "Draft Letter Content"}
            </button>
          </div>
          
          <div className="bg-[#0c0c0e] border border-white/5 rounded-2xl p-6">
             <div className="flex items-start gap-3">
               <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                 <Download className="w-4 h-4 text-white/60" />
               </div>
               <div>
                 <h3 className="font-semibold text-white text-sm mb-1">Exporting your letter</h3>
                 <p className="text-xs text-white/50 leading-relaxed">
                   When you click download, this content will be automatically embedded into the official Connect Club .docx template, retaining all standard headers and footers.
                 </p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
