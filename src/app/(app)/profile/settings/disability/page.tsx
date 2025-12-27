'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';


const disabilitySchema = z.object({
  mainDisability: z.enum(['visually-impaired', 'hard-of-hearing'], {
    required_error: 'Please select a disability type.',
  }),
  visionSubOption: z.enum(['totally-blind', 'low-vision']).optional(),
  visionPercentage: z.coerce.number().min(1).max(100).optional(),
  hearingPercentage: z.coerce.number().min(1).max(100).optional(),
  requiresSignLanguageGuide: z.boolean().optional(),
  documentUrl: z.string().url().optional(),
  documentName: z.string().optional(),
  agreedToVoluntaryDisclosure: z.boolean().refine(val => val === true, {
    message: 'You must agree to the voluntary disclosure before saving.',
  }),
}).superRefine((data, ctx) => {
    if (data.mainDisability === 'visually-impaired') {
        if (!data.visionSubOption) {
            ctx.addIssue({ code: 'custom', message: 'Please specify your vision status.', path: ['visionSubOption'] });
        }
        if (!data.visionPercentage) {
            ctx.addIssue({ code: 'custom', message: 'Percentage of impairment is required.', path: ['visionPercentage'] });
        }
    }
    if (data.mainDisability === 'hard-of-hearing') {
        if (!data.hearingPercentage) {
            ctx.addIssue({ code: 'custom', message: 'Percentage of impairment is required.', path: ['hearingPercentage'] });
        }
    }
});

type DisabilityFormData = z.infer<typeof disabilitySchema>;

