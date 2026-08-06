import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { Mission } from "@/components/home/Mission";
import { StickyStats } from "@/components/home/StickyStats";
import { FeaturedEvent } from "@/components/home/FeaturedEvent";
import { FeaturedProject } from "@/components/home/FeaturedProject";
import { WhyConnect } from "@/components/home/WhyConnect";
import { CTA } from "@/components/home/CTA";

export const metadata: Metadata = {
  title: "Connect Club | Vardhaman College of Engineering",
  description:
    "Building the Next Generation of Innovators. Connect Club is the premier student-led technology community at Vardhaman College of Engineering — discover events, projects, and join our mission.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Connect Club | Vardhaman College of Engineering",
    description:
      "Building the Next Generation of Innovators. Discover events, projects, and join our tech community.",
    url: "/",
  },
};

export default function Home() {
  return (
    <>
      {/* WebSite JSON-LD for Google Sitelinks Search Box */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Connect Club VCE",
            url: "https://connectclub-vce.vercel.app",
            description:
              "Student-led technology community at Vardhaman College of Engineering",
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate:
                  "https://connectclub-vce.vercel.app/events?q={search_term_string}",
              },
              "query-input": "required name=search_term_string",
            },
          }),
        }}
      />
      <Hero />
      <StickyStats />
      <Mission />
      <FeaturedEvent />
      <FeaturedProject />
      <WhyConnect />
      <CTA />
    </>
  );
}
