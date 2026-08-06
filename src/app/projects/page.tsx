import type { Metadata } from "next";
import { getProjects } from "@/lib/firebase/api";
import ProjectsClient from "./ProjectsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects",
  description:
    "Explore innovative projects built by Connect Club members at Vardhaman College of Engineering — from web apps to AI-powered tools.",
  alternates: {
    canonical: "/projects",
  },
  openGraph: {
    title: "Projects | Connect Club VCE",
    description:
      "Explore innovative projects built by Connect Club members — from web apps to AI-powered tools.",
    url: "/projects",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Projects | Connect Club VCE",
    description:
      "Explore innovative projects built by Connect Club members — from web apps to AI-powered tools.",
  },
};

export default async function ProjectsPage() {
  const projects = await getProjects();
  return <ProjectsClient initialProjects={projects} />;
}
