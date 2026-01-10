
'use server';

import { getUser } from '@/lib/auth';
import { getAdminServices } from '@/lib/firebase-admin';
import { type TravelRequest, type User } from '@/lib/definitions';
import { Timestamp } from 'firebase-admin/firestore';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';
import { RequestDetailsView } from './request-details-view';

const siteName = homeContent.meta.title.split('–')[0].trim();

// A version of TravelRequest where dates can be Timestamps
type ServerTravelRequest = Omit<TravelRequest, 'createdAt' | 'paidAt' | 'submittedAt' | 'acceptedAt'> & {
  createdAt?: Timestamp | string;
  submittedAt?: Timestamp | string;
  acceptedAt?: Timestamp | string;
  paidAt?: Timestamp | string;
};

export async function generateMetadata({ params }: { params: { requestId: string } }): Promise<Metadata> {
  const { adminDb } = getAdminServices();
  const requestSnap = await adminDb.collection('travelRequests').doc(params.requestId).get();
  
  if (!requestSnap.exists) {
    return { title: `Request Not Found | ${siteName}` };
  }
  
  const request = requestSnap.data() as TravelRequest;
  const travelerName = request.travelerData?.name || 'a traveler';
  
  return {
    title: `Request from ${travelerName} | ${siteName}`,
  };
}

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
        createdAt: requestData?.createdAt && typeof (requestData.createdAt as any).toDate === 'function' ? (requestData.createdAt as Timestamp).toDate().toISOString() : requestData.createdAt,
        submittedAt: requestData?.submittedAt && typeof (requestData.submittedAt as any).toDate === 'function' ? (requestData.submittedAt as Timestamp).toDate().toISOString() : requestData.submittedAt,
        acceptedAt: requestData?.acceptedAt && typeof (requestData.acceptedAt as any).toDate === 'function' ? (requestData.acceptedAt as Timestamp).toDate().toISOString() : requestData.acceptedAt,
        paidAt: requestData?.paidAt && typeof (requestData.paidAt as any).toDate === 'function' ? (requestData.paidAt as Timestamp).toDate().toISOString() : requestData.paidAt,
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

  return <RequestDetailsView request={request} userData={userData} />;
}
