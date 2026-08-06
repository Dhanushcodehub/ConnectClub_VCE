export type ProjectStatus = "Live" | "In Development" | "Archived";

export interface ConnectProject {
  id: string;
  name: string;
  description: string;
  features?: string[];
  technologies: string[];
  teamMembers?: { name: string; role: string; linkedin?: string }[];
  timeline: string;
  banner: string;
  screenshots?: string[];
  demoLink?: string;
  githubRepo?: string;
  githubLink?: string;
  status: ProjectStatus;
}

export const projectsData: ConnectProject[] = [
  {
    id: "connect-ai",
    name: "Connect AI",
    description: "An intelligent assistant powered by the Gemini API, designed to answer student queries, manage event registrations, and guide new members. Built directly into our platform.",
    features: [
      "Real-time chat interface",
      "RAG-lite architecture pulling from Firebase",
      "Context-aware event recommendations",
      "Automated FAQ answering"
    ],
    technologies: ["Next.js", "Firebase", "Gemini API", "Tailwind CSS", "Framer Motion"],
    teamMembers: [
      { name: "Alex Kumar", role: "AI Engineer" },
      { name: "Priya Singh", role: "Frontend Developer" }
    ],
    timeline: "Jan 2026 - Present",
    banner: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1200",
    screenshots: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
      "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800"
    ],
    status: "Live"
  },
  {
    id: "qr-attendance",
    name: "QR Attendance System",
    description: "A lightning-fast check-in system for club events. Generates unique dynamic QR codes for each registered participant to prevent proxy attendance.",
    features: [
      "Dynamic QR code generation",
      "Sub-second scan and verification",
      "Real-time dashboard for organizers",
      "Offline fallback mode"
    ],
    technologies: ["React Native", "Node.js", "MongoDB", "Socket.io"],
    teamMembers: [
      { name: "Rahul Dev", role: "Fullstack Engineer" }
    ],
    timeline: "Sep 2025 - Nov 2025",
    banner: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200",
    screenshots: [],
    status: "Live"
  },
  {
    id: "certificate-automation",
    name: "Certificate Automation",
    description: "A bulk certificate generation and delivery tool that pulls participant data from Google Sheets/Firestore and emails branded PDFs automatically.",
    features: [
      "Template-based PDF generation",
      "Bulk email delivery with SendGrid",
      "Verification QR codes on certificates"
    ],
    technologies: ["Python", "ReportLab", "Firebase Functions"],
    teamMembers: [
      { name: "Neha Reddy", role: "Backend Engineer" }
    ],
    timeline: "Oct 2025 - Dec 2025",
    banner: "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=1200",
    screenshots: [],
    status: "Live"
  }
];
