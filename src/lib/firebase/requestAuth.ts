import { getAdminAuth } from "@/lib/firebase/admin";

export async function requireAdminRequest(request: Request) {
  const decodedToken = await verifyRequestToken(request);
  if (
    decodedToken.role !== "admin" &&
    decodedToken.email !== "admin@connectclubvce.in"
  ) {
    throw new Error("FORBIDDEN");
  }
  return decodedToken;
}

export async function requireStaffRequest(request: Request) {
  const decodedToken = await verifyRequestToken(request);
  if (
    decodedToken.role === "admin" ||
    decodedToken.role === "member" ||
    decodedToken.email === "admin@connectclubvce.in"
  ) {
    return decodedToken;
  }

  // Fallback: check Firestore users collection for tier
  const { getFirestore } = await import("firebase-admin/firestore");
  const { getAdminApp } = await import("@/lib/firebase/admin");
  const primaryApp = getAdminApp();
  const primaryDb = getFirestore(primaryApp);
  const userDoc = await primaryDb.collection("users").doc(decodedToken.uid).get();
  const tier = userDoc.data()?.tier;

  if (tier !== "Core Team" && tier !== "Executive Board") {
    throw new Error("FORBIDDEN");
  }

  return decodedToken;
}

async function verifyRequestToken(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) throw new Error("UNAUTHORIZED");

  let decodedToken;
  try {
    decodedToken = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
  return decodedToken;
}
