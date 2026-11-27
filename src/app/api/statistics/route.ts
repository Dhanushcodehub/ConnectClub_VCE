import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { eventsData } from "@/lib/data/events";
import { projectsData } from "@/lib/data/projects";

// Next.js ISR: Revalidate route every 1 hour (3600s)
export const revalidate = 3600;

export interface StatisticsData {
  activeMembers: number;
  eventsHosted: number;
  projectsShipped: number;
  studentParticipations: number;
  source: "database" | "fallback";
  timestamp: number;
}

// In-memory cache for fast response and avoiding excess Firestore reads
let memCache: { data: StatisticsData; expiresAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function GET() {
  const now = Date.now();

  // Return memory-cached statistics if valid
  if (memCache && memCache.expiresAt > now) {
    return NextResponse.json(memCache.data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  }

  try {
    let db;
    try {
      db = getAdminDb();
    } catch {
      db = null;
    }

    if (!db) {
      // Calculate from local static data if Firebase Admin is unconfigured
      const pastEvents = eventsData.filter((e) => e.status === "Past").length;
      const liveProjects = projectsData.filter((p) => p.status === "Live").length;

      const fallbackData: StatisticsData = {
        activeMembers: 0,
        eventsHosted: pastEvents,
        projectsShipped: liveProjects,
        studentParticipations: 0,
        source: "fallback",
        timestamp: now,
      };

      return NextResponse.json(fallbackData, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
        },
      });
    }

    // 1. ACTIVE MEMBERS: Count active/verified student users and team members
    let activeMembers = 0;
    try {
      const [usersSnap, membersSnap] = await Promise.all([
        db.collection("users").count().get().catch(() => null),
        db.collection("members").count().get().catch(() => null),
      ]);

      const userCount = usersSnap?.data()?.count || 0;
      const memberCount = membersSnap?.data()?.count || 0;

      // Active members is the union of registered student users and team members
      activeMembers = userCount > 0 ? userCount : memberCount;
    } catch (err) {
      console.error("[Statistics API] Error counting members:", err);
    }

    // 2. EVENTS HOSTED: Count past completed events
    let eventsHosted = 0;
    try {
      const pastEventsSnap = await db
        .collection("events")
        .where("status", "==", "Past")
        .count()
        .get()
        .catch(() => null);

      if (pastEventsSnap) {
        eventsHosted = pastEventsSnap.data().count;
      } else {
        // Fallback: check all events by status and date
        const allEventsSnap = await db.collection("events").get();
        const currentDate = new Date();
        eventsHosted = allEventsSnap.docs.filter((doc) => {
          const d = doc.data();
          if (d.status === "Past") return true;
          if (d.status === "Upcoming" || d.status === "Draft" || d.status === "Cancelled") return false;
          if (d.date) {
            const parsed = new Date(d.date);
            return !isNaN(parsed.getTime()) && parsed < currentDate;
          }
          return false;
        }).length;
      }

      // If database has no past events recorded yet, fall back to historical eventsData
      if (eventsHosted === 0) {
        eventsHosted = eventsData.filter((e) => e.status === "Past").length;
      }
    } catch (err) {
      console.error("[Statistics API] Error counting events:", err);
      eventsHosted = eventsData.filter((e) => e.status === "Past").length;
    }

    // 3. PROJECTS SHIPPED: Count approved & live projects
    let projectsShipped = 0;
    try {
      const [officialProjectsSnap, userProjectsSnap] = await Promise.all([
        db
          .collection("projects")
          .where("status", "==", "Live")
          .count()
          .get()
          .catch(() => null),
        db
          .collection("user_projects")
          .where("status", "==", "approved")
          .count()
          .get()
          .catch(() => null),
      ]);

      const officialCount = officialProjectsSnap?.data()?.count || 0;
      const userCount = userProjectsSnap?.data()?.count || 0;
      projectsShipped = officialCount + userCount;

      if (projectsShipped === 0) {
        projectsShipped = projectsData.filter((p) => p.status === "Live").length;
      }
    } catch (err) {
      console.error("[Statistics API] Error counting projects:", err);
      projectsShipped = projectsData.filter((p) => p.status === "Live").length;
    }

    // 4. STUDENT PARTICIPATIONS: Deduplicated student attendees from valid registrations
    let studentParticipations = 0;
    try {
      const [regsSnap, extRegsSnap] = await Promise.all([
        db.collection("event_registrations").select("userId", "email").get().catch(() => null),
        db.collection("external_registrations").select("email", "rollNumber").get().catch(() => null),
      ]);

      const uniqueStudents = new Set<string>();

      if (regsSnap && !regsSnap.empty) {
        regsSnap.docs.forEach((doc) => {
          const data = doc.data();
          const id = (data.email || data.userId || doc.id).toString().trim().toLowerCase();
          if (id) uniqueStudents.add(id);
        });
      }

      if (extRegsSnap && !extRegsSnap.empty) {
        extRegsSnap.docs.forEach((doc) => {
          const data = doc.data();
          const id = (data.email || data.rollNumber || doc.id).toString().trim().toLowerCase();
          if (id) uniqueStudents.add(id);
        });
      }

      studentParticipations = uniqueStudents.size;

      // If individual docs couldn't be enumerated, aggregate total count
      if (studentParticipations === 0) {
        const totalRegsSnap = await db
          .collection("event_registrations")
          .count()
          .get()
          .catch(() => null);
        studentParticipations = totalRegsSnap?.data()?.count || 0;
      }
    } catch (err) {
      console.error("[Statistics API] Error counting student participations:", err);
    }

    const payload: StatisticsData = {
      activeMembers,
      eventsHosted,
      projectsShipped,
      studentParticipations,
      source: "database",
      timestamp: now,
    };

    // Store in memory cache
    memCache = {
      data: payload,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("[Statistics API] Fatal error:", error);
    return NextResponse.json(
      {
        activeMembers: 0,
        eventsHosted: eventsData.filter((e) => e.status === "Past").length,
        projectsShipped: projectsData.filter((p) => p.status === "Live").length,
        studentParticipations: 0,
        source: "fallback",
        timestamp: now,
      },
      { status: 200 }
    );
  }
}
