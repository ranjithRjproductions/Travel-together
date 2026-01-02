
import admin from "firebase-admin";

const initializeAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined. Admin SDK cannot be initialized.");
  }

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error: any) {
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
  }
};

// Call initialization function
initializeAdmin();

// Export initialized services
export const auth = admin.auth();
export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;
