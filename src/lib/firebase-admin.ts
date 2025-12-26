import admin from 'firebase-admin';

// This check ensures that the full service account key is available in the environment variables.
// It's critical for server-side Firebase services to function.
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  throw new Error(
    'The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. It must contain the full JSON service account credentials.'
  );
}

// Initialize the service account object.
let serviceAccount;

try {
  // Parse the stringified JSON from the environment variable.
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
} catch (error) {
  console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it's a valid JSON string.");
  throw error;
}


// Correct the formatting of the private key.
// Environment variables often escape newline characters, which must be replaced with actual newlines.
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// Initialize Firebase Admin SDK only once to avoid re-initialization errors.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Export the initialized auth and firestore instances for use in server-side logic.
export const auth = admin.auth();
export const db = admin.firestore();
