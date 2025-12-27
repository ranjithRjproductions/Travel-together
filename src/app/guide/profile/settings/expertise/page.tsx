'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';

const expertiseAreas = [
    { id: 'education', label: 'Education Support (familiar with local educational places)' },
    { id: 'shopping', label: 'Shopping Assistance (familiar with local shopping areas)' },
    { id: 'hospital', label: 'Hospital Guidance (familiar with local hospitals)' },
];

const languages = ['Tamil', 'English', 'Hindi', 'Malayalam', 'Kannada'];

const expertiseSchema = z.object({
    hasDisabilityExperience: z.enum(['yes', 'no'], { required_error: 'Please select an option.' }),
    experienceType: z.enum(['visually-impaired', 'hearing-impaired']).optional(),
    visionSupport: z.object({
        specialization: z.enum(['totally-blind', 'low-vision']).optional(),
    }).optional(),
    hearingSupport: z.object({
        knowsSignLanguage: z.boolean().default(false),
    }).optional(),
    localExpertise: z.array(z.string()).refine(value => value.some(item => item), {
        message: "You have to select at least one area of expertise.",
    }),
    readingLanguages: z.array(z.string()).optional(),
    writingLanguages: z.array(z.string()).optional(),
    willingToUseVehicle: z.enum(['yes', 'no'], { required_error: 'Please select an option.' }),
    driversLicenseUrl: z.string().url().optional(), // Make this optional in the schema for initial validation
    agreeToAwareness: z.boolean().refine(val => val === true, {
        message: 'You must acknowledge your awareness.',
    }),
    agreeToTraining: z.boolean().refine(val => val === true, {
        message: 'You must agree to the training and interview.',
    }),
}).superRefine((data, ctx) => {
    if (data.hasDisabilityExperience === 'yes' && !data.experienceType) {
        ctx.addIssue({ code: 'custom', message: 'Please select the type of disability experience.', path: ['experienceType'] });
    }
});


type ExpertiseFormData = z.infer<typeof expertiseSchema>;

