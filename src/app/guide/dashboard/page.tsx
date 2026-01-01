
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import content from '@/app/content/guide-dashboard.json';
import { type TravelRequest } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { respondToTravelRequest } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

function IncomingRequests() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const incomingRequestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'travelRequests'),
      where('guideId', '==', user.uid),
      where('status', '==', 'guide-selected')
    );
  }, [user, firestore]);

  const { data: requests, isLoading } = useCollection<TravelRequest>(incomingRequestsQuery);

  const handleResponse = async (requestId: string, response: 'confirmed' | 'declined') => {
    const result = await respondToTravelRequest(requestId, response);
    if (result.success) {
      toast({
        title: `Request ${response === 'confirmed' ? 'Accepted' : 'Declined'}`,
        description: `You have successfully ${response === 'confirmed' ? 'accepted' : 'declined'} the request.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: result.message,
      });
    }
  };

  if (isUserLoading || isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!requests || requests.length === 0) {
    return null; // Don't show the section if there are no requests
  }

  const getRequestTitle = (request: TravelRequest): string => {
    const { purposeData } = request;
    if (!purposeData?.purpose) return 'Untitled Request';

    let title = `${purposeData.purpose.charAt(0).toUpperCase() + purposeData.purpose.slice(1)}`;
    if (purposeData.purpose === 'education' && purposeData.subPurposeData?.subPurpose) {
        title += `: ${purposeData.subPurposeData.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support'}`;
    }
    return title;
};

  return (
    <section aria-labelledby="incoming-requests-heading">
      <h2 id="incoming-requests-heading" className="text-2xl font-semibold tracking-tight mb-4">
        New Incoming Requests
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {requests.map(request => (
          <Card key={request.id} className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle>{getRequestTitle(request)}</CardTitle>
              <CardDescription>
                New request for {request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
                <p><span className="font-semibold">Location:</span> {request.purposeData?.subPurposeData?.collegeAddress?.district || request.purposeData?.subPurposeData?.hospitalAddress?.district || request.purposeData?.subPurposeData?.shoppingArea?.district}</p>
                 <p><span className="font-semibold">Est. Earnings:</span> ₹{request.estimatedCost?.toFixed(2)}</p>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button onClick={() => handleResponse(request.id, 'confirmed')}>Accept</Button>
                <Button variant="outline" onClick={() => handleResponse(request.id, 'declined')}>Decline</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </section>
  );
}


export default function GuideDashboard() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="grid gap-4 md:gap-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-8">
      <h1 className="font-headline text-3xl font-bold">
        {content.welcome.replace('{name}', user.displayName?.split(' ')[0] || 'Guide')}
      </h1>

      <IncomingRequests />

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="available-requests-heading">
          <Card>
            <CardHeader>
              <CardTitle id="available-requests-heading">
                {content.availableRequests.title}
              </CardTitle>
              <CardDescription>
                {content.availableRequests.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                [Available requests will be listed here]
              </p>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="my-requests-heading">
          <Card>
            <CardHeader>
              <CardTitle id="my-requests-heading">
                {content.myRequests.title}
              </CardTitle>
              <CardDescription>{content.myRequests.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                [Accepted requests will be listed here]
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
