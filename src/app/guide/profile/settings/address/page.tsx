'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useStorage } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
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
import { Progress } from '@/components/ui/progress';

const addressSchema = z.object({
  addressLine1: z.string().min(1, 'Address Line 1 is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Must be a 6-digit pincode'),
  country: z.string().min(1, 'Country is required'),
  isDefault: z.boolean().default(false),
  addressProofUrl: z.string().url().optional(),
  agreedToAddressProof: z.boolean().refine(val => val === true, {
    message: 'You must agree to provide address proof.',
  }),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function GuideAddressPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const router = useRouter();
  const [isEditMode, setIsEditMode] = useState(false);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
        addressLine1: '',
        addressLine2: '',
        city: '',
        district: '',
        pincode: '',
        country: 'India',
        state: 'Tamil Nadu',
        isDefault: true,
        agreedToAddressProof: false,
    }
  });

  const [guideProfile, setGuideProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isFormSubmitting = isSubmitting || isUploading;

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      setAddressProofFile(file);
    } else {
        toast({
            variant: "destructive",
            title: "Invalid File Type",
            description: "Please select a PDF or Image file."
        });
    }
  };

  const uploadProof = async (file: File): Promise<string> => {
    if (!storage || !user) throw new Error("Storage or user not available.");

    const filePath = `guide-address-proofs/${user.uid}/${file.name}`;
    const fileRef = storageRef(storage, filePath);
    const uploadTask = uploadBytesResumable(fileRef, file);

    return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(Math.round(progress));
            },
            (error) => {
                console.error("Upload error:", error);
                reject(error);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                resolve(downloadURL);
            }
        );
    });
  };

  const onSubmit: SubmitHandler<AddressFormData> = async (data) => {
    if (!guideProfileDocRef) return;
    if (!addressProofFile && !guideProfile?.address?.addressProofUrl) {
      toast({ variant: 'destructive', title: 'Address Proof Required', description: 'Please upload a document to verify your address.' });
      return;
    }
    
    setIsUploading(true);
    let proofUrl = guideProfile?.address?.addressProofUrl;

    try {
      if (addressProofFile) {
        proofUrl = await uploadProof(addressProofFile);
      }

      const addressData = { ...data, addressProofUrl: proofUrl };

      await setDoc(guideProfileDocRef, { address: addressData }, { merge: true });
      toast({
        title: 'Success',
        description: 'Your address has been saved.',
      });
      setGuideProfile((prev: any) => ({ ...prev, address: addressData }));
      setIsEditMode(false);
      router.push('/guide/profile/settings/contact');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save address.',
      });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  const currentAddress = guideProfile?.address;

  return (
    <div>
       <CardDescription className="mb-6">
        Please provide the primary address from which you will operate as a guide. An address proof document is required for verification.
       </CardDescription>

      {isEditMode ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="addressLine1">Address Line 1</Label>
            <Input id="addressLine1" {...register('addressLine1')} aria-invalid={errors.addressLine1 ? "true" : "false"} />
            {errors.addressLine1 && <p className="text-sm text-destructive">{errors.addressLine1.message}</p>}
          </div>
          <div>
            <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
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
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register('country')} readOnly />
            </div>
          </div>
           <div className="space-y-2">
            <Label htmlFor="pincode">Pincode</Label>
            <Input id="pincode" {...register('pincode')} aria-invalid={errors.pincode ? "true" : "false"} maxLength={6} />
            {errors.pincode && <p className="text-sm text-destructive">{errors.pincode.message}</p>}
          </div>
           <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="address-proof-upload">Address Proof (PDF/Image)</Label>
              <p id="proof-description" className="text-sm text-muted-foreground">
                Upload a document like a utility bill or government ID showing this address.
              </p>
              <Input id="address-proof-upload" type="file" accept="image/*,application/pdf" onChange={handleFileChange} disabled={isFormSubmitting} aria-describedby="proof-description"/>
              {addressProofFile && <p className="text-sm text-muted-foreground">Selected: {addressProofFile.name}</p>}
              {!addressProofFile && currentAddress?.addressProofUrl && <p className="text-sm text-muted-foreground">Current: A document is on file.</p>}
              {isUploading && <div className="w-full mt-2"><Progress value={uploadProgress} /><p className="text-xs text-center text-muted-foreground mt-1">{uploadProgress}%</p></div>}
          </div>
           <div className="flex items-start space-x-2">
             <Controller
                name="agreedToAddressProof"
                control={control}
                render={({ field }) => <Checkbox id="agreedToAddressProof" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />}
              />
              <Label htmlFor="agreedToAddressProof" className="font-normal text-sm">To give the safest travel experiences to our friends with disabilities, we collect address proof. I understand and share this responsibility.</Label>
          </div>
            {errors.agreedToAddressProof && <p className="text-sm text-destructive">{errors.agreedToAddressProof.message}</p>}
          <div className="flex justify-end gap-2">
            {currentAddress && <Button variant="ghost" type="button" onClick={() => { reset(currentAddress); setIsEditMode(false); }}>Cancel</Button>}
            <Button type="submit" disabled={isFormSubmitting}>
              {isFormSubmitting ? 'Saving...' : 'Save and Continue'}
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
                    {currentAddress.addressLine2 && <p>{currentAddress.addressLine2}</p>}
                    <p>{currentAddress.city}, {currentAddress.district}, {currentAddress.pincode}</p>
                    <p>{currentAddress.state}, {currentAddress.country}</p>
                    {currentAddress.addressProofUrl && (
                        <div>
                            <p className="font-medium text-muted-foreground mt-2">Address Proof</p>
                            <a href={currentAddress.addressProofUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">View Document</a>
                        </div>
                    )}
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
