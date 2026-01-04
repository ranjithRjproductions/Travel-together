
import { cookies } from 'next/headers';
import type { User } from '@/lib/definitions';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function getUser(): Promise<User | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const role = decodedClaims.role as 'Traveler' | 'Guide' | undefined;

    if (!role || (role !== 'Traveler' && role !== 'Guide')) {
        // If role claim is missing or invalid, we must not proceed.
        // It indicates a problem with the session cookie or user setup.
        console.warn(`Invalid or missing role for UID: ${decodedClaims.uid}`);
        return null;
    }

    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();
    if (!userDoc.exists) {
        // If the user document doesn't exist, the claims in the cookie are stale.
        console.warn(`User document not found for UID: ${decodedClaims.uid}`);
        return null;
    }
    
    const userData = userDoc.data();
    
    // Server-side check for admin privileges, ignoring any client-sent claims
    const adminDoc = await adminDb.collection('roles_admin').doc(decodedClaims.uid).get();
    const isAdmin = adminDoc.exists;
    
    // Ensure the role in the database matches the role in the session cookie.
    if (userData?.role !== role) {
        console.warn(`Role mismatch for UID: ${decodedClaims.uid}. Cookie: ${role}, DB: ${userData?.role}`);
        return null;
    }

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
    if (process.env.NODE_ENV !== 'production') {
      console.error('Auth Error in getUser:', error);
    }
    return null;
  }
}
