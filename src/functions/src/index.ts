
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as sgMail from "@sendgrid/mail";

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  console.warn("SENDGRID_API_KEY not set. Emails will not be sent.");
}
const FROM_EMAIL = "ranjithkumarsrk123@gmail.com"; // Your verified sender

interface User {
  uid: string;
  name?: string;
  email?: string;
  fcmTokens?: string[];
}

interface TravelRequest {
  id: string;
  travelerId: string;
  guideId?: string;
  status: string;
  travelerData?: Partial<User>;
  guideData?: Partial<User>;
  emailNotified?: {
    guideSelected?: boolean;
    travelerConfirmed?: boolean;
    travelerPaid?: boolean;
  };
  paymentDetails?: {
    expectedAmount?: number;
    currency?: string;
  };
  razorpayOrderId?: string;
}

// Helper function to send an email
const sendEmail = async (to: string, subject: string, html: string) => {
  if (!SENDGRID_API_KEY) {
    console.log(`Email not sent (SendGrid not configured): To=${to}, Subject=${subject}`);
    return;
  }
  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    html,
  };
  try {
    await sgMail.send(msg);
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};


export const travelRequestStatusUpdate = functions.firestore
  .document("travelRequests/{requestId}")
  .onUpdate(async (change, context) => {
    const {requestId} = context.params;
    const newValue = change.after.data() as TravelRequest;
    const previousValue = change.before.data() as TravelRequest;

    let userIdToSendPush: string | undefined;
    let pushTitle = "";
    let pushBody = "";

    const requestDocRef = db.collection("travelRequests").doc(requestId);

    // --- Push Notification and Email Logic ---

    // Case 1: Traveler selects a guide. Notify the Guide.
    if (
      newValue.status === "guide-selected" &&
      previousValue.status === "pending" &&
      newValue.guideId &&
      !newValue.emailNotified?.guideSelected // Idempotency check
    ) {
      userIdToSendPush = newValue.guideId;
      pushTitle = "New Travel Request!";
      pushBody = `You have a new request from ${
        newValue.travelerData?.name || "a traveler"
      }. Please respond.`;

      // Send Email to Guide
      const guideDoc = await db.collection("users").doc(newValue.guideId).get();
      const guideData = guideDoc.data();
      if (guideData?.email) {
        const subject = "You Have a New Travel Request on Let's Travel Together";
        const html = `<p>Hi ${guideData.name},</p>
                      <p>You have received a new travel request from ${newValue.travelerData?.name || "a traveler"}.</p>
                      <p>Please log in to your dashboard to review the details and respond.</p>
                      <p>Thank you,<br/>The Let's Travel Together Team</p>`;
        await sendEmail(guideData.email, subject, html);
        await requestDocRef.set({emailNotified: {guideSelected: true}}, {merge: true});
      }
    }

    // Case 2: Guide confirms the request. Notify the Traveler.
    if (
      newValue.status === "confirmed" &&
      previousValue.status === "guide-selected" &&
      !newValue.emailNotified?.travelerConfirmed // Idempotency check
    ) {
      userIdToSendPush = newValue.travelerId;
      pushTitle = "Your Guide has Confirmed!";
      pushBody = `Your booking with ${
        newValue.guideData?.name || "your guide"
      } is confirmed. Please proceed with payment.`;

      // Send Email to Traveler
      if (newValue.travelerData?.email) {
        const subject = "Your Travel Request is Confirmed!";
        const html = `<p>Hi ${newValue.travelerData.name},</p>
                      <p>Great news! Your request has been confirmed by ${newValue.guideData?.name || "your guide"}.</p>
                      <p>Please complete the payment to finalize your booking.</p>
                      <p>Thank you,<br/>The Let's Travel Together Team</p>`;
        await sendEmail(newValue.travelerData.email, subject, html);
        await requestDocRef.set({emailNotified: {travelerConfirmed: true}}, {merge: true});
      }
    }

    // Case 3: Guide declines the request. Notify the Traveler.
    if (
      newValue.status === "pending" &&
      previousValue.status === "guide-selected"
    ) {
      userIdToSendPush = newValue.travelerId;
      pushTitle = "Guide Unavailable";
      pushBody = `${
        previousValue.guideData?.name || "The selected guide"
      } was unable to accept your request. Please find another guide.`;
      // Note: No email for rejection to avoid negative notifications. Push is sufficient.
    }
    
    // Case 4: Traveler pays for the request. Notify Traveler.
    if (
      newValue.status === "confirmed" &&
      (previousValue.status === "payment-pending") &&
      (newValue as any).tripPin && // This is the key change - only send email when PIN is generated
      !newValue.emailNotified?.travelerPaid // Idempotency check
    ) {
        // No push notification, just email confirmation
         if (newValue.travelerData?.email) {
            const subject = "Payment Received - Your Booking is Finalized!";
            const html = `<p>Hi ${newValue.travelerData.name},</p>
                          <p>We have received your payment. Your booking with ${newValue.guideData?.name || "your guide"} is now finalized and secure.</p>
                          <p>Your Trip PIN is: <strong>${(newValue as any).tripPin || "Not available"}</strong>. You will need to provide this to your guide to start the service.</p>
                          <p>We wish you a safe and pleasant journey!</p>
                          <p>Thank you,<br/>The Let's Travel Together Team</p>`;
            await sendEmail(newValue.travelerData.email, subject, html);
            await requestDocRef.set({emailNotified: {travelerPaid: true}}, {merge: true});
         }
    }

    // --- Existing Push Notification Logic ---
    if (!userIdToSendPush) {
      console.log("No relevant status change for push notification.");
      return null;
    }

    const userDoc = await db.collection("users").doc(userIdToSendPush).get();
    if (!userDoc.exists) {
      console.log(`User document ${userIdToSendPush} not found for push.`);
      return null;
    }

    const userData = userDoc.data() as User;
    const tokens = userData.fcmTokens;

    if (!tokens || tokens.length === 0) {
      console.log(`User ${userIdToSendPush} has no FCM tokens.`);
      return null;
    }

    const payload = {
      notification: {
        title: pushTitle,
        body: pushBody,
        icon: "/logo.png",
      },
      webpush: {
        fcm_options: {
          link:
            userIdToSendPush === newValue.travelerId ?
              "/traveler/my-bookings" :
              "/guide/dashboard",
        },
      },
    };

    console.log(
      `Sending push notification to ${tokens.length} tokens for user ${userIdToSendPush}.`
    );
    const response = await messaging.sendToDevice(tokens, payload);

    const tokensToRemove: string[] = [];
    response.results.forEach((result, index) => {
      const error = result.error;
      if (error) {
        console.error("Failure sending push to", tokens[index], error);
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

// "Smart" Payment Processor Cloud Function
export const processRazorpayEvent = functions.firestore
  .document("payment_events/{eventId}")
  .onCreate(async (snap, context) => {
    const event = snap.data();
    const eventId = context.params.eventId;
    
    const allowedEvents = ["order.paid", "payment.captured"];
    if (!allowedEvents.includes(event.event)) {
      console.log(`[Processor] Ignoring event '${event.event}' (${eventId}).`);
      return null;
    }

    const payment = event.payload.payment.entity;
    const order = event.payload.order?.entity;
    
    const requestId = order?.notes?.requestId || payment?.notes?.requestId;
    const receivedAmount = payment?.amount;
    const receivedCurrency = payment?.currency;
    const razorpayOrderId = payment?.order_id;

    if (!requestId || !razorpayOrderId) {
        console.error(`[Processor Error] Missing 'requestId' or 'order_id' in event ${eventId}.`);
        return null;
    }

    const requestRef = db.collection("travelRequests").doc(requestId);

    try {
        await db.runTransaction(async (transaction) => {
            const requestSnap = await transaction.get(requestRef);

            if (!requestSnap.exists) {
                throw new Error(`Travel request ${requestId} not found.`);
            }

            const request = requestSnap.data() as TravelRequest;

            // --- Validation Checks ---
            if (request.status === "confirmed" && (request as any).tripPin) {
              console.log(`[Processor] Request ${requestId} is already finalized (has Trip PIN). Ignoring duplicate processing.`);
              return;
            }
            if (request.status !== "payment-pending") {
              throw new Error(`Request ${requestId} is not in 'payment-pending' state. Current state: ${request.status}.`);
            }
            if (request.razorpayOrderId !== razorpayOrderId) {
              throw new Error(`Razorpay Order ID mismatch for request ${requestId}.`);
            }
            
            const expected = Number(request.paymentDetails?.expectedAmount);
            const received = Number(receivedAmount);
            
            if (expected !== received) {
              throw new Error(`Amount mismatch for request ${requestId}. Expected ${expected}, got ${received}.`);
            }
            if (request.paymentDetails?.currency !== receivedCurrency) {
              throw new Error(`Currency mismatch for request ${requestId}. Expected ${request.paymentDetails?.currency}, got ${receivedCurrency}.`);
            }

            // --- All checks passed, update document ---
            const tripPin = Math.floor(1000 + Math.random() * 9000).toString();
            
            transaction.update(requestRef, {
                status: "confirmed", // Move to the final 'confirmed' state
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                tripPin, // Add the Trip PIN to signify payment completion
                'paymentDetails.razorpayPaymentId': payment.id,
                'paymentDetails.processedEventId': eventId,
            });

            console.log(`[Processor] Successfully processed payment for request ${requestId}. Status set to confirmed with Trip PIN.`);
        });
    } catch (error: any) {
        console.error(`[Processor Transaction Error] for event ${eventId}:`, error);
        // If the transaction fails, the event document remains, and it can be retried or inspected manually.
        // You could also add a retry count to the event document to prevent infinite loops.
    }

    return null;
  });
