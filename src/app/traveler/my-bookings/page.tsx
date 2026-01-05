
'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, Edit, MoreHorizontal, Search, Trash2, KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, doc, deleteDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { format } from 'date-fns';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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
import { AriaLive } from '@/components/ui/aria-live';

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
  onDelete,
}: {
  requests: TravelRequest[] | null;
  emptyMessage: string;
  isLoading: boolean;
  showStatus?: boolean;
  onDelete: (requestId: string) => void;
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
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/traveler/request/${request.id}`}>View Details</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                        <Link href={`/traveler/find-guide/${request.id}`}>
                            <Search className="mr-2 h-4 w-4" />
                            Find Another Guide
                        </Link>
                    </Button>
                     <Button variant="destructive" size="sm" onClick={() => onDelete(request.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
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

    if (isLoading) {
        return <RequestList isLoading={true} requests={null} emptyMessage="" onDelete={() => {}} />;
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
                                <Button asChild>
                                    <Link href={`/traveler/checkout/${request.id}`}>Pay Now (₹{request.estimatedCost?.toFixed(2)})</Link>
                                </Button>
                            ) : (
                               <div className="text-right">
                                    <Badge variant="default" className="bg-green-600 mb-2">Paid & Confirmed</Badge>
                                    {request.tripPin && (
                                        <div className="flex items-center justify-end gap-2 text-sm">
                                            <KeyRound className="h-4 w-4 text-muted-foreground" />
                                            <span>Your Trip PIN:</span>
                                            <span className="font-bold text-lg tracking-wider">{request.tripPin}</span>
                                        </div>
                                    )}
                               </div>
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
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');

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

  const handleDeleteClick = (requestId: string) => {
    setRequestToDelete(requestId);
    setIsAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete || !firestore) return;
    setIsDeleting(true);

    const docRef = doc(firestore, 'travelRequests', requestToDelete);
    try {
        await deleteDoc(docRef);
        toast({
            title: "Request Deleted",
            description: "Your travel request has been successfully deleted.",
        });
        setAriaLiveMessage('Request successfully deleted.');
    } catch (serverError) {
        const permissionError = new FirestorePermissionError({
          path: docRef.path,
          operation: 'delete',
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not delete the request. Please try again.',
        });
        setAriaLiveMessage('Error: Could not delete the request.');
    } finally {
        setIsDeleting(false);
        setIsAlertOpen(false);
        setRequestToDelete(null);
    }
  };

  return (
    <div className="grid gap-6 md:gap-8">
      <AriaLive message={ariaLiveMessage} />
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this travel request. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Yes, delete request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                onDelete={handleDeleteClick}
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
