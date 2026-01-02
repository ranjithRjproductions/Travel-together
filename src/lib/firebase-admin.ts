
import admin from "firebase-admin";

if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  // The private_key is often stored with escaped newlines in environment variables.
  // This line correctly replaces those escaped newlines with actual newline characters.
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
} catch (error) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
  throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY format. Please ensure it is a valid, single-line JSON string.");
}


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
export const auth = admin.auth();
export const db = admin.firestore();
