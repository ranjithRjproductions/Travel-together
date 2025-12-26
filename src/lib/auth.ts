import { cookies } from 'next/headers';
import type { User } from '@/lib/definitions';
import { auth as adminAuth, db } from '@/lib/firebase-admin';

export async function getUser(): Promise<User | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // The role is now sourced from custom claims, the single source of truth for the session.
    const role = decodedClaims.role as 'Traveler' | 'Guide' | undefined;

    // Edge case handling: If role is missing or invalid in the claim, treat the session as invalid.
    if (!role || (role !== 'Traveler' && role !== 'Guide')) {
        // Return null for an invalid role claim; do not modify cookies here.
        return null;
    }

    // Note: We no longer need to hit Firestore here to get the role,
    // but we can still fetch other user details if necessary. For now, claims are sufficient.
    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();

    if (!userDoc.exists) {
        // Edge case: claims are valid but user doc is gone. Invalidate session by returning null.
        return null;
    }

    const userData = userDoc.data();

    return {
      uid: decodedClaims.uid,
      name: userData?.name || 'Unnamed',
      email: decodedClaims.email || 'no-email@example.com',
      role: role,
      photoURL: userData?.photoURL || undefined,
      photoAlt: userData?.photoAlt || undefined,
    } as User;
  } catch (error) {
    // Session cookie is invalid or expired.
    // Return null and let the calling component handle the redirect.
    console.error('Auth Error:', error);
    return null;
  }
}
