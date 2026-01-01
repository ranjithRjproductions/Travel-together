
'use client';

import { useMemo } from 'react';
import { ArrowLeft, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { type TravelRequest } from '@/lib/definitions';
import { format } from 'date-fns';
import Link from 'next/link';

function RequestList({
  requests,
  emptyMessage,
  isLoading
}: {
  requests: TravelRequest[] | null;
  emptyMessage: string;
  isLoading: boolean;
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
    // Firestore Timestamps have a toDate() method.
    if (createdAt && typeof createdAt.toDate === 'function') {
      return format(createdAt.toDate(), 'PP');
    }
    // Fallback for ISO string dates
    try {
      const d = new Date(createdAt);
      if (isNaN(d.getTime())) return 'Invalid Date';
      return format(d, 'PP');
    } catch (e) {
      return 'Invalid date';
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
                <Button asChild variant="outline">
                  <Link href={`/traveler/request/${request.id}`}>View Details</Link>
                </Button>
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

  // This will be used later for guides who have accepted.
  // const upcomingRequestsQuery = useMemoFirebase(() => {
  //   if (!user || !firestore) return null;
  //   return query(
  //     collection(firestore, 'travelRequests'),
  //     where('travelerId', '==', user.uid),
  //     where('status', '==', 'confirmed')
  //   );
  // }, [user, firestore]);

  // const { data: upcomingRequests, isLoading: upcomingLoading } = useCollection<TravelRequest>(upcomingRequestsQuery);


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
          <Tabs defaultValue="inprogress">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inprogress">In Progress</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="inprogress" className="mt-4">
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>
                  Requests that are awaiting guide acceptance will appear here.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>
                  Your confirmed bookings with assigned guides will appear here.
                </p>
              </div>
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
