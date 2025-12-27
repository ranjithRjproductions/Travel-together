'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

import { CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

const expertiseSchema = z.object({
    experienceType: z.enum(['visually-impaired', 'hearing-impaired'], {
        required_error: 'Please select an experience type.',
    }),
    visionSupport: z.object({
        specialization: z.enum(['totally-blind', 'low-vision']).optional(),
        description: z.string().optional(),
    }).optional(),
    hearingSupport: z.object({
        knowsSignLanguage: z.boolean().default(false),
        description: z.string().optional(),
    }).optional(),
    isTrained: z.boolean({
        required_error: 'Please specify if you are trained.',
    }),
    agreedToDisclaimer: z.boolean().optional(),
}).superRefine((data, ctx) => {
    if (data.experienceType === 'visually-impaired' && !data.visionSupport?.specialization) {
        ctx.addIssue({ code: 'custom', message: 'Please select a vision support specialization.', path: ['visionSupport.specialization'] });
    }
    if (data.isTrained && !data.agreedToDisclaimer) {
        ctx.addIssue({ code: 'custom', message: 'You must agree to the disclaimer if you are trained.', path: ['agreedToDisclaimer'] });
    }
});


type ExpertiseFormData = z.infer<typeof expertiseSchema>;

export default function GuideExpertisePage() {
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
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<ExpertiseFormData>({
        resolver: zodResolver(expertiseSchema),
        defaultValues: {
            isTrained: undefined,
            agreedToDisclaimer: false,
            visionSupport: { specialization: undefined, description: '' },
            hearingSupport: { knowsSignLanguage: false, description: '' },
        }
    });

    const experienceType = watch('experienceType');
    const isTrained = watch('isTrained');

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

    const onSubmit: SubmitHandler<ExpertiseFormData> = async (data) => {
        if (!guideProfileDocRef) return;
        try {
            await setDoc(guideProfileDocRef, { disabilityExpertise: data }, { merge: true });
            toast({ title: 'Success', description: 'Your expertise has been saved.' });
            setGuideProfile((prev: any) => ({ ...prev, disabilityExpertise: data }));
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

    const renderSavedData = () => {
        if (!currentExpertise) {
            return (
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                    <p>You haven't added your disability expertise yet.</p>
                    <Button variant="link" className="mt-2" onClick={() => setIsEditMode(true)}>Add Expertise</Button>
                </div>
            );
        }

        return (
            <div className="space-y-4 text-sm">
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsEditMode(true)}>Edit</Button>
                </div>
                <div>
                    <p className="font-medium text-muted-foreground">Experience With</p>
                    <p>{currentExpertise.experienceType === 'visually-impaired' ? 'Visually Impaired Travelers' : 'Hearing Impaired Travelers'}</p>
                </div>
                {currentExpertise.experienceType === 'visually-impaired' && currentExpertise.visionSupport && (
                    <>
                        <div>
                            <p className="font-medium text-muted-foreground">Specialization</p>
                            <p>{currentExpertise.visionSupport.specialization === 'totally-blind' ? 'Totally Blind' : 'Low Vision'}</p>
                        </div>
                        {currentExpertise.visionSupport.description && (
                             <div>
                                <p className="font-medium text-muted-foreground">Description</p>
                                <p className="whitespace-pre-wrap">{currentExpertise.visionSupport.description}</p>
                            </div>
                        )}
                    </>
                )}
                 {currentExpertise.experienceType === 'hearing-impaired' && currentExpertise.hearingSupport && (
                    <>
                        <div>
                            <p className="font-medium text-muted-foreground">Knows Sign Language</p>
                            <p>{currentExpertise.hearingSupport.knowsSignLanguage ? 'Yes' : 'No'}</p>
                        </div>
                        {currentExpertise.hearingSupport.description && (
                             <div>
                                <p className="font-medium text-muted-foreground">Description</p>
                                <p className="whitespace-pre-wrap">{currentExpertise.hearingSupport.description}</p>
                            </div>
                        )}
                    </>
                )}
                 <div>
                    <p className="font-medium text-muted-foreground">Formally Trained</p>
                    <p>{currentExpertise.isTrained ? 'Yes' : 'No'}</p>
                </div>
                <div className="flex justify-end pt-4">
                    <Button onClick={() => router.push('/guide/profile/settings/verification')}>Next Step</Button>
                </div>
            </div>
        )
    };

    return (
        <div>
            <CardDescription className="mb-6">
                Detail your experience and training in assisting travelers with disabilities. This helps travelers find the right guide for their needs.
            </CardDescription>

            {isEditMode ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <fieldset>
                        <legend className="text-sm font-medium mb-2">Which disability support are you experienced with?</legend>
                        <Controller
                            name="experienceType"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="visually-impaired" id="visually-impaired" />
                                        <Label htmlFor="visually-impaired" className="font-normal">Visually Impaired</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="hearing-impaired" id="hearing-impaired" />
                                        <Label htmlFor="hearing-impaired" className="font-normal">Hearing Impaired</Label>
                                    </div>
                                </RadioGroup>
                            )}
                        />
                        {errors.experienceType && <p className="text-sm text-destructive mt-2">{errors.experienceType.message}</p>}
                    </fieldset>

                    {experienceType === 'visually-impaired' && (
                        <fieldset className="pl-6 border-l-2 border-muted space-y-4">
                            <div>
                                <legend className="text-sm font-medium mb-2">Please specify your support specialization:</legend>
                                <Controller
                                    name="visionSupport.specialization"
                                    control={control}
                                    render={({ field }) => (
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="space-y-2">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="totally-blind" id="totally-blind" /><Label htmlFor="totally-blind" className="font-normal">Totally Blind</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="low-vision" id="low-vision" /><Label htmlFor="low-vision" className="font-normal">Low Vision</Label></div>
                                        </RadioGroup>
                                    )}
                                />
                                {errors.visionSupport?.specialization && <p className="text-sm text-destructive mt-2">{errors.visionSupport.specialization.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="vision-description">Optional: Describe your experience supporting visually impaired travelers.</Label>
                                <Controller name="visionSupport.description" control={control} render={({ field }) => <Textarea id="vision-description" {...field} />} />
                            </div>
                        </fieldset>
                    )}

                    {experienceType === 'hearing-impaired' && (
                         <fieldset className="pl-6 border-l-2 border-muted space-y-4">
                            <Controller
                                name="hearingSupport.knowsSignLanguage"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-start space-x-2">
                                        <Checkbox id="knows-sign-language" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                                        <Label htmlFor="knows-sign-language" className="font-normal text-sm">Do you know sign language?</Label>
                                    </div>
                                )}
                            />
                             <div>
                                <Label htmlFor="hearing-description">Optional: Describe your experience supporting hearing impaired travelers.</Label>
                                <Controller name="hearingSupport.description" control={control} render={({ field }) => <Textarea id="hearing-description" {...field} />} />
                            </div>
                        </fieldset>
                    )}

                    <fieldset className="pt-4 border-t">
                        <legend className="text-sm font-medium mb-2">Are you trained to assist persons with disabilities?</legend>
                         <Controller
                            name="isTrained"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup onValueChange={(val) => field.onChange(val === 'true')} value={String(field.value)} className="flex items-center gap-4">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="true" id="trained-yes" /><Label htmlFor="trained-yes" className="font-normal">Yes</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="false" id="trained-no" /><Label htmlFor="trained-no" className="font-normal">No</Label></div>
                                </RadioGroup>
                            )}
                        />
                        {errors.isTrained && <p className="text-sm text-destructive mt-2">{errors.isTrained.message}</p>}
                    </fieldset>
                    
                    {isTrained === true && (
                        <div className="pl-6">
                            <Controller
                                name="agreedToDisclaimer"
                                control={control}
                                render={({ field }) => (
                                <div className="flex items-start space-x-2">
                                    <Checkbox id="agreedToDisclaimer" checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                                    <Label htmlFor="agreedToDisclaimer" className="font-normal text-sm">I acknowledge that providing assistance requires specific skills and I confirm that I am qualified to offer this support.</Label>
                                </div>
                                )}
                            />
                            {errors.agreedToDisclaimer && <p className="text-sm text-destructive mt-2">{errors.agreedToDisclaimer.message}</p>}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        {currentExpertise && <Button variant="ghost" type="button" onClick={() => { reset(currentExpertise); setIsEditMode(false); }}>Cancel</Button>}
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save and Continue'}
                        </Button>
                    </div>
                </form>
            ) : (
                renderSavedData()
            )}
        </div>
    );
}
