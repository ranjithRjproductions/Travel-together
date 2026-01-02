
import { cookies } from 'next/headers';
import type { User } from '@/lib/definitions';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function getUser(): Promise<User | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const role = decodedClaims.role as 'Traveler' | 'Guide' | undefined;

    if (!role || (role !== 'Traveler' && role !== 'Guide')) {
        return null;
    }

    const userDoc = await db.collection('users').doc(decodedClaims.uid).get();
    if (!userDoc.exists) {
        return null;
    }

    // Check for admin privileges
    const adminDoc = await db.collection('roles_admin').doc(decodedClaims.uid).get();
    const isAdmin = adminDoc.exists;

    const userData = userDoc.data();

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
    // console.error('Auth Error:', error);
    // Hide spammy auth errors in production, but keep for debugging in dev.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Auth Error:', error);
    }
    return null;
  }
}
