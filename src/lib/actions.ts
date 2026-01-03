
'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { User, TravelRequest } from './definitions';
import admin from 'firebase-admin';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { differenceInMinutes, parseISO } from 'date-fns';
import { revalidatePath } from 'next/cache';

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

// This is now only responsible for creating the DB record and setting claims.
// The client handles the redirect.
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
  const adminAuth = getAdminAuth();
  const db = getAdminDb();

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

    return { success: true, message: 'User record created successfully.' };
    
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
  
  const adminAuth = getAdminAuth();

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


export async function submitTravelRequest(requestId: string, guideId?: string): Promise<{ success: boolean, message: string }> {
  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  try {
    const sessionCookie = cookies().get('session')?.value;
    if (!sessionCookie) {
      throw new Error('Not authenticated.');
    }
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const travelerId = decodedToken.uid;

    // Get both the request and the user's profile data
    const requestDocRef = db.collection('travelRequests').doc(requestId);
    const userDocRef = db.collection('users').doc(travelerId);

    const [requestDoc, userDoc] = await Promise.all([requestDocRef.get(), userDocRef.get()]);

    if (!requestDoc.exists) {
      throw new Error('Request not found.');
    }
    if (!userDoc.exists) {
      throw new Error('User profile not found.');
    }

    const request = requestDoc.data() as TravelRequest;
    const userData = userDoc.data() as User;

    if (request.travelerId !== travelerId) {
      throw new Error('Permission denied.');
    }
    
    const estimatedCost = calculateCostOnServer(request);
    const travelerDataToEmbed: Partial<User> = {
      name: userData.name,
      gender: userData.gender,
      photoURL: userData.photoURL,
      photoAlt: userData.photoAlt,
      disability: userData.disability,
    };
    
    const dataToUpdate: any = {
      status: 'pending',
      estimatedCost: estimatedCost,
      travelerData: travelerDataToEmbed,
    };

    if (guideId) {
      dataToUpdate.guideId = guideId;
      dataToUpdate.status = 'guide-selected';
    }


    await requestDocRef.update(dataToUpdate);

    return { success: true, message: 'Request submitted successfully.' };
  } catch (error: any) {
    console.error('Failed to submit request:', error);
    return { success: false, message: error.message || 'Could not submit your request.' };
  }
}

export async function respondToTravelRequest(requestId: string, response: 'confirmed' | 'declined'): Promise<{ success: boolean, message: string }> {
  'use server';

  const adminAuth = getAdminAuth();
  const db = getAdminDb();
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
      return { success: false, message: 'Authentication required.' };
  }

  try {
      const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
      const guideId = decodedClaims.uid;
      
      const requestDocRef = db.collection('travelRequests').doc(requestId);
      const requestDoc = await requestDocRef.get();

      if (!requestDoc.exists) {
          return { success: false, message: 'This travel request no longer exists.' };
      }
      
      const requestData = requestDoc.data() as TravelRequest;

      if (requestData.guideId !== guideId) {
          return { success: false, message: 'You are not authorized to respond to this request.' };
      }

      if (response === 'confirmed') {
          const guideDoc = await db.collection('users').doc(guideId).get();
          if (!guideDoc.exists) {
            throw new Error("Could not find the guide's profile to confirm the request.");
          }
          const guideData = guideDoc.data() as User;
          // Only embed non-sensitive, public-facing information
          const guideDataToEmbed: Partial<User> = {
            name: guideData.name,
            photoURL: guideData.photoURL,
            photoAlt: guideData.photoAlt,
          };
          await requestDocRef.update({ status: 'confirmed', guideData: guideDataToEmbed });
      } else {
          // If declined, set status back to 'pending' and remove the guideId so traveler can choose another.
          await requestDocRef.update({ 
              status: 'pending', 
              guideId: admin.firestore.FieldValue.delete(),
              guideData: admin.firestore.FieldValue.delete(),
          });
      }

      revalidatePath('/guide/dashboard');
      revalidatePath('/traveler/my-bookings');

      return { success: true, message: `Request has been successfully ${response}.` };

  } catch (error: any) {
      console.error('Error responding to travel request:', error);
      return { success: false, message: 'An unexpected error occurred. Please try again.' };
  }
}

export async function updateGuideStatus(guideId: string, status: 'active' | 'rejected'): Promise<{ success: boolean; message: string }> {
  'use server';
  
  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  // 1. Verify admin privileges
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminDoc = await db.collection('roles_admin').doc(decodedClaims.uid).get();
    if (!adminDoc.exists) {
      return { success: false, message: 'Permission denied. Not an admin.' };
    }

    // 2. Update the guide's profile
    const guideProfileRef = db.collection('users').doc(guideId).collection('guideProfile').doc('guide-profile-doc');
    
    await guideProfileRef.update({
      onboardingState: status,
    });

    // 3. Revalidate the path to refresh the data on the admin page
    revalidatePath('/admin/users/guides');

    return { success: true, message: `Guide status updated to ${status}.` };
  } catch (error: any) {
    console.error('Error updating guide status:', error);
    return { success: false, message: 'An unexpected error occurred.' };
  }
}

