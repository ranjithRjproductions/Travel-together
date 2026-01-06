
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminServices } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[Webhook Error] RAZORPAY_WEBHOOK_SECRET is not defined.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('[Webhook Error] Missing x-razorpay-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // --- Step 1: Verify Razorpay Signature ---
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      console.error('[Webhook Error] Invalid Razorpay signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id;

    if (!eventId) {
        console.error('[Webhook Error] Event ID is missing from payload');
        return NextResponse.json({ error: 'Event ID missing' }, { status: 400 });
    }
    
    // --- Step 2 & 3: Check for Idempotency & Store Raw Event ---
    const { adminDb } = getAdminServices();
    const eventRef = adminDb.collection('payment_events').doc(eventId);
    
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
        // Event already processed, return 200 OK to acknowledge receipt.
        console.log(`[Webhook] Duplicate event received: ${eventId}. Acknowledging and ignoring.`);
        return NextResponse.json({ status: 'ok', message: 'Duplicate event' });
    }
    
    // If not a duplicate, store the raw event payload.
    // This triggers the "smart" processor function.
    await eventRef.set(event);
    console.log(`[Webhook] Stored new event: ${eventId}`);

    // --- Step 4: Return 200 OK Immediately ---
    // Acknowledge receipt of the event. The actual business logic is handled by the background function.
    return NextResponse.json({ status: 'received' });

  } catch (error: any) {
    console.error('[Webhook Error] Unhandled exception in webhook processor:', error);
    // Return a generic error to the sender without revealing internal details.
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
