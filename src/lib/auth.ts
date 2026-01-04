
import { cookies } from 'next/headers';
import type { User } from '@/lib/definitions';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function getUser(): Promise<User | null> {
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) return null;

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    const role = decodedClaims.role as 'Traveler' | 'Guide' | 'Admin' | undefined;

    // Check if user is an admin by querying the roles_admin collection
    const adminDoc = await adminDb.collection('roles_admin').doc(decodedClaims.uid).get();
    const isAdmin = adminDoc.exists;

    // If the role from claims is Admin, it must be validated by the collection
    if (role === 'Admin' && !isAdmin) {
      console.warn(`Role claim 'Admin' for UID ${decodedClaims.uid} is invalid.`);
      return null;
    }
    
    if (!role || (role !== 'Traveler' && role !== 'Guide' && role !== 'Admin')) {
        console.warn(`Invalid or missing role for UID: ${decodedClaims.uid}`);
        return null;
    }

    const userDoc = await adminDb.collection('users').doc(decodedClaims.uid).get();
    if (!userDoc.exists) {
        console.warn(`User document not found for UID: ${decodedClaims.uid}`);
        return null;
    }
    
    const userData = userDoc.data();
    
    // Final check: if user is admin, their role in the cookie should also be admin.
    if (isAdmin && role !== 'Admin') {
        // This is a state of desynchronization, we can try to fix it here
        // or just deny access. Denying is safer.
        console.warn(`Role mismatch for admin UID: ${decodedClaims.uid}. DB says admin, cookie says ${role}`);
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
    // Session cookie is invalid or expired.
    // It's a normal occurrence, so no need to log an error in production.
    if (process.env.NODE_ENV !== 'production') {
      console.error('Auth Error in getUser:', error);
    }
    return null;
  }
}

    