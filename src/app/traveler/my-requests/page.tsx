'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  errorEmitter,
} from '@/firebase';
import {
  collection,
  query,
  where,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import { redirect } from 'next/navigation';
import { ArrowLeft, Edit, MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type TravelRequest } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  emptyMessage,
  onDelete,
}: {
  requests: TravelRequest[];
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
    // Fallback for string dates
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        return formatDistanceToNow(date, { addSuffix: true });
      }
    } catch (e) { /* ignore invalid date strings */ }

    return 'a while ago';
  };
  
  return (
    <div className="space-y-4">
      {requests.map((request, index) => (
            <Card key={request.id}>
              <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex-grow">
                  <h3 className="font-semibold capitalize">
                      Draft {index + 1} of {requests.length}
                  </h3>
                   <p className="text-sm text-muted-foreground">
                      Created {formatCreationDate(request.createdAt)}
                  </p>
                </div>
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
              </CardContent>
            </Card>
      ))}
    </div>
  );
}

export default function MyRequestsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');

  const requestsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'travelRequests'),
      where('travelerId', '==', user.uid),
      where('status', '==', 'draft')
    );
  }, [user, firestore]);

  const { data: draftRequests, isLoading: isRequestsLoading } =
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

  return (
    <div className="grid gap-6 md:gap-8">
      <AriaLive message={ariaLiveMessage} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">Draft Requests</h1>
         <Button variant="outline" onClick={() => router.push('/traveler/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
            {isRequestsLoading ? (
            <RequestListSkeleton />
            ) : (
            <RequestList
                requests={draftRequests || []}
                emptyMessage="You have no draft requests."
                onDelete={handleDeleteRequest}
            />
            )}
        </CardContent>
      </Card>
    </div>
  );
}
