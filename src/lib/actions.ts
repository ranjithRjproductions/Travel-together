

'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { getAdminServices } from '@/lib/firebase-admin';
import type { User, TravelRequest } from './definitions';
import { differenceInMinutes, parseISO } from 'date-fns';

/* 
* ────────────────────────────────────────────────────────────────────────────────
* 🔒 PAYMENT FLOW (LOCKED – PRODUCTION SAFE)
* ────────────────────────────────────────────────────────────────────────────────
* 
* This project uses a STRICT, server-controlled payment flow.
* Any change here can cause double charges, stuck bookings,
* or financial inconsistencies.
* 
* PAYMENT ARCHITECTURE:
* 
* 
* 1. Server Action (createRazorpayOrder)
* 
*   ◦ Calculates amount on the server ONLY
* 
*   ◦ Creates Razorpay order
* 
*   ◦ Sets booking status → "payment-pending"
* 
* 
* 2. Client Checkout Page
* 
*   ◦ Opens Razorpay Checkout using server order ID
* 
*   ◦ On success, calls `verifyRazorpayPayment` server action
* 
* 
* 3. Server Action (verifyRazorpayPayment)
* 
*   ◦ Verifies Razorpay signature (critically important for security)
* 
*   ◦ Updates booking status from "payment-pending" → "confirmed"
* 
*   ◦ Adds `paidAt` timestamp
* 
* 
* STATE RULES (DO NOT CHANGE):
* 
*   confirmed → payment-pending → confirmed
* 
* 
*   ◦ "payment-pending" = retry allowed
* 
*   ◦ "confirmed" + "paidAt" = final, paid, locked
* 
* 
* IMPORTANT:
* 
*   ◦ Clients must NEVER write payment fields.
* 
*   ◦ Amount must NEVER be client-controlled.
* 
*   ◦ Signature verification MUST happen on the server.
* 
* ⚠️ Any change here REQUIRES architectural review.
* ────────────────────────────────────────────────────────────────────────────────
*/


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
  // This redirect is intentional and terminal. The user's session is being destroyed.
  // Per docs/REDIRECT_CONTRACT.md, this is a valid use of redirect() in a Server Action.
  // DO NOT reuse this pattern for auth gating or role-based routing.
  const cookieStore = await cookies();
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

    return cost;
};

