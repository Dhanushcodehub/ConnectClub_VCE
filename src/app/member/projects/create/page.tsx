"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ArrowLeft, Save, Loader2, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import ImageUploader from "@/components/ImageUploader";
import { ProjectStatus, ConnectProject } from "@/lib/data/projects";

export default function CreateProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<Omit<ConnectProject, "id">>({
    name: "",
    description: "",
    status: "In Development",
    banner: "",
    timeline: "",
    demoLink: "",
    githubRepo: "",
    githubLink: "",
    technologies: [],
    features: [],
    teamMembers: [],
    screenshots: [],
  });

  const [techInput, setTechInput] = useState("");

  const handleAddTech = () => {
    if (techInput.trim() && !formData.technologies.includes(techInput.trim())) {
      setFormData({ ...formData, technologies: [...formData.technologies, techInput.trim()] });
      setTechInput("");
    }
  };

  const removeTech = (tech: string) => {
    setFormData({ ...formData, technologies: formData.technologies.filter(t => t !== tech) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.banner) {
      alert("Please fill in the project name and upload a banner.");
      return;
    }

    setLoading(true);
    try {
      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await setDoc(doc(collection(db, "projects"), slug), {
        ...formData,
        id: slug,
      });
      router.push("/member/projects");
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project.");
      setLoading(false);
    }
  };

  const handleArrayStringAdd = (field: "features" | "screenshots") => {
    setFormData({ ...formData, [field]: [...(formData[field] || []), ""] });
  };

  const handleArrayStringChange = (field: "features" | "screenshots", index: number, value: string) => {
    const newArray = [...(formData[field] || [])];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const handleArrayStringRemove = (field: "features" | "screenshots", index: number) => {
    const newArray = [...(formData[field] || [])];
    newArray.splice(index, 1);
    setFormData({ ...formData, [field]: newArray });
  };

  const handleTeamMemberAdd = () => {
    setFormData({ ...formData, teamMembers: [...(formData.teamMembers || []), { name: "", role: "", linkedin: "" }] });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto">
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10">
          <div className="flex items-center space-x-4">
            <Link href="/member/projects" className="p-2 bg-white/5 hover:bg-white/10 rounded-md transition-colors text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Create New Project</h1>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-primary text-white px-6 py-2 rounded-md font-medium flex items-center hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Project
          </button>
        </header>

        <div className="p-8 max-w-5xl mx-auto pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              
              {/* Basic Information */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Basic Information</h2>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Project Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="e.g. Connect AI"
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
                    placeholder="A brief description of the project..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">Timeline</label>
                  <input
                    type="text"
                    required
                    value={formData.timeline}
                    onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="e.g. Sep 2025 - Present"
                  />
                </div>
              </div>

              {/* Technologies */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Technologies</h2>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={techInput}
                    onChange={(e) => setTechInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTech();
                      }
                    }}
                    className="flex-1 bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="Add a technology..."
                  />
                  <button type="button" onClick={handleAddTech} className="bg-white/10 p-3 rounded-md hover:bg-white/20 transition-colors text-white">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {formData.technologies.map(tech => (
                    <span key={tech} className="bg-primary/20 text-primary px-3 py-1.5 rounded-md text-sm font-medium flex items-center border border-primary/20">
                      {tech}
                      <button type="button" onClick={() => removeTech(tech)} className="ml-2 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Key Features</h2>
                  <button type="button" onClick={() => handleArrayStringAdd("features")} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Feature
                  </button>
                </div>
                {formData.features?.map((feature, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => handleArrayStringChange("features", i, e.target.value)}
                      className="flex-1 bg-background border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                    <button type="button" onClick={() => handleArrayStringRemove("features", i)} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Team Members */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Team Members</h2>
                  <button type="button" onClick={handleTeamMemberAdd} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-md flex items-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Member
                  </button>
                </div>
                {formData.teamMembers?.map((member, i) => (
                  <div key={i} className="flex gap-2 items-start bg-background p-4 rounded-md border border-white/5">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={member.name}
                        onChange={(e) => {
                          const newTeam = [...(formData.teamMembers || [])];
                          newTeam[i].name = e.target.value;
                          setFormData({ ...formData, teamMembers: newTeam });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm"
                        placeholder="Name"
                      />
                      <input
                        type="text"
                        value={member.role}
                        onChange={(e) => {
                          const newTeam = [...(formData.teamMembers || [])];
                          newTeam[i].role = e.target.value;
                          setFormData({ ...formData, teamMembers: newTeam });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm"
                        placeholder="Role"
                      />
                      <input
                        type="url"
                        value={member.linkedin || ""}
                        onChange={(e) => {
                          const newTeam = [...(formData.teamMembers || [])];
                          newTeam[i].linkedin = e.target.value;
                          setFormData({ ...formData, teamMembers: newTeam });
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white focus:outline-none text-sm"
                        placeholder="LinkedIn URL (optional)"
                      />
                    </div>
                    <button type="button" onClick={() => {
                      const newTeam = [...(formData.teamMembers || [])];
                      newTeam.splice(i, 1);
                      setFormData({ ...formData, teamMembers: newTeam });
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
                <h2 className="text-lg font-bold text-white mb-4">Status & Links</h2>
                <div className="space-y-1.5 mb-4">
                  <label className="text-sm font-medium text-white/80">Project Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  >
                    <option value="Live">Live</option>
                    <option value="In Development">In Development</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>

                <div className="space-y-1.5 mb-4">
                  <label className="text-sm font-medium text-white/80">Demo Link</label>
                  <input
                    type="url"
                    value={formData.demoLink}
                    onChange={(e) => setFormData({ ...formData, demoLink: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-white/80">GitHub Link</label>
                  <input
                    type="url"
                    value={formData.githubLink}
                    onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
                    className="w-full bg-background border border-white/10 rounded-md px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    placeholder="https://github.com/..."
                  />
                </div>
              </div>

              {/* Banner */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <h2 className="text-lg font-bold text-white mb-4">Banner Image</h2>
                <ImageUploader 
                  className="h-48 rounded-md"
                  onUpload={(url) => setFormData({ ...formData, banner: url })}
                />
                {formData.banner && (
                  <div className="text-xs text-green-400 mt-2 break-all">Banner uploaded!</div>
                )}
              </div>

              {/* Screenshots */}
              <div className="bg-card border border-white/5 p-6 rounded-xl space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white">Screenshots</h2>
                </div>
                <div className="space-y-4">
                  {formData.screenshots?.map((imgUrl, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="url"
                        value={imgUrl}
                        onChange={(e) => handleArrayStringChange("screenshots", i, e.target.value)}
                        className="flex-1 bg-background border border-white/10 rounded-md px-4 py-2 text-white text-sm"
                        placeholder="Image URL"
                      />
                      <button type="button" onClick={() => handleArrayStringRemove("screenshots", i)} className="p-2 bg-red-500/10 text-red-500 rounded-md hover:bg-red-500/20">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => handleArrayStringAdd("screenshots")} className="w-full text-xs bg-white/5 hover:bg-white/10 text-white px-3 py-2 rounded-md flex items-center justify-center">
                    <Plus className="w-3 h-3 mr-1" /> Add Image URL
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
