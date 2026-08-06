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
          <div className="bg-card border border-white/5 rounded-3xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/5 text-white/50 text-sm">
                  <th className="px-6 py-4 font-medium">Project Name</th>
                  <th className="px-6 py-4 font-medium">Tech Stack</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/50">Loading projects...</td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/50">No projects found in database.</td>
                  </tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-medium text-white">{project.name}</td>
                      <td className="px-6 py-4 text-white/60">
                        {project.technologies.slice(0, 2).join(", ")}
                        {project.technologies.length > 2 && "..."}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-white/10 text-white/80 border-white/10 uppercase">
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/admin/projects/${project.id}/edit`} className="p-2 text-white/50 hover:text-white transition-colors inline-flex" aria-label="Edit">
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(project.id, project.name)} className="p-2 text-red-400/50 hover:text-red-400 transition-colors ml-2" aria-label="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
}
