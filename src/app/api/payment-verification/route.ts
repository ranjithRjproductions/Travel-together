
import { NextRequest, NextResponse } from 'next/server';
import { getAdminServices } from '@/lib/firebase-admin';
import crypto from 'crypto';
import admin from 'firebase-admin';

export async function POST(req: NextRequest) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Webhook Error: RAZORPAY_WEBHOOK_SECRET is not defined.');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { adminDb } = getAdminServices();

  try {
    const text = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      console.error('Webhook Error: Missing signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(text);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== signature) {
      console.error('Webhook Error: Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
    
    const data = JSON.parse(text);

    if (data.event === 'payment.captured') {
      const payment = data.payload.payment.entity;
      const requestId = payment.notes.requestId;

      if (!requestId) {
        console.error('Webhook Error: Missing requestId in payment notes');
        return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
      }

      // Generate a random 4-digit PIN
      const tripPin = Math.floor(1000 + Math.random() * 9000).toString();

      // Securely update the document status and add the PIN on the server
      const requestDocRef = adminDb.collection('travelRequests').doc(requestId);
      await requestDocRef.update({ 
          status: 'paid',
          paidAt: admin.firestore.FieldValue.serverTimestamp(), // Add paid timestamp
          tripPin: tripPin // Add the generated Trip PIN
      });
      
      console.log(`Successfully verified, updated request: ${requestId}, and generated Trip PIN.`);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook processing error:', error.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
