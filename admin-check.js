const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  })
});

async function run() {
  try {
    const user = await admin.auth().getUserByEmail('admin@connectclubvce.in');
    
    // Reset the password
    await admin.auth().updateUser(user.uid, {
      password: 'AdminPassword123!'
    });
    console.log('Password reset successfully to AdminPassword123!');
  } catch (err) {
    console.log('Error:', err.message);
  }
}

run();