export default function DisabilityPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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
      visionPercentage: undefined,
      hearingPercentage: undefined,
      requiresSignLanguageGuide: false,
      agreedToVoluntaryDisclosure: false,
    },
  });

  const mainDisability = watch('mainDisability');
  const isFormSubmitting = isSubmitting || isUploading;
  const isLoading = isUserLoading || isProfileLoading;

  useEffect(() => {
     if (isProfileLoading) return;

    if (userProfile?.disability) {
      reset(userProfile.disability);
      setIsEditMode(false);
    } else {
      setIsEditMode(true);
    }
  }, [userProfile, reset, isProfileLoading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        if (file.type.startsWith('image/') || file.type === 'application/pdf') {
            setSelectedFile(file);
            setValue('documentName', file.name, { shouldValidate: true });
        } else {
            toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please select a PDF or image file.'});
            e.target.value = '';
        }
    }
  };

  const uploadDocument = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!storage || !user) {
            return reject(new Error("Storage or user not available."));
        }
        setIsUploading(true);
        setUploadProgress(0);

        const filePath = `disability-ids/${user.uid}/${file.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
            },
            (error) => {
                setIsUploading(false);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setIsUploading(false);
                resolve(downloadURL);
            }
        );
    });
  };

  const onSubmit: SubmitHandler<DisabilityFormData> = async (data) => {
    if (!userDocRef || !userProfile) return;

    if (data.mainDisability && !selectedFile && !userProfile?.disability?.documentUrl) {
         toast({ variant: 'destructive', title: 'Validation Error', description: 'A supporting document is required.' });
         return;
    }
    
    let uploadedFileUrl = userProfile?.disability?.documentUrl;

    try {
        if (selectedFile) {
            uploadedFileUrl = await uploadDocument(selectedFile);
            data.documentUrl = uploadedFileUrl;
            data.documentName = selectedFile.name;
        }

        await setDoc(userDocRef, { disability: data }, { merge: true });

        toast({ title: 'Success', description: 'Your accessibility needs have been saved.' });
        setSelectedFile(null);
        setIsEditMode(false);
        
        const redirectTo = userProfile.role === 'Guide' ? '/guide/dashboard' : '/traveler/dashboard';
        router.push(redirectTo);

    } catch (error: any) {
        console.error("Save error:", error);
        toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to save disclosure.' });
        setIsUploading(false);
    }
  };
  
  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const renderSavedData = () => {
    const disability = userProfile?.disability;
    if (!disability) {
      return (
         <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>You have not disclosed any accessibility needs.</p>
             <Button variant="link" className="mt-2" onClick={() => setIsEditMode(true)}>Add Disclosure</Button>
        </div>
      );
    }

    return (
        <div className="space-y-4 text-sm">
             <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            <div>
                <p className="font-medium text-muted-foreground">Disability Type</p>
                <p>{disability.mainDisability === 'visually-impaired' ? 'Visually Impaired' : 'Hard of Hearing'}</p>
            </div>

            {disability.mainDisability === 'visually-impaired' && (
                <>
                    <div>
                        <p className="font-medium text-muted-foreground">Details</p>
                        <p>{disability.visionSubOption === 'totally-blind' ? 'Totally Blind' : 'Low Vision'}</p>
                    </div>
                    <div>
                        <p className="font-medium text-muted-foreground">Percentage of Impairment</p>
                        <p>{disability.visionPercentage}%</p>
                    </div>
                </>
            )}

             {disability.mainDisability === 'hard-of-hearing' && (
                <>
                  <div>
                      <p className="font-medium text-muted-foreground">Percentage of Impairment</p>
                      <p>{disability.hearingPercentage}%</p>
                  </div>
                  <div>
                      <p className="font-medium text-muted-foreground">Sign Language Support</p>
                      <p>{disability.requiresSignLanguageGuide ? 'Yes, a guide proficient in sign language is required.' : 'No'}</p>
                  </div>
                </>
            )}
            
            {disability.documentUrl && disability.documentName && (
                 <div>
                    <p className="font-medium text-muted-foreground">Supporting Document</p>
                     <a href={disability.documentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                        {disability.documentName}
                    </a>
                </div>
            )}
        </div>
    );
  }

  return (
    <div>
        <CardDescription className="mb-6">
            This information helps us provide accessible and inclusive support during your journey.
        </CardDescription>

      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <fieldset>
                <legend className="text-sm font-medium mb-2">Disability Type</legend>
                 <Controller
                    name="mainDisability"
                    control={control}
                    render={({ field }) => (
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="visually-impaired" id="visually-impaired" />
                            <Label htmlFor="visually-impaired" className="font-normal">Visually Impaired</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                           <RadioGroupItem value="hard-of-hearing" id="hard-of-hearing" />
                           <Label htmlFor="hard-of-hearing" className="font-normal">Hard of Hearing</Label>
                        </div>
                    </RadioGroup>
                    )}
                />
                {errors.mainDisability && <p className="text-sm text-destructive mt-2">{errors.mainDisability.message}</p>}
            </fieldset>

          {mainDisability === 'visually-impaired' && (
            <fieldset className="pl-6 border-l-2 border-muted space-y-4">
                <div>
                    <legend className="text-sm font-medium mb-2">Details</legend>
                    <Controller
                        name="visionSubOption"
                        control={control}
                        render={({ field }) => (
                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="totally-blind" id="totally-blind" />
                                <Label htmlFor="totally-blind" className="font-normal">Totally Blind</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="low-vision" id="low-vision" />
                                <Label htmlFor="low-vision" className="font-normal">Low Vision</Label>
                            </div>
                        </RadioGroup>
                        )}
                    />
                     {errors.visionSubOption && <p className="text-sm text-destructive mt-2">{errors.visionSubOption.message}</p>}
                </div>
               <div>
                  <Label htmlFor="visionPercentage">Percentage of vision impairment (required)</Label>
                  <Input 
                    id="visionPercentage"
                    type="number" 
                    {...control.register('visionPercentage')} 
                    min="1" 
                    max="100"
                    aria-invalid={!!errors.visionPercentage}
                  />
                  {errors.visionPercentage && <p className="text-sm text-destructive">{errors.visionPercentage.message}</p>}
               </div>
            </fieldset>
          )}

           {mainDisability === 'hard-of-hearing' && (
            <fieldset className="pl-6 border-l-2 border-muted space-y-4">
               <div>
                  <Label htmlFor="hearingPercentage">Percentage of hearing impairment (required)</Label>
                  <Input 
                    id="hearingPercentage"
                    type="number" 
                    {...control.register('hearingPercentage')} 
                    min="1" 
                    max="100"
                    aria-invalid={!!errors.hearingPercentage}
                  />
                  {errors.hearingPercentage && <p className="text-sm text-destructive">{errors.hearingPercentage.message}</p>}
               </div>
              <Controller
                  name="requiresSignLanguageGuide"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="requiresSignLanguageGuide"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="mt-1"
                      />
                      <Label htmlFor="requiresSignLanguageGuide" className="font-normal text-sm">
                        I require a guide who is proficient in sign language.
                      </Label>
                    </div>
                  )}
                />
            </fieldset>
          )}

          {mainDisability && (
              <div className="space-y-2 pt-4 border-t">
                  <Label htmlFor="document-upload">Supporting Document (PDF/Image, Required)</Label>
                  <p id="document-upload-description" className="text-sm text-muted-foreground">
                    Please upload your government-issued disability ID card or a similar document. This is used only to verify your eligibility for accessible services.
                  </p>
                  <Input id="document-upload" type="file" accept="image/*,application/pdf" onChange={handleFileChange} disabled={isFormSubmitting} aria-describedby="document-upload-description" />
                  {selectedFile && <p className="text-sm text-muted-foreground">Selected: {selectedFile.name}</p>}
                  {userProfile?.disability?.documentName && !selectedFile && <p className="text-sm text-muted-foreground">Current: {userProfile.disability.documentName}</p>}

                  {isUploading && (
                    <div className="w-full mt-2">
                        <Progress value={uploadProgress} />
                        <p className="text-xs text-center text-muted-foreground mt-1">{uploadProgress}%</p>
                    </div>
                  )}
              </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <Controller
                name="agreedToVoluntaryDisclosure"
                control={control}
                render={({ field }) => (
                  <div className="flex items-start space-x-2">
                    <Checkbox id="agreement" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                    <Label htmlFor="agreement" className="font-normal text-sm">
                      I voluntarily agree to provide this information to help "Let's Travel Together" offer better accessibility support. I understand this data will be handled securely and used only for this purpose.
                    </Label>
                  </div>
                )}
              />
              {errors.agreedToVoluntaryDisclosure && <p className="text-sm text-destructive">{errors.agreedToVoluntaryDisclosure.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            {userProfile?.disability && <Button variant="ghost" type="button" onClick={() => { reset(userProfile.disability); setIsEditMode(false); }}>Cancel</Button>}
            <Button type="submit" disabled={isFormSubmitting}>
              {isFormSubmitting ? 'Saving...' : 'Save and Finish'}
            </Button>
          </div>
        </form>
      ) : (
        renderSavedData()
      )}
    </div>
  );
}
