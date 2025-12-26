'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User } from './definitions';
import { auth as adminAuth, db } from '@/lib/firebase-admin';

export async function login(idToken: string) {
  'use server';

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return { message: 'User data not found in Firestore.', success: false, redirectTo: '' };
    }

    const userData = userDoc.data() as User;
    const role = userData.role;

    // Set role as a custom claim
    await adminAuth.setCustomUserClaims(uid, { role });

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 5 * 1000, // 5 days
    });

    cookies().set('session', sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 5, // 5 days
      path: '/',
    });

    const redirectTo =
      role === 'Guide'
        ? '/guide/dashboard'
        : '/traveler/dashboard';
        
    return { success: true, redirectTo };

  } catch (error: any) {
    console.error('Login error:', error);
    let message = 'Login failed due to a server error.';
    if (error.code === 'auth/id-token-expired' || error.code === 'auth/id-token-revoked') {
      message = 'Your session has expired or been revoked. Please log in again.';
    }
    return { message, success: false, redirectTo: '' };
  }
}

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
  role: z.enum(['Traveler', 'Guide'], {
    required_error: 'Please select a role.',
  }),
  uid: z.string().min(1, { message: 'User ID is required.' }),
});

export async function signup(prevState: any, formData: FormData) {
  'use server';
  
  const validatedFields = signupSchema.safeParse(Object.fromEntries(formData));
  
  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Invalid form data. Please check your inputs.',
    };
  }
  
  const { uid, name, email, role } = validatedFields.data;

  try {
    await db.collection('users').doc(uid).set({
      id: uid,
      name,
      email,
      role,
    });
    
    // On successful Firestore write, redirect.
  } catch (error) {
    console.error('Firestore user creation error:', error);
    // In case of Firestore error, we should ideally delete the Auth user
    // to allow them to try signing up again.
    try {
      await adminAuth.deleteUser(uid);
    } catch (deleteError) {
      console.error(`Failed to clean up auth user ${uid} after Firestore error:`, deleteError);
    }
    return {
      success: false,
      message: 'Failed to store user details. Please try signing up again.',
    };
  }

  redirect('/login?message=Account created successfully! Please log in.');
}


export async function logout() {
  'use server';
  
  const sessionCookieValue = cookies().get('session')?.value;
  if (!sessionCookieValue) {
    redirect('/');
    return;
  }

  // Clear the session cookie first.
  cookies().set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(
      sessionCookieValue,
      true
    );
    await adminAuth.revokeRefreshTokens(decodedClaims.sub);
  } catch (error) {
    // This can happen if the cookie is invalid or expired.
    // In any case, the user is effectively logged out on the client.
    console.error('Error revoking refresh tokens during logout:', error);
  }

  redirect('/');
}
