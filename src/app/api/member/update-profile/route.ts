import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing auth token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken.email) {
      return NextResponse.json({ error: "Token has no verified email" }, { status: 403 });
    }

    const body = await request.json();
    const { memberId, name, linkedinUrl, instaUrl, imageUrl } = body;

    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const memberRef = adminDb.collection("members").doc(memberId);
    const memberDoc = await memberRef.get();

    if (!memberDoc.exists) {
      return NextResponse.json({ error: "Member document not found" }, { status: 404 });
    }

    const memberData = memberDoc.data();
    // Verify that the logged-in user owns this member record
    if (memberData?.email?.toLowerCase() !== decodedToken.email.toLowerCase()) {
      return NextResponse.json({ error: "Forbidden: You cannot edit another member's profile" }, { status: 403 });
    }

    const updates: Record<string, any> = {};
    if (typeof name === "string" && name.trim()) updates.name = name.trim();
    if (typeof linkedinUrl === "string") updates.linkedinUrl = linkedinUrl.trim();
    if (typeof instaUrl === "string") updates.instaUrl = instaUrl.trim();
    if (typeof imageUrl === "string") updates.imageUrl = imageUrl.trim();

    if (Object.keys(updates).length > 0) {
      await memberRef.update(updates);
    }

    // Also update Firebase Auth profile displayName / photoURL if provided
    try {
      const authUpdates: Record<string, any> = {};
      if (typeof updates.name === "string") authUpdates.displayName = updates.name;
      if (typeof updates.imageUrl === "string") {
        // Empty string or null in Firebase Admin resets/removes the photoURL
        authUpdates.photoURL = updates.imageUrl ? updates.imageUrl : "";
      }
      if (Object.keys(authUpdates).length > 0) {
        await adminAuth.updateUser(decodedToken.uid, authUpdates);
      }
    } catch (e) {
      console.warn("Could not sync with Firebase Auth user profile:", e);
    }

    // Also sync with users collection if the document exists for this uid
    try {
      const userDocRef = adminDb.collection("users").doc(decodedToken.uid);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        const userUpdates: Record<string, any> = {};
        if (typeof updates.name === "string") userUpdates.name = updates.name;
        if (typeof updates.imageUrl === "string") userUpdates.photoURL = updates.imageUrl;
        if (Object.keys(userUpdates).length > 0) {
          await userDocRef.update(userUpdates);
        }
      }
    } catch (e) {
      console.warn("Could not sync with users collection:", e);
    }

    return NextResponse.json({ success: true, updates });
  } catch (error: any) {
    console.error("Error in update-profile API:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
