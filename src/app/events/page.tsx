import type { Metadata } from "next";
import { getEvents } from "@/lib/firebase/api";
import EventsClient from "./EventsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Discover upcoming and past events hosted by Connect Club at Vardhaman College of Engineering — hackathons, workshops, tech talks, and more.",
  alternates: {
    canonical: "/events",
  },
  openGraph: {
    title: "Events | Connect Club VCE",
    description:
      "Discover upcoming and past events hosted by Connect Club — hackathons, workshops, tech talks, and more.",
    url: "/events",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Events | Connect Club VCE",
    description:
      "Discover upcoming and past events hosted by Connect Club — hackathons, workshops, tech talks, and more.",
  },
};

export default async function EventsPage() {
  const events = await getEvents();

  return <EventsClient initialEvents={events} />;
}
