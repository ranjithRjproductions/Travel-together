
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';
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

const calculateCostOnServer = (request: TravelRequest): number => {
    const { purposeData, pickupData, startTime, endTime, requestedDate } = request;

    let serviceStartTimeStr: string | undefined, serviceEndTimeStr: string | undefined;

    const isPrebookedHospital = purposeData?.purpose === 'hospital' &&
                                purposeData.subPurposeData?.bookingDetails?.isAppointmentPrebooked === 'yes';

    if (pickupData?.pickupType === 'destination') {
        if (isPrebookedHospital) {
            serviceStartTimeStr = purposeData.subPurposeData.bookingDetails.startTime;
        } else {
            serviceStartTimeStr = startTime;
        }
    } else {
        serviceStartTimeStr = pickupData?.pickupTime;
    }

    if (isPrebookedHospital) {
        serviceEndTimeStr = purposeData.subPurposeData.bookingDetails.endTime;
    } else {
        serviceEndTimeStr = endTime;
    }

    if (!serviceStartTimeStr || !serviceEndTimeStr || !requestedDate) return 0;
    
    const baseDate = parseISO(requestedDate);
    
    const start = new Date(baseDate);
    const [startHours, startMinutes] = serviceStartTimeStr.split(':').map(Number);
    start.setHours(startHours, startMinutes, 0, 0);

    const end = new Date(baseDate);
    const [endHours, endMinutes] = serviceEndTimeStr.split(':').map(Number);
    end.setHours(endHours, endMinutes, 0, 0);

    if (end <= start) return 0;

    const durationInMinutes = differenceInMinutes(end, start);
    if (durationInMinutes <= 0) return 0;
    
    const durationInHours = durationInMinutes / 60;
    let cost = 0;

    if (durationInHours <= 3) {
        cost = durationInHours * 150;
    } else {
        const baseCost = 3 * 150;
        const additionalHours = durationInHours - 3;
        const additionalCost = additionalHours * 100;
        cost = baseCost + additionalCost;
    }

    return Math.round(cost); // Return a whole number
};

export async function createRazorpayOrder(requestId: string): Promise<{ success: boolean; message: string; order?: any }> {
    const { adminAuth, adminDb } = getAdminServices();

    try {
        const session = cookies().get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        await adminAuth.verifySessionCookie(session, true);
        
        const requestRef = adminDb.collection('travelRequests').doc(requestId);
        const requestSnap = await requestRef.get();
        if (!requestSnap.exists) throw new Error('Request not found.');

        const request = requestSnap.data() as TravelRequest;

        // Use the same server-side cost calculation
        const amountInRupees = calculateCostOnServer(request);
        if (amountInRupees <= 0) {
            throw new Error('Calculated amount must be positive.');
        }
        const amountInPaise = amountInRupees * 100;

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: requestId,
            notes: {
                requestId: requestId,
                travelerId: request.travelerId,
            }
        };

        const order = await razorpay.orders.create(options);

        // Atomically update the travel request with payment details
        await requestRef.update({
            razorpayOrderId: order.id,
            status: 'payment-pending',
            paymentDetails: {
                expectedAmount: amountInPaise,
                currency: 'INR',
            }
        });

        revalidatePath(`/traveler/checkout/${requestId}`);

        return { success: true, message: 'Order created', order: {
            id: order.id,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
        }};

    } catch (error: any) {
        console.error('Failed to create Razorpay order:', error);
        return { success: false, message: error.message || 'Could not create order.' };
    }
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
