
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User, TravelRequest } from './definitions';
import { auth as adminAuth, db } from '@/lib/firebase-admin';
import { differenceInMinutes, parseISO } from 'date-fns';

const signupSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }).refine(
    (email) => email.endsWith('@gmail.com') || email.endsWith('@outlook.com'),
    { message: 'Only @gmail.com and @outlook.com emails are allowed.' }
  ),
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
    // Set the user's role as a custom claim immediately after creation
    await adminAuth.setCustomUserClaims(uid, { role });

    // Create the user document in Firestore
    await db.collection('users').doc(uid).set({
      id: uid,
      name,
      email,
      role,
    });
    
  } catch (error) {
    console.error('Signup process error:', error);
    // In case of Firestore error, we should ideally delete the Auth user
    // to allow them to try signing up again.
    try {
      await adminAuth.deleteUser(uid);
    } catch (deleteError) {
      console.error(`Failed to clean up auth user ${uid} after Firestore error:`, deleteError);
    }
    return {
      success: false,
      message: 'Failed to complete signup. Please try again.',
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

    if (durationInHours <= 3) {
        return durationInHours * 150;
    } else {
        const baseCost = 3 * 150;
        const additionalHours = durationInHours - 3;
        const additionalCost = additionalHours * 100;
        return baseCost + additionalCost;
    }
};


export async function submitTravelRequest(requestId: string): Promise<{ success: boolean, message: string }> {
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
      throw new Error('Not authenticated.');
    }
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);

    const requestDocRef = db.collection('travelRequests').doc(requestId);
    const requestDoc = await requestDocRef.get();

    if (!requestDoc.exists) {
      throw new Error('Request not found.');
    }

    const request = requestDoc.data() as TravelRequest;

    if (request.travelerId !== decodedToken.uid) {
      throw new Error('Permission denied.');
    }
    
    const estimatedCost = calculateCostOnServer(request);

    await requestDocRef.update({
      status: 'pending',
      estimatedCost: estimatedCost,
    });

    return { success: true, message: 'Request submitted successfully.' };
  } catch (error: any) {
    console.error('Failed to submit request:', error);
    return { success: false, message: error.message || 'Could not submit your request.' };
  }
}
