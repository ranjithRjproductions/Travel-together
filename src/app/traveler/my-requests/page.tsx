'use client';

import { useState } from 'react';
import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useCollection,
  useFirestore,
  useUser,
  useMemoFirebase,
  FirestorePermissionError,
  errorEmitter
} from '@/firebase';
import {
  collection,
  query,
  where,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { Edit, MoreHorizontal, Trash2, View } from 'lucide-react';
import Link from 'next/link';
import { type TravelRequest } from '@/lib/definitions';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AriaLive } from '@/components/ui/aria-live';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `My Travel Requests | ${siteName}`,
};

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
  listType,
  emptyMessage,
  onDelete,
}: {
  requests: TravelRequest[];
  listType: 'draft' | 'upcoming';
  emptyMessage: string;
  onDelete: (id: string) => void;
}) {
  if (requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const formatCreationDate = (createdAt: any) => {
    if (!createdAt) {
      return 'just now';
    }
    // Check if it's a Firestore Timestamp and convert it
    if (typeof createdAt.toDate === 'function') {
      return formatDistanceToNow(createdAt.toDate(), { addSuffix: true });
    }
    // Fallback for string dates, though Firestore Timestamps are preferred
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    } catch (e) { /* ignore invalid date strings */ }

    // If all else fails, provide a generic fallback
    return 'a while ago';
  };
  
   const getRequestDetails = (request: TravelRequest): { title: string, subtitle: string } => {
      const { purposeData } = request;
      if (!purposeData?.purpose) return { title: 'Untitled Request', subtitle: 'No details provided' };
      
      switch (purposeData.purpose) {
        case 'education':
          return {
            title: `Education: ${purposeData.subPurposeData?.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support'}`,
            subtitle: `${purposeData.subPurposeData?.collegeName || 'Institute'}`,
          };
        case 'hospital':
           return {
            title: 'Hospital Visit',
            subtitle: `${purposeData.subPurposeData?.hospitalName || 'Hospital'}`,
          };
        case 'shopping':
          return {
            title: 'Shopping Assistance',
            subtitle: `In ${purposeData.subPurposeData?.shoppingArea?.area || purposeData.subPurposeData?.shopAddress?.district || 'area'}`,
          };
        default:
          return { title: 'General Request', subtitle: 'Details not available'};
      }
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

  const statusText: Record<TravelRequest['status'], string> = {
    draft: 'Draft',
    pending: 'Waiting for Approval',
    confirmed: 'Guide Assigned',
    completed: 'Completed',
    cancelled: 'Cancelled'
  }

  return (
    <div className="space-y-4">
      {requests.map((request, index) => {
          const { title, subtitle } = getRequestDetails(request);
          return (
            <Card key={request.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold capitalize">
                        {listType === 'draft' ? `Draft ${index + 1} of ${requests.length}` : title}
                    </h3>
                    {listType === 'upcoming' && (
                        <Badge variant={getStatusVariant(request.status)}>
                            <span className="sr-only">Status: </span>
                            {statusText[request.status]}
                        </Badge>
                    )}
                  </div>
                   <p className="text-sm text-muted-foreground">
                    {listType === 'draft' ? 
                      `Created ${formatCreationDate(request.createdAt)}` :
                      `${subtitle} on ${request.requestedDate ? format(new Date(request.requestedDate), 'MMM d, yyyy') : 'date not set'}`
                    }
                  </p>
                </div>

                {listType === 'draft' ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`More options for draft created ${formatCreationDate(request.createdAt)}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/traveler/request/${request.id}`} className="cursor-pointer">
                          <Edit className="mr-2 h-4 w-4" />
                          Continue
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(request.id)} className="text-destructive cursor-pointer">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button asChild>
                    <Link href={`/traveler/request/${request.id}`}>
                       <View className="mr-2 h-4 w-4" /> View Request
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          );
      })}
    </div>
  );
}

export default function MyRequestsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');

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

  const handleDeleteRequest = (requestId: string) => {
    if (!requestId || !firestore) return;

    const docRef = doc(firestore, 'travelRequests', requestId);
    
    deleteDoc(docRef)
      .then(() => {
        toast({
          title: 'Draft Deleted',
          description: 'Your travel request draft has been successfully deleted.',
        });
        setAriaLiveMessage('Draft successfully deleted.');
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not delete the draft. Please try again.',
        });
        setAriaLiveMessage('Error: Could not delete draft.');
      });
  };

  const draftRequests = requests?.filter((r) => r.status === 'draft') || [];
  const upcomingRequests =
    requests?.filter(
      (r) => r.status === 'pending' || r.status === 'confirmed'
    ) || [];

  return (
    <div className="grid gap-6 md:gap-8">
      <AriaLive message={ariaLiveMessage} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Travel Requests</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="drafts">Drafts ({draftRequests.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming ({upcomingRequests.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="drafts" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={draftRequests}
                  listType="draft"
                  emptyMessage="You have no draft requests."
                  onDelete={handleDeleteRequest}
                />
              )}
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={upcomingRequests}
                  listType="upcoming"
                  emptyMessage="You have no upcoming requests."
                  onDelete={handleDeleteRequest}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
