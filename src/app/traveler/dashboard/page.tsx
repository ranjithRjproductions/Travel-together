
'use client';

import { useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useDoc, useFirestore, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { useRouter } from 'next/navigation';
import content from '@/app/content/traveler-dashboard.json';
import { PlusCircle, BookMarked, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { type TravelRequest, type User as UserProfile } from '@/lib/definitions';
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
import { doc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { createDraftRequest } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';


function DashboardSkeleton() {
  return (
    <div className="grid gap-6 md:gap-8">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}

export default function TravelerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const isLoading = isUserLoading || isProfileLoading;

  const checkProfileCompleteness = (profile: UserProfile | null | undefined): { complete: boolean, reason: string } => {
    if (!profile) return { complete: false, reason: 'Profile data could not be loaded.' };
    
    if (!profile.name || !profile.gender || !profile.photoURL) {
        return { complete: false, reason: 'Please complete your basic profile information, including your name, gender, and photo.' };
    }
    if (!profile.contact) {
        return { complete: false, reason: 'Please add your contact details.' };
    }
    if (!profile.address) {
        return { complete: false, reason: 'Please add an address.' };
    }
    if (!profile.address.isDefault) {
        return { complete: false, reason: 'Please make sure at least one address is set as your primary/default address.' };
    }
    if (!profile.hasOwnProperty('disability')) {
        return { complete: false, reason: 'Please complete the disability disclosure section.' };
    }
    
    return { complete: true, reason: '' };
  };
  
  const handleCreateRequestClick = async () => {
    const { complete, reason } = checkProfileCompleteness(userProfile);
    if (!complete) {
      setAlertMessage(reason || 'Please make sure all your profile settings are complete before creating a request. This helps us find the perfect guide for your needs.');
      setIsAlertOpen(true);
      return;
    }

    setIsCreatingRequest(true);
    
    const authResult = await createDraftRequest();

    if (authResult.success && authResult.travelerId && firestore) {
        const dataToCreate = {
            travelerId: authResult.travelerId,
            status: 'draft' as const,
            createdAt: serverTimestamp(),
            step1Complete: false,
            step2Complete: false,
            step3Complete: false,
            step4Complete: false,
        };

        try {
            const newRequestRef = await addDoc(collection(firestore, 'travelRequests'), dataToCreate);
            router.push(`/traveler/request/${newRequestRef.id}`);
        } catch (serverError: any) {
            const contextualError = new FirestorePermissionError({
                path: `travelRequests`, // Path of the collection we are writing to
                operation: 'create',
                requestResourceData: dataToCreate
            });
            errorEmitter.emit('permission-error', contextualError);

            toast({
                variant: "destructive",
                title: "Permission Error",
                description: "You do not have permission to create a new request. This might be a temporary issue, please try again.",
            });
            setIsCreatingRequest(false);
        }
    } else {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: authResult.message || "Could not verify your identity to create a request.",
        });
        setIsCreatingRequest(false);
    }
  };

  if (isLoading || !userProfile) {
    return <DashboardSkeleton />;
  }

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Your Profile</AlertDialogTitle>
            <AlertDialogDescription>
             {alertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction asChild>
              <Link href="/traveler/profile/settings">
                <UserIcon className="mr-2 h-4 w-4" /> Go to Profile Settings
              </Link>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-6 md:gap-8">
        <h1 className="font-headline text-3xl font-bold">
          <span>Welcome back, {userProfile.name?.split(' ')[0]}!</span>
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>{content.createRequest.title}</CardTitle>
              <CardDescription>
                {content.createRequest.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button onClick={handleCreateRequestClick} size="lg" className="w-full" disabled={isCreatingRequest}>
                {isCreatingRequest ? 'Creating...' : (
                    <>
                        <PlusCircle aria-hidden="true" /> {content.createRequest.cta}
                    </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>{content.myRequests.title}</CardTitle>
              <CardDescription>{content.myRequests.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex items-end">
              <Button asChild size="lg" className="w-full" variant="secondary">
                <Link href="/traveler/my-bookings">
                  <BookMarked aria-hidden="true" /> View My Bookings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
