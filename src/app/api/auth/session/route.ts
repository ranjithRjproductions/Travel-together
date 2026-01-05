
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getAdminServices } from '@/lib/firebase-admin';
import type { User } from '@/lib/definitions';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { adminAuth, adminDb } = getAdminServices();
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days in milliseconds
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const { uid } = decodedToken;
    const userDoc = await adminDb.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      throw new Error('User document not found in Firestore.');
    }
    const userData = userDoc.data() as User;
    const role = userData.role;
    const adminDoc = await adminDb.collection('roles_admin').doc(uid).get();
    const isAdmin = adminDoc.exists;
    
    // The `maxAge` property should be in seconds.
    const maxAgeInSeconds = Math.round(expiresIn / 1000);

    cookies().set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: maxAgeInSeconds,
      path: '/',
    });

    return NextResponse.json({ success: true, role, isAdmin });
  } catch (error: any) {
    console.error('Session login error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create session.' }, { status: 500 });
  }
}
