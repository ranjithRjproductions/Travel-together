

'use client';

import { useMemo, useState, useEffect } from 'react';
import { ArrowLeft, Edit, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc, updateDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

function GuideInfo({ guideData }: { guideData?: Partial<UserData> }) {
    if (!guideData) {
        return <Skeleton className="h-5 w-24" />;
    }
    return <span className="font-semibold">{guideData.name}</span>;
}

function RequestList({
  requests,
  emptyMessage,
  isLoading,
  showStatus,
}: {
  requests: TravelRequest[] | null;
  emptyMessage: string;
  isLoading: boolean;
  showStatus?: boolean;
}) {

  if (isLoading) {
      return (
          <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                  <Card key={i}><CardContent className="p-4"><Skeleton className="h-8 w-full" /></CardContent></Card>
              ))}
          </div>
      );
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const formatCreationDate = (createdAt: any) => {
    if (!createdAt) return '...';
    if (createdAt && typeof createdAt.toDate === 'function') {
      return format(createdAt.toDate(), 'PP');
    }
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return format(d, 'PP');
    } catch (e) {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (status: TravelRequest['status']) => {
    switch(status) {
        case 'pending': return <Badge variant="secondary">Finding Guides</Badge>;
        case 'guide-selected': return <Badge variant="secondary">Waiting for Guide</Badge>;
        case 'confirmed': return <Badge variant="default" className="bg-amber-500">Payment Pending</Badge>;
        case 'paid': return <Badge variant="default" className="bg-green-600">Paid & Confirmed</Badge>;
        default: return null;
    }
  };


  return (
    <div className="space-y-4">
      {requests.map(request => (
        <Card key={request.id}>
            <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                 <div className="flex-grow">
                    <h3 className="font-semibold capitalize">
                        {request.purposeData?.purpose} Request for {request.purposeData?.subPurposeData?.collegeAddress?.district || request.purposeData?.subPurposeData?.hospitalAddress?.district || request.purposeData?.subPurposeData?.shoppingArea?.district}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Submitted on {formatCreationDate(request.createdAt)}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    {showStatus && getStatusBadge(request.status)}
                    <Button asChild variant="secondary">
                      <Link href={`/traveler/request/${request.id}`}>View Details</Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={`/traveler/find-guide/${request.id}`}>
                            <Search className="mr-2 h-4 w-4" />
                            Find Another Guide
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UpcomingRequestList({
  requests,
  isLoading,
}: {
  requests: TravelRequest[] | null;
  isLoading: boolean;
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handlePayment = async (request: TravelRequest) => {
        if (!firestore || !user || !request.estimatedCost) return;

        const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
            console.error("Razorpay Key ID is not configured.");
            toast({
                title: "Payment Error",
                description: "Payment gateway is not configured. Please contact support.",
                variant: 'destructive'
            });
            return;
        }

        const options = {
            key: razorpayKeyId,
            amount: request.estimatedCost * 100, // Amount in paise
            currency: "INR",
            name: "Let's Travel Together",
            description: `Payment for ${request.purposeData?.purpose} request`,
            image: "/logo.png", // URL to your app logo
            order_id: "", // Optional: Can be used if you create orders on your server
            handler: async function (response: any) {
                const requestRef = doc(firestore, 'travelRequests', request.id);
                try {
                    await updateDoc(requestRef, { status: 'paid' });
                    toast({
                        title: 'Payment Successful!',
                        description: 'Your booking is now fully confirmed.',
                    });
                } catch (error) {
                     console.error('Firestore update failed after payment:', error);
                    toast({
                        title: 'Update Failed',
                        description: 'Payment was successful but we failed to update your booking. Please contact support.',
                        variant: 'destructive',
                    });
                }
            },
            prefill: {
                name: user.displayName || "",
                email: user.email || "",
                contact: "", // You can prefill contact from user profile if available
            },
            notes: {
                requestId: request.id,
                travelerId: request.travelerId,
            },
            theme: {
                color: "#3b82f6" // Primary color
            }
        };
        
        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.open();
    };

    if (isLoading) {
        return <RequestList isLoading={true} requests={null} emptyMessage="" />;
    }

    if (!requests || requests.length === 0) {
        return (
            <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>Your confirmed bookings with assigned guides will appear here.</p>
            </div>
        );
    }
    
    return (
        <div className="space-y-4">
            {requests.map(request => (
                <Card key={request.id}>
                    <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <div className="flex-grow">
                            <h3 className="font-semibold capitalize flex items-center gap-2">
                                {request.purposeData?.purpose} with <GuideInfo guideData={request.guideData} />
                            </h3>
                             <p className="text-sm text-muted-foreground">
                                {request.requestedDate ? format(new Date(request.requestedDate), 'PPPP') : 'Date not set'}
                            </p>
                        </div>
                         <div className="flex items-center gap-4">
                            {request.status === 'confirmed' ? (
                                <Button onClick={() => handlePayment(request)}>Pay Now (₹{request.estimatedCost?.toFixed(2)})</Button>
                            ) : (
                                <Badge variant="default" className="bg-green-600">Paid & Confirmed</Badge>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}


export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();
  const [previousInProgress, setPreviousInProgress] = useState<TravelRequest[]>([]);

  const inProgressRequestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'travelRequests'),
      where('travelerId', '==', user.uid),
      where('status', 'in', ['pending', 'guide-selected'])
    );
  }, [user, firestore]);

  const { data: inProgressRequests, isLoading: inProgressLoading } = useCollection<TravelRequest>(inProgressRequestsQuery);

  const upcomingRequestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'travelRequests'),
      where('travelerId', '==', user.uid),
      where('status', 'in', ['confirmed', 'paid'])
    );
  }, [user, firestore]);

  const { data: upcomingRequests, isLoading: upcomingLoading } = useCollection<TravelRequest>(upcomingRequestsQuery);

  useEffect(() => {
    if (inProgressLoading || !inProgressRequests) return;

    // Check if a request that was 'guide-selected' is now 'pending'
    const declinedRequest = previousInProgress.find(prev => 
      prev.status === 'guide-selected' &&
      inProgressRequests.some(current => current.id === prev.id && current.status === 'pending')
    );

    if (declinedRequest) {
      router.push(`/traveler/find-guide/${declinedRequest.id}`);
    }

    setPreviousInProgress(inProgressRequests);
  }, [inProgressRequests, inProgressLoading, previousInProgress, router]);


  return (
    <div className="grid gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Bookings</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/traveler/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="inprogress">In Progress</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
             <TabsContent value="upcoming" className="mt-4">
                <UpcomingRequestList requests={upcomingRequests} isLoading={upcomingLoading} />
            </TabsContent>
            <TabsContent value="inprogress" className="mt-4">
               <RequestList
                requests={inProgressRequests}
                isLoading={inProgressLoading}
                emptyMessage="Requests that are awaiting guide acceptance will appear here."
                showStatus={true}
              />
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>
                  Your completed trips will be listed here, where you can rate
                  your guide.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
