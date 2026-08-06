"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";
import { EventStatus, ConnectEvent } from "@/lib/data/events";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  const [formData, setFormData] = useState<ConnectEvent>({
    id: "",
    title: "",
    description: "",
    date: "",
    venue: "",
    status: "Upcoming",
    banner: "",
    registrationLink: "",
    speakers: [],
    agenda: [],
    faqs: [],
    galleryAlbums: [],
    highlights: [],
    certificates: false,
  });

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const docRef = doc(db, "events", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setFormData(docSnap.data() as ConnectEvent);
        } else {
          alert("Event not found");
          router.push("/admin/events");
        }
      } catch (err) {
        console.error("Error fetching event:", err);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchEvent();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.banner) {
      alert("Please fill in the title and upload a banner.");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "events", id), {
        ...formData,
      });
      router.push("/admin/events");
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event.");
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

  if (initialLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <Link href="/admin/events" className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Edit Event</h1>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-white px-6 py-2 rounded-md font-medium flex items-center hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Update Event
          </button>
        </header>

        <div className="p-8 max-w-5xl mx-auto pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Basic Information */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Basic Information</h2>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Event Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="e.g. InspireX 2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Description</label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                    placeholder="A brief description of the event..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80">Date & Time</label>
                    <input
                      type="text"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. March 15, 2026"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-white/80">Venue</label>
                    <input
                      type="text"
                      required
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                      placeholder="e.g. Main Auditorium"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Array Fields */}
              {/* Speakers */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Speakers</h2>
                  <button type="button" onClick={() => handleArrayStringAdd("speakers")} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Speaker
                  </button>
                </div>
                {formData.speakers?.map((speaker, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={speaker}
                      onChange={(e) => handleArrayStringChange("speakers", i, e.target.value)}
                      className="flex-1 bg-background border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <button type="button" onClick={() => handleArrayStringRemove("speakers", i)} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Event Highlights</h2>
                  <button type="button" onClick={() => handleArrayStringAdd("highlights")} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Highlight
                  </button>
                </div>
                {formData.highlights?.map((hl, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={hl}
                      onChange={(e) => handleArrayStringChange("highlights", i, e.target.value)}
                      className="flex-1 bg-background border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <button type="button" onClick={() => handleArrayStringRemove("highlights", i)} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Agenda */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Agenda</h2>
                  <button type="button" onClick={handleAgendaAdd} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </button>
                </div>
                {formData.agenda?.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start bg-background p-4 rounded-md border border-white/5">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={item.time}
                        onChange={(e) => {
                          const newAgenda = [...(formData.agenda || [])];
                          newAgenda[i].time = e.target.value;
                          setFormData({ ...formData, agenda: newAgenda });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm"
                        placeholder="Time (e.g. 10:00 AM)"
                      />
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => {
                          const newAgenda = [...(formData.agenda || [])];
                          newAgenda[i].title = e.target.value;
                          setFormData({ ...formData, agenda: newAgenda });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm"
                        placeholder="Title"
                      />
                      <textarea
                        value={item.description}
                        onChange={(e) => {
                          const newAgenda = [...(formData.agenda || [])];
                          newAgenda[i].description = e.target.value;
                          setFormData({ ...formData, agenda: newAgenda });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm resize-none"
                        placeholder="Description (Optional)"
                        rows={2}
                      />
                    </div>
                    <button type="button" onClick={() => {
                      const newAgenda = [...(formData.agenda || [])];
                      newAgenda.splice(i, 1);
                      setFormData({ ...formData, agenda: newAgenda });
                    }} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 mt-1">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* FAQs */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">FAQs</h2>
                  <button type="button" onClick={handleFaqAdd} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add FAQ
                  </button>
                </div>
                {formData.faqs?.map((faq, i) => (
                  <div key={i} className="flex gap-2 items-start bg-background p-4 rounded-md border border-white/5">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const newFaqs = [...(formData.faqs || [])];
                          newFaqs[i].question = e.target.value;
                          setFormData({ ...formData, faqs: newFaqs });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm font-medium"
                        placeholder="Question"
                      />
                      <textarea
                        value={faq.answer}
                        onChange={(e) => {
                          const newFaqs = [...(formData.faqs || [])];
                          newFaqs[i].answer = e.target.value;
                          setFormData({ ...formData, faqs: newFaqs });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm resize-none text-white/70"
                        placeholder="Answer"
                        rows={3}
                      />
                    </div>
                    <button type="button" onClick={() => {
                      const newFaqs = [...(formData.faqs || [])];
                      newFaqs.splice(i, 1);
                      setFormData({ ...formData, faqs: newFaqs });
                    }} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20 mt-1">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {/* Status */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Status & Registration</h2>
                <div className="space-y-1.5 mb-4">
                  <label className="text-sm font-medium text-white/80">Event Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as EventStatus })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="Upcoming">Upcoming</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Past">Past</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3 mb-4 pt-2">
                  <input
                    type="checkbox"
                    id="certificates"
                    checked={formData.certificates}
                    onChange={(e) => setFormData({ ...formData, certificates: e.target.checked })}
                    className="w-5 h-5 rounded border-white/10 bg-background accent-primary"
                  />
                  <label htmlFor="certificates" className="text-sm font-medium text-white/80">
                    Provides Certificates
                  </label>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Registration Link</label>
                  <input
                    type="url"
                    value={formData.registrationLink}
                    onChange={(e) => setFormData({ ...formData, registrationLink: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="https://forms.gle/..."
                  />
                </div>
              </div>

              {/* Banner */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Banner Image</h2>
                <ImageUploader 
                  className="h-48 rounded-md"
                  onUpload={(url) => setFormData({ ...formData, banner: url })}
                  defaultImage={formData.banner}
                />
              </div>

              {/* Gallery Albums */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Gallery Album Links</h2>
                </div>
                <div className="space-y-4">
                  {formData.galleryAlbums?.map((url, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="url"
                        value={url}
                        onChange={(e) => handleArrayStringChange("galleryAlbums", i, e.target.value)}
                        className="flex-1 bg-background border border-white/10 rounded-md px-4 py-2 text-white text-sm"
                        placeholder="Google Drive / Photos link"
                      />
                      <button type="button" onClick={() => handleArrayStringRemove("galleryAlbums", i)} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => handleArrayStringAdd("galleryAlbums")} className="w-full text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-md flex items-center justify-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Album Link
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
