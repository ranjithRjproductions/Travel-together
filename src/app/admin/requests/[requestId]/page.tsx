
'use server';

import { getAdminServices } from '@/lib/firebase-admin';
import { notFound, redirect } from 'next/navigation';
import { type TravelRequest, type User } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Step5Review } from '@/app/traveler/request/[requestId]/step5-review';
import { getUser } from '@/lib/auth';

// This is a Server Component responsible for securely fetching and displaying
// a travel request for an administrator.

async function getRequestAndUserData(requestId: string): Promise<{ request: TravelRequest, userData: User } | null> {
    const { adminDb } = getAdminServices();

    const requestRef = adminDb.collection('travelRequests').doc(requestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
        return null;
    }

    // Since Timestamps are not serializable, we convert them immediately.
    const requestData = requestSnap.data();
    const request: TravelRequest = {
        id: requestSnap.id,
        ...requestData,
        createdAt: requestData?.createdAt?.toDate()?.toISOString() || null,
        submittedAt: requestData?.submittedAt?.toDate()?.toISOString() || null,
        acceptedAt: requestData?.acceptedAt?.toDate()?.toISOString() || null,
        paidAt: requestData?.paidAt?.toDate()?.toISOString() || null,
    } as TravelRequest;
    
    if (!request.travelerId) {
        return null;
    }

    const userRef = adminDb.collection('users').doc(request.travelerId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
        return null;
    }

    const userData = userSnap.data() as User;
    
    return { request, userData };
}

export default async function AdminRequestViewPage({ params }: { params: { requestId: string } }) {
  // Gatekeeping: Ensure only admins can access this page.
  // This uses the secure, server-side `getUser` helper.
  const sessionUser = await getUser();
  if (!sessionUser?.isAdmin) {
    redirect('/login');
  }

  const data = await getRequestAndUserData(params.requestId);

  if (!data) {
    notFound();
  }

  const { request, userData } = data;

  return (
    <main id="main-content" className="flex-grow container mx-auto px-4 md:px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Admin View: Travel Request
        </h1>
        <Button asChild variant="outline">
          <Link href="/admin/users/travelers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
      </div>

      <div className="max-w-2xl mx-auto">
        <Step5Review request={request} userData={userData} />
      </div>
    </main>
  );
}

    