import { NextResponse } from "next/server";
import { requireAdminRequest, authErrorResponse } from "@/lib/firebase/requestAuth";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PRIMARY_ADMIN_EMAIL = "admin@connectclubvce.in";

interface AdminListItem {
  uid: string | null;
  email: string;
  displayName: string;
  grantedByEmail: string;
  grantedAt: string | null;
  twoFactorEnabled: boolean;
  primary: boolean;
}

export async function GET(request: Request) {
  try {
    await requireAdminRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const snaps = await getAdminDb().collection("admins").get();
    const admins: AdminListItem[] = snaps.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: typeof data.email === "string" ? data.email : "",
        displayName: typeof data.displayName === "string" ? data.displayName : "",
        grantedByEmail: typeof data.grantedByEmail === "string" ? data.grantedByEmail : "",
        grantedAt: data.grantedAt?.toDate?.()?.toISOString?.() ?? null,
        twoFactorEnabled: Boolean(data.twoFactorEnabled),
        primary: false,
      };
    });

    const hasPrimary = admins.some((admin) => admin.email === PRIMARY_ADMIN_EMAIL);
    if (!hasPrimary) {
      admins.unshift({
        uid: null,
        email: PRIMARY_ADMIN_EMAIL,
        displayName: "Connect Club Admin",
        grantedByEmail: "",
        grantedAt: null,
        twoFactorEnabled: false,
        primary: true,
      });
    } else {
      const primary = admins.find((admin) => admin.email === PRIMARY_ADMIN_EMAIL);
      if (primary) primary.primary = true;
    }

    admins.sort((a, b) => Number(b.primary) - Number(a.primary));
    return NextResponse.json({ admins });
  } catch (error) {
    console.error("Failed to list admins:", error);
    return NextResponse.json({ error: "Failed to list admins." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let caller;
  try {
    caller = await requireAdminRequest(request);
  } catch (error) {
    return authErrorResponse(error) ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const targetEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!action || !targetEmail) {
    return NextResponse.json({ error: "action and email are required." }, { status: 400 });
  }
  if (action !== "grant" && action !== "revoke") {
    return NextResponse.json({ error: "action must be 'grant' or 'revoke'." }, { status: 400 });
  }

  const auth = getAdminAuth();
  const db = getAdminDb();

  try {
    let user;
    try {
      user = await auth.getUserByEmail(targetEmail);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/user-not-found") {
        return NextResponse.json(
          { error: "No Firebase account exists with this email. Create the user first via Admin → Members." },
          { status: 404 }
        );
      }
      throw error;
    }

    if (action === "grant") {
      if (user.customClaims && user.customClaims.role === "admin") {
        return NextResponse.json({ success: true, alreadyAdmin: true, uid: user.uid });
      }
      if (user.email === PRIMARY_ADMIN_EMAIL) {
        return NextResponse.json({ error: "The primary admin account already has full access." }, { status: 400 });
      }

      await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role: "admin" });

      const userDocRef = db.collection("users").doc(user.uid);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        await userDocRef.update({ role: "admin" }).catch(() => {});
      }

      await db.collection("admins").doc(user.uid).set(
        {
          email: user.email,
          displayName: user.displayName || user.email,
          role: "admin",
          grantedByEmail: caller.email || "",
          grantedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return NextResponse.json({ success: true, uid: user.uid });
    }

    if (user.email === PRIMARY_ADMIN_EMAIL) {
      return NextResponse.json({ error: "The primary admin account cannot be revoked." }, { status: 400 });
    }
    if (user.uid === caller.uid) {
      return NextResponse.json({ error: "You cannot revoke your own admin access." }, { status: 400 });
    }

    await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), role: "user" });

    const userDocRef = db.collection("users").doc(user.uid);
    const userDoc = await userDocRef.get();
    if (userDoc.exists) {
      await userDocRef.update({ role: "user" }).catch(() => {});
    }

    await db.collection("admins").doc(user.uid).delete();

    return NextResponse.json({ success: true, uid: user.uid });
  } catch (error: unknown) {
    console.error("Admin access management error:", error);
    return NextResponse.json({ error: "Failed to update admin access." }, { status: 500 });
  }
}