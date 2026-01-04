
import admin from 'firebase-admin';

/**
 * Firebase Admin initialization
 * Uses FIREBASE_SERVICE_ACCOUNT_KEY from environment variables
 * This file MUST only be imported in server-side code
 */

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.'
  );
}

// Parse the full service account JSON from env
const serviceAccount = JSON.parse(
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY
);

// 🔑 CRITICAL: Convert escaped newlines into real newlines
if (!serviceAccount.private_key) {
  throw new Error('Service account private_key is missing.');
}

serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// Initialize Admin SDK once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Export strongly-typed Admin helpers
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export const adminMessaging = admin.messaging();
