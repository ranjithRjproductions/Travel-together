
import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.");
}

const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);

// 🔑 CRITICAL FIX: Replace literal "\\n" with actual newline characters
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();
