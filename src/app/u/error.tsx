"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

/**
 * Error boundary for all routes under /u (user portal).
 * Next 16: recovery prop is `unstable_retry`.
 */
export default function UserError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("User portal error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] w-full flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>

      <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400 mb-3">
        User portal
      </p>
      <h2 className="text-2xl sm:text-3xl font-black font-heading text-white mb-3">
        Something went wrong here
      </h2>
      <p className="text-sm text-white/50 max-w-md mb-6 leading-relaxed">
        Retrying re-runs the request that failed. If the problem persists, go
        back to your dashboard and try opening this page again.
      </p>

      {error?.digest && (
        <p className="text-[11px] font-mono text-white/30 mb-6">
          Reference: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={() => unstable_retry()}
          className="inline-flex items-center gap-2 px-5 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl text-sm transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Retry
        </button>
        <Link
          href="/u/dashboard"
          className="inline-flex items-center gap-2 px-5 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-2xl text-sm transition-all"
        >
          <Home className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
