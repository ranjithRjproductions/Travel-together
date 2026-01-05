
import { cookies } from 'next/headers';
import type { User } from '@/lib/definitions';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function getUser(): Promise<User | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    // Verify the session cookie. This checks for valid signature and expiry.
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // The role is now reliably sourced from the custom claim set during signup.
    const role = decodedClaims.role as 'Traveler' | 'Guide' | 'Admin' | undefined;

    // isAdmin is also a claim, ensuring it's tied to the session.
    const isAdmin = Boolean(decodedClaims.isAdmin);

    // Basic validation to ensure the role claim exists and is valid.
    if (!role || (role !== 'Traveler' && role !== 'Guide' && role !== 'Admin')) {
        console.warn(`Invalid or missing role claim for UID: ${decodedClaims.uid}`);
        return null;
    }

    // Fetch the corresponding user document from Firestore to get profile data.
    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();
    if (!userDoc.exists) {
        console.warn(`User document not found for UID: ${decodedClaims.uid}`);
        // This indicates a desync between Auth and Firestore, which should be handled.
        return null;
    }
    
    const userData = userDoc.data();
    
    // Construct the final User object for use in layouts and pages.
    return {
      uid: decodedClaims.uid,
      name: userData?.name || 'Unnamed',
      email: decodedClaims.email || 'no-email@example.com',
      role: role,
      isAdmin: isAdmin,
      photoURL: userData?.photoURL || undefined,
      photoAlt: userData?.photoAlt || undefined,
    } as User;

  } catch (error) {
    // This block will be hit if the cookie is invalid, expired, or revoked.
    // This is an expected condition for logged-out users, not an error.
    return null;
  }
}
