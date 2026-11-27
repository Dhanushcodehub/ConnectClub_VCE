"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ArrowLeft, Save, Loader2, Plus, Trash2, Lock, Unlock } from "lucide-react";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";
import MediaUploader from "@/components/MediaUploader";
import { EventStatus, ConnectEvent } from "@/lib/data/events";
import { cn } from "@/lib/utils";

export default function CreateEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Omit<ConnectEvent, "id">>({
    title: "",
    description: "",
    date: "",
    venue: "",
    status: "Upcoming",
    banner: "",
    registrationLink: "",
    time: "",
    price: "",
    organizedBy: "",
    speakers: [],
    agenda: [],
    faqs: [],
    galleryAlbums: [],
    highlights: [],
    certificates: false,
    isClosed: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.banner) {
      alert("Please fill in the title and upload a banner.");
      return;
    }

    setLoading(true);
    try {
      const slug = formData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await setDoc(doc(collection(db, "events"), slug), {
        ...formData,
        id: slug,
      });

      // Instantly revalidate the public cache so users see the changes
      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/events", "/"] }),
      });

      router.push("/admin/events");
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event.");
      setLoading(false);
    }
  };

  const handleArrayStringAdd = (field: "speakers" | "highlights" | "galleryAlbums") => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ""] });
  };

  const handleArrayStringChange = (field: "speakers" | "highlights" | "galleryAlbums", index: number, value: string) => {
    const newArray = [...(formData[field] || [])];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const handleArrayStringRemove = (field: "speakers" | "highlights" | "galleryAlbums", index: number) => {
    const newArray = [...(formData[field] || [])];
    newArray.splice(index, 1);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleAgendaAdd = () => {
    setFormData({ ...formData, agenda: [...(formData.agenda || []), { time: "", title: "", description: "" }] });
  };

  const handleFaqAdd = () => {
    setFormData({ ...formData, faqs: [...(formData.faqs || []), { question: "", answer: "" }] });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <header className="px-4 sm:px-6 md:px-8 py-3.5 sm:py-5 border-b border-white/5 flex items-center justify-between gap-3 sm:gap-4 sticky top-0 bg-background/90 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5 sm:space-x-4 min-w-0">
            <Link href="/admin/events" className="p-2 bg-white/5 hover:bg-white/10 rounded-lg sm:rounded-xl transition-colors text-white shrink-0">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight truncate whitespace-nowrap">Create New Event</h1>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary hover:bg-primary/90 text-white px-3 sm:px-5 py-2 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-colors shadow-md active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 animate-spin shrink-0" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1 sm:mr-1.5 shrink-0" />}
            <span>Save Event</span>
          </button>
        </header>

        <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Basic Information */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Basic Information</h2>
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-white/80">Event Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="e.g. InspireX 2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-white/80">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    placeholder="A brief description of the event..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Date</label>
                    <input
                      type="text"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. 15 Aug 2026"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Venue</label>
                    <input
                      type="text"
                      required
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. T-Works, Hyderabad"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Time</label>
                    <input
                      type="text"
                      value={formData.time || ""}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. 3:00 PM"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Price</label>
                    <input
                      type="text"
                      value={formData.price || ""}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. Free or ₹69.00"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2 md:col-span-1">
                    <label className="text-xs sm:text-sm font-medium text-white/80">Organized By</label>
                    <input
                      type="text"
                      value={formData.organizedBy || ""}
                      onChange={(e) => setFormData({ ...formData, organizedBy: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. Connect Club"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-medium text-white/80">Registration Link (Optional)</label>
                  <input
                    type="url"
                    value={formData.registrationLink}
                    onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="https://lu.ma/..."
                  />
                </div>
              </div>

              {/* Highlights */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">Event Highlights</h2>
                  <button type="button" onClick={() => handleArrayStringAdd("highlights")} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center shrink-0">
                    <Plus className="w-3 h-3 mr-1" /> Add Highlight
                  </button>
                </div>
                {formData.highlights?.map((hl, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={hl}
                      onChange={(e) => handleArrayStringChange("highlights", i, e.target.value)}
                      className="flex-1 bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                      placeholder="e.g. Build 3 end-to-end AI applications"
                    />
                    <button type="button" onClick={() => handleArrayStringRemove("highlights", i)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 shrink-0">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Speakers */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">Speakers</h2>
                  <button type="button" onClick={() => handleArrayStringAdd("speakers")} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center shrink-0">
                    <Plus className="w-3 h-3 mr-1" /> Add Speaker
                  </button>
                </div>
                {formData.speakers?.map((speaker, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={speaker}
                      onChange={(e) => handleArrayStringChange("speakers", i, e.target.value)}
                      className="flex-1 bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                      placeholder="e.g. John Doe"
                    />
                    <button type="button" onClick={() => handleArrayStringRemove("speakers", i)} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 shrink-0">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Agenda */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">Agenda</h2>
                  <button type="button" onClick={handleAgendaAdd} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center shrink-0">
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </button>
                </div>
                {formData.agenda?.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start bg-background p-3.5 sm:p-4 rounded-xl border border-white/5">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => {
                          const newAgenda = [...(formData.agenda || [])];
                          newAgenda[i].time = e.target.value;
                          setFormData({ ...formData, agenda: newAgenda });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-white focus:outline-none text-sm"
                        placeholder="Time (e.g. Day 1 - 09:00 AM)"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const newAgenda = [...(formData.agenda || [])];
                          newAgenda[i].title = e.target.value;
                          setFormData({ ...formData, agenda: newAgenda });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-white focus:outline-none text-sm"
                        placeholder="Title (e.g. Opening Ceremony)"
                      />
                    </div>
                    <button type="button" onClick={() => {
                      const newAgenda = [...(formData.agenda || [])];
                      newAgenda.splice(i, 1);
                      setFormData({ ...formData, agenda: newAgenda });
                    }} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 mt-1 shrink-0">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* FAQs */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">FAQs</h2>
                  <button type="button" onClick={handleFaqAdd} className="text-xs bg-white/10 hover:bg-white/20 text-white px-2.5 sm:px-3 py-1.5 rounded-lg flex items-center shrink-0">
                    <Plus className="w-3 h-3 mr-1" /> Add FAQ
                  </button>
                </div>
                {formData.faqs?.map((faq, i) => (
                  <div key={i} className="flex gap-2 items-start bg-background p-3.5 sm:p-4 rounded-xl border border-white/5">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const newFaqs = [...(formData.faqs || [])];
                          newFaqs[i].question = e.target.value;
                          setFormData({ ...formData, faqs: newFaqs });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-white focus:outline-none text-sm"
                        placeholder="Question"
                      />
                      <textarea
                        value={faq.answer}
                        rows={2}
                        onChange={(e) => {
                          const newFaqs = [...(formData.faqs || [])];
                          newFaqs[i].answer = e.target.value;
                          setFormData({ ...formData, faqs: newFaqs });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-white focus:outline-none text-sm resize-none"
                        placeholder="Answer"
                      />
                    </div>
                    <button type="button" onClick={() => {
                      const newFaqs = [...(formData.faqs || [])];
                      newFaqs.splice(i, 1);
                      setFormData({ ...formData, faqs: newFaqs });
                    }} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 mt-1 shrink-0">
                      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Status & Features</h2>
                <div className="space-y-1.5 mb-4">
                  <label className="text-xs sm:text-sm font-medium text-white/80">Event Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                    className="w-full bg-background border border-white/10 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Past">Past</option>
                  </select>
                </div>

                {/* Event Registration Open / Closed Toggle */}
                <div className="p-3.5 sm:p-4 rounded-xl border bg-white/[0.02] border-white/10 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                        <span>Event Registration</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                          formData.isClosed
                            ? "bg-red-500/15 text-red-400 border-red-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        )}>
                          {formData.isClosed ? "Closed" : "Open"}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">
                        {formData.isClosed
                          ? "Registration is closed. The Register button is disabled on event pages."
                          : "Registration is open. Students can click Register Now."}
                      </p>
                    </div>

                    {/* Interactive Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!formData.isClosed}
                      onClick={() => setFormData({ ...formData, isClosed: !formData.isClosed })}
                      className={cn(
                        "relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary/50",
                        !formData.isClosed ? "bg-emerald-600" : "bg-white/20"
                      )}
                      title={formData.isClosed ? "Click to open registrations" : "Click to close registrations"}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out",
                          !formData.isClosed ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </div>

                  {/* Dual Mode Switch Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isClosed: false })}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border",
                        !formData.isClosed
                          ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm"
                          : "bg-white/[0.03] text-white/50 border-white/5 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, isClosed: true })}
                      className={cn(
                        "py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border",
                        formData.isClosed
                          ? "bg-red-500/20 text-red-300 border-red-500/40 shadow-sm"
                          : "bg-white/[0.03] text-white/50 border-white/5 hover:bg-white/[0.06] hover:text-white"
                      )}
                    >
                      <Lock className="w-3.5 h-3.5 text-red-400" />
                      Closed
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <input
                    type="checkbox"
                    id="certificates"
                    checked={formData.certificates}
                    onChange={(e) => setFormData({ ...formData, certificates: e.target.checked })}
                    className="w-5 h-5 rounded border-white/10 bg-background accent-primary"
                  />
                  <label htmlFor="certificates" className="text-xs sm:text-sm font-medium text-white/80 select-none cursor-pointer">
                    Provide Certificates
                  </label>
                </div>
              </div>

              {/* Banner */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Banner Image</h2>
                <ImageUploader 
                  className="h-48 rounded-xl"
                  onUpload={(url) => setFormData({ ...formData, banner: url })}
                />
                {formData.banner && (
                  <div className="text-xs text-green-400 mt-2 break-all">Banner uploaded!</div>
                )}
              </div>

              {/* Gallery Media */}
              <div className="bg-[#0c0c0e] border border-white/5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl space-y-4">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">Gallery Media</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formData.galleryAlbums?.map((url, i) => (
                    <div key={i} className="relative aspect-video">
                       <MediaUploader 
                         defaultMedia={url}
                         onUpload={(newUrl) => handleArrayStringChange("galleryAlbums", i, newUrl)}
                         className="w-full h-full"
                       />
                       <button 
                         type="button" 
                         onClick={() => handleArrayStringRemove("galleryAlbums", i)} 
                         className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:scale-110 z-10 shadow-lg"
                       >
                         <Trash2 className="w-3 h-3" />
                       </button>
                    </div>
                  ))}
                  <button 
                    type="button" 
                    onClick={() => handleArrayStringAdd("galleryAlbums")} 
                    className="flex flex-col items-center justify-center border-2 border-dashed border-white/20 rounded-xl bg-white/5 hover:bg-white/10 hover:border-primary/50 transition-colors aspect-video text-white/70 w-full h-full"
                  >
                    <Plus className="w-5 h-5 mb-1" /> 
                    <span className="text-[10px] font-medium uppercase tracking-wider">Add Media</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
