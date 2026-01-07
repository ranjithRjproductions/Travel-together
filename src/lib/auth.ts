
import { cookies } from 'next/headers';
import type { User } from '@/lib/definitions';
import { getAdminServices } from '@/lib/firebase-admin';
import type { Timestamp } from 'firebase-admin/firestore';

export async function getUser(): Promise<User | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const { adminAuth, adminDb } = getAdminServices();

    // Verify the session cookie. This checks for valid signature and expiry.
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Fetch the corresponding user document from Firestore to get the role and profile data.
    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();
    if (!userDoc.exists) {
        console.warn(`User document not found for UID: ${decodedClaims.uid}`);
        return null;
    }
    
    const userData = userDoc.data() as User & { createdAt?: Timestamp };
    const role = userData.role;

    // Also check for admin status from a separate collection for security.
    const adminDoc = await adminDb.collection('roles_admin').doc(decodedClaims.uid).get();
    const isAdmin = adminDoc.exists;

    // IMPORTANT: Convert Firestore Timestamp to a serializable format (ISO string)
    // before passing the object to a Client Component.
    const finalUserData: any = { ...userData };
    if (userData.createdAt && typeof userData.createdAt.toDate === 'function') {
        finalUserData.createdAt = userData.createdAt.toDate().toISOString();
    }

    // Construct the final User object for use in layouts and pages.
    return {
      ...finalUserData,
      uid: decodedClaims.uid,
      email: decodedClaims.email || 'no-email@example.com',
      role,
      isAdmin,
    } as User;

  } catch (error) {
    // This block will be hit if the cookie is invalid, expired, or revoked.
    // This is an expected condition for logged-out users, not an error.
    return null;
  }
}
