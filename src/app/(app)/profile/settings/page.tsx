'use client';

import { useDoc } from '@/firebase';
import { useMemo } from 'react';
import { doc, collection } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import content from '@/app/content/profile-settings.json';

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(collection(firestore, 'users'), user.uid);
  }, [user, firestore]);

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error,
  } = useDoc(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold mb-8">
        {content.pageTitle}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{content.formTitle}</CardTitle>
          <CardDescription>{content.formDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <ProfileSkeleton />}
          {!isLoading && userProfile && (
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">{content.nameLabel}</Label>
                <Input
                  id="name"
                  defaultValue={userProfile.name}
                  className="text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{content.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={userProfile.email}
                  disabled
                  className="disabled:opacity-100 disabled:cursor-not-allowed text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{content.roleLabel}</Label>
                <Input
                  id="role"
                  defaultValue={userProfile.role}
                  disabled
                  className="disabled:opacity-100 disabled:cursor-not-allowed text-base"
                />
              </div>
              <div className="flex justify-end">
                <Button disabled>{content.saveButton}</Button>
              </div>
            </form>
          )}
          {error && (
            <p className="text-destructive-foreground">
              There was an error loading your profile.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
