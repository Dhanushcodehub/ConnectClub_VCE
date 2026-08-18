"use client";

import { useState } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { submitUserProject } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { ArrowLeft, Send, X, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";

export default function SubmitProjectPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    technologies: [] as string[],
    githubUrl: "",
    demoUrl: "",
    bannerUrl: "",
    screenshots: [] as string[],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddTech = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tech = techInput.trim().replace(',', '');
      if (tech && !formData.technologies.includes(tech)) {
        setFormData(prev => ({
          ...prev,
          technologies: [...prev.technologies, tech]
        }));
        setTechInput("");
      }
    }
  };

  const removeTech = (techToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      technologies: prev.technologies.filter(t => t !== techToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    if (formData.description.length < 50) {
      alert("Description must be at least 50 characters.");
      return;
    }
    
    if (!formData.bannerUrl) {
      alert("Please upload a banner image for your project.");
      return;
    }

    setLoading(true);
    try {
      await submitUserProject({
        title: formData.title,
        description: formData.description,
        technologies: formData.technologies,
        githubUrl: formData.githubUrl,
        demoUrl: formData.demoUrl,
        banner: formData.bannerUrl,
        screenshots: formData.screenshots,
        userId: user.uid,
        authorName: profile?.name || user.displayName || "Anonymous",
        status: "pending"
      });
      router.push('/u/projects');
    } catch (error) {
      console.error("Error submitting project:", error);
      setLoading(false);
    }
  };

  return (
    <div className="p-8 md:p-12 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Link href="/u/projects" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to My Projects
        </Link>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
          Submit a Project
        </h1>
        <p className="text-white/50">
          Share your work with the community. All submissions are reviewed before being published.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl p-8 space-y-6"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">Project Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              name="title"
              required
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
              placeholder="e.g. Campus Event Management System"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">Description <span className="text-red-400">*</span></label>
            <textarea
              name="description"
              required
              rows={5}
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors resize-none"
              placeholder="Describe what your project does, the problem it solves, and how you built it... (min 50 characters)"
            />
            <div className="text-right text-xs text-white/40">
              {formData.description.length} / 50 min
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">Technologies Used</label>
            <div className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 focus-within:border-primary transition-colors flex flex-wrap gap-2">
              {formData.technologies.map(tech => (
                <span key={tech} className="bg-white/10 text-white text-sm px-3 py-1 rounded-lg flex items-center gap-1.5">
                  {tech}
                  <button type="button" onClick={() => removeTech(tech)} className="hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={techInput}
                onChange={(e) => setTechInput(e.target.value)}
                onKeyDown={handleAddTech}
                className="bg-transparent border-none outline-none text-white placeholder-white/30 flex-1 min-w-[150px]"
                placeholder={formData.technologies.length === 0 ? "Type and press Enter (e.g. React, Node.js)" : "Add more..."}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">GitHub Repository URL</label>
              <input
                type="url"
                name="githubUrl"
                value={formData.githubUrl}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="https://github.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 ml-1">Live Demo URL</label>
              <input
                type="url"
                name="demoUrl"
                value={formData.demoUrl}
                onChange={handleChange}
                className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:border-primary focus:outline-none transition-colors"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">Banner Image <span className="text-red-400">*</span></label>
            <div className="h-48 w-full">
              <ImageUploader 
                onUpload={(url) => setFormData(prev => ({ ...prev, bannerUrl: url }))} 
                defaultImage={formData.bannerUrl}
                className="h-full w-full rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70 ml-1">Project Screenshots (Optional)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {formData.screenshots.map((url, index) => (
                <div key={index} className="relative h-32 rounded-2xl overflow-hidden group border border-white/10 bg-white/5">
                  <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setFormData(prev => ({ ...prev, screenshots: prev.screenshots.filter((_, i) => i !== index) }))}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 rounded-full text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {formData.screenshots.length < 6 && (
                <div className="h-32">
                  <ImageUploader 
                    onUpload={(url) => setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, url] }))} 
                    className="h-full w-full rounded-2xl"
                  />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Submit for Review</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
