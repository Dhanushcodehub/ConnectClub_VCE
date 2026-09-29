import { getAdminDb } from "@/lib/firebase/admin";
import { eventsData, ConnectEvent } from "@/lib/data/events";
import { projectsData, ConnectProject } from "@/lib/data/projects";
import { vceStaticContextText } from "./vceStaticData";

export interface BuiltAIContext {
  contextText: string;
  liveSources: {
    events: boolean;
    projects: boolean;
    team: boolean;
    faqs: boolean;
    domains: boolean;
  };
  upcomingEvents: string[];
}

const LIMITS = {
  events: 15,
  projects: 10,
  team: 24,
  faqs: 15,
  domains: 15,
};

const WEBSITE_SITE_MAP = `## This Website (Connect Club site)

Public pages:
- / - Home: what Connect Club is, upcoming featured event, mission, stats.
- /events - All events with status, date, venue, and registration links.
- /events/{eventId} - Single event page: full description, agenda, speakers, registration link, FAQs, gallery, highlights.
- /projects - All club projects.
- /projects/{slug} - Single project page with details.
- /timeline - Chronological history of the club's journey and milestones.
- /team - Club members, roles, and departments.
- /gallery - Photo and video albums from past events.
- /contact - Contact form and club contact details.
- /feedback - Share feedback about the club, events, or the website.
- /connect-ai - This assistant.

Member area (requires signing in as a club member):
- /member/dashboard - Member overview and activity.
- /member/events - Create and manage events.
- /member/projects - Create and manage projects.
- /member/gallery - Manage gallery albums.
- /member/timeline - Manage timeline milestones.
- /member/chat - Member group chat and direct messages.

How things work:
- Registering for an event: open the event's page at /events/{eventId} and use its Registration link. Events without a registration link are not open for sign-up.
- Joining the club: attend an upcoming event listed on /events, or email the club below to ask about recruitment.
- Submitting a project: sign in as a member, then use /member/projects.
- Getting a certificate: certificates for attended events are issued through the club and are listed under /u/certificates for signed-in members.
- Feedback: use the /feedback page.

Contact:
- General: connectclub@vce.ac.in
- Support: support@connectclubvce.in
- Instagram: @connectclubvce`;

async function fetchCollectionDocs<T = Record<string, unknown>>(
  name: string,
  limit: number
): Promise<T[]> {
  if (!process.env.FIREBASE_PROJECT_ID) return [];
  try {
    const db = getAdminDb();
    const snapshot = await db.collection(name).limit(limit).get();
    return snapshot.docs.map((doc) => doc.data() as T);
  } catch (error) {
    console.warn(`[contextBuilder] Failed to fetch Firestore collection "${name}":`, error);
    return [];
  }
}

type EventDoc = Partial<ConnectEvent>;

function formatEvent(e: EventDoc, index: number): string {
  const title = e.title || e.id || `Event ${index + 1}`;
  const status = e.status || "Unknown";
  const date = e.date || "Date TBD";
  const venue = e.venue || "Venue TBD";
  const description = (e.description || "").slice(0, 240);
  const lines = [`- ${title} (${status}) — ${description} — Date: ${date} — Venue: ${venue}`];

  if (e.registrationLink) {
    lines.push(`  Registration: ${e.registrationLink}`);
  }
  if (e.price) {
    lines.push(`  Price/Fee: ${e.price}`);
  }
  if (e.time) {
    lines.push(`  Time: ${e.time}`);
  }
  if (e.certificates) {
    lines.push(`  Certificates: provided`);
  }
  if (e.organizedBy) {
    lines.push(`  Organized by: ${e.organizedBy}`);
  }
  if (e.speakers?.length) {
    lines.push(`  Speakers: ${e.speakers.join(", ")}`);
  }
  if (e.agenda?.length) {
    lines.push(`  Agenda: ${e.agenda.map((a) => `${a.time} - ${a.title}`).join("; ")}`);
  }
  if (e.highlights?.length) {
    lines.push(`  Highlights: ${e.highlights.join("; ")}`);
  }
  lines.push(`  Page: /events/${e.id || ""}`);

  return lines.join("\n");
}

