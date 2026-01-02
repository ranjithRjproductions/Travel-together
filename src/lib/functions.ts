
'use server';

import * as functions from 'firebase-functions';
import { db, messaging } from './firebase-admin'; // Ensure admin is initialized here
import { type User } from './definitions';
import { type TravelRequest } from './definitions';

// Note: To deploy, you'll need to set up Firebase CLI and run `firebase deploy --only functions`

export const travelRequestStatusUpdate = functions.firestore
  .document('travelRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data() as TravelRequest;
    const previousValue = change.before.data() as TravelRequest;

    let userIdToSend: string | undefined;
    let notificationTitle = '';
    let notificationBody = '';

    // Case 1: Guide confirms the request. Notify the Traveler.
    if (newValue.status === 'confirmed' && previousValue.status === 'guide-selected') {
      userIdToSend = newValue.travelerId;
      notificationTitle = 'Your Guide has Confirmed!';
      notificationBody = `Your booking with ${newValue.guideData?.name || 'your guide'} is confirmed. Please proceed with payment.`;
    }
    
    // Case 2: Traveler selects a guide. Notify the Guide.
    else if (newValue.status === 'guide-selected' && previousValue.status === 'pending') {
      userIdToSend = newValue.guideId;
      notificationTitle = 'New Travel Request!';
      notificationBody = `You have a new travel request from ${newValue.travelerData?.name || 'a traveler'}. Please respond.`;
    }
    
    // Case 3: Guide declines the request. Notify the Traveler.
    else if (newValue.status === 'pending' && previousValue.status === 'guide-selected') {
        userIdToSend = newValue.travelerId;
        notificationTitle = 'Guide Unavailable';
        notificationBody = `${previousValue.guideData?.name || 'The selected guide'} was unable to accept your request. Please find another guide.`;
    }

    if (!userIdToSend) {
      console.log('No relevant status change for notification.');
      return null;
    }

    // Get the user's document to find their FCM tokens
    const userDoc = await db.collection('users').doc(userIdToSend).get();
    if (!userDoc.exists) {
      console.log(`User document ${userIdToSend} not found.`);
      return null;
    }

    const userData = userDoc.data() as User;
    const tokens = userData.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log(`User ${userIdToSend} has no FCM tokens.`);
      return null;
    }

    // Construct the notification payload
    const payload = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
        icon: '/logo.png', // Optional: URL to an icon
      },
      webpush: {
        fcm_options: {
            // This link allows the user to click the notification and go directly to the relevant page
            link: userIdToSend === newValue.travelerId ? '/traveler/my-bookings' : '/guide/dashboard'
        }
      }
    };

    // Send messages to all tokens.
    console.log(`Sending notification to ${tokens.length} tokens for user ${userIdToSend}.`);
    const response = await messaging.sendToDevice(tokens, payload);
    
    // Optional: Clean up invalid tokens
    const tokensToRemove: Promise<any>[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error('Failure sending notification to', tokens[index], error);
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          // This token is invalid, it should be removed from the user's document
          // For simplicity here, we're not removing them, but in a production app you would.
        }
      }
    });

    return null;
  });
