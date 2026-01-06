
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import admin from 'firebase-admin';
import { getAdminServices } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error('Webhook Error: RAZORPAY_WEBHOOK_SECRET is not defined.');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Webhook Error: Missing Razorpay signature');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(rawBody);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== signature) {
      console.error('Webhook Error: Invalid Razorpay signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === 'payment.captured') {
      const payment = payload.payload.payment.entity;
      const requestId = payment?.notes?.requestId;

      if (!requestId) {
        console.error('Webhook Error: Missing requestId in payment notes');
        return NextResponse.json(
          { error: 'Missing requestId' },
          { status: 400 }
        );
      }

      const { adminDb } = getAdminServices();

      const requestRef = adminDb
        .collection('travelRequests')
        .doc(requestId);

      // Generate 4-digit Trip PIN (non-auth, acceptable)
      const tripPin = Math.floor(1000 + Math.random() * 9000).toString();

      await requestRef.update({
        status: 'paid',
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        tripPin,
      });

      console.log(
        `Payment verified and booking confirmed for requestId: ${requestId}`
      );
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
