const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function check() {
  const snapshot = await db.collection('event_registrations').where('eventId', '==', 'inspirex-s2').get();
  console.log(`Found ${snapshot.size} docs in event_registrations for inspirex-s2`);
  snapshot.forEach(doc => console.log(doc.id, doc.data()));
  
  const regs = await db.collection('registrations').get();
  console.log(`\nFound ${regs.size} docs in raw registrations`);
  regs.forEach(doc => console.log(doc.id, doc.data()));
}

check();
