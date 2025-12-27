'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Details | Let\'s Travel Together',
};

const contactSchema = z.object({
  primaryPhone: z.string().min(10, 'Please enter a valid phone number'),
  whatsappSameAsPrimary: z.boolean().default(false),
  whatsappNumber: z.string().optional(),
}).refine(data => data.whatsappSameAsPrimary || (data.whatsappNumber && data.whatsappNumber.length >= 10), {
  message: "WhatsApp number is required and must be valid if not same as primary",
  path: ["whatsappNumber"],
});


type ContactFormData = z.infer<typeof contactSchema>;

export default function GuideContactPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [guideProfile, setGuideProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const guideProfileDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, `users/${user.uid}/guideProfile/guide-profile-doc`);
    }
    return null;
  }, [user, firestore]);

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
          if (data.contact) {
            reset(data.contact);
            setIsEditMode(false);
          } else {
            setIsEditMode(true);
          }
        } else {
          setIsEditMode(true);
        }
      } catch (error) {
        console.error("Error fetching guide profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your profile data.' });
        setIsEditMode(true);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGuideProfile();
  }, [guideProfileDocRef, isUserLoading, reset, toast]);
  
  useEffect(() => {
    if (whatsappSameAsPrimary) {
      setValue('whatsappNumber', primaryPhone);
    }
  }, [primaryPhone, whatsappSameAsPrimary, setValue]);

  const onSubmit: SubmitHandler<ContactFormData> = async (data) => {
    if (!guideProfileDocRef) return;
    try {
      await setDoc(guideProfileDocRef, { contact: data }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your contact details have been saved.',
      });
      setGuideProfile((prev: any) => ({ ...prev, contact: data }));
      setIsEditMode(false);
      router.push('/guide/profile/settings/expertise');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save contact details.',
      });
    }
  };
  
  if (isLoading) {
    return <Skeleton className="h-60 w-full" />;
  }

  const currentContact = guideProfile?.contact;

  return (
    <div>
      <CardDescription className="mb-6">
        Provide your professional contact information. This will be used for coordinating with travelers.
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
            {currentContact && <Button variant="ghost" type="button" onClick={() => { reset(currentContact); setIsEditMode(false); }}>Cancel</Button>}
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
            {currentContact ? (
                <>
                    <div>
                        <p className="font-medium text-muted-foreground">Primary Phone</p>
                        <p>{currentContact.primaryPhone}</p>
                    </div>
                     <div>
                        <p className="font-medium text-muted-foreground">WhatsApp Number</p>
                        <p>{currentContact.whatsappNumber}</p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button onClick={() => router.push('/guide/profile/settings/expertise')}>Next Step</Button>
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
