
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import admin from 'firebase-admin';
import { getAdminServices } from '@/lib/firebase-admin';
import type { User, TravelRequest } from './definitions';
import { differenceInMinutes, parseISO } from 'date-fns';

/* -------------------------------------------------------------------------- */
/* SIGNUP – DB RECORD ONLY (NO CUSTOM CLAIMS)                                  */
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
  const { adminDb, adminAuth } = getAdminServices();

  try {
    const userPayload: any = {
      id: uid,
      name,
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (email === 'admin@gmail.com') {
      await adminDb.collection('roles_admin').doc(uid).set({ isAdmin: true });
    }

    await adminDb.collection('users').doc(uid).set(userPayload);

    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    try {
      await adminAuth.deleteUser(uid);
    } catch (cleanupError) {
      console.error('Cleanup auth user failed:', cleanupError);
    }
    return {
      success: false,
      message: 'Signup failed. Please try again.',
    };
  }
}


/* -------------------------------------------------------------------------- */
/* LOGOUT                                                                     */
/* -------------------------------------------------------------------------- */
export async function logoutAction() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session') || cookieStore.get('__session');

  if (sessionCookie) {
    cookieStore.set(sessionCookie.name, '', { maxAge: 0, path: '/' });
  }

  redirect('/login?message=You have been logged out.');
}


/* -------------------------------------------------------------------------- */
/* OTHER ACTIONS (UNCHANGED)                                                  */
/* -------------------------------------------------------------------------- */
export async function updateGuideStatus(guideId: string, status: 'active' | 'rejected') {
    const { adminAuth, adminDb } = getAdminServices();
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);

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
    const { adminAuth, adminDb } = getAdminServices();
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');

        await adminAuth.deleteUser(travelerId);
        await adminDb.collection('users').doc(travelerId).delete();

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
    const { adminAuth, adminDb } = getAdminServices();
    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');

        await adminAuth.deleteUser(guideId);
        
        const guideProfileRef = adminDb.collection('users').doc(guideId).collection('guideProfile').doc('guide-profile-doc');
        await guideProfileRef.delete().catch(() => {});
        
        await adminDb.collection('users').doc(guideId).delete();

        revalidatePath('/admin/users/guides');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteTravelerProfileInfo(travelerId: string) {
    const { adminAuth, adminDb } = getAdminServices();
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
    const { adminAuth, adminDb } = getAdminServices();
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

export async function submitTravelRequest(
  requestId: string,
  guideId?: string
) {
  const { adminAuth, adminDb } = getAdminServices();
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
  const { adminAuth, adminDb } = getAdminServices();
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
            guideId: admin.firestore.FieldValue.delete(),
            guideData: admin.firestore.FieldValue.delete(),
        });
    }

    revalidatePath('/guide/dashboard');
    revalidatePath('/traveler/my-bookings');
    return { success: true };
  } catch(e: any) {
    return { success: false, message: e.message };
  }
}

    