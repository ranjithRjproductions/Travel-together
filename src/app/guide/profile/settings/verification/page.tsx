'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, GraduationCap } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Verification | Let\'s Travel Together',
};

const verificationSchema = z.object({
  governmentIdUrl: z.string().url().optional(),
  proofDocumentUrl: z.string().url().optional(),
});

type VerificationFormData = z.infer<typeof verificationSchema>;

export default function GuideVerificationPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();

  const [guideProfile, setGuideProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [govIdFile, setGovIdFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  const [isUploadingGovId, setIsUploadingGovId] = useState(false);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [govIdProgress, setGovIdProgress] = useState(0);
  const [proofProgress, setProofProgress] = useState(0);

  const guideProfileDocRef = useMemo(() => {
    if (user && firestore) {
      return doc(firestore, `users/${user.uid}/guideProfile/guide-profile-doc`);
    }
    return null;
  }, [user, firestore]);

  const {
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<VerificationFormData>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
        governmentIdUrl: undefined,
        proofDocumentUrl: undefined,
    }
  });

  const formValues = watch();
  const isSubmittingForm = isSubmitting || isUploadingGovId || isUploadingProof;

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
          if (data.verification) {
            reset(data.verification);
          }
        }
      } catch (error) {
        console.error("Error fetching guide profile:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load your verification data.' });
      } finally {
        setIsLoading(false);
      }
    }
    fetchGuideProfile();
  }, [guideProfileDocRef, isUserLoading, reset, toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'govId' | 'proof') => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      if (fileType === 'govId') setGovIdFile(file);
      else setProofFile(file);
    } else {
      toast({ variant: "destructive", title: "Invalid File Type", description: "Please select a PDF or Image file." });
    }
  };

  const uploadFile = (file: File, path: string, setProgress: (p: number) => void): Promise<string> => {
    if (!storage || !user) throw new Error("Storage or user not available.");
    
    const fileRef = storageRef(storage, `guide-verification-docs/${user.uid}/${path}/${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
        (error) => reject(error),
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        }
      );
    });
  };

  const onSubmit: SubmitHandler<VerificationFormData> = async (data) => {
    if (!guideProfileDocRef) return;
    
    // Manual validation before submission
    if (!govIdFile && !formValues.governmentIdUrl) {
        toast({ variant: 'destructive', title: 'Missing Document', description: 'Government-issued ID is required.' });
        return;
    }
    if (!proofFile && !formValues.proofDocumentUrl) {
        toast({ variant: 'destructive', title: 'Missing Document', description: 'Proof of qualification is required.' });
        return;
    }

    let { governmentIdUrl, proofDocumentUrl } = formValues;

    try {
      if (govIdFile) {
        setIsUploadingGovId(true);
        governmentIdUrl = await uploadFile(govIdFile, 'govt-id', setGovIdProgress);
        setValue('governmentIdUrl', governmentIdUrl);
        setIsUploadingGovId(false);
      }
      if (proofFile) {
        setIsUploadingProof(true);
        proofDocumentUrl = await uploadFile(proofFile, 'qualification-proof', setProofProgress);
        setValue('proofDocumentUrl', proofDocumentUrl);
        setIsUploadingProof(false);
      }
      
      const finalData = { governmentIdUrl, proofDocumentUrl };
      
      await setDoc(guideProfileDocRef, { verification: finalData, onboardingState: 'verification-pending' }, { merge: true });

      toast({
        title: 'Profile Submitted!',
        description: 'Your verification documents have been submitted for review.',
      });
      // Re-fetch or update local state to show the submitted view
      setGuideProfile((prev: any) => ({ ...prev, verification: finalData, onboardingState: 'verification-pending' }));

    } catch (error: any) {
      console.error('Verification submit error:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message || 'Failed to submit documents.' });
      setIsUploadingGovId(false);
      setIsUploadingProof(false);
    }
  };
  
  if (isLoading) return <Skeleton className="h-96 w-full" />;

  const isSubmitted = guideProfile?.onboardingState === 'verification-pending' || guideProfile?.onboardingState === 'active';

  return (
    <div>
      <CardDescription className="mb-6">
        Please upload your government-issued ID and a document proving your qualification or training in disability assistance to complete your profile.
      </CardDescription>

      {isSubmitted ? (
        <Alert variant="default" className="bg-primary/10 border-primary/20">
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Profile Under Review</AlertTitle>
          <AlertDescription>
            Your profile and documents have been submitted for verification. We will notify you once the review process is complete. Thank you for your patience.
             <div className="mt-4">
                <Button onClick={() => router.push('/guide/learning-hub')}>
                    <GraduationCap className="mr-2" />
                    Go to Learning Hub
                </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="governmentId">Government-issued ID</Label>
            <Input id="governmentId" type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'govId')} disabled={isSubmittingForm} />
            {govIdFile && <p className="text-sm text-muted-foreground">Selected: {govIdFile.name}</p>}
            {!govIdFile && formValues.governmentIdUrl && <a href={formValues.governmentIdUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View current ID</a>}
            {isUploadingGovId && <Progress value={govIdProgress} className="w-full mt-2" />}
            {errors.governmentIdUrl && <p className="text-sm text-destructive">{errors.governmentIdUrl.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="proofDocument">Proof of Qualification</Label>
            <p className="text-sm text-muted-foreground">E.g., training certificate, professional license, etc.</p>
            <Input id="proofDocument" type="file" accept="image/*,application/pdf" onChange={(e) => handleFileChange(e, 'proof')} disabled={isSubmittingForm} />
            {proofFile && <p className="text-sm text-muted-foreground">Selected: {proofFile.name}</p>}
            {!proofFile && formValues.proofDocumentUrl && <a href={formValues.proofDocumentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View current proof</a>}
            {isUploadingProof && <Progress value={proofProgress} className="w-full mt-2" />}
            {errors.proofDocumentUrl && <p className="text-sm text-destructive">{errors.proofDocumentUrl.message}</p>}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isSubmittingForm}>
              {isSubmittingForm ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
