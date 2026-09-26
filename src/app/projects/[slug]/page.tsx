import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProjectBySlug, getProjects } from "@/lib/firebase/api";
import { ArrowUpRight, CheckCircle2, GitBranch, Globe } from "lucide-react";
import Link from "next/link";
import ProjectLikeButton from "./ProjectLikeButton";
import ProjectComments from "./ProjectComments";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    return {
      title: "Project Not Found",
    };
  }

  const techStack = project.technologies?.join(", ") || "";
  const description =
    project.description?.substring(0, 160) ||
    `${project.name} — a project by Connect Club at Vardhaman College of Engineering.`;

  return {
    title: project.name,
    description,
    alternates: {
      canonical: `/projects/${slug}`,
    },
    openGraph: {
      title: `${project.name} | Connect Club VCE`,
      description,
      url: `/projects/${slug}`,
      type: "article",
      images: project.banner
        ? [
            {
              url: project.banner,
              width: 1200,
              height: 630,
              alt: project.name,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${project.name} | Connect Club VCE`,
      description,
      images: project.banner ? [project.banner] : undefined,
    },
    keywords: [
      project.name,
      "Connect Club",
      "VCE",
      "student project",
      ...project.technologies,
    ],
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  // SoftwareApplication JSON-LD Structured Data
  const projectJsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.name,
    description: project.description,
    applicationCategory: "WebApplication",
    operatingSystem: "Web",
    image: project.banner || undefined,
    url: project.demoLink || `https://connectclub-vce.vercel.app/projects/${slug}`,
    ...(project.githubRepo && {
      codeRepository: project.githubRepo,
    }),
    author: {
      "@type": "Organization",
      name: "Connect Club",
      url: "https://connectclub-vce.vercel.app",
    },
    ...(project.technologies && {
      keywords: project.technologies.join(", "),
    }),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
  };

  return (
    <article className="w-full min-h-screen pt-32 pb-24 md:pt-48 md:pb-32">
      {/* Project JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(projectJsonLd) }}
      />

      <div className="w-full max-w-[1200px] mx-auto px-4 md:px-8">
        {/* Hero Section Split Layout */}
        <div className="flex flex-col lg:flex-row items-stretch gap-6 md:gap-8 mb-16 md:mb-24">
          
          {/* Left: Banner Image */}
          <div className="w-full lg:w-3/5 rounded-3xl overflow-hidden border border-white/[0.06] bg-[#0C0C0E] relative aspect-[16/9] lg:aspect-auto min-h-[350px]">
             {/* Blurred backdrop to fill empty space seamlessly */}
             <div 
               className="absolute inset-0 w-full h-full bg-cover bg-center blur-2xl opacity-40 scale-110 pointer-events-none"
               style={{ backgroundImage: `url(${project.banner || "/images/placeholder.jpg"})` }}
             />
             <img 
               src={project.banner || "/images/placeholder.jpg"} 
               alt={project.name}
               className="absolute inset-0 w-full h-full object-cover z-10"
             />
          </div>

          {/* Right: Project Info Box */}
          <div className="w-full lg:w-2/5 rounded-3xl bg-[#0C0C0E] border border-white/[0.06] shadow-2xl p-8 md:p-12 flex flex-col justify-center relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
            
            <div className="inline-flex items-center space-x-2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest border mb-6 bg-white/5 text-primary border-primary/20 w-fit z-10">
              {project.status}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-display font-black text-white tracking-tight leading-tight mb-10 uppercase z-10">
              {project.name}
            </h1>

            <div className="flex flex-wrap gap-4 mt-auto z-10">
              {project.demoLink && (
                <a href={project.demoLink} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-display font-black uppercase tracking-widest btn-glow transition-all border border-transparent hover:!bg-none hover:bg-white/10 hover:text-white hover:border-white/40 hover:shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                  <Globe className="w-4 h-4 mr-1" />
                  Live Demo
                </a>
              )}
              {project.githubLink && (
                <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-xs font-display font-black uppercase tracking-widest border border-white/10 bg-[#0A0B14] text-white/60 hover:bg-[#13151F] hover:text-white hover:border-white/25 transition-all">
                  <GitBranch className="w-4 h-4 mr-1" />
                  Source
                </a>
              )}
              
              <ProjectLikeButton projectId={project.id} initialLikes={project.likes || 0} collectionName={(project as any).collectionName || "projects"} />
            </div>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 md:gap-16">
            
            {/* Left Column: Description & Features */}
            <div className="lg:col-span-2 space-y-16">
              <section>
                <h2 className="text-2xl font-display font-black text-white mb-6 uppercase">Overview</h2>
                <div className="prose prose-invert max-w-none text-white/70 text-lg leading-relaxed">
                  <p>{project.description}</p>
                </div>
              </section>

              {project.features && project.features.length > 0 && (
                <section>
                  <h2 className="text-2xl font-display font-black text-white mb-6 uppercase">Key Features</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.features.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-start space-x-3 text-white/80 p-4 rounded-xl bg-white/5 border border-white/10">
                        <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {project.screenshots && project.screenshots.length > 0 && (
                <section>
                  <h2 className="text-2xl font-display font-black text-white mb-8 uppercase">Gallery</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {project.screenshots.map((shot: string, idx: number) => (
                      <div key={idx} className="rounded-2xl border border-white/5 overflow-hidden bg-card">
                        <img src={shot} alt={`${project.name} screenshot ${idx + 1}`} className="w-full h-auto" />
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Meta Info */}
            <div className="space-y-8">
              <div className="p-8 rounded-3xl bg-[#0C0C0E] border border-white/[0.06] shadow-2xl sticky top-32">
                
                {/* Author Section for User Projects */}
                {((project as any).authorName || (project as any).userId) && (
                  <div className="mb-10">
                    <h3 className="text-xl font-display font-black text-white mb-6 uppercase">Creator</h3>
                    <Link href={`/u/profile/${(project as any).userId}`} className="flex items-center space-x-4 p-4 rounded-2xl bg-[#0C0C0E] border border-white/10 hover:bg-white/5 transition-colors group">
                      {(project as any).authorPhotoUrl ? (
                        <img src={(project as any).authorPhotoUrl} alt={(project as any).authorName || "Creator"} className="w-12 h-12 rounded-full object-cover border border-primary/30 shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                          {((project as any).authorName || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="text-white font-medium group-hover:text-primary transition-colors">{(project as any).authorName || "Community Member"}</div>
                        <div className="text-white/50 text-xs mt-0.5">View Profile</div>
                      </div>
                    </Link>
                  </div>
                )}

                <h3 className="text-xl font-display font-black text-white mb-8 uppercase">Tech Stack</h3>
                <div className="flex flex-wrap gap-2 mb-10">
                  {project.technologies.map((tech: string) => (
                    <span key={tech} className="px-4 py-2 bg-[#0C0C0E] border border-white/10 rounded-full text-xs font-sigmar font-normal uppercase text-white/90">
                      {tech}
                    </span>
                  ))}
                </div>

                <h3 className="text-xl font-display font-black text-white mb-6 mt-10 uppercase">Timeline</h3>
                <p className="text-white/70">{project.timeline}</p>

                {project.teamMembers && project.teamMembers.length > 0 && (
                  <>
                    <h3 className="text-xl font-display font-black text-white mb-6 mt-10 uppercase">Team</h3>
                    <div className="space-y-4">
                    {project.teamMembers.map((member: { name: string; role: string }, idx: number) => (
                      <div key={idx} className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-white font-bold">
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-white/90 font-medium">{member.name}</div>
                          <div className="text-white/50 text-xs">{member.role}</div>
                        </div>
                      </div>
                    ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
          
          {/* Comments Section */}
          <div className="max-w-4xl mx-auto mt-12">
            <ProjectComments projectId={project.id} collectionName={(project as any).collectionName || "projects"} />
          </div>
        </div>
      </article>
    );
}
