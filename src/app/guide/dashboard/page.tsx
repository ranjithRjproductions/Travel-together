
'use client';

import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { redirect } from 'next/navigation';
import content from '@/app/content/guide-dashboard.json';
import { type User as UserProfile } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText } from 'lucide-react';
import Link from 'next/link';


export default function GuideDashboard() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isUserLoading = isAuthLoading || isProfileLoading;

  if (isUserLoading) {
    return (
      <div className="grid gap-4 md:gap-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-8">
      <h1 className="font-headline text-3xl font-bold">
        {userProfile?.name ? `Welcome back, ${userProfile.name.split(' ')[0]}!` : content.pageTitle}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
            <CardHeader>
              <CardTitle>View Your Requests</CardTitle>
              <CardDescription>
                Review incoming requests, manage your upcoming bookings, and see your past trips.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg" className="w-full">
                <Link href="/guide/my-requests">
                    <FileText className="mr-2" />
                    Go to My Requests
                </Link>
              </Button>
            </CardContent>
          </Card>
        
        <section aria-labelledby="available-requests-heading">
          <Card>
            <CardHeader>
              <CardTitle id="available-requests-heading">
                {content.availableRequests.title}
              </CardTitle>
              <CardDescription>
                {content.availableRequests.description} (Feature coming soon)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                 <p>A marketplace for available requests will appear here.</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
