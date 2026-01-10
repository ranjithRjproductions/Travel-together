
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';

const availabilitySchema = z.object({
  isAvailable: z.boolean().default(true),
});

type AvailabilityFormData = z.infer<typeof availabilitySchema>;

export default function GuideAvailabilityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const guideProfileDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, `users/${user.uid}/guideProfile/guide-profile-doc`);
    }
    return null;
  }, [user, firestore]);

  const { control, reset, watch, handleSubmit } = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      isAvailable: true,
    },
  });

  const isAvailable = watch('isAvailable');

  useEffect(() => {
    async function fetchGuideProfile() {
      if (!guideProfileDocRef) {
        setIsLoading(isUserLoading);
        return;
      }

      try {
        const docSnap = await getDoc(guideProfileDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (typeof data.isAvailable === 'boolean') {
            reset({ isAvailable: data.isAvailable });
          }
        }
      } catch (error) {
        console.error("Error fetching guide profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your availability status.' });
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuideProfile();
  }, [guideProfileDocRef, isUserLoading, reset, toast]);
  
  const onSubmit = async (data: AvailabilityFormData) => {
      if (!guideProfileDocRef) return;
      setIsSubmitting(true);
      try {
        await setDoc(guideProfileDocRef, { isAvailable: data.isAvailable }, { merge: true });
        toast({
          title: 'Status Updated',
          description: `You are now ${data.isAvailable ? 'available' : 'unavailable'} for new requests.`,
        });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update availability status.',
        });
      } finally {
        setIsSubmitting(false);
      }
  };


  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <CardDescription className="mb-6">
        Use this toggle to control your visibility for new travel requests. When you're unavailable, you will not appear in traveler searches.
      </CardDescription>

      <div className="flex items-center space-x-4 rounded-md border p-4 mb-6">
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium leading-none">
            Available for New Requests
          </p>
          <p className="text-sm text-muted-foreground">
            {isAvailable ? "You are currently LIVE and visible to travelers." : "You are currently hidden and will not receive new requests."}
          </p>
        </div>
        <Controller
          name="isAvailable"
          control={control}
          render={({ field }) => (
             <Switch
                id="availability-switch"
                checked={field.value}
                onCheckedChange={field.onChange}
                aria-label="Toggle availability for new requests"
              />
          )}
        />
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
