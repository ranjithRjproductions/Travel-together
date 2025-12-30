'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { indianStates, tamilNaduCities } from '@/lib/location-data';

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().min(1, 'Address Line 2 is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit postal code'),
  country: z.string().min(1, 'Country is required'),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);

  const userDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        postalCode: '',
        country: 'India',
        state: 'Tamil Nadu',
        isDefault: false,
    }
  });

  useEffect(() => {
    if (userProfile) {
        if (userProfile.address) {
            reset(userProfile.address);
            setIsEditMode(false);
        } else {
            setIsEditMode(true);
        }
    } else if (!isUserLoading && !isProfileLoading) {
        setIsEditMode(true);
    }
  }, [userProfile, reset, isUserLoading, isProfileLoading]);

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
       <CardDescription className="mb-6">
        This address is used for travel-related services and communication. Please provide your primary address.
       </CardDescription>

      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input id="addressLine1" {...register('addressLine1')} aria-invalid={errors.addressLine1 ? "true" : "false"} />
            {errors.addressLine1 && <p className="text-sm text-destructive">{errors.addressLine1.message}</p>}
          </div>
          <div>
            <Label htmlFor="addressLine2">Address Line 2</Label>
            <Input id="addressLine2" {...register('addressLine2')} aria-invalid={errors.addressLine2 ? "true" : "false"} />
            {errors.addressLine2 && <p className="text-sm text-destructive">{errors.addressLine2.message}</p>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Controller
                name="city"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="city"><SelectValue placeholder="Select a city" /></SelectTrigger>
                    <SelectContent>
                      {tamilNaduCities.map(city => <SelectItem key={city} value={city}>{city}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="state">State / Province</Label>
              <Controller
                name="state"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="state"><SelectValue placeholder="Select a state" /></SelectTrigger>
                    <SelectContent>
                      {indianStates.map(state => <SelectItem key={state} value={state}>{state}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" {...register('postalCode')} aria-invalid={errors.postalCode ? "true" : "false"} maxLength={6} />
              {errors.postalCode && <p className="text-sm text-destructive">{errors.postalCode.message}</p>}
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} readOnly />
              {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2">
             <Controller
                name="isDefault"
                control={control}
                render={({ field }) => <Checkbox id="isDefault" checked={field.value} onCheckedChange={field.onChange} />}
              />
              <Label htmlFor="isDefault" className="font-normal">Make this my default address</Label>
          </div>
          <div className="flex justify-end gap-2">
            {userProfile?.address && <Button variant="ghost" type="button" onClick={() => { reset(userProfile.address); setIsEditMode(false); }}>Cancel</Button>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Address'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 text-sm">
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            {userProfile?.address ? (
                <>
                    <p>{userProfile.address.addressLine1}</p>
                    {userProfile.address.addressLine2 && <p>{userProfile.address.addressLine2}</p>}
                    <p>{userProfile.address.city}, {userProfile.address.state} {userProfile.address.postalCode}</p>
                    <p>{userProfile.address.country}</p>
                    {userProfile.address.isDefault && <p className="font-medium text-primary pt-2">This is your default address.</p>}
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => router.push('/traveler/profile/settings/contact')}>Next Step</Button>
                    </div>
                </>
            ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                  <p>You haven't added an address yet.</p>
                  <Button variant="link" className="mt-2" onClick={() => setIsEditMode(true)}>Add an Address</Button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
