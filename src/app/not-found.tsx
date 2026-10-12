import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-primary/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -left-24 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-8">
          <Compass className="w-8 h-8 text-primary" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.4em] text-primary mb-4">
          Error 404
        </p>

        <h1 className="text-5xl sm:text-7xl font-black font-heading text-white leading-none tracking-tight mb-5">
          Page not found
        </h1>

        <p className="text-sm sm:text-base text-white/50 max-w-md leading-relaxed mb-10">
          The page you are looking for was moved, renamed, or never existed.
          Try heading back to the homepage or exploring upcoming events.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-sm transition-all"
          >
            Back to Home
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/events"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl text-sm transition-all"
          >
            Browse Events
          </Link>
        </div>
      </div>
    </div>
  );
}
