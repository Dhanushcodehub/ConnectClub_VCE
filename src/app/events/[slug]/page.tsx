import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getEventBySlug, getEvents } from "@/lib/firebase/api";
import { Calendar, MapPin, Users, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((event) => ({
    slug: event.id,
  }));
}

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

      {/* Hero Banner */}
      <div className="relative h-[50vh] min-h-[400px] w-full">
        <img
          src={event.banner}
          alt={event.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="absolute bottom-0 inset-x-0">
          <div className="container mx-auto px-4 md:px-8 pb-12">
            <div className="max-w-4xl">
              <div className={cn(
                "inline-flex items-center space-x-2 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md border mb-6",
                event.status === "Upcoming" ? "bg-primary/20 text-primary border-primary/20" :
                event.status === "Ongoing" ? "bg-green-500/20 text-green-400 border-green-500/20" :
                "bg-white/10 text-white/80 border-white/10"
              )}>
                {event.status}
              </div>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-black font-heading tracking-tight text-white mb-6">
                {event.title}
              </h1>
              
              <div className="flex flex-wrap items-center gap-6 text-white/70 font-medium">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-primary" />
                  <time>{event.date}</time>
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-primary" />
                  <span>{event.venue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Layout */}
      <div className="container mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Description & Agenda */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold font-heading text-white mb-4">About this Event</h2>
              <div className="prose prose-invert max-w-none text-white/70 text-lg leading-relaxed">
                <p>{event.description}</p>
              </div>
            </section>

            {event.agenda && (
              <section>
                <h2 className="text-2xl font-bold font-heading text-white mb-6">Agenda</h2>
                <div className="space-y-4">
                  {event.agenda.map((item: { time: string; title: string }, idx: number) => (
                    <div key={idx} className="flex p-4 rounded-2xl bg-card border border-white/5">
                      <div className="w-1/3 text-primary font-semibold shrink-0">
                        {item.time}
                      </div>
                      <div className="w-2/3 text-white/90">
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Event Highlights (Past Events) */}
            {event.status === "Past" && (
              <section>
                <h2 className="text-2xl font-bold font-heading text-white mb-6">Event Highlights</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-video bg-card rounded-2xl border border-white/5 overflow-hidden relative">
                     <img src="https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&q=80&w=600" alt={`${event.title} highlight - collaboration`} className="w-full h-full object-cover opacity-60" />
                  </div>
                  <div className="aspect-video bg-card rounded-2xl border border-white/5 overflow-hidden relative">
                     <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600" alt={`${event.title} highlight - teamwork`} className="w-full h-full object-cover opacity-60" />
                  </div>
                </div>
                <div className="mt-6 p-6 rounded-2xl bg-secondary/10 border border-secondary/20 flex items-center justify-between">
                  <div className="flex items-center space-x-3 text-white">
                    <CheckCircle2 className="w-6 h-6 text-secondary" />
                    <span className="font-semibold">Certificates are now available</span>
                  </div>
                  <button className="px-4 py-2 bg-secondary text-white font-medium rounded-full hover:bg-secondary/90 transition-colors text-sm">
                    Download
                  </button>
                </div>
              </section>
            )}
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
            <div className="p-8 rounded-3xl bg-card border border-white/5 sticky top-32">
              <h3 className="text-xl font-bold font-heading text-white mb-6">Status</h3>
              
              {event.status === "Upcoming" ? (
                <Link
                  href={event.registrationLink || "#"}
                  className="flex items-center justify-center w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-white/90 transition-all group"
                >
                  Register Now
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : event.status === "Ongoing" ? (
                <div className="flex items-center justify-center w-full py-4 bg-green-500/10 text-green-400 font-semibold rounded-2xl border border-green-500/20">
                  Happening Now
                </div>
              ) : (
                <div className="flex items-center justify-center w-full py-4 bg-white/5 text-white/40 font-semibold rounded-2xl border border-white/5">
                  Event Concluded
                </div>
              )}
            </div>

            {event.speakers && event.speakers.length > 0 && (
              <div className="p-8 rounded-3xl bg-card border border-white/5">
                <h3 className="text-xl font-bold font-heading text-white mb-6 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Speakers
                </h3>
                <div className="space-y-4">
                  {event.speakers.map((speaker: string, idx: number) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/40">
                        {speaker.charAt(0)}
                      </div>
                      <span className="text-white/80 font-medium">{speaker}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </article>
  );
}
