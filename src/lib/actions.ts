
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
    const userPayload: any = {
      id: uid,
      name,
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await adminDb.collection('users').doc(uid).set(userPayload);
    
    // Check if the user is the special admin user and grant claims
    if (email === 'admin@gmail.com') {
        await adminAuth.setCustomUserClaims(uid, { role: 'Admin', isAdmin: true });
        await adminDb.collection('roles_admin').doc(uid).set({ isAdmin: true });
    }


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
    
    cookies().set({
      name: 'session',
      value: sessionCookie,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresIn / 1000,
    });
    
    // This action now completes without redirecting.
    // The client-side form will handle the redirect after this promise resolves.
  } catch (error: any) {
    console.error('Login session error:', error);
    // Re-throw the error to be caught by the client form
    throw new Error(error.message || 'Failed to create session.');
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


export async function updateGuideStatus(guideId: string, status: 'active' | 'rejected') {
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);

        // Verify user is admin
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');
        
        const guideProfileRef = adminDb.collection('users').doc(guideId).collection('guideProfile').doc('guide-profile-doc');

        await guideProfileRef.update({ onboardingState: status });

        revalidatePath('/admin/users/guides');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}


export async function deleteTravelerAccount(travelerId: string) {
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');

        // Delete user from Auth
        await adminAuth.deleteUser(travelerId);
        // Delete user document from Firestore
        await adminDb.collection('users').doc(travelerId).delete();

        // Optional: Delete all associated travel requests
        const requestsQuery = adminDb.collection('travelRequests').where('travelerId', '==', travelerId);
        const requestsSnapshot = await requestsQuery.get();
        const batch = adminDb.batch();
        requestsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        
        revalidatePath('/admin/users/travelers');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteGuideAccount(guideId: string) {
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');

        await adminAuth.deleteUser(guideId);
        
        const guideProfileRef = adminDb.collection('users').doc(guideId).collection('guideProfile').doc('guide-profile-doc');
        await guideProfileRef.delete().catch(() => {}); // Fails silently if no profile
        
        await adminDb.collection('users').doc(guideId).delete();

        revalidatePath('/admin/users/guides');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteTravelerProfileInfo(travelerId: string) {
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');
        
        const userRef = adminDb.collection('users').doc(travelerId);
        await userRef.update({
            address: admin.firestore.FieldValue.delete(),
            contact: admin.firestore.FieldValue.delete(),
            disability: admin.firestore.FieldValue.delete(),
        });

        revalidatePath(`/admin/users/travelers/${travelerId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteTravelRequest(requestId: string) {
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');
        
        await adminDb.collection('travelRequests').doc(requestId).delete();
        
        revalidatePath('/admin/users/travelers');
        revalidatePath('/admin/users/guides');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
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
    
    // Fetch traveler data to embed in the request
    const travelerDoc = await adminDb.collection('users').doc(travelerId).get();
    const travelerData = travelerDoc.data();
    
    let updateData: any = {
      status: guideId ? 'guide-selected' : 'pending',
      guideId: guideId ?? null,
      estimatedCost: cost,
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      travelerData: {
          name: travelerData?.name,
          email: travelerData?.email,
          disability: travelerData?.disability,
      }
    };
    
    // If a guide is selected, embed their data too
    if (guideId) {
        const guideDoc = await adminDb.collection('users').doc(guideId).get();
        const guideData = guideDoc.data();
        updateData.guideData = {
            name: guideData?.name,
            email: guideData?.email,
        }
    }

    await requestRef.update(updateData);

    revalidatePath(`/traveler/find-guide/${requestId}`);
    revalidatePath(`/traveler/my-bookings`);
    return { success: true };
  } catch (error: any) {
    console.error('Submit request error:', error);
    return { success: false, message: error.message };
  }
}

export async function respondToTravelRequest(
    requestId: string,
    response: 'confirmed' | 'declined'
) {
  try {
    const session = cookies().get('session')?.value;
    if (!session) throw new Error('Unauthenticated');

    const decoded = await adminAuth.verifySessionCookie(session, true);
    const guideId = decoded.uid;

    const requestRef = adminDb.collection('travelRequests').doc(requestId);
    const requestSnap = await requestRef.get();
     if (!requestSnap.exists) throw new Error('Request not found');

    const request = requestSnap.data() as TravelRequest;
    if (request.guideId !== guideId) throw new Error('Permission denied');
    
    if (response === 'confirmed') {
        await requestRef.update({ 
            status: 'confirmed',
            acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    } else { // Declined
         await requestRef.update({ 
            status: 'pending',
            guideId: admin.firestore.FieldValue.delete(), // Remove the guideId
            guideData: admin.firestore.FieldValue.delete(), // Remove the guide data
        });
    }

    revalidatePath('/guide/dashboard');
    revalidatePath('/traveler/my-bookings');
    return { success: true };
  } catch(e: any) {
    return { success: false, message: e.message };
  }
}
