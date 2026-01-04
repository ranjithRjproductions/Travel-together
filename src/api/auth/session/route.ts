

import { type NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

// 🔴 REQUIRED: firebase-admin needs Node.js runtime
export const runtime = 'nodejs';

// Disable caching for this dynamic route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    
    // createSessionCookie already verifies the token.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const decodedIdToken = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedIdToken.uid;
    
    // Check for admin privileges and get user role in parallel
    const [userDoc, adminDoc] = await Promise.all([
        adminDb.collection('users').doc(uid).get(),
        adminDb.collection('roles_admin').doc(uid).get()
    ]);

    if (!userDoc.exists) {
        return NextResponse.json({ error: 'User data not found.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isAdmin = adminDoc.exists;
    const role = userData?.role;

    const response = NextResponse.json({ status: 'success', role, isAdmin }, { status: 200 });

    // Set the session cookie on the response.
    // secure: true is only used in production (HTTPS).
    response.cookies.set({
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn / 1000, // maxAge is in seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    
    return response;

  } catch (error) {
    console.error('Session Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
