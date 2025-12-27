'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { tamilNaduCities } from '@/lib/location-data';

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().min(1, 'Address Line 2 is required'),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  country: z.string().min(1, 'Country is required'),
  isDefault: z.boolean().default(false),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function GuideAddressPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);

  const guideProfileDocRef = useMemo(() => {
    if (user && firestore) {
      // Note: Using a fixed ID 'guide-profile-doc' for simplicity, assuming one profile per guide.
      return doc(firestore, `users/${user.uid}/guideProfile/guide-profile-doc`);
    }
    return null;
  }, [user, firestore]);
  
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
        district: '',
        country: 'India',
        state: 'Tamil Nadu',
        isDefault: true,
    }
  });

  const [guideProfile, setGuideProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          setGuideProfile(data);
          if (data.address) {
            reset(data.address);
            setIsEditMode(false);
          } else {
            setIsEditMode(true);
          }
        } else {
          setIsEditMode(true);
        }
      } catch (error) {
        console.error("Error fetching guide profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your profile.' });
        setIsEditMode(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuideProfile();
  }, [guideProfileDocRef, isUserLoading, reset, toast]);

  const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
    if (!guideProfileDocRef) return;
    try {
      await setDoc(guideProfileDocRef, { address: data }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your address has been saved.',
      });
      setGuideProfile((prev: any) => ({ ...prev, address: data }));
      setIsEditMode(false);
      router.push('/guide/profile/settings/contact');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save address.',
      });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const currentAddress = guideProfile?.address;

  return (
    <div>
       <CardDescription className="mb-6">
        Please provide the primary address from which you will operate as a guide.
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
              <Input id="city" {...register('city')} aria-invalid={errors.city ? "true" : "false"} />
              {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
            </div>
            <div>
              <Label htmlFor="district">District</Label>
              <Controller
                name="district"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="district"><SelectValue placeholder="Select a district" /></SelectTrigger>
                    <SelectContent>
                      {tamilNaduCities.map(district => <SelectItem key={district} value={district}>{district}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.district && <p className="text-sm text-destructive">{errors.district.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="state">State</Label>
                <Input id="state" {...register('state')} readOnly />
                {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
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
            {currentAddress && <Button variant="ghost" type="button" onClick={() => { reset(currentAddress); setIsEditMode(false); }}>Cancel</Button>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save and Continue'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 text-sm">
            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            {currentAddress ? (
                <>
                    <p>{currentAddress.addressLine1}</p>
                    <p>{currentAddress.addressLine2}</p>
                    <p>{currentAddress.city}, {currentAddress.district}</p>
                    <p>{currentAddress.state}, {currentAddress.country}</p>
                    {currentAddress.isDefault && <p className="font-medium text-primary pt-2">This is your default address.</p>}
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => router.push('/guide/profile/settings/contact')}>Next Step</Button>
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

    