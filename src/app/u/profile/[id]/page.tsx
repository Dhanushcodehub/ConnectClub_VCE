import { notFound } from "next/navigation";
import { getUserProfile, getUserProjects } from "@/lib/firebase/users";
import { ArrowLeft, Code2, Heart, MessageCircle, GitBranch, Globe } from "lucide-react";
import Link from "next/link";
import { ConnectProject } from "@/lib/data/projects";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Fetch user and their approved projects
  const profile = await getUserProfile(id);
  
  if (!profile) {
    return (
      <div className="text-white text-center p-20">
        <h1>Profile not found for ID: {id}</h1>
        <p>Debug info: getUserProfile returned null.</p>
      </div>
    );
  }

  const userProjects = await getUserProjects(id);
  
  // Calculate stats dynamically from all projects
  const totalLikes = userProjects.reduce((sum, p) => sum + (p.likes || 0), 0);
  const totalComments = userProjects.reduce((sum, p) => sum + (p.commentsCount || 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-8">
        <Link 
          href="/projects" 
          className="flex items-center text-sm font-medium text-white/50 hover:text-white transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-[#0C0C0E] border border-white/[0.06] rounded-3xl p-8 md:p-12 mb-12 relative overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
          {/* Avatar */}
          <div className="w-32 h-32 rounded-full border-4 border-[#0C0C0E] shadow-2xl overflow-hidden shrink-0 bg-primary/20 flex items-center justify-center">
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-primary">
                {profile.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
              </span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">
              {profile.name}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
                {profile.department || "Engineering"}
              </span>
              <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-medium text-white/70">
                {profile.yearOfStudy || "Student"}
              </span>
              
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors" title="GitHub">
                  <GitBranch className="w-4 h-4" />
                </a>
              )}
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-white/5 border border-white/10 rounded-full text-white/70 hover:text-white hover:bg-[#0A66C2]/20 hover:border-[#0A66C2]/30 hover:text-[#0A66C2] transition-colors" title="LinkedIn">
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>

            <p className="text-white/70 max-w-2xl text-lg leading-relaxed mb-8">
              {profile.bio || "This user prefers to keep an air of mystery about them."}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-8 border-t border-white/10 pt-8">
              <div className="text-center md:text-left">
                <div className="text-2xl font-bold text-white mb-1">{userProjects.length}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Projects</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-2xl font-bold text-white mb-1">{totalLikes}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Likes</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-2xl font-bold text-white mb-1">{totalComments}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Comments</div>
              </div>
              <div className="text-center md:text-left">
                <div className="text-2xl font-bold text-white mb-1">{profile.certificatesCount || 0}</div>
                <div className="text-xs text-white/50 uppercase tracking-wider">Certificates</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-8">
          <span className="w-8 h-[2px] bg-primary rounded-full" />
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">Portfolio</h2>
        </div>

        {userProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {userProjects.map((project) => (
              <div key={project.id} className="group relative flex flex-col rounded-2xl border border-white/[0.06] bg-[#0C0C0E] transition-all hover:border-white/[0.15] hover:bg-[#111114] overflow-hidden h-[400px]">
                <Link href={`/projects/${project.id}`} className="absolute inset-0 z-30" />
                
                <div className="w-full h-[200px] relative overflow-hidden bg-white/5">
                  {project.banner ? (
                    <img
                      src={project.banner}
                      alt={project.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Code2 className="w-12 h-12 text-white/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C0E] to-transparent" />
                  
                  {project.status === "pending" && (
                    <div className="absolute top-4 right-4 px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full text-[10px] font-bold text-yellow-500 uppercase tracking-wider backdrop-blur-md z-40">
                      Pending Approval
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-1 relative z-20 -mt-10">
                  <h3 className="font-bold text-xl text-white mb-2 group-hover:text-primary transition-colors line-clamp-1">{project.title}</h3>
                  <p className="text-white/50 text-sm line-clamp-2 mb-4">{project.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-auto">
                    {project.technologies?.slice(0, 3).map((tech) => (
                      <span key={tech} className="px-2 py-1 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded-md text-white/50 uppercase tracking-wider font-bold">
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-white/[0.06] text-white/50">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4" />
                      <span className="text-xs font-medium">{project.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-xs font-medium">{project.commentsCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-[#0C0C0E] border border-white/[0.06] rounded-3xl">
            <Code2 className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Projects Yet</h3>
            <p className="text-white/50">This member hasn't published any projects.</p>
          </div>
        )}
      </div>
    </div>
  );
}
