'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDoc, useFirestore, useUser, useStorage } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import {
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { File as FileIcon } from 'lucide-react';
import Link from 'next/link';

const disabilitySchema = z.object({
  visionImpairment: z.boolean().default(false),
  lowVision: z.boolean().default(false),
  blind: z.boolean().default(false),
  hearingImpairment: z.boolean().default(false),
  mobilityImpairment: z.boolean().default(false),
  preferNotToSay: z.boolean().default(false),
  disabilityIdUrl: z.string().optional(),
  agreedToVoluntaryDisclosure: z.boolean().refine(val => val === true, {
    message: "You must agree to the voluntary disclosure.",
  }),
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    defaultValues: {
      visionImpairment: false,
      lowVision: false,
      blind: false,
      hearingImpairment: false,
      mobilityImpairment: false,
      preferNotToSay: false,
      agreedToVoluntaryDisclosure: false,
    }
  });

  const visionImpairment = watch('visionImpairment');

  useEffect(() => {
    if (userProfile?.disability) {
      reset(userProfile.disability);
      setIsEditMode(false);
    } else if (userProfile) {
      setIsEditMode(true);
    }
  }, [userProfile, reset]);
  
  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIdFile(file);
    }
  };

  const onSubmit: SubmitHandler<DisabilityFormData> = async (data) => {
    if (!userDocRef || !user) return;
    
    let disabilityIdUrl = userProfile?.disability?.disabilityIdUrl || '';

    if (idFile) {
        setIsUploading(true);
        setUploadProgress(0);
        const filePath = `disability-ids/${user.uid}/${idFile.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, idFile);

        try {
            await new Promise<void>((resolve, reject) => {
                 uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        setUploadProgress(progress);
                    },
                    (error) => {
                        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
                        setIsUploading(false);
                        reject(error);
                    },
                    async () => {
                        disabilityIdUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        resolve();
                    }
                );
            });
        } catch (error) {
            return; // Stop submission if upload fails
        } finally {
            setIsUploading(false);
        }
    }

    try {
      await setDoc(userDocRef, { disability: { ...data, disabilityIdUrl } }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your disability disclosure has been saved.',
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

  return (
    <div>
      <CardDescription className="mb-6">
        Sharing this information is voluntary and helps us provide a more accessible and supportive experience.
      </CardDescription>
      
      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
                <Controller name="visionImpairment" control={control} render={({ field }) => (
                    <div className="flex items-center space-x-2"><Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="vision" /><Label htmlFor="vision">Vision Impairment</Label></div>
                )}/>
                {visionImpairment && (
                    <div className="pl-6 space-y-2">
                         <Controller name="lowVision" control={control} render={({ field }) => (
                            <div className="flex items-center space-x-2"><Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="lowVision" /><Label htmlFor="lowVision">Low Vision</Label></div>
                        )}/>
                         <Controller name="blind" control={control} render={({ field }) => (
                            <div className="flex items-center space-x-2"><Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="blind" /><Label htmlFor="blind">Blind / Screen reader user</Label></div>
                        )}/>
                    </div>
                )}
            </div>
             <Controller name="hearingImpairment" control={control} render={({ field }) => (
                <div className="flex items-center space-x-2"><Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="hearing" /><Label htmlFor="hearing">Hearing Impairment</Label></div>
            )}/>
             <Controller name="mobilityImpairment" control={control} render={({ field }) => (
                <div className="flex items-center space-x-2"><Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="mobility" /><Label htmlFor="mobility">Mobility Impairment</Label></div>
            )}/>
             <Controller name="preferNotToSay" control={control} render={({ field }) => (
                <div className="flex items-center space-x-2"><Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="preferNotToSay" /><Label htmlFor="preferNotToSay">Prefer not to say</Label></div>
            )}/>
            
            <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="id-upload">Upload Disability ID (Optional)</Label>
                <p className="text-sm text-muted-foreground">You can upload a state or unique ID card for verification.</p>
                <Input id="id-upload" type="file" ref={fileInputRef} onChange={handleIdFileChange} accept="image/*,.pdf" className="hidden"/>
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>Choose File</Button>
                {idFile && !isUploading && <div className="text-sm text-muted-foreground flex items-center gap-2"><FileIcon className="h-4 w-4" /> {idFile.name}</div>}
                {isUploading && <Progress value={uploadProgress} className="w-full" />}
            </div>

             <Controller name="agreedToVoluntaryDisclosure" control={control} render={({ field }) => (
                <div className="flex items-start space-x-2 pt-4 border-t">
                    <Checkbox {...field} checked={field.value} onCheckedChange={field.onChange} id="agreement" className="mt-1" />
                    <div className="grid gap-1.5 leading-none">
                        <Label htmlFor="agreement">I acknowledge that I am providing this information voluntarily.</Label>
                        {errors.agreedToVoluntaryDisclosure && <p className="text-sm text-destructive">{errors.agreedToVoluntaryDisclosure.message}</p>}
                    </div>
                </div>
            )}/>
             <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => { reset(userProfile?.disability); setIsEditMode(false); }}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                {isSubmitting || isUploading ? 'Saving...' : 'Save Disclosure'}
                </Button>
            </div>
        </form>
      ) : (
        <div className="space-y-4 text-sm">
             <div className="flex justify-end">
                <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
            </div>
            {userProfile?.disability && (userProfile.disability.visionImpairment || userProfile.disability.hearingImpairment || userProfile.disability.mobilityImpairment || userProfile.disability.preferNotToSay) ? (
                <>
                   <ul className="list-disc pl-5 space-y-1">
                      {userProfile.disability.visionImpairment && <li>Vision Impairment
                        <ul className="list-circle pl-5">
                            {userProfile.disability.lowVision && <li>Low Vision</li>}
                            {userProfile.disability.blind && <li>Blind / Screen reader user</li>}
                        </ul>
                      </li>}
                      {userProfile.disability.hearingImpairment && <li>Hearing Impairment</li>}
                      {userProfile.disability.mobilityImpairment && <li>Mobility Impairment</li>}
                      {userProfile.disability.preferNotToSay && <li>Prefer not to say</li>}
                   </ul>
                   {userProfile.disability.disabilityIdUrl && (
                       <div>
                           <p className="font-medium">Uploaded ID:</p>
                           <Button variant="link" asChild className="p-0 h-auto">
                               <Link href={userProfile.disability.disabilityIdUrl} target="_blank" rel="noopener noreferrer">View Document</Link>
                           </Button>
                       </div>
                   )}
                </>
            ) : (
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                  <p>You have not disclosed any information.</p>
                  <Button variant="secondary" className="mt-4" onClick={() => setIsEditMode(true)}>Add Disclosure</Button>
                </div>
            )}
        </div>
      )}
    </div>
  );
}
