/**
 * Generates a ticket ID in the form `TX-XXXXXXXX` using the platform CSPRNG.
 * crypto.randomUUID() is available in Node >= 19 and all modern browsers,
 * so this works in both server routes and client bundles.
 */
export function generateTicketId(): string {
  const random =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 16)
        ).map((n) => n.toString(16)).join("");
  return `TX-${random.slice(0, 8).toUpperCase()}`;
}
