"use client";

/**
 * Root layout error boundary — replaces the entire document when the root
 * layout or template throws. It must render its own <html> and <body>, and it
 * does not receive global styles (globals.css), so all styling here is inline.
 *
 * Next 16.2.0+: recovery prop is `unstable_retry`.
 */
export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
          background: "#07070a",
          color: "#ffffff",
          fontFamily:
            "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ maxWidth: "480px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              margin: "0 auto 24px",
              borderRadius: "24px",
              background: "rgba(255,60,60,0.10)",
              border: "1px solid rgba(255,60,60,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
            }}
          >
            ⚠️
          </div>

          <p
            style={{
              margin: "0 0 12px",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.35em",
              textTransform: "uppercase",
              color: "#ff6b6b",
            }}
          >
            Fatal error
          </p>

          <h1
            style={{
              margin: "0 0 12px",
              fontSize: "32px",
              lineHeight: 1.15,
              fontWeight: 800,
            }}
          >
            Connect Club could not start
          </h1>

          <p style={{ margin: "0 0 24px", fontSize: "14px", lineHeight: 1.6, color: "rgba(255,255,255,0.55)" }}>
            The application hit an error while loading. Retrying usually fixes
            temporary issues.
          </p>

          {error?.digest && (
            <p
              style={{
                margin: "0 0 24px",
                fontSize: "11px",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                color: "rgba(255,255,255,0.35)",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            onClick={() => unstable_retry()}
            style={{
              padding: "14px 28px",
              borderRadius: "16px",
              border: "none",
              background: "#6d5cff",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Try again
          </button>

          {process.env.NODE_ENV !== "production" && error?.message && (
            <pre
              style={{
                marginTop: "24px",
                textAlign: "left",
                fontSize: "11px",
                color: "#ffb3b3",
                background: "rgba(255,60,60,0.06)",
                border: "1px solid rgba(255,60,60,0.2)",
                borderRadius: "12px",
                padding: "12px",
                overflowX: "auto",
              }}
            >
              {error.message}
            </pre>
          )}
        </div>
      </body>
    </html>
  );
}
