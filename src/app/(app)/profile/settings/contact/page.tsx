'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const contactSchema = z.object({
  primaryPhone: z.string().min(10, 'Please enter a valid phone number'),
  whatsappSameAsPrimary: z.boolean().default(false),
  whatsappNumber: z.string().optional(),
}).refine(data => data.whatsappSameAsPrimary || data.whatsappNumber, {
  message: "WhatsApp number is required if not same as primary",
  path: ["whatsappNumber"],
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
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
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
        primaryPhone: '',
        whatsappNumber: '',
        whatsappSameAsPrimary: false,
    }
  });
  
  const primaryPhone = watch('primaryPhone');
  const whatsappSameAsPrimary = watch('whatsappSameAsPrimary');

  useEffect(() => {
    if (userProfile) {
        if(userProfile.contact) {
            reset(userProfile.contact);
            setIsEditMode(false);
        } else {
            setIsEditMode(true);
        }
    } else if (!isUserLoading && !isProfileLoading) {
        setIsEditMode(true);
    }
  }, [userProfile, reset, isUserLoading, isProfileLoading]);
  
  useEffect(() => {
    if (whatsappSameAsPrimary) {
      setValue('whatsappNumber', primaryPhone);
    }
  }, [primaryPhone, whatsappSameAsPrimary, setValue]);

  const onSubmit: SubmitHandler<ContactFormData> = async (data) => {
    if (!userDocRef) return;
    try {
      await setDoc(userDocRef, { contact: data }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your contact details have been saved.',
      });
      setIsEditMode(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save contact details.',
      });
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <Skeleton className="h-60 w-full" />;
  }

  return (
    <div>
      <CardDescription className="mb-6">
        Provide contact information for communication and emergency use. This information will be kept confidential.
      </CardDescription>
      
      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="primaryPhone">Primary Phone Number</Label>
            <Input id="primaryPhone" type="tel" {...register('primaryPhone')} aria-invalid={errors.primaryPhone ? 'true' : 'false'} />
            {errors.primaryPhone && <p className="text-sm text-destructive">{errors.primaryPhone.message}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <Controller
              name="whatsappSameAsPrimary"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="whatsappSameAsPrimary"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  aria-labelledby="whatsapp-label"
                />
              )}
            />
            <Label id="whatsapp-label" htmlFor="whatsappSameAsPrimary" className="text-sm font-normal">
              My WhatsApp number is the same as my primary phone number.
            </Label>
          </div>
          {!whatsappSameAsPrimary && (
            <div>
              <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
              <Input id="whatsappNumber" type="tel" {...register('whatsappNumber')} disabled={whatsappSameAsPrimary} aria-invalid={errors.whatsappNumber ? 'true' : 'false'} />
              {errors.whatsappNumber && <p className="text-sm text-destructive">{errors.whatsappNumber.message}</p>}
            </div>
          )}
          <div className="flex justify-end gap-2">
            {userProfile?.contact && <Button variant="ghost" type="button" onClick={() => { reset(userProfile.contact); setIsEditMode(false); }}>Cancel</Button>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </form>
      ) : (
         <div className="space-y-4 text-sm">
           <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            {userProfile?.contact ? (
                <>
                    <div>
                        <p className="font-medium text-muted-foreground">Primary Phone</p>
                        <p>{userProfile.contact.primaryPhone}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">WhatsApp Number</p>
                        <p>{userProfile.contact.whatsappNumber}</p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => router.push('/profile/settings/disability')}>Next Step</Button>
                    </div>
                </>
            ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                  <p>You haven't added contact details yet.</p>
                  <Button variant="link" className="mt-2" onClick={() => setIsEditMode(true)}>Add Contact Details</Button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
