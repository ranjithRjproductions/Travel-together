'use client';

import { useState, useEffect, useMemo, ChangeEvent } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser, useStorage } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

const disabilitySchema = z.object({
  mainDisability: z.enum(['vision', 'hearing', 'none', 'mobility', 'preferNotToSay']).optional(),
  visionSubOption: z.enum(['blind', 'low-vision']).optional(),
  visionPercentage: z.coerce.number().min(0).max(100).optional(),
  hearingAssistance: z.boolean().optional(),
  hearingPercentage: z.coerce.number().min(0).max(100).optional(),
  disabilityIdUrl: z.string().url().optional(),
  agreedToVoluntaryDisclosure: z.boolean().default(false),
});

type DisabilityFormData = z.infer<typeof disabilitySchema>;

export default function DisabilityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DisabilityFormData>({
    resolver: zodResolver(disabilitySchema),
    defaultValues: {
      mainDisability: 'none',
      visionPercentage: undefined,
      hearingPercentage: undefined,
      hearingAssistance: false,
      agreedToVoluntaryDisclosure: false,
    },
  });

  const mainDisability = watch('mainDisability');

  useEffect(() => {
    if (isProfileLoading) return; // Wait until data is loaded

    if (userProfile && userProfile.disability) {
      const profileData = {
        ...userProfile.disability,
        visionPercentage: userProfile.disability.visionPercentage || undefined,
        hearingPercentage: userProfile.disability.hearingPercentage || undefined,
      };
      reset(profileData);
      setIsEditMode(false); // Data exists, go to display mode
    } else {
      setIsEditMode(true); // No data, go to edit mode
    }
  }, [userProfile, reset, isProfileLoading]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
    }
  };

  const handleIdUpload = async () => {
    if (!idFile || !storage || !user || !userDocRef) {
      toast({ variant: "destructive", title: "Upload error" });
      return;
    }
    const filePath = `disability-ids/${user.uid}/${idFile.name}`;
    const fileRef = storageRef(storage, filePath);
    setIsUploading(true);
    setUploadProgress(0);

    const uploadTask = uploadBytesResumable(fileRef, idFile);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(Math.round(progress));
      },
      (error) => {
        setIsUploading(false);
        toast({ variant: "destructive", title: "Upload failed", description: error.message });
      },
      async () => {
        try {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setValue('disabilityIdUrl', downloadURL, { shouldValidate: true });
          await setDoc(userDocRef, { disability: { disabilityIdUrl: downloadURL } }, { merge: true });
          toast({ title: "Upload complete", description: "Disability ID has been uploaded." });
          setIdFile(null);
        } catch (err: any) {
          toast({ variant: "destructive", title: "Save failed", description: err.message });
        } finally {
          setIsUploading(false);
        }
      }
    );
  };


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
    if (!disability || disability.mainDisability === 'none' || disability.mainDisability === 'preferNotToSay' || !disability.mainDisability) {
      return (
         <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>You have not disclosed any accessibility needs.</p>
             <Button variant="link" className="mt-2" onClick={() => setIsEditMode(true)}>Add Disclosure</Button>
        </div>
      );
    }

    return (
        <div className="space-y-4">
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
            {disability.disabilityIdUrl && (
                 <div>
                    <p className="font-medium">Disability ID</p>
                     <p className="text-muted-foreground"><a href={disability.disabilityIdUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Uploaded ID</a></p>
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
                  <RadioGroupItem value="mobility" id="mobility" />
                  <Label htmlFor="mobility" className="font-normal">Mobility Impairment</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <RadioGroupItem value="preferNotToSay" id="preferNotToSay" />
                  <Label htmlFor="preferNotToSay" className="font-normal">Prefer not to say</Label>
                </div>
                 <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="none" />
                  <Label htmlFor="none" className="font-normal">No specific impairment</Label>
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
                    render={({ field }) => <Input {...field} id="visionPercentage" type="number" min="0" max="100" value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} />}
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
                    render={({ field }) => <Input {...field} id="hearingPercentage" type="number" min="0" max="100" value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber)} />}
                  />
                  {errors.hearingPercentage && <p className="text-sm text-destructive">{errors.hearingPercentage.message}</p>}
               </div>
            </fieldset>
          )}

          <div className="space-y-4 pt-4 border-t">
              <Label>Voluntary: Upload Disability ID</Label>
              <CardDescription>You can optionally upload your state or unique ID card for faster verification with guides.</CardDescription>
              <Input id="id-upload" type="file" onChange={handleFileChange} disabled={isUploading} />
              {idFile && !isUploading && <Button onClick={handleIdUpload} size="sm" type="button">Upload ID</Button>}
              {isUploading && <div className="w-full mt-2"><Progress value={uploadProgress} /><p className="text-xs text-center text-muted-foreground mt-1">{uploadProgress}%</p></div>}
              {userProfile?.disability?.disabilityIdUrl && <p className="text-sm text-muted-foreground">An ID has already been uploaded.</p>}
          </div>

           <div className="flex items-start space-x-2 pt-4 border-t">
              <Controller
                name="agreedToVoluntaryDisclosure"
                control={control}
                render={({ field }) => ( <Checkbox id="agreedToVoluntaryDisclosure" checked={field.value} onCheckedChange={field.onChange} /> )}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="agreedToVoluntaryDisclosure" className="font-normal">
                  I voluntarily agree to share this information for the purpose of receiving better accessibility support.
                </Label>
              </div>
          </div>


          <div className="flex justify-end gap-2 pt-4 border-t">
            {userProfile?.disability && <Button variant="ghost" type="button" onClick={() => { reset(userProfile.disability); setIsEditMode(false); }}>Cancel</Button>}
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
