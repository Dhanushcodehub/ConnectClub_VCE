"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Root error boundary.
 *
 * Next 16 renamed the recovery prop: this component receives `unstable_retry`
 * (added in v16.2.0), not the older `reset`. `unstable_retry` re-fetches and
 * re-renders the segment, which is what recovers from server component and
 * data-fetch failures; `reset` only clears the error state.
 */
export default function RootError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-24 text-center relative overflow-hidden">
      <div className="absolute top-1/4 -right-24 w-96 h-96 bg-red-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-lg">
        <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-8">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.4em] text-red-400 mb-4">
          Something broke
        </p>

        <h1 className="text-4xl sm:text-5xl font-black font-heading text-white leading-tight tracking-tight mb-4">
          We hit an unexpected error
        </h1>

        <p className="text-sm text-white/50 leading-relaxed mb-6">
          This is usually temporary. Retry the page, and if it keeps failing the
          details below will help whoever investigates.
        </p>

        {error?.digest && (
          <p className="text-[11px] font-mono text-white/30 mb-6">
            Reference: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => unstable_retry()}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-sm transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            Go home
          </Link>
        </div>

        {process.env.NODE_ENV !== "production" && error?.message && (
          <pre className="mt-8 w-full text-left text-[11px] text-red-300/80 bg-red-500/5 border border-red-500/20 rounded-xl p-4 overflow-x-auto">
            {error.message}
          </pre>
        )}
      </div>
    </div>
  );
}
