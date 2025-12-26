'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

const contactSchema = z.object({
  primaryPhone: z.string().min(1, 'Primary phone is required'),
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
  const [isEditMode, setIsEditMode] = useState(false);

  const userDocRef = user ? doc(firestore, 'users', user.uid) : null;
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
  });
  
  const primaryPhone = watch('primaryPhone');
  const whatsappSameAsPrimary = watch('whatsappSameAsPrimary');

  useEffect(() => {
    if (userProfile?.contact) {
      reset(userProfile.contact);
      setIsEditMode(false);
    } else if (userProfile) {
      setIsEditMode(true);
    }
  }, [userProfile, reset]);
  
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
        Provide contact information for communication and emergency use.
      </CardDescription>
      
      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="primaryPhone">Primary Phone Number</Label>
            <Input id="primaryPhone" type="tel" {...register('primaryPhone')} />
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
                />
              )}
            />
            <Label htmlFor="whatsappSameAsPrimary" className="text-sm font-normal">
              Same as primary number
            </Label>
          </div>
          <div>
            <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
            <Input id="whatsappNumber" type="tel" {...register('whatsappNumber')} disabled={whatsappSameAsPrimary} />
            {errors.whatsappNumber && <p className="text-sm text-destructive">{errors.whatsappNumber.message}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => { userProfile?.contact && reset(userProfile.contact); setIsEditMode(false); }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </form>
      ) : (
         <div className="space-y-2 text-sm">
           <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            {userProfile?.contact ? (
                <>
                    <p><span className="font-medium">Primary Phone:</span> {userProfile.contact.primaryPhone}</p>
                    <p><span className="font-medium">WhatsApp:</span> {userProfile.contact.whatsappNumber}</p>
                </>
            ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                  <p>You haven't added contact details yet.</p>
                  <Button variant="secondary" className="mt-4" onClick={() => setIsEditMode(true)}>Add Contact Details</Button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