export default function GuideExpertisePage() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const storage = useStorage();
    const { toast } = useToast();
    const router = useRouter();

    const [isEditMode, setIsEditMode] = useState(false);
    const [guideProfile, setGuideProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const guideProfileDocRef = useMemo(() => {
        if (user && firestore) {
            return doc(firestore, `users/${user.uid}/guideProfile/guide-profile-doc`);
        }
        return null;
    }, [user, firestore]);
    
    const {
        control,
        handleSubmit,
        register,
        reset,
        watch,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ExpertiseFormData>({
        resolver: zodResolver(expertiseSchema),
        defaultValues: {
            localExpertise: [],
            readingLanguages: [],
            writingLanguages: [],
            agreeToAwareness: false,
            agreeToTraining: false,
        }
    });

    const hasDisabilityExperience = watch('hasDisabilityExperience');
    const willingToUseVehicle = watch('willingToUseVehicle');
    const formIsSubmitting = isSubmitting || isUploading;

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
                    if (data.disabilityExpertise) {
                        reset(data.disabilityExpertise);
                        setIsEditMode(false);
                    } else {
                        setIsEditMode(true);
                    }
                } else {
                    setIsEditMode(true);
                }
            } catch (error) {
                console.error("Error fetching guide profile:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not load your expertise data.' });
                setIsEditMode(true);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGuideProfile();
    }, [guideProfileDocRef, isUserLoading, reset, toast]);

    const handleLicenseFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
            setLicenseFile(file);
        } else {
            toast({ variant: "destructive", title: "Invalid File Type", description: "Please upload a PDF or image file." });
        }
    };
    
    const uploadLicense = async (file: File): Promise<string> => {
        if (!storage || !user) throw new Error("Storage or user not available.");
        setIsUploading(true);
        const filePath = `guide-licenses/${user.uid}/${file.name}`;
        const fileRef = storageRef(storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, file);

        return new Promise((resolve, reject) => {
            uploadTask.on('state_changed',
                (snapshot) => setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
                (error) => { setIsUploading(false); reject(error); },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    setIsUploading(false);
                    resolve(downloadURL);
                }
            );
        });
    };

    const onSubmit: SubmitHandler<ExpertiseFormData> = async (data) => {
        if (!guideProfileDocRef) return;
        
        let finalData = { ...data };

        try {
            if (licenseFile) {
                const url = await uploadLicense(licenseFile);
                finalData.driversLicenseUrl = url;
            }

            if (data.willingToUseVehicle === 'yes' && !finalData.driversLicenseUrl) {
                toast({ variant: 'destructive', title: 'Validation Error', description: 'Please upload your driver\'s license to proceed.' });
                return;
            }

            await setDoc(guideProfileDocRef, { disabilityExpertise: finalData }, { merge: true });
            toast({ title: 'Success', description: 'Your expertise has been saved.' });
            setGuideProfile((prev: any) => ({ ...prev, disabilityExpertise: finalData }));
            setIsEditMode(false);
            router.push('/guide/profile/settings/verification');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save expertise details.' });
        }
    };

    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    const currentExpertise = guideProfile?.disabilityExpertise;

    return (
        <div>
            <CardDescription className="mb-6">
                This section has important questions. Kindly answer them slowly for getting a perfect match.
            </CardDescription>

            {isEditMode ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Disability Experience */}
                    <fieldset>
                        <legend className="text-sm font-medium mb-2">Have you ever assisted a person with a disability?</legend>
                        <Controller name="hasDisabilityExperience" control={control} render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="exp-yes" /><Label htmlFor="exp-yes" className="font-normal">Yes</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="exp-no" /><Label htmlFor="exp-no" className="font-normal">No</Label></div>
                            </RadioGroup>
                        )} />
                        {errors.hasDisabilityExperience && <p className="text-sm text-destructive mt-2">{errors.hasDisabilityExperience.message}</p>}
                    </fieldset>

                    {hasDisabilityExperience === 'yes' && (
                        <fieldset className="pl-6 border-l-2 border-muted space-y-4">
                             <legend className="text-sm font-medium mb-2">What kind of disability are you experienced with?</legend>
                            <Controller name="experienceType" control={control} render={({ field }) => (
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="visually-impaired" id="visually-impaired" /><Label htmlFor="visually-impaired" className="font-normal">Visually Impaired</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="hearing-impaired" id="hearing-impaired" /><Label htmlFor="hearing-impaired" className="font-normal">Hearing Impaired</Label></div>
                                </RadioGroup>
                            )} />
                            {errors.experienceType && <p className="text-sm text-destructive mt-2">{errors.experienceType.message}</p>}
                        </fieldset>
                    )}

                    {/* Local Expertise */}
                    <fieldset>
                        <legend className="text-sm font-medium mb-2">Select your areas of expertise in your local places.</legend>
                        {expertiseAreas.map(item => (
                            <Controller key={item.id} name="localExpertise" control={control} render={({ field }) => (
                                <div className="flex items-start space-x-2 my-2">
                                    <Checkbox id={item.id} checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(field.value?.filter(v => v !== item.id));
                                        }}
                                    />
                                    <Label htmlFor={item.id} className="font-normal text-sm">{item.label}</Label>
                                </div>
                            )} />
                        ))}
                         {errors.localExpertise && <p className="text-sm text-destructive mt-2">{errors.localExpertise.message}</p>}
                    </fieldset>

                    {/* Language Expertise */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <fieldset>
                            <legend className="text-sm font-medium mb-2">Languages you can read:</legend>
                             {languages.map(lang => (
                                <Controller key={lang} name="readingLanguages" control={control} render={({ field }) => (
                                    <div className="flex items-start space-x-2 my-2">
                                        <Checkbox id={`read-${lang}`} checked={field.value?.includes(lang)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), lang])
                                                    : field.onChange(field.value?.filter(v => v !== lang));
                                            }}
                                        />
                                        <Label htmlFor={`read-${lang}`} className="font-normal text-sm">{lang}</Label>
                                    </div>
                                )} />
                            ))}
                        </fieldset>
                         <fieldset>
                            <legend className="text-sm font-medium mb-2">Languages you can write:</legend>
                             {languages.map(lang => (
                                <Controller key={lang} name="writingLanguages" control={control} render={({ field }) => (
                                    <div className="flex items-start space-x-2 my-2">
                                        <Checkbox id={`write-${lang}`} checked={field.value?.includes(lang)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                    ? field.onChange([...(field.value || []), lang])
                                                    : field.onChange(field.value?.filter(v => v !== lang));
                                            }}
                                        />
                                        <Label htmlFor={`write-${lang}`} className="font-normal text-sm">{lang}</Label>
                                    </div>
                                )} />
                            ))}
                        </fieldset>
                    </div>

                    {/* Vehicle Support */}
                     <fieldset>
                        <legend className="text-sm font-medium mb-2">Are you willing to provide support with your own vehicle? (Fuel will be paid)</legend>
                        <Controller name="willingToUseVehicle" control={control} render={({ field }) => (
                            <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center gap-4">
                                <div className="flex items-center space-x-2"><RadioGroupItem value="yes" id="vehicle-yes" /><Label htmlFor="vehicle-yes" className="font-normal">Yes</Label></div>
                                <div className="flex items-center space-x-2"><RadioGroupItem value="no" id="vehicle-no" /><Label htmlFor="vehicle-no" className="font-normal">No</Label></div>
                            </RadioGroup>
                        )} />
                        {errors.willingToUseVehicle && <p className="text-sm text-destructive mt-2">{errors.willingToUseVehicle.message}</p>}
                    </fieldset>

                    {willingToUseVehicle === 'yes' && (
                        <fieldset className="pl-6 border-l-2 border-muted space-y-2">
                            <Label htmlFor="license-upload">Upload Driver's License Copy (PDF/Image)</Label>
                            <Input id="license-upload" type="file" accept="image/*,application/pdf" onChange={handleLicenseFileChange} disabled={formIsSubmitting}/>
                             {licenseFile && <p className="text-sm text-muted-foreground">Selected: {licenseFile.name}</p>}
                             {!licenseFile && currentExpertise?.driversLicenseUrl && <a href={currentExpertise.driversLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View Current License</a>}
                            {isUploading && <div className="w-full mt-2"><Progress value={uploadProgress} /><p className="text-xs text-center text-muted-foreground mt-1">{uploadProgress}%</p></div>}
                            {errors.driversLicenseUrl && <p className="text-sm text-destructive mt-2">{errors.driversLicenseUrl.message}</p>}
                        </fieldset>
                    )}

                    {/* Training Agreement */}
                     <fieldset className="pt-4 border-t space-y-4">
                         <Controller name="agreeToAwareness" control={control} render={({ field }) => (
                            <div className="flex items-start space-x-3">
                                <Checkbox id="agreeToAwareness" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                                <Label htmlFor="agreeToAwareness" className="font-normal">I must be aware of more things before guiding friends with disabilities and assisting their needs.</Label>
                            </div>
                        )} />
                        {errors.agreeToAwareness && <p className="text-sm text-destructive mt-2">{errors.agreeToAwareness.message}</p>}
                        
                         <Controller name="agreeToTraining" control={control} render={({ field }) => (
                            <div className="flex items-start space-x-3">
                                <Checkbox id="agreeToTraining" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                                 <Label htmlFor="agreeToTraining" className="font-normal">I agree to take online training and am ready to attend an interview.</Label>
                            </div>
                        )} />
                        {errors.agreeToTraining && <p className="text-sm text-destructive mt-2">{errors.agreeToTraining.message}</p>}
                    </fieldset>

                    <div className="flex justify-end gap-2">
                        {currentExpertise && <Button variant="ghost" type="button" onClick={() => { reset(currentExpertise); setIsEditMode(false); }}>Cancel</Button>}
                        <Button type="submit" disabled={formIsSubmitting}>
                            {formIsSubmitting ? 'Saving...' : 'Save and Continue'}
                        </Button>
                    </div>
                </form>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-end gap-2">
                         <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
                    </div>
                    {currentExpertise ? (
                         <Button onClick={() => router.push('/guide/profile/settings/verification')}>Next Step</Button>
                    ) : (
                         <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                            <p>You haven't added your expertise details yet.</p>
                            <Button variant="link" className="mt-2" onClick={() => setIsEditMode(true)}>Add Expertise</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
