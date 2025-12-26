import admin from 'firebase-admin';

// This check ensures that the environment variable is set.
// It's critical for server-side Firebase services to function.
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    'FIREBASE_SERVICE_ACCOUNT_KEY is not set. This environment variable is required for server-side Firebase authentication.'
  );
}

// Safely parse the service account key from the environment variable.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

// Initialize Firebase Admin SDK only once.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
