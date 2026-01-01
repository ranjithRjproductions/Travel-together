
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
import { useUser, useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import content from '@/app/content/traveler-dashboard.json';
import { PlusCircle, BookMarked, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { type User as UserProfile } from '@/lib/definitions';
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

export default function TravelerDashboard() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

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
    // Check that disability has been at least visited/answered. The 'disability' property will exist even if they chose not to disclose.
    if (!profile.hasOwnProperty('disability')) {
        return { complete: false, reason: 'Please complete the disability disclosure section.' };
    }
    
    return { complete: true, reason: '' };
  };
  
  const handleCreateRequestClick = () => {
    const { complete, reason } = checkProfileCompleteness(userProfile);
    if (complete) {
      router.push('/traveler/request/create');
    } else {
      setAlertMessage(reason || 'Please make sure all your profile settings are complete before creating a request. This helps us find the perfect guide for your needs.');
      setIsAlertOpen(true);
    }
  };

  // Wait for auth to resolve first
  if (isUserLoading) {
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

  // Redirect unauthenticated users
  if (!user) {
    router.replace('/login');
    return null;
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
          {isProfileLoading ? (
            <Skeleton className="h-10 w-64" />
          ) : (
            <span>Welcome back, {userProfile?.name?.split(' ')[0]}!</span>
          )}
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
              <Button onClick={handleCreateRequestClick} size="lg" className="w-full">
                <PlusCircle aria-hidden="true" /> {content.createRequest.cta}
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