export async function createRazorpayOrder(requestId: string): Promise<{ success: boolean; message: string; order?: any }> {
    const { adminAuth, adminDb } = getAdminServices();

    try {
        const session = (await cookies()).get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        await adminAuth.verifySessionCookie(session, true);
        
        const requestRef = adminDb.collection('travelRequests').doc(requestId);
        const requestSnap = await requestRef.get();
        if (!requestSnap.exists) throw new Error('Request not found.');

        const request = requestSnap.data() as TravelRequest;
        
        if (request.status !== 'confirmed') {
            return { success: false, message: 'This request is not ready for payment.' };
        }

        const razorpay = new Razorpay({
            key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
            key_secret: process.env.RAZORPAY_KEY_SECRET!,
        });

        // If an order ID already exists and is still in 'created' state, reuse it.
        if (request.razorpayOrderId) {
            try {
                const existingOrder = await razorpay.orders.fetch(request.razorpayOrderId);
                 if (existingOrder && existingOrder.status === 'created') {
                     await requestRef.update({ 
                         status: 'payment-pending',
                         razorpayOrderId: existingOrder.id,
                         'paymentDetails.expectedAmount': existingOrder.amount,
                         'paymentDetails.currency': existingOrder.currency,
                     });
                     return { success: true, message: 'Existing order found', order: {
                        id: existingOrder.id,
                        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                        amount: existingOrder.amount,
                        currency: existingOrder.currency,
                     }};
                 }
            } catch (e) {
                console.warn("Could not fetch existing Razorpay order or it was already paid. A new one will be created.", e);
            }
        }

        const amountInRupees = calculateCostOnServer(request);
        if (amountInRupees <= 0) {
            throw new Error('Calculated amount must be positive.');
        }
        const amountInPaise = Math.round(amountInRupees * 100);

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

        await requestRef.update({
            razorpayOrderId: order.id,
            status: 'payment-pending',
            'paymentDetails.expectedAmount': amountInPaise,
            'paymentDetails.currency': 'INR',
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


export async function verifyRazorpayPayment(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
) {
  const { adminAuth, adminDb } = getAdminServices();

  try {
    const session = (await cookies()).get('session')?.value;
    if (!session) throw new Error('Unauthenticated');
    await adminAuth.verifySessionCookie(session, true);

    const secret = process.env.RAZORPAY_KEY_SECRET!;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      throw new Error('Invalid payment signature');
    }

    // Signature is valid, now fetch the request from Firestore
    const query = adminDb.collection('travelRequests').where('razorpayOrderId', '==', razorpay_order_id).limit(1);
    const snapshot = await query.get();

    if (snapshot.empty) {
      throw new Error('No matching travel request found for this order.');
    }

    const requestRef = snapshot.docs[0].ref;
    const request = snapshot.docs[0].data() as TravelRequest;

    // Idempotency check: if already paid, do nothing.
    if (request.status === 'confirmed' && request.paidAt) {
        console.log('Payment already verified for this request.');
        revalidatePath('/traveler/my-bookings');
        return { success: true, message: 'Payment already verified.' };
    }

    if (request.status !== 'payment-pending') {
      throw new Error(`Request is not in payment-pending state. Current state: ${request.status}`);
    }

    // All checks passed. Update the document.
    await requestRef.update({
        status: "confirmed", // Set status back to confirmed
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        'paymentDetails.razorpayPaymentId': razorpay_payment_id,
    });
    
    revalidatePath('/traveler/my-bookings');
    revalidatePath('/guide/dashboard');
    return { success: true, message: 'Payment verified and booking confirmed.' };

  } catch (error: any) {
    console.error('Razorpay verification failed:', error);
    return { success: false, message: error.message };
  }
}

/* -------------------------------------------------------------------------- */
/* OTHER ACTIONS                                                              */
/* -------------------------------------------------------------------------- */

export async function createDraftRequest(): Promise<{ success: boolean; message: string; travelerId?: string; }> {
    const { adminAuth } = getAdminServices();
    try {
        const session = (await cookies()).get('session')?.value;
        if (!session) throw new Error('Unauthenticated. Please log in.');
        const decodedToken = await adminAuth.verifySessionCookie(session, true);
        
        return { success: true, message: 'User authenticated.', travelerId: decodedToken.uid };

    } catch (error: any) {
        console.error("Failed to authenticate user for draft creation:", error);
        return { success: false, message: error.message || 'Could not authenticate user.' };
    }
}


export async function updateGuideStatus(guideId: string, status: 'active' | 'rejected') {
    const { adminAuth, adminDb } = getAdminServices();
    try {
        const session = (await cookies()).get('session')?.value;
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
        const session = (await cookies()).get('session')?.value;
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
        const session = (await cookies()).get('session')?.value;
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
        const session = (await cookies()).get('session')?.value;
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
        const session = (await cookies()).get('session')?.value;
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

export async function deleteDraftRequestsForTraveler(travelerId: string) {
    const { adminAuth, adminDb } = getAdminServices();
    try {
        const session = (await cookies()).get('session')?.value;
        if (!session) throw new Error('Unauthenticated');
        const decoded = await adminAuth.verifySessionCookie(session, true);
        const adminDoc = await adminDb.collection('roles_admin').doc(decoded.uid).get();
        if (!adminDoc.exists) throw new Error('Unauthorized');
        
        const draftsQuery = adminDb.collection('travelRequests')
            .where('travelerId', '==', travelerId)
            .where('status', '==', 'draft');
            
        const draftsSnapshot = await draftsQuery.get();
        if (draftsSnapshot.empty) {
            return { success: true, message: 'No draft requests to delete.' };
        }

        const batch = adminDb.batch();
        draftsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        revalidatePath(`/admin/users/travelers/${travelerId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || 'Failed to delete draft requests.' };
    }
}


export async function submitTravelRequest(
  requestId: string,
  guideId?: string
) {
  const { adminAuth, adminDb } = getAdminServices();
  try {
    const session = (await cookies()).get('session')?.value;
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
    const session = (await cookies()).get('session')?.value;
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
    revalidatePath('/guide/my-requests');
    revalidatePath('/traveler/my-bookings');
    return { success: true };
  } catch(e: any) {
    return { success: false, message: e.message };
  }
}

export async function checkIsAdmin(): Promise<boolean> {
  const { adminAuth, adminDb } = getAdminServices();

  try {
    const session = (await cookies()).get('session')?.value;
    if (!session) return false;

    const decoded = await adminAuth.verifySessionCookie(session, true);

    const adminDoc = await adminDb
      .collection('roles_admin')
      .doc(decoded.uid)
      .get();

    return adminDoc.exists;
  } catch (error) {
    // If cookie is invalid or any other error occurs, user is not admin
    return false;
  }
}

export async function getGuideRequests(): Promise<{
  inProgress: TravelRequest[];
  upcoming: TravelRequest[];
  past: TravelRequest[];
}> {
  const { adminAuth, adminDb } = getAdminServices();
  try {
    const session = (await cookies()).get('session')?.value;
    if (!session) {
      throw new Error('User not authenticated');
    }
    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    const guideId = decodedToken.uid;

    const requestsQuery = adminDb
      .collection('travelRequests')
      .where('guideId', '==', guideId);

    const snapshot = await requestsQuery.get();
    const requests = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Convert Timestamps to serializable strings
      const serializedData: any = { id: doc.id };
      for (const key in data) {
        if (data[key] instanceof admin.firestore.Timestamp) {
          serializedData[key] = (data[key] as admin.firestore.Timestamp)
            .toDate()
            .toISOString();
        } else {
          serializedData[key] = data[key];
        }
      }
      return serializedData as TravelRequest;
    });

    const inProgress = requests.filter((r) =>
      ['guide-selected', 'confirmed', 'payment-pending'].includes(r.status) && !r.paidAt
    );
    const upcoming = requests.filter((r) => r.status === 'confirmed' && r.paidAt);
    const past = requests.filter((r) => r.status === 'completed');

    return { inProgress, upcoming, past };
  } catch (error) {
    console.error('Error fetching guide requests:', error);
    // In case of error, return empty arrays to prevent page crashes
    return { inProgress: [], upcoming: [], past: [] };
  }
}
