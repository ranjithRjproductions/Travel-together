
import { type NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// Disabling caching for this route.
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // Set session expiration to 5 days.
    const expiresIn = 60 * 60 * 24 * 5 * 1000;
    
    const adminAuth = getAdminAuth();
    const db = getAdminDb();
    
    // Verify the ID token and get the user's UID.
    const decodedIdToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedIdToken.uid;

    // Check for admin privileges and get user role in parallel
    const [userDoc, adminDoc] = await Promise.all([
        db.collection('users').doc(uid).get(),
        db.collection('roles_admin').doc(uid).get()
    ]);

    if (!userDoc.exists) {
        return NextResponse.json({ error: 'User data not found.' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isAdmin = adminDoc.exists;
    const role = userData?.role;

    // The session cookie will be exchanged for an ID token and refreshed automatically.
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const options = {
      name: 'session',
      value: sessionCookie,
      maxAge: expiresIn,
      httpOnly: true,
      secure: true,
      path: '/',
    };

    const response = NextResponse.json({ status: 'success', role, isAdmin }, { status: 200 });
    response.cookies.set(options);
    
    return response;

  } catch (error) {
    console.error('Session Login Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
