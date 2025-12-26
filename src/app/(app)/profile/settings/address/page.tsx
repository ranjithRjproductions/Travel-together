'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal Code is required'),
  country: z.string().min(1, 'Country is required'),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);

  const userDocRef = user ? doc(firestore, 'users', user.uid) : null;
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  useEffect(() => {
    if (userProfile?.address) {
      reset(userProfile.address);
      setIsEditMode(false); // Default to view mode if address exists
    } else if (userProfile) {
      setIsEditMode(true); // Default to edit mode if no address
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
    if (!userDocRef) return;
    try {
      await setDoc(userDocRef, { address: data }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your address has been saved.',
      });
      setIsEditMode(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save address.',
      });
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div>
      <CardHeader className="p-0 mb-6">
        <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">My Address</CardTitle>
            {!isEditMode && (
                 <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            )}
        </div>
        <CardDescription>
          This address is used for travel-related services and communication.
        </CardDescription>
      </CardHeader>

      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input id="addressLine1" {...register('addressLine1')} />
            {errors.addressLine1 && <p className="text-sm text-destructive">{errors.addressLine1.message}</p>}
          </div>
          <div>
            <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
            <Input id="addressLine2" {...register('addressLine2')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="state">State / Province</Label>
              <Input id="state" {...register('state')} />
              {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" {...register('postalCode')} />
              {errors.postalCode && <p className="text-sm text-destructive">{errors.postalCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} />
              {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => { reset(userProfile?.address); setIsEditMode(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Address'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 text-sm">
            {userProfile?.address ? (
                <>
                    <p>{userProfile.address.addressLine1}</p>
                    {userProfile.address.addressLine2 && <p>{userProfile.address.addressLine2}</p>}
                    <p>{userProfile.address.city}, {userProfile.address.state} {userProfile.address.postalCode}</p>
                    <p>{userProfile.address.country}</p>
                </>
            ) : (
                <p className="text-muted-foreground">You haven't added an address yet.</p>
            )}
        </div>
      )}
    </div>
  );
}
