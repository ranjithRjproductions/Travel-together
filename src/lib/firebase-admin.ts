
import admin from "firebase-admin";

// Initialize only if not already done
if (!admin.apps.length) {
  // Check if the service account key is in the environment variables
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    // This will happen in client-side code that incorrectly imports this file.
    // We can't throw an error here as it would crash the client-side build.
    // The error will be caught where the SDK is actually used on the server.
    console.warn("FIREBASE_SERVICE_ACCOUNT_KEY is not defined. Admin SDK will not be initialized.");
  } else {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      
      // The private_key is often stored with escaped newlines. This replaces them.
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (error: any) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY or initialize admin app:", error.message);
      // We can't throw here, but we can log the error.
    }
  }
}

export const auth = admin.auth();
export const db = admin.firestore();
export const messaging = admin.messaging();
export default admin;
