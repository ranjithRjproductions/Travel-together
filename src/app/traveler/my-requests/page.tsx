
'use client';

import { useState } from 'react';
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
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { AriaLive } from '@/components/ui/aria-live';

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
  listType: 'draft' | 'upcoming' | 'past';
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
  
  const getRequestDetails = (request: TravelRequest): string => {
      const { purposeData } = request;
      if (!purposeData?.purpose) return 'Untitled Request';
      
      switch (purposeData.purpose) {
        case 'education':
          return `Education at ${purposeData.subPurposeData?.collegeName || 'institute'}`;
        case 'hospital':
          return `Visit to ${purposeData.subPurposeData?.hospitalName || 'hospital'}`;
        case 'shopping':
          return `Shopping in ${purposeData.subPurposeData?.shoppingArea?.area || purposeData.subPurposeData?.shopAddress?.district || 'area'}`;
        default:
          return 'General Request';
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
                  {getRequestDetails(request)}
                </h3>
                 <Badge variant={getStatusVariant(request.status)}>
                  {request.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Created {formatCreationDate(request.createdAt)}
              </p>
            </div>

            {listType === 'draft' ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More options</span>
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
                   <View className="mr-2 h-4 w-4" /> View
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function MyRequestsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
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

  const handleDeleteRequest = async () => {
    if (!requestToDelete || !firestore) return;
    try {
      await deleteDoc(doc(firestore, 'travelRequests', requestToDelete));
      toast({
        title: 'Draft Deleted',
        description: 'Your travel request draft has been successfully deleted.',
      });
      setAriaLiveMessage('Draft successfully deleted.');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not delete the draft. Please try again.',
      });
      setAriaLiveMessage('Error: Could not delete draft.');
    } finally {
      setRequestToDelete(null);
    }
  };

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
      <AriaLive message={ariaLiveMessage} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Travel Requests</h1>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="drafts">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="drafts">Drafts ({draftRequests.length})</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="drafts" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={draftRequests}
                  listType="draft"
                  emptyMessage="You have no draft requests."
                  onDelete={setRequestToDelete}
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
                  onDelete={setRequestToDelete}
                />
              )}
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              {isRequestsLoading ? (
                <RequestListSkeleton />
              ) : (
                <RequestList
                  requests={pastRequests}
                  listType="past"
                  emptyMessage="You have no past requests."
                  onDelete={setRequestToDelete}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <AlertDialog open={!!requestToDelete} onOpenChange={(open) => !open && setRequestToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this travel request draft.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRequest} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
