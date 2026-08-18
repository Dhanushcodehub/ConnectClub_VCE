import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "./src/lib/firebase/admin";

async function run() {
  const app = getAdminApp();
  const db = getFirestore(app);

  console.log("Looking up user 25881A05FC...");
  const usersSnapshot = await db.collection("users").where("rollNo", "==", "25881A05FC").get();
  
  if (usersSnapshot.empty) {
    console.log("No user found with rollNo 25881A05FC");
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;
  console.log("Found user ID:", userId);

  console.log("Looking up notifications for this user...");
  const notifs = await db.collection("notifications").where("userId", "==", userId).get();
  
  if (notifs.empty) {
    console.log("No notifications found for this user.");
  } else {
    notifs.forEach(doc => {
      console.log("Notification ID:", doc.id);
      console.log(doc.data());
    });
  }

  console.log("Looking up event registrations...");
  const regs = await db.collection("event_registrations").where("userId", "==", userId).get();
  if (regs.empty) {
    console.log("No event registrations found.");
  } else {
    regs.forEach(doc => {
      console.log("Reg ID:", doc.id);
      console.log(doc.data());
    });
  }
}

run().catch(console.error);
