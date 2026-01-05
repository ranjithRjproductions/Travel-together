
import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

// This function checks if the required environment variables are set.
const hasAdminConfig = () => {
  return (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  );
};

// This function initializes the Firebase Admin SDK using environment variables.
const initializeAdminApp = () => {
  if (!hasAdminConfig()) {
    console.warn(
      'Firebase Admin SDK environment variables are not set. Skipping initialization.'
    );
    return null; // Return null if config is missing
  }

  // The private key from the environment variable needs to have its newlines properly formatted.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n');

  try {
    return initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization failed:', error.message);
    return null;
  }
};

// Initialize Admin SDK once globally.
// Check if apps are already initialized to prevent re-initialization.
const adminApp = !getApps().length ? initializeAdminApp() : getApp();

// Export the initialized services. If initialization failed, these will be null
// or throw an error upon use, which helps in debugging.
export const adminAuth = adminApp ? getAuth(adminApp) : null;
export const adminDb = adminApp ? getFirestore(adminApp) : null;
export const adminMessaging = adminApp ? getMessaging(adminApp) : null;

// A helper function to safely get the database instance.
// This is useful in server components/actions where you need to ensure db is available.
export function getAdminDb() {
  if (!adminDb) {
    throw new Error(
      'Firestore Admin is not initialized. Check your server environment variables.'
    );
  }
  return adminDb;
}
