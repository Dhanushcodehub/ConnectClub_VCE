"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { ConnectProject } from "@/lib/data/projects";
import { Plus, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ConnectProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "projects"));
        if (!querySnapshot.empty) {
          const projectsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ConnectProject));
          setProjects(projectsData);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, "projects", id));
        setProjects(projects.filter(p => p.id !== id));
        
        // Instantly revalidate the public cache
        await fetch("/api/admin/revalidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: ["/projects", "/"] }),
        });
      } catch (error) {
        console.error("Error deleting project:", error);
        alert("Failed to delete project.");
      }
    }
  };

  return (
    <div>
        <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Manage Projects</h1>
          <Link href="/admin/projects/create" className="bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4 mr-2" />
            Add Project
          </Link>
        </header>

        <div className="p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white/50 font-medium">Loading projects...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-16 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-8 h-8 text-white/20" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No projects yet</h3>
              <p className="text-white/50 mb-6 max-w-md mx-auto">Your portfolio is empty. Add your first project to showcase what Connect Club has built.</p>
              <Link 
                href="/admin/projects/create" 
                className="bg-white/5 text-white hover:bg-white/10 border border-white/10 px-6 py-2.5 rounded-lg font-medium transition-colors inline-block"
              >
                Create First Project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {projects.map((project) => (
                <div key={project.id} className="bg-[#0c0c0e] border border-white/5 rounded-3xl p-6 hover:border-white/10 transition-colors shadow-lg flex flex-col h-full group relative overflow-hidden">
                  
                  {/* Subtle top gradient */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider",
                      project.status === "Live" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                      project.status === "Archived" ? "bg-white/5 text-white/50 border-white/5" :
                      "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    )}>
                      {project.status}
                    </span>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 p-1 rounded-xl border border-white/5">
                      <Link href={`/admin/projects/${project.id}/edit`} className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <div className="w-px h-3 bg-white/10"></div>
                      <button onClick={() => handleDelete(project.id, project.name)} className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                  <p className="text-sm text-white/50 line-clamp-3 mb-8 flex-1 leading-relaxed">
                    {project.description || "No description provided."}
                  </p>
                  
                  <div className="mt-auto">
                    <div className="flex flex-wrap gap-2">
                      {project.technologies?.slice(0, 3).map(tech => (
                        <span key={tech} className="text-[11px] font-medium text-white/40 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-md">
                          {tech}
                        </span>
                      ))}
                      {project.technologies?.length > 3 && (
                        <span className="text-[11px] font-medium text-white/40 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-md">
                          +{project.technologies.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
