export type EventStatus = "Upcoming" | "Ongoing" | "Past";

export interface ConnectEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  status: EventStatus;
  banner: string;
  speakers?: string[];
  agenda?: { time: string; title: string; description?: string }[];
  registrationLink?: string;
  faqs?: { question: string; answer: string }[];
  galleryAlbums?: string[];
  certificates?: boolean;
  highlights?: string[];
  time?: string;
  price?: string;
  organizedBy?: string;
}

export const eventsData: ConnectEvent[] = [
  // Upcoming Events
  {
    id: "inspirex-2026",
    title: "InspireX Hackathon 2026",
    description: "A 48-hour continuous building sprint. Bring your ideas, form a team, and build the next big thing. Mentorship, food, and huge prizes included.",
    date: "Oct 15 - 17, 2026",
    venue: "Main Auditorium, VCE",
    status: "Upcoming",
    banner: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1200",
    speakers: ["John Doe (CEO, TechCorp)", "Jane Smith (Lead Engineer)"],
    registrationLink: "https://lu.ma/inspirex2026",
    agenda: [
      { time: "Day 1 - 09:00 AM", title: "Opening Ceremony & Keynote" },
      { time: "Day 1 - 11:00 AM", title: "Hacking Begins" },
      { time: "Day 3 - 10:00 AM", title: "Submission Deadline" },
      { time: "Day 3 - 02:00 PM", title: "Closing Ceremony & Winners" }
    ],
  },
  {
    id: "cloud-summit-2026",
    title: "Cloud Native Summit",
    description: "Explore the future of scalable applications. Learn about Docker, Kubernetes, and serverless architecture from industry veterans.",
    date: "Nov 02, 2026",
    venue: "Seminar Hall",
    status: "Upcoming",
    banner: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200",
    registrationLink: "https://lu.ma/cloud-summit"
  },
  {
    id: "oss-day-2026",
    title: "Open Source Day",
    description: "Contribute to your first open-source project. We will guide you through Git, GitHub, and finding beginner-friendly issues to tackle.",
    date: "Dec 05, 2026",
    venue: "Lab 2, Block A",
    status: "Upcoming",
    banner: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=1200"
  },

  // Ongoing Events
  {
    id: "ai-bootcamp",
    title: "Generative AI Bootcamp",
    description: "A deep dive into LLMs, prompting, and building AI-powered applications. Hands-on coding sessions every weekend.",
    date: "Sep 20 - Oct 10, 2026",
    venue: "Block 1, Lab 4",
    status: "Ongoing",
    banner: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=1200",
    speakers: ["Dr. Alan Turing (AI Researcher)", "Ada Lovelace (ML Engineer)"],
    agenda: [
      { time: "Week 1", title: "Introduction to Transformers & LLMs" },
      { time: "Week 2", title: "Prompt Engineering Mastery" },
      { time: "Week 3", title: "RAG & Vector Databases" },
      { time: "Week 4", title: "Capstone Project Presentation" }
    ],
    registrationLink: "https://lu.ma/gen-ai-bootcamp",
    faqs: [
      { question: "Are laptops required?", answer: "Yes, you must bring a laptop with at least 8GB RAM." },
      { question: "Will we get API keys?", answer: "Yes, OpenAI API keys will be provided for the duration of the bootcamp." }
    ],
    galleryAlbums: [
      "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=400"
    ],
    certificates: true,
    highlights: [
      "Build 3 end-to-end AI applications",
      "Learn to use LangChain & Pinecone",
      "Network with AI researchers"
    ]
  },
  {
    id: "100-days-of-code",
    title: "100 Days of Code Challenge",
    description: "Commit to coding for 1 hour every day. Join our discord channels, share your progress, and get unstuck with the help of peers.",
    date: "Aug 01 - Nov 08, 2026",
    venue: "Discord / Virtual",
    status: "Ongoing",
    banner: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=1200",
  },

  // Past Events
  {
    id: "web3-summit",
    title: "Web3 Summit 2025",
    description: "Exploring decentralized applications, smart contracts, and the future of the web.",
    date: "Dec 10, 2025",
    venue: "Seminar Hall",
    status: "Past",
    banner: "https://images.unsplash.com/photo-1639762681485-074b7f4ec651?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "ux-masterclass",
    title: "UX/UI Masterclass",
    description: "Figma design principles, user research, and wireframing techniques for building beautiful interfaces.",
    date: "Oct 05, 2025",
    venue: "Design Studio",
    status: "Past",
    banner: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "cybersecurity-101",
    title: "Cybersecurity 101",
    description: "Introduction to ethical hacking, penetration testing, and securing modern web applications.",
    date: "Aug 22, 2025",
    venue: "Lab 3, Block B",
    status: "Past",
    banner: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=1200",
  },
  {
    id: "gamedev-week",
    title: "GameDev Week",
    description: "Built games from scratch using Unity and C#. Ended with an indie game showcase.",
    date: "May 14 - May 20, 2025",
    venue: "Virtual",
    status: "Past",
    banner: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&q=80&w=1200",
    speakers: ["Alex Mercer (Unity Developer)", "Sarah Chen (Indie Dev)"],
    agenda: [
      { time: "Day 1", title: "Intro to Unity Engine" },
      { time: "Day 3", title: "C# Scripting Basics" },
      { time: "Day 5", title: "Physics and Collision" },
      { time: "Day 7", title: "Game Showcase & Feedback" }
    ],
    registrationLink: "https://lu.ma/gamedev-week",
    faqs: [
      { question: "Do I need prior coding experience?", answer: "No, this is completely beginner-friendly!" },
      { question: "Is this event free?", answer: "Yes, it is fully free for all students." }
    ],
    galleryAlbums: [
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&q=80&w=400",
      "https://images.unsplash.com/photo-1493711662062-fa541abbe517?auto=format&fit=crop&q=80&w=400"
    ],
    certificates: true,
    highlights: [
      "Over 100+ unique indie games developed",
      "Special guest talk from industry veterans",
      "Top 3 games featured on our platform"
    ]
  }
];
