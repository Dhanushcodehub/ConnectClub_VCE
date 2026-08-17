import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug, getEvents } from "@/lib/firebase/api";
import { Calendar, MapPin, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import EventDetailClient from "./EventDetailClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return {
      title: "Event Not Found",
    };
  }

  return {
    title: event.title,
    description:
      event.description?.substring(0, 160) ||
      `${event.title} — an event by Connect Club at Vardhaman College of Engineering.`,
    alternates: {
      canonical: `/events/${slug}`,
    },
    openGraph: {
      title: `${event.title} | Connect Club VCE`,
      description:
        event.description?.substring(0, 160) ||
        `${event.title} — an event by Connect Club at VCE.`,
      url: `/events/${slug}`,
      type: "article",
      images: event.banner
        ? [
            {
              url: event.banner,
              width: 1200,
              height: 630,
              alt: event.title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.title} | Connect Club VCE`,
      description:
        event.description?.substring(0, 160) ||
        `${event.title} — an event by Connect Club at VCE.`,
      images: event.banner ? [event.banner] : undefined,
    },
  };
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  // Event JSON-LD Structured Data
  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.date,
    eventStatus:
      event.status === "Upcoming"
        ? "https://schema.org/EventScheduled"
        : event.status === "Ongoing"
          ? "https://schema.org/EventScheduled"
          : "https://schema.org/EventPostponed",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue || "Vardhaman College of Engineering",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
    },
    image: event.banner || undefined,
    organizer: {
      "@type": "Organization",
      name: "Connect Club",
      url: "https://connectclub-vce.vercel.app",
    },
    ...(event.registrationLink && {
      offers: {
        "@type": "Offer",
        url: event.registrationLink,
        price: "0",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
      },
    }),
    ...(event.speakers &&
      event.speakers.length > 0 && {
        performer: event.speakers.map((speaker: string) => ({
          "@type": "Person",
          name: speaker,
        })),
      }),
  };

  return (
    <article className="pb-20">
      {/* Event JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />

      <EventDetailClient event={event} />
    </article>
  );
}
