
'use client';

import { useMemo } from 'react';
import { ArrowLeft, CheckCircle, Clock, CreditCard, FileText, Loader2, MapPin, Search, User, View, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { respondToTravelRequest } from '@/lib/actions';

function RequestListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
        </div>
    );
}


function InProgressRequests() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const inProgressQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'travelRequests'),
            where('guideId', '==', user.uid),
            where('status', 'in', ['guide-selected', 'confirmed', 'payment-pending'])
        );
    }, [user, firestore]);

    const { data: requests, isLoading } = useCollection<TravelRequest>(inProgressQuery);

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
    
    if (isLoading || isUserLoading) {
        return <RequestListSkeleton />;
    }
    
    if (!requests || requests.length === 0) {
      return (
          <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>New requests and bookings awaiting payment will appear here.</p>
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

    const isAwaitingAction = (status: TravelRequest['status']) => status === 'guide-selected';
    const isAwaitingPayment = (status: TravelRequest['status']) => status === 'confirmed' || status === 'payment-pending';

    return (
      <div className="space-y-4">
        {requests.map(request => (
          <Card key={request.id} className={isAwaitingAction(request.status) ? 'bg-primary/5 border-primary/20' : ''}>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2 space-y-1">
                      <h3 className="font-semibold">{getRequestTitle(request)}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}</span>
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {request.startTime} - {request.endTime}</div>
                           <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {request.purposeData?.subPurposeData?.collegeAddress?.district || request.purposeData?.subPurposeData?.hospitalAddress?.district || request.purposeData?.subPurposeData?.shoppingArea?.district}</div>
                      </div>
                  </div>
                  <div className="sm:text-right flex items-center justify-end gap-2">
                       <Button asChild variant="secondary" size="sm">
                        <Link href={`/traveler/request/${request.id}`}><View className="mr-2 h-4 w-4" /> Details</Link>
                      </Button>
                  </div>
              </CardContent>
              {isAwaitingAction(request.status) && (
                <CardFooter className="flex gap-2">
                    <Button onClick={() => handleResponse(request.id, 'confirmed')}><CheckCircle className="mr-2 h-4 w-4" /> Accept</Button>
                    <Button variant="outline" onClick={() => handleResponse(request.id, 'declined')}><X className="mr-2 h-4 w-4" />Decline</Button>
                </CardFooter>
              )}
               {isAwaitingPayment(request.status) && (
                <CardFooter>
                    <div className="flex items-center justify-start gap-2 text-amber-600 font-semibold text-sm">
                        {request.status === 'payment-pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        <span>Awaiting payment from {request.travelerData?.name || 'traveler'}</span>
                    </div>
                </CardFooter>
              )}
          </Card>
        ))}
      </div>
  );
}

function UpcomingRequests() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    const upcomingQuery = useMemoFirebase(() => {
        if (!user || !firestore) return null;
        return query(
            collection(firestore, 'travelRequests'),
            where('guideId', '==', user.uid),
            where('status', '==', 'confirmed'),
            where('paidAt', '!=', null)
        );
    }, [user, firestore]);

     const { data: requests, isLoading } = useCollection<TravelRequest>(upcomingQuery);

     if (isLoading || isUserLoading) {
        return <RequestListSkeleton />;
    }
    
    if (!requests || requests.length === 0) {
      return (
          <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>Your upcoming paid bookings will appear here.</p>
          </div>
      );
    }
    
    return (
        <div className="space-y-4">
        {requests.map(request => (
            <Card key={request.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex-grow space-y-1">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={request.travelerData?.photoURL} alt={request.travelerData?.name} />
                                <AvatarFallback>{request.travelerData?.name?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{request.travelerData?.name || 'Traveler'}</span>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                           <span>
                             {request.purposeData?.subPurposeData?.collegeAddress?.district || 
                                request.purposeData?.subPurposeData?.hospitalAddress?.district || 
                                request.purposeData?.subPurposeData?.shoppingArea?.district}
                           </span>
                        </div>
                    </div>
                    <div className="text-right">
                       <p className="font-semibold">{request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}</p>
                       <p className="text-sm text-muted-foreground">{request.startTime} - {request.endTime}</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <Badge className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="mr-1 h-3 w-3" /> Paid</Badge>
                        <Button asChild variant="secondary" size="sm">
                            <Link href={`/traveler/request/${request.id}`}><View className="mr-2 h-4 w-4" /> Details</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ))}
        </div>
    );
}

export default function MyGuideRequestsPage() {
  const router = useRouter();

  return (
    <div className="grid gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Requests</h1>
        <Button variant="outline" onClick={() => router.push('/guide/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
      </div>

        <Tabs defaultValue="inprogress">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="inprogress">In Progress</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="inprogress" className="mt-4">
                <InProgressRequests />
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
                <UpcomingRequests />
            </TabsContent>
            <TabsContent value="past" className="mt-4">
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>Your completed trips will be listed here.</p>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
