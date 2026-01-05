
import { initializeApp, getApps, cert, getApp, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function initializeAdminApp() {
  if (getApps().length > 0) {
    adminApp = getApp();
  } else {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Cannot initialize Firebase Admin SDK.');
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e: any) {
      throw new Error(`Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize app: ${e.message}`);
    }
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

// Ensure initialization is attempted when the module is loaded.
try {
  initializeAdminApp();
} catch (error) {
  console.error("Firebase Admin SDK Initialization Error:", (error as Error).message);
  // The services will remain null, and getAdminServices will throw an error when called.
}


export function getAdminServices() {
  if (!adminApp || !adminAuth || !adminDb) {
    throw new Error('Firebase Admin SDK has not been initialized. Please check your server environment and configuration.');
  }
  return { adminAuth, adminDb };
}

// Backwards compatibility for any other files that might be using the direct export.
// This is not ideal, but safer during this transition.
export { adminAuth, adminDb };

export function getAdminDb() {
  if (!adminDb) {
    throw new Error('Firestore Admin is not initialized. Please check your server environment and configuration.');
  }
  return adminDb;
}
