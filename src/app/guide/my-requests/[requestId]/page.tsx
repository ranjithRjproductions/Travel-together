
'use client';

import { getAdminServices } from '@/lib/firebase-admin';
import { notFound, redirect } from 'next/navigation';
import { type TravelRequest, type User } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Step5Review } from '@/app/traveler/request/[requestId]/step5-review';
import { getUser } from '@/lib/auth';
import { Timestamp } from 'firebase-admin/firestore';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';
import { useRouter } from 'next/navigation';


// This is a Firestore server-side Timestamp
interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
  toDate(): Date;
}

// A version of TravelRequest where dates can be Timestamps
type ServerTravelRequest = Omit<TravelRequest, 'createdAt' | 'paidAt' | 'submittedAt' | 'acceptedAt'> & {
  createdAt?: FirestoreTimestamp | string;
  submittedAt?: FirestoreTimestamp | string;
  acceptedAt?: FirestoreTimestamp | string;
  paidAt?: FirestoreTimestamp | string;
};


async function getRequestAndUserData(requestId: string): Promise<{ request: TravelRequest, userData: User } | null> {
    const { adminDb } = getAdminServices();

    const requestRef = adminDb.collection('travelRequests').doc(requestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
        return null;
    }

    const requestData = requestSnap.data() as ServerTravelRequest;
    const request: TravelRequest = {
        id: requestSnap.id,
        ...requestData,
        createdAt: requestData?.createdAt && typeof (requestData.createdAt as any).toDate === 'function' ? (requestData.createdAt as FirestoreTimestamp).toDate().toISOString() : requestData.createdAt,
        submittedAt: requestData?.submittedAt && typeof (requestData.submittedAt as any).toDate === 'function' ? (requestData.submittedAt as FirestoreTimestamp).toDate().toISOString() : requestData.submittedAt,
        acceptedAt: requestData?.acceptedAt && typeof (requestData.acceptedAt as any).toDate === 'function' ? (requestData.acceptedAt as FirestoreTimestamp).toDate().toISOString() : requestData.acceptedAt,
        paidAt: requestData?.paidAt && typeof (requestData.paidAt as any).toDate === 'function' ? (requestData.paidAt as FirestoreTimestamp).toDate().toISOString() : requestData.paidAt,
    } as TravelRequest;
    
    if (!request.travelerId) {
        return null;
    }

    const userRef = adminDb.collection('users').doc(request.travelerId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        return null;
    }

    const rawUserData = userSnap.data() as User & { createdAt?: Timestamp };

    const userData: User = {
        ...rawUserData,
        uid: userSnap.id,
        // @ts-ignore
        createdAt: rawUserData.createdAt?.toDate?.().toISOString() || null,
    };
    
    return { request, userData };
}

// Since we're moving this to a client component, we can no longer use generateMetadata.
// We can handle the title update on the client if needed, or set a generic one in the layout.
// For now, let's rely on the layout for a generic title.

export default async function GuideRequestViewPage({ params }: { params: { requestId: string } }) {
  const sessionUser = await getUser();
  if (!sessionUser || sessionUser.role !== 'Guide') {
    redirect('/login');
  }

  const data = await getRequestAndUserData(params.requestId);

  if (!data) {
    notFound();
  }

  const { request, userData } = data;
  
  if (request.guideId !== sessionUser.uid) {
    redirect('/guide/my-requests');
  }

  // The rendering logic remains the same, but it will be inside a Client Component wrapper now.
  // We can't use useRouter at the top level of a Server Component.
  const ClientPage = () => {
    const router = useRouter();
    return (
      <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
        <div className="flex justify-end items-center mb-6">
          <Button variant="outline" onClick={() => router.push('/guide/my-requests')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Requests
          </Button>
        </div>

        <div className="max-w-2xl mx-auto">
          <Step5Review request={request} userData={userData} userRole="guide" />
        </div>
      </main>
    );
  };

  return <ClientPage />;
}
