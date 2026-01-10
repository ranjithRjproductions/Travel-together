
'use client';

import { useRouter } from 'next/navigation';
import { type TravelRequest, type User } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Step5Review } from '@/app/traveler/request/[requestId]/step5-review';

export function RequestDetailsView({ request, userData }: { request: TravelRequest, userData: User }) {
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
}
