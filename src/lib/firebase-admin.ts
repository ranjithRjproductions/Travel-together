
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
    // Best practice: use individual environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // The private key needs to have its newlines restored
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase Admin SDK environment variables not set. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
      );
    }
    
    const serviceAccount = {
        projectId,
        clientEmail,
        privateKey,
    };

    adminApp = initializeApp({
      credential: cert(serviceAccount),
    });
  }

  adminAuth = getAuth(adminApp);
  adminDb = getFirestore(adminApp);
}

// Initialize immediately when the module is loaded.
// If this fails, the entire server will fail to start, which is the correct behavior.
initializeAdminApp();

export function getAdminServices() {
  if (!adminApp || !adminAuth || !adminDb) {
    // This should theoretically not be reachable if initialization is mandatory.
    throw new Error('Firebase Admin SDK has not been initialized.');
  }
  return { adminAuth, adminDb };
}

// To be used in other server-side files that need only the db instance.
export function getAdminDb() {
  if (!adminDb) {
    // This check is redundant if initialization is guaranteed, but good for safety.
    throw new Error('Firestore Admin is not initialized.');
  }
  return adminDb;
}
