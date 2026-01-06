
'use client';

import { useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { redirect } from 'next/navigation';
import content from '@/app/content/guide-dashboard.json';
import { type TravelRequest, type User as UserProfile } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import { respondToTravelRequest } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, CreditCard, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';


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
  
  const getLocationInfo = (request: TravelRequest) => {
    const { purposeData } = request;
    if (!purposeData) return null;

    switch (purposeData.purpose) {
      case 'education':
        return { label: 'College', name: purposeData.subPurposeData?.collegeName, district: purposeData.subPurposeData?.collegeAddress?.district };
      case 'hospital':
        return { label: 'Hospital', name: purposeData.subPurposeData?.hospitalName, district: purposeData.subPurposeData?.hospitalAddress?.district };
      case 'shopping':
        if (purposeData.subPurposeData?.shopType === 'particular') {
            return { label: 'Shop', name: purposeData.subPurposeData?.shopName, district: purposeData.subPurposeData?.shopAddress?.district };
        }
        return { label: 'Area', name: purposeData.subPurposeData?.shoppingArea?.area, district: purposeData.subPurposeData?.shoppingArea?.district };
      default:
        return null;
    }
  };

  return (
    <section aria-labelledby="incoming-requests-heading">
      <h2 id="incoming-requests-heading" className="text-2xl font-semibold tracking-tight mb-4">
        New Incoming Requests
      </h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {requests.map(request => {
            const locationInfo = getLocationInfo(request);
            return (
              <Card key={request.id} className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle>{getRequestTitle(request)}</CardTitle>
                  <CardDescription>
                    New request for {request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    {locationInfo && (
                        <p><span className="font-semibold">{locationInfo.label}:</span> {locationInfo.name}, {locationInfo.district}</p>
                    )}
                     <p><span className="font-semibold">Time:</span> {request.startTime} - {request.endTime}</p>
                     <p><span className="font-semibold">Est. Earnings:</span> ₹{request.estimatedCost?.toFixed(2)}</p>
                </CardContent>
                <CardFooter className="flex gap-2">
                    <Button onClick={() => handleResponse(request.id, 'confirmed')}>Accept</Button>
                    <Button variant="outline" onClick={() => handleResponse(request.id, 'declined')}>Decline</Button>
                </CardFooter>
              </Card>
            );
        })}
      </div>
    </section>
  );
}

function RequestTravelerInfo({ travelerData, status, paidAt }: { travelerData: Partial<UserProfile> | undefined, status: TravelRequest['status'], paidAt: any }) {
    if (!travelerData) {
        return <Skeleton className="h-10 w-32" />;
    }

    if (status === 'confirmed' && !paidAt) {
        return (
            <div className="text-right">
                 <div className="flex items-center justify-end gap-2 text-amber-600">
                    <CreditCard className="h-4 w-4" />
                    <span className="font-semibold">Payment Pending</span>
                </div>
                <p className="text-xs text-muted-foreground">from {travelerData.name}</p>
            </div>
        );
    }
    
    if (status === 'confirmed' && paidAt) {
        const initials = travelerData.name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
        return (
            <div>
                 <div className="flex items-center justify-end gap-2 text-green-600 font-semibold">
                    <CheckCircle className="h-4 w-4" />
                    <span>Paid & Confirmed</span>
                </div>
                <div className="flex items-center justify-end gap-2 mt-2">
                    <span className="font-medium">{travelerData.name}</span>
                     <Avatar className="h-8 w-8">
                        <AvatarImage src={travelerData.photoURL} alt={travelerData.photoAlt || `Photo of ${travelerData.name}`} />
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                </div>
            </div>
        );
    }

    if (status === 'payment-pending') {
        return (
            <Button disabled variant="secondary">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Payment...
            </Button>
        )
    }

     return <Badge variant="outline">{status}</Badge>;
}

function ConfirmedRequests() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const confirmedRequestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'travelRequests'),
      where('guideId', '==', user.uid),
      where('status', 'in', ['confirmed', 'payment-pending'])
    );
  }, [user, firestore]);

  const { data: requests, isLoading } = useCollection<TravelRequest>(confirmedRequestsQuery);
  
  if (isLoading || isUserLoading) {
      return (
          <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
          </div>
      );
  }

  if (!requests || requests.length === 0) {
      return (
          <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>Your accepted requests will appear here.</p>
          </div>
      );
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
      <div className="space-y-4">
        {requests.map(request => (
          <Card key={request.id}>
              <CardContent className="p-4 grid sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2 space-y-1">
                      <h3 className="font-semibold">{getRequestTitle(request)}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}</span>
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {request.startTime} - {request.endTime}</div>
                           <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {request.purposeData?.subPurposeData?.collegeAddress?.district || request.purposeData?.subPurposeData?.hospitalAddress?.district || request.purposeData?.subPurposeData?.shoppingArea?.district}</div>
                      </div>
                  </div>
                  <div className="sm:text-right">
                      <RequestTravelerInfo travelerData={request.travelerData} status={request.status} paidAt={request.paidAt} />
                  </div>
              </CardContent>
          </Card>
        ))}
      </div>
  );

}


export default function GuideDashboard() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isUserLoading = isAuthLoading || isProfileLoading;

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
        {userProfile?.name ? `Welcome back, ${userProfile.name.split(' ')[0]}!` : content.pageTitle}
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
                {content.availableRequests.description} (Feature coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                 <p>A marketplace for available requests will appear here.</p>
              </div>
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
                <ConfirmedRequests />
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
