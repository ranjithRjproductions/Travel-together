
import admin from "firebase-admin";

const initializeAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined. Admin SDK cannot be initialized.");
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    // The replace call is necessary to format the private key correctly
    // when it's stored as a single-line string in an environment variable.
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
};


function getAdminApp() {
  return initializeAdmin();
}

export function getAdminAuth() {
  return admin.auth(getAdminApp());
}

export function getAdminDb() {
  return admin.firestore(getAdminApp());
}

export function getAdminMessaging() {
    return admin.messaging(getAdminApp());
}

export default admin;
