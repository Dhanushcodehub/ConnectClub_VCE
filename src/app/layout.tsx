import type { Metadata } from "next";
import { Inter, Unbounded, Syne } from "next/font/google";
import "./globals.css";
import { SmoothScroll } from "@/components/SmoothScroll";
import { ClientLayout } from "@/components/ClientLayout";
import { GridBackground } from "@/components/GridBackground";
import { ConnectAIChat } from "@/components/ai/ConnectAIChat";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://connectclub-vce.vercel.app"),
  title: {
    default: "Connect Club | Vardhaman College of Engineering",
    template: "%s | Connect Club VCE",
  },
  description:
    "Building the Next Generation of Innovators. Connect Club is a student-led technology community at Vardhaman College of Engineering, fostering innovation through events, projects, and collaboration.",
  keywords: [
    "Connect Club",
    "Vardhaman College of Engineering",
    "VCE",
    "student club",
    "technology community",
    "coding club",
    "hackathon",
    "tech events",
    "student projects",
    "innovation",
    "engineering college club",
    "Hyderabad",
  ],
  authors: [{ name: "Connect Club VCE" }],
  creator: "Connect Club - Vardhaman College of Engineering",
  publisher: "Connect Club VCE",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://connectclub-vce.vercel.app",
    siteName: "Connect Club VCE",
    title: "Connect Club | Vardhaman College of Engineering",
    description:
      "Building the Next Generation of Innovators. Student-led technology community at Vardhaman College of Engineering.",
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "Connect Club - Vardhaman College of Engineering",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connect Club | Vardhaman College of Engineering",
    description:
      "Building the Next Generation of Innovators. Student-led technology community at Vardhaman College of Engineering.",
    images: ["/opengraph-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${unbounded.variable} ${syne.variable} ${inter.variable} min-h-screen antialiased dark`}
    >
      <head>
        {/* Organization JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Connect Club",
              alternateName: "Connect Club VCE",
              url: "https://connectclub-vce.vercel.app",
              logo: "https://connectclub-vce.vercel.app/logo/logo-transparent.svg",
              description:
                "Student-led technology community at Vardhaman College of Engineering, fostering innovation through events, projects, and collaboration.",
              foundingDate: "2023",
              parentOrganization: {
                "@type": "EducationalOrganization",
                name: "Vardhaman College of Engineering",
                url: "https://vardhaman.org",
                address: {
                  "@type": "PostalAddress",
                  addressLocality: "Hyderabad",
                  addressRegion: "Telangana",
                  addressCountry: "IN",
                },
              },
              sameAs: [],
              contactPoint: {
                "@type": "ContactPoint",
                contactType: "General Inquiry",
                url: "https://connectclub-vce.vercel.app/contact",
              },
            }),
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col font-sans relative overflow-x-clip">
        {/* InspireX Interactive Background Ambiance */}
        <GridBackground />

        <SmoothScroll>
          <ClientLayout>
            {children}
          </ClientLayout>
        </SmoothScroll>

        <ConnectAIChat />
      </body>
    </html>
  );
}
