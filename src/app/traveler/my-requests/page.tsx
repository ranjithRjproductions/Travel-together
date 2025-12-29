
'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
} from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { PlusCircle, Edit, View } from 'lucide-react';
import Link from 'next/link';
import { type TravelRequest } from '@/lib/definitions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

function RequestListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-10 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RequestList({
  requests,
  isDraft,
  emptyMessage,
}: {
  requests: TravelRequest[];
  isDraft: boolean;
  emptyMessage: string;
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Helper function to safely format the date
  const formatCreationDate = (createdAt: any) => {
    if (!createdAt) {
      return 'just now';
    }
    // Firestore timestamps have a toDate() method
    if (typeof createdAt.toDate === 'function') {
      return formatDistanceToNow(createdAt.toDate(), { addSuffix: true });
    }
    // Handle ISO strings or other date formats
    const date = new Date(createdAt);
    if (!isNaN(date.getTime())) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return 'a while ago';
  };

  const getStatusVariant = (
    status: TravelRequest['status']
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'confirmed':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'cancelled':
        return 'destructive';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id}>
          <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex-grow">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold capitalize">
                  {request.purposeData?.purpose || 'Untitled Request'}
                </h3>
                <Badge variant={getStatusVariant(request.status)}>
                  {request.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Created {formatCreationDate(request.createdAt)}
              </p>
            </div>
            <Button asChild>
              <Link href={`/traveler/request/${request.id}`}>
                {isDraft ? <Edit /> : <View />}
                {isDraft ? 'Continue' : 'View'}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MyRequestsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const requestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'travelRequests'),
      where('travelerId', '==', user.uid)
    );
  }, [user, firestore]);

  const { data: requests, isLoading: isRequestsLoading } =
    useCollection<TravelRequest>(requestsQuery);

  if (isUserLoading) {
    return (
      <div className="grid gap-4 md:gap-8">
        <Skeleton className="h-10 w-64" />
        <RequestListSkeleton />
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  const draftRequests = requests?.filter((r) => r.status === 'draft') || [];
  const upcomingRequests =
    requests?.filter(
      (r) => r.status !== 'draft' && r.status !== 'completed' && r.status !== 'cancelled'
    ) || [];
  const pastRequests =
    requests?.filter(
      (r) => r.status === 'completed' || r.status === 'cancelled'
    ) || [];

  return (
    <div className="grid gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Travel Requests</h1>
        <Button asChild size="lg">
          <Link href="/traveler/request/create">
            <PlusCircle aria-hidden="true" /> Create a New Request
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="drafts">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="drafts" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={draftRequests}
                  isDraft={true}
                  emptyMessage="You have no draft requests."
                />
              )}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={upcomingRequests}
                  isDraft={false}
                  emptyMessage="You have no upcoming requests."
                />
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={pastRequests}
                  isDraft={false}
                  emptyMessage="You have no past requests."
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
