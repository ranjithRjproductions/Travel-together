'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';

const disabilitySchema = z.object({
  mainDisability: z.enum(['vision', 'hearing', 'none']).optional(),
  visionSubOption: z.enum(['blind', 'low-vision']).optional(),
  visionPercentage: z.number().min(0).max(100).optional(),
  hearingAssistance: z.boolean().optional(),
  hearingPercentage: z.number().min(0).max(100).optional(),
});

type DisabilityFormData = z.infer<typeof disabilitySchema>;

export default function DisabilityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);

  const userDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, 'users', user.uid);
    }
    return null;
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DisabilityFormData>({
    resolver: zodResolver(disabilitySchema),
  });

  const mainDisability = watch('mainDisability');

  useEffect(() => {
    if (userProfile?.disability) {
      reset(userProfile.disability);
      setIsEditMode(false);
    } else if (userProfile) {
      setIsEditMode(true);
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<DisabilityFormData> = async (data) => {
    if (!userDocRef) return;
    try {
      await setDoc(userDocRef, { disability: data }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your accessibility needs have been saved.',
      });
      setIsEditMode(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save disclosure.',
      });
    }
  };

  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const renderSavedData = () => {
    const disability = userProfile?.disability;
    if (!disability || disability.mainDisability === 'none' || !disability.mainDisability) {
      return (
         <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>You have not disclosed any accessibility needs.</p>
            <Button variant="secondary" className="mt-4" onClick={() => setIsEditMode(true)}>Add Disclosure</Button>
        </div>
      );
    }

    return (
        <div className="space-y-2">
            {disability.mainDisability === 'vision' && (
                <div>
                    <p className="font-medium">Vision Impairment</p>
                    <ul className="list-disc pl-5 text-muted-foreground">
                        {disability.visionSubOption === 'blind' && <li>Totally Blind</li>}
                        {disability.visionSubOption === 'low-vision' && <li>Low Vision</li>}
                        {disability.visionPercentage !== undefined && <li>Percentage Level: {disability.visionPercentage}%</li>}
                    </ul>
                </div>
            )}
             {disability.mainDisability === 'hearing' && (
                <div>
                    <p className="font-medium">Hearing Impairment</p>
                     <ul className="list-disc pl-5 text-muted-foreground">
                        {disability.hearingAssistance && <li>Requires assistive support</li>}
                        {!disability.hearingAssistance && <li>Does not require assistive support</li>}
                        {disability.hearingPercentage !== undefined && <li>Percentage Level: {disability.hearingPercentage}%</li>}
                    </ul>
                </div>
            )}
        </div>
    );
  }

  return (
    <div>
      <CardDescription className="mb-6">
        Sharing this information helps us provide a more accessible and supportive experience. You may update this anytime. Your information is kept confidential.
      </CardDescription>
      
      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Controller
            name="mainDisability"
            control={control}
            render={({ field }) => (
              <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                <Label>Select an option that best describes your needs:</Label>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vision" id="vision" />
                  <Label htmlFor="vision" className="font-normal">Vision Impairment</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hearing" id="hearing" />
                  <Label htmlFor="hearing" className="font-normal">Hearing Impairment</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal">No specific impairment / Prefer not to say</Label>
                </div>
              </RadioGroup>
            )}
          />

          {mainDisability === 'vision' && (
            <fieldset className="pl-6 border-l-2 border-muted space-y-4">
              <Controller
                name="visionSubOption"
                control={control}
                render={({ field }) => (
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                    <Label>Please specify:</Label>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="blind" id="blind" />
                      <Label htmlFor="blind" className="font-normal">Totally Blind</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="low-vision" id="low-vision" />
                      <Label htmlFor="low-vision" className="font-normal">Low Vision</Label>
                    </div>
                  </RadioGroup>
                )}
              />
               <div>
                  <Label htmlFor="visionPercentage">Percentage Level (Required)</Label>
                  <Controller
                    name="visionPercentage"
                    control={control}
                    render={({ field }) => <Input {...field} id="visionPercentage" type="number" min="0" max="100" onChange={e => field.onChange(e.target.valueAsNumber)} />}
                  />
                  {errors.visionPercentage && <p className="text-sm text-destructive">{errors.visionPercentage.message}</p>}
               </div>
            </fieldset>
          )}

           {mainDisability === 'hearing' && (
            <fieldset className="pl-6 border-l-2 border-muted space-y-4">
               <div>
                  <Controller
                    name="hearingAssistance"
                    control={control}
                    render={({ field }) => (
                        <div className="flex items-center space-x-2">
                            <Checkbox id="hearingAssistance" checked={field.value} onCheckedChange={field.onChange} />
                            <Label htmlFor="hearingAssistance" className="font-normal">Is assistive support required?</Label>
                        </div>
                    )}
                  />
               </div>
                <div>
                  <Label htmlFor="hearingPercentage">Percentage Level (Required)</Label>
                   <Controller
                    name="hearingPercentage"
                    control={control}
                    render={({ field }) => <Input {...field} id="hearingPercentage" type="number" min="0" max="100" onChange={e => field.onChange(e.target.valueAsNumber)} />}
                  />
                  {errors.hearingPercentage && <p className="text-sm text-destructive">{errors.hearingPercentage.message}</p>}
               </div>
            </fieldset>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="ghost" type="button" onClick={() => { if(userProfile?.disability) { reset(userProfile.disability); setIsEditMode(false); } }}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4 text-sm">
             <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            {renderSavedData()}
             <div className="flex justify-end pt-4">
                <Button onClick={() => toast({ title: 'Profile Complete!', description: "You have completed all steps of your profile setup."})}>Finish Setup</Button>
            </div>
        </div>
      )}
    </div>
  );
}