type ProjectDoc = Partial<ConnectProject>;

function formatProject(p: ProjectDoc, index: number): string {
  const name = p.name || p.id || `Project ${index + 1}`;
  const status = p.status || "Unknown";
  const description = (p.description || "").slice(0, 200);
  const tech = Array.isArray(p.technologies) ? p.technologies.join(", ") : "";
  return `- ${name} (${status}) — ${description}${tech ? ` — Tech: ${tech}` : ""}`;
}

interface MemberDoc {
  name?: string;
  position?: string;
  tier?: string;
  department?: string;
  [key: string]: unknown;
}

function formatMember(m: MemberDoc): string {
  const parts = [m.name || "Team Member", m.position || "", m.tier || "", m.department || ""]
    .map((s) => s.trim())
    .filter(Boolean);
  return `- ${parts.join(" — ")}`;
}

export async function buildContext(): Promise<BuiltAIContext> {
  const [liveEvents, liveProjects, liveTeam, liveFaqs, liveDomains] = await Promise.all([
    fetchCollectionDocs<EventDoc>("events", LIMITS.events),
    fetchCollectionDocs<ProjectDoc>("projects", LIMITS.projects),
    fetchCollectionDocs<MemberDoc>("members", LIMITS.team),
    fetchCollectionDocs<{ question?: string; answer?: string }>("faqs", LIMITS.faqs),
    fetchCollectionDocs<{ name?: string; description?: string }>("domains", LIMITS.domains),
  ]);

  const events = liveEvents.length > 0 ? liveEvents : eventsData;
  const projects = liveProjects.length > 0 ? liveProjects : projectsData;

  const upcomingEvents = events
    .filter((e) => e.status === "Upcoming")
    .map((e) => e.title || "")
    .filter(Boolean);

  const sections: string[] = [];

  sections.push(`## Connect Club`);
  sections.push(`We are a student-led technology community at Vardhaman College of Engineering.`);
  sections.push(
    `We run events such as hackathons, bootcamps, and summits; build live projects; and offer technical domains including AI, cloud native, web3, cybersecurity, and game development. Open to all VCE students.`
  );
  sections.push(`\n${WEBSITE_SITE_MAP}`);

  sections.push(`\n### Events (${events.length})`);
  events.slice(0, LIMITS.events).forEach((e, i) => sections.push(formatEvent(e, i)));

  sections.push(`\n### Projects (${projects.length})`);
  projects.slice(0, LIMITS.projects).forEach((p, i) => sections.push(formatProject(p, i)));

  sections.push(`\n### Team / Domains`);
  if (liveTeam.length > 0) {
    liveTeam.slice(0, LIMITS.team).forEach((m) => sections.push(formatMember(m)));
  } else {
    sections.push("- Team roster is managed in the club's member database.");
  }

  if (liveDomains.length > 0) {
    sections.push(`\n### Technical Domains`);
    liveDomains.slice(0, LIMITS.domains).forEach((d) =>
      sections.push(`- ${d.name || "Domain"}${d.description ? ` — ${d.description}` : ""}`)
    );
  }

  const collectedFaqs = liveFaqs.length > 0
    ? liveFaqs
    : events
        .flatMap((e) => e.faqs || [])
        .slice(0, LIMITS.faqs)
        .map((f) => ({ question: f.question, answer: f.answer }));

  if (collectedFaqs.length > 0) {
    sections.push(`\n### FAQs`);
    collectedFaqs.slice(0, LIMITS.faqs).forEach((f) => {
      sections.push(`- Q: ${f.question || ""}`);
      sections.push(`  A: ${f.answer || ""}`);
    });
  }

  sections.push(`\n## Vardhaman College of Engineering (VCE)`);
  sections.push(vceStaticContextText());

  return {
    contextText: sections.join("\n"),
    liveSources: {
      events: liveEvents.length > 0,
      projects: liveProjects.length > 0,
      team: liveTeam.length > 0,
      faqs: liveFaqs.length > 0,
      domains: liveDomains.length > 0,
    },
    upcomingEvents,
  };
}
