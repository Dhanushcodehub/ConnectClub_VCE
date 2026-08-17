"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { getUserProjects } from "@/lib/firebase/users";
import { motion } from "framer-motion";
import { FolderGit2, Plus, Heart, MessageCircle, ExternalLink, GitBranch, Clock, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function MyProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      if (user?.uid) {
        try {
          const projs = await getUserProjects(user.uid);
          setProjects(projs);
        } catch (error) {
          console.error("Failed to fetch projects:", error);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchProjects();
  }, [user]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>;
      case 'rejected':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    }
  };

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-purple-400/10 text-purple-400 flex items-center justify-center shrink-0">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              My Projects
            </h1>
            <p className="text-white/50">
              Manage projects you've shared with the community.
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link
            href="/u/projects/submit"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-6 rounded-xl transition-colors shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Submit New Project</span>
          </Link>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl overflow-hidden flex flex-col h-full hover:border-white/10 transition-colors"
            >
              {project.bannerUrl ? (
                <div className="relative h-48 w-full bg-white/5">
                  <Image src={project.bannerUrl} alt={project.title} fill className="object-cover" />
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center border-b border-white/[0.06]">
                  <FolderGit2 className="w-10 h-10 text-white/20" />
                </div>
              )}
              
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <h3 className="text-xl font-display font-bold text-white line-clamp-1">
                    {project.title}
                  </h3>
                  {getStatusBadge(project.status || 'pending')}
                </div>
                
                <p className="text-white/60 text-sm mb-6 line-clamp-2 flex-1">
                  {project.description}
                </p>

                {project.technologies && project.technologies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {project.technologies.slice(0, 3).map((tech: string, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 bg-white/5 text-white/70 text-xs rounded-lg border border-white/10">
                        {tech}
                      </span>
                    ))}
                    {project.technologies.length > 3 && (
                      <span className="px-2.5 py-1 bg-white/5 text-white/50 text-xs rounded-lg border border-white/10">
                        +{project.technologies.length - 3}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-white/50 text-sm">
                      <Heart className="w-4 h-4" /> {project.likes || 0}
                    </div>
                    <div className="flex items-center gap-1.5 text-white/50 text-sm">
                      <MessageCircle className="w-4 h-4" /> {project.comments || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <GitBranch className="w-4 h-4" />
                      </a>
                    )}
                    {project.demoUrl && (
                      <a href={project.demoUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl p-12 text-center max-w-2xl mx-auto mt-10"
        >
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderGit2 className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-4">No projects yet</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            Share your work with the Connect Club community. Get feedback, likes, and build your portfolio.
          </p>
          <Link 
            href="/u/projects/submit"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Submit First Project
          </Link>
        </motion.div>
      )}
    </div>
  );
}