export async function deleteTravelerAccount(travelerId: string): Promise<{ success: boolean; message: string }> {
  'use server';

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  // 1. Verify admin privileges
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminDoc = await db.collection('roles_admin').doc(decodedClaims.uid).get();
    if (!adminDoc.exists) {
      return { success: false, message: 'Permission denied. Not an admin.' };
    }

    // 2. Delete user from Firebase Authentication
    await adminAuth.deleteUser(travelerId);

    // 3. Delete user document from Firestore
    await db.collection('users').doc(travelerId).delete();

    // 4. (Optional but recommended) Delete associated data like travel requests
    const requestsQuery = db.collection('travelRequests').where('travelerId', '==', travelerId);
    const requestsSnapshot = await requestsQuery.get();
    const batch = db.batch();
    requestsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // 5. Revalidate the path to refresh the data on the admin page
    revalidatePath('/admin/users/travelers');

    return { success: true, message: 'Traveler account and all associated data have been deleted.' };
  } catch (error: any) {
    console.error('Error deleting traveler account:', error);
    if (error.code === 'auth/user-not-found') {
        // If auth user is already gone, try to delete Firestore data anyway
        try {
            await db.collection('users').doc(travelerId).delete();
            revalidatePath('/admin/users/travelers');
            return { success: true, message: 'User already deleted from Auth, Firestore record cleaned up.' };
        } catch (dbError: any) {
            return { success: false, message: `Auth user not found, but failed to clean Firestore: ${dbError.message}` };
        }
    }
    return { success: false, message: 'An unexpected error occurred during account deletion.' };
  }
}

export async function deleteTravelerProfileInfo(travelerId: string): Promise<{ success: boolean; message: string }> {
  'use server';

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  // 1. Verify admin privileges
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminDoc = await db.collection('roles_admin').doc(decodedClaims.uid).get();
    if (!adminDoc.exists) {
      return { success: false, message: 'Permission denied. Not an admin.' };
    }

    // 2. Delete the specific fields from the user's document
    const userDocRef = db.collection('users').doc(travelerId);
    await userDocRef.update({
      address: admin.firestore.FieldValue.delete(),
      contact: admin.firestore.FieldValue.delete(),
      disability: admin.firestore.FieldValue.delete(),
    });

    // 3. Revalidate the path to refresh the data on the detail page
    revalidatePath(`/admin/users/travelers/${travelerId}`);

    return { success: true, message: 'Traveler profile information has been deleted.' };
  } catch (error: any) {
    console.error('Error deleting traveler profile info:', error);
    return { success: false, message: 'An unexpected error occurred during profile info deletion.' };
  }
}


export async function deleteTravelRequest(requestId: string): Promise<{ success: boolean; message: string }> {
  'use server';

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  // 1. Verify admin privileges
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminDoc = await db.collection('roles_admin').doc(decodedClaims.uid).get();
    if (!adminDoc.exists) {
      return { success: false, message: 'Permission denied. Not an admin.' };
    }

    // 2. Delete the travel request document
    const requestDocRef = db.collection('travelRequests').doc(requestId);
    const requestDoc = await requestDocRef.get();
    if (!requestDoc.exists) {
      return { success: false, message: 'Request not found.' };
    }
    const travelerId = requestDoc.data()?.travelerId;

    await requestDocRef.delete();

    // 3. Revalidate the traveler detail page to refresh the list
    if (travelerId) {
        revalidatePath(`/admin/users/travelers/${travelerId}`);
    }

    return { success: true, message: 'Travel request deleted successfully.' };
  } catch (error: any) {
    console.error('Error deleting travel request:', error);
    return { success: false, message: 'An unexpected error occurred during request deletion.' };
  }
}

export async function deleteGuideAccount(guideId: string): Promise<{ success: boolean; message: string }> {
  'use server';

  const adminAuth = getAdminAuth();
  const db = getAdminDb();

  // 1. Verify admin privileges
  const sessionCookie = cookies().get('session')?.value;
  if (!sessionCookie) {
    return { success: false, message: 'Authentication required.' };
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminDoc = await db.collection('roles_admin').doc(decodedClaims.uid).get();
    if (!adminDoc.exists) {
      return { success: false, message: 'Permission denied. Not an admin.' };
    }

    // 2. Delete user from Firebase Authentication
    await adminAuth.deleteUser(guideId);

    // 3. Delete guide's subcollection documents (recursively not supported on client/admin SDK, must be done manually or with cloud function)
    const guideProfileCollectionRef = db.collection('users').doc(guideId).collection('guideProfile');
    const guideProfileSnapshot = await guideProfileCollectionRef.get();
    const batch = db.batch();
    guideProfileSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // 4. Delete user document from Firestore
    await db.collection('users').doc(guideId).delete();

    // 5. Revalidate the path to refresh the data on the admin page
    revalidatePath('/admin/users/guides');

    return { success: true, message: 'Guide account and all associated data have been deleted.' };
  } catch (error: any) {
    console.error('Error deleting guide account:', error);
    if (error.code === 'auth/user-not-found') {
        try {
            await db.collection('users').doc(guideId).delete();
            revalidatePath('/admin/users/guides');
            return { success: true, message: 'User already deleted from Auth, Firestore record cleaned up.' };
        } catch (dbError: any) {
            return { success: false, message: `Auth user not found, but failed to clean Firestore: ${dbError.message}` };
        }
    }
    return { success: false, message: 'An unexpected error occurred during account deletion.' };
  }
}
