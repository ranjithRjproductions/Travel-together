
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

interface User {
  uid: string;
  name?: string;
  fcmTokens?: string[];
}

interface TravelRequest {
  travelerId: string;
  guideId?: string;
  status: string;
  travelerData?: Partial<User>;
  guideData?: Partial<User>;
}

export const travelRequestStatusUpdate = functions.firestore
  .document("travelRequests/{requestId}")
  .onUpdate(async (change) => {
    const newValue = change.after.data() as TravelRequest;
    const previousValue = change.before.data() as TravelRequest;

    let userIdToSend: string | undefined;
    let notificationTitle = "";
    let notificationBody = "";

    // Case 1: Guide confirms the request. Notify the Traveler.
    if (
      newValue.status === "confirmed" &&
      previousValue.status === "guide-selected"
    ) {
      userIdToSend = newValue.travelerId;
      notificationTitle = "Your Guide has Confirmed!";
      notificationBody = `Your booking with ${
        newValue.guideData?.name || "your guide"
      } is confirmed. Please proceed with payment.`;
    } else if (
      // Case 2: Traveler selects a guide. Notify the Guide.
      newValue.status === "guide-selected" &&
      previousValue.status === "pending"
    ) {
      userIdToSend = newValue.guideId;
      notificationTitle = "New Travel Request!";
      notificationBody = `You have a new request from ${
        newValue.travelerData?.name || "a traveler"
      }. Please respond.`;
    } else if (
      // Case 3: Guide declines the request. Notify the Traveler.
      newValue.status === "pending" &&
      previousValue.status === "guide-selected"
    ) {
      userIdToSend = newValue.travelerId;
      notificationTitle = "Guide Unavailable";
      notificationBody = `${
        previousValue.guideData?.name || "The selected guide"
      } was unable to accept your request. Please find another guide.`;
    }

    if (!userIdToSend) {
      console.log("No relevant status change for notification.");
      return null;
    }

    const userDoc = await db.collection("users").doc(userIdToSend).get();
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

    const payload = {
      notification: {
        title: notificationTitle,
        body: notificationBody,
        icon: "/logo.png",
      },
      webpush: {
        fcm_options: {
          link:
            userIdToSend === newValue.travelerId ?
              "/traveler/my-bookings" :
              "/guide/dashboard",
        },
      },
    };

    console.log(
      `Sending notification to ${tokens.length} tokens for user ${userIdToSend}.`
    );
    const response = await messaging.sendToDevice(tokens, payload);

    const tokensToRemove: string[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("Failure sending notification to", tokens[index], error);
        if (
          error.code === "messaging/invalid-registration-token" ||
          error.code === "messaging/registration-token-not-registered"
        ) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      return userDoc.ref.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove),
      });
    }

    return null;
  });
