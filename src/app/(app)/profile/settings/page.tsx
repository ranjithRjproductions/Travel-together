'use client';

import { useDoc, useFirestore, useUser } from '@/firebase';
import { useMemo, useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (userProfile) {
      reset({ name: userProfile.name });
      if (!userProfile.name) {
        setIsEditMode(true);
      }
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<ProfileFormData> = async (data) => {
    if (!userDocRef) return;
    try {
      await setDoc(userDocRef, { name: data.name }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your profile information has been saved.',
      });
      setIsEditMode(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update your profile.',
      });
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  return (
    <div>
      <CardDescription className="mb-6">
        This is your basic identity on the platform. Your name can be updated, but your email and role are fixed for security.
      </CardDescription>

      {isLoading && <ProfileSkeleton />}

      {!isLoading && userProfile && (
        <>
          {isEditMode ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  aria-describedby="name-description"
                  aria-invalid={errors.name ? "true" : "false"}
                />
                <p id="name-description" className="text-sm text-muted-foreground">
                  Please use your name as it appears on government-issued documents.
                </p>
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email} readOnly />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">User Role</Label>
                <Input id="role" value={userProfile.role} readOnly />
              </div>

              <div className="flex justify-end gap-2">
                {userProfile.name && <Button variant="ghost" type="button" onClick={() => { reset({ name: userProfile.name }); setIsEditMode(false); }}>Cancel</Button>}
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Full Name</p>
                <p>{userProfile.name}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">Email Address</p>
                <p>{userProfile.email}</p>
              </div>
              <div>
                <p className="font-medium text-muted-foreground">User Role</p>
                <p>{userProfile.role}</p>
              </div>
              <div className="flex justify-end pt-4">
                <Button onClick={() => router.push('/profile/settings/address')}>Next Step</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
