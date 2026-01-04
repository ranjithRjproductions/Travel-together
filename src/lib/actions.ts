
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import admin from 'firebase-admin';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { User, TravelRequest } from './definitions';
import { differenceInMinutes, parseISO } from 'date-fns';

/* -------------------------------------------------------------------------- */
/* SIGNUP – DB RECORD + ROLE CLAIM ONLY (AUTH DONE ON CLIENT)                  */
/* -------------------------------------------------------------------------- */

export async function signup(_: any, formData: FormData) {
  const schema = z.object({
    uid: z.string().min(1),
    name: z.string().min(2),
    email: z.string().email(),
    role: z.enum(['Traveler', 'Guide']),
  });

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { success: false, message: 'Invalid signup data.' };
  }

  const { uid, name, email, role } = parsed.data;

  try {
    // Set immutable role claim
    await adminAuth.setCustomUserClaims(uid, { role });

    // Create Firestore user record
    await adminDb.collection('users').doc(uid).set({
      id: uid,
      name,
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);

    // Cleanup auth user if DB write fails
    try {
      await adminAuth.deleteUser(uid);
    } catch {}

    return {
      success: false,
      message: 'Signup failed. Please try again.',
    };
  }
}

/* -------------------------------------------------------------------------- */
/* LOGIN – SESSION CREATION (SERVER ACTION, NO API ROUTES)                     */
/* -------------------------------------------------------------------------- */

export async function login(idToken: string) {
  try {
    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days

    const decoded = await adminAuth.verifyIdToken(idToken, true);

    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists) {
      return { success: false, message: 'User profile not found.' };
    }

    const userData = userDoc.data() as User;

    cookies().set({
      name: 'session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });

    // 🔐 SERVER-DRIVEN REDIRECT (NO RACE CONDITIONS)
    if (userData.role === 'Guide') {
      redirect('/guide/dashboard');
    } else {
      redirect('/traveler/dashboard');
    }
  } catch (error) {
    console.error('Login session error:', error);
    return { success: false, message: 'Failed to create session.' };
  }
}

/* -------------------------------------------------------------------------- */
/* LOGOUT                                                                      */
/* -------------------------------------------------------------------------- */

export async function logout() {
  const session = cookies().get('session')?.value;

  cookies().set({
    name: 'session',
    value: '',
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  });

  if (session) {
    try {
      const decoded = await adminAuth.verifySessionCookie(session, true);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    } catch {}
  }

  redirect('/');
}

/* -------------------------------------------------------------------------- */
/* SERVER-SIDE COST CALCULATION (ANTI-TAMPER)                                  */
/* -------------------------------------------------------------------------- */

const calculateCostOnServer = (request: TravelRequest): number => {
  const { startTime, endTime, requestedDate } = request;
  if (!startTime || !endTime || !requestedDate) return 0;

  const baseDate = parseISO(requestedDate);

  const start = new Date(baseDate);
  const [sh, sm] = startTime.split(':').map(Number);
  start.setHours(sh, sm, 0, 0);

  const end = new Date(baseDate);
  const [eh, em] = endTime.split(':').map(Number);
  end.setHours(eh, em, 0, 0);

  if (end <= start) return 0;

  const hours = differenceInMinutes(end, start) / 60;

  return hours <= 3
    ? hours * 150
    : 3 * 150 + (hours - 3) * 100;
};

/* -------------------------------------------------------------------------- */
/* TRAVEL REQUEST SUBMISSION                                                   */
/* -------------------------------------------------------------------------- */

export async function submitTravelRequest(
  requestId: string,
  guideId?: string
) {
  try {
    const session = cookies().get('session')?.value;
    if (!session) throw new Error('Unauthenticated');

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const travelerId = decoded.uid;

    const requestRef = adminDb.collection('travelRequests').doc(requestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      throw new Error('Request not found');
    }

    const request = requestSnap.data() as TravelRequest;
    if (request.travelerId !== travelerId) {
      throw new Error('Permission denied');
    }

    const cost = calculateCostOnServer(request);

    await requestRef.update({
      status: guideId ? 'guide-selected' : 'pending',
      guideId: guideId ?? null,
      estimatedCost: cost,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Submit request error:', error);
    return { success: false, message: error.message };
  }
}
