"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";
import { ConnectProject } from "@/lib/data/projects";
import { getProjects } from "@/lib/firebase/api";
import { staggerContainer, fadeUp } from "@/lib/animations";

export default function ProjectsClient({ initialProjects }: { initialProjects: ConnectProject[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [isLoading, setIsLoading] = useState(initialProjects.length === 0);

  useEffect(() => {
    getProjects().then((data) => {
      setProjects(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 md:pt-36 md:pb-20 relative">
      {/* Page Header */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="col-span-full mb-8 md:mb-12"
      >
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-4">
          <span className="w-8 h-[2px] bg-primary rounded-full" />
          <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">Open Source</span>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="text-h1 font-black uppercase tracking-tight text-white mb-4"
        >
          Projects
        </motion.h1>
        <motion.p variants={fadeUp} className="text-body text-white/50 max-w-2xl">
          We don't just talk about technology. We build it. Explore
          the tools and platforms shipped by Connect Club members.
        </motion.p>
      </motion.div>

      {/* Skeleton Loading State */}
      {isLoading ? (
        <>
          <div className="w-full col-span-full rounded-xl border border-white/[0.06] bg-[#0C0C0E] overflow-hidden flex flex-col lg:flex-row h-auto lg:h-[480px]">
             <div className="w-full lg:w-1/2 h-[300px] lg:h-full bg-white/[0.03] animate-pulse" />
             <div className="w-full lg:w-1/2 p-8 lg:p-12 flex flex-col justify-center">
                <div className="w-32 h-6 bg-white/[0.05] rounded-md mb-6 animate-pulse" />
                <div className="w-3/4 h-10 lg:h-12 bg-white/[0.08] rounded-md mb-4 animate-pulse" />
                <div className="w-full h-4 bg-white/[0.04] rounded-md mb-2 animate-pulse" />
                <div className="w-5/6 h-4 bg-white/[0.04] rounded-md mb-8 animate-pulse" />
                <div className="flex flex-wrap gap-2 mt-auto">
                  {[1,2,3].map(i => <div key={i} className="w-20 h-7 bg-white/[0.05] rounded-full animate-pulse" />)}
                </div>
             </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full col-span-full md:col-span-3 lg:col-span-6 rounded-xl border border-white/[0.06] bg-[#0C0C0E] overflow-hidden flex flex-col h-[480px]">
               <div className="w-full h-[240px] bg-white/[0.03] animate-pulse" />
               <div className="p-8 flex flex-col flex-1">
                 <div className="w-3/4 h-8 bg-white/[0.06] rounded-md mb-4 animate-pulse" />
                 <div className="w-full h-4 bg-white/[0.04] rounded-md mb-2 animate-pulse" />
                 <div className="w-4/5 h-4 bg-white/[0.04] rounded-md mb-6 animate-pulse" />
                 <div className="flex flex-wrap gap-2 mt-auto">
                  {[1,2,3].map(j => <div key={j} className="w-16 h-7 bg-white/[0.05] rounded-full animate-pulse" />)}
                 </div>
               </div>
            </div>
          ))}
        </>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="w-full grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-y-12 gap-x-6"
        >
          {projects.map((project, idx) => {
            const isFeatured = idx === 0;

            return (
              <motion.div
                key={project.id}
                variants={fadeUp}
                className={`w-full group relative flex flex-col rounded-xl border border-white/[0.06] bg-[#0C0C0E] transition-all hover:border-white/[0.15] hover:bg-[#111114] shadow-xl hover:shadow-2xl overflow-hidden ${
                  isFeatured 
                    ? "col-span-full lg:flex-row lg:h-[480px]" 
                    : "col-span-full md:col-span-3 lg:col-span-6 h-full"
                }`}
              >
                <Link
                  href={`/projects/${project.id}`}
                  className="absolute inset-0 z-30"
                  aria-label={`View ${project.name}`}
                />

                {/* Image Section */}
                <div
                  className={`relative overflow-hidden shrink-0 bg-white/5 ${
                    isFeatured ? "w-full lg:w-1/2 h-[300px] lg:h-full order-1 lg:order-2" : "w-full h-[240px] order-1"
                  }`}
                >
                  <img
                    src={project.banner}
                    alt={project.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:scale-105"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {/* Subtle overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0B14]/80 lg:bg-gradient-to-r lg:from-[#0A0B14]/40 to-transparent pointer-events-none" />
                </div>

                {/* Content Section */}
                <div
                  className={`flex flex-col relative z-20 p-8 ${
                    isFeatured ? "w-full lg:w-1/2 order-2 lg:order-1 lg:p-12 justify-center bg-background/50" : "w-full order-2 flex-1"
                  }`}
                >
                  {/* Badge */}
                  <div className="flex items-center gap-2.5 mb-6">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <span className="text-label text-primary font-bold uppercase tracking-[0.2em]">{project.status}</span>
                  </div>

                  {/* Title & Description */}
                  <h3 className={`text-h2 lg:text-h3 font-black text-white uppercase tracking-tight mb-4 group-hover:text-primary transition-colors`}>
                    {project.name}
                  </h3>
                  <p className={`text-body text-white/50 mb-8 ${isFeatured ? "max-w-md" : "line-clamp-3"}`}>
                    {project.description}
                  </p>

                  {/* Tags */}
                  <div className={`flex flex-wrap gap-2 ${isFeatured ? "mb-10" : "mb-6 mt-auto"}`}>
                    {project.technologies.slice(0, isFeatured ? 5 : 3).map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 text-label bg-white/[0.04] border border-white/[0.08] rounded-full text-white/50 uppercase tracking-widest font-bold"
                      >
                        {tech}
                      </span>
                    ))}
                    {!isFeatured && project.technologies.length > 3 && (
                      <span className="px-3 py-1 text-label bg-white/[0.04] border border-white/[0.08] rounded-full text-white/50 uppercase tracking-widest font-bold">
                        +{project.technologies.length - 3}
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className={`flex items-center text-primary text-label font-bold uppercase tracking-[0.2em] gap-2 group-hover:gap-4 transition-all ${isFeatured ? "mt-auto lg:mt-0" : ""}`}>
                    View Case Study
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:-rotate-45" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {projects.length === 0 && !isLoading && (
        <div className="col-span-full text-center py-24">
          <p className="text-body font-bold text-white/30 uppercase tracking-widest">No projects found.</p>
        </div>
      )}
    </div>
  );
}
