
'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useGuideMatcher } from '@/hooks/use-guide-matcher';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, UserCheck, MapPin, Star, CheckCircle, User as UserIcon, CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { submitTravelRequest } from '@/lib/actions';
import { format, parseISO } from 'date-fns';
import { AriaLive } from '@/components/ui/aria-live';

function GuideCardSkeleton() {
    return (
        <Card className="flex flex-col">
           <CardHeader className="flex-row items-start gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <div className="flex gap-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                   <Skeleton className="h-4 w-24" />
                </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                 <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </CardContent>
            <CardFooter>
                 <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    )
}

function GuideListSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <GuideCardSkeleton />
            <GuideCardSkeleton />
            <GuideCardSkeleton />
        </div>
    )
}

function GuideExpertiseTags({ guide, request }: { guide: any, request: TravelRequest | null }) {
    if (!guide.guideProfile?.disabilityExpertise || !request) return null;

    const expertise = guide.guideProfile.disabilityExpertise;
    const requestPurpose = request.purposeData;
    const tags: React.ReactNode[] = [];

    // Check for sign language match
    if (request.travelerData?.disability?.requiresSignLanguageGuide) {
        if (expertise.hearingSupport?.knowsSignLanguage === true) {
            tags.push(
                <div key="sign-language" className="flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-1 rounded-full">
                    <Star className="h-3 w-3" />
                    <span>Knows Sign Language</span>
                </div>
            );
        }
    }
    
    // Check for scribe expertise match and list the subjects
    if (requestPurpose?.purpose === 'education' && requestPurpose.subPurposeData?.subPurpose === 'scribe') {
        if (expertise.visionSupport?.willingToScribe === 'yes') {
            const matchedSubjects = (requestPurpose.subPurposeData.scribeSubjects || []).filter((sub: string) =>
                (expertise.visionSupport?.scribeSubjects || []).includes(sub)
            );
            if (matchedSubjects.length > 0) {
                 tags.push(
                    <div key="scribe" className="w-full text-sm">
                        <p className="font-semibold text-muted-foreground">Can scribe for:</p>
                        <p className="font-medium capitalize">{matchedSubjects.join(', ').replace(/_/g, ' ')}</p>
                    </div>
                );
            }
        }
    }

    if (tags.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {tags}
        </div>
    );
}

export default function FindGuidePage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.requestId as string;
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);

    const requestDocRef = useMemoFirebase(() => {
        if (!firestore || !requestId) return null;
        return doc(firestore, 'travelRequests', requestId);
    }, [firestore, requestId]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<TravelRequest>(requestDocRef);

    const travelerDocRef = useMemoFirebase(() => {
        if (!firestore || !request?.travelerId) return null;
        return doc(firestore, 'users', request.travelerId);
    }, [firestore, request?.travelerId]);

    const { data: traveler, isLoading: isTravelerLoading } = useDoc<UserData>(travelerDocRef);
    
    const { matchedGuides, isLoading: areGuidesLoading } = useGuideMatcher(request, traveler);
    
    const isLoading = isRequestLoading || isTravelerLoading || areGuidesLoading;
    
    const handleSelectGuide = async (guideId: string) => {
        if (!requestDocRef || !traveler) return;
        
        setSelectedGuideId(guideId);
        setIsSubmitting(true);

        const result = await submitTravelRequest(requestDocRef.id, guideId);

        if (result.success) {
             toast({
                title: "Guide Selected!",
                description: "The guide has been notified. You can track the confirmation status in 'My Bookings'."
            });
            router.push('/traveler/my-bookings');
        } else {
             toast({
                variant: 'destructive',
                title: "Something went wrong",
                description: result.message || "Could not select the guide. Please try again."
            });
            setIsSubmitting(false);
            setSelectedGuideId(null);
        }
    }

    const getAvailabilityText = () => {
        if (!request || !request.purposeData?.purpose || !request.requestedDate) {
            return "Available";
        }
        const purposeText = request.purposeData.purpose.replace('-', ' ');
        const dateText = format(parseISO(request.requestedDate), 'PPP');
        return `Available on ${dateText} for ${purposeText} support`;
    }

    const getSubtitleText = () => {
        if (isLoading) {
            return "We are filtering guides based on your request's criteria...";
        }
        if (matchedGuides.length > 0) {
            return "We’ve found these guides based on your request's location and expertise.";
        }
        return "No guides matched all your criteria.";
    }


    return (
        <div className="container mx-auto py-8">
            <AriaLive message={isLoading ? "Filtering guides..." : "Guide search complete."} />
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Find Your Guide</h1>
                    <div className="text-lg text-muted-foreground">
                        {getSubtitleText()}
                    </div>
                </div>
                 <Button variant="outline" onClick={() => router.push('/traveler/dashboard')}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
                </Button>
            </div>

            {isLoading ? (
                <GuideListSkeleton />
            ) : matchedGuides.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {matchedGuides.map(guide => (
                        <Card key={guide.uid} className="flex flex-col">
                           <CardHeader className="flex-row items-start gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={guide.photoURL} alt={guide.photoAlt || `Photo of ${guide.name}`} />
                                    <AvatarFallback>{guide.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <CardTitle as="h2" className="text-lg">{guide.name}</CardTitle>
                                     <div className="flex items-center gap-2">
                                        <Badge variant="secondary">
                                            <CheckCircle className="mr-1 h-3 w-3" />
                                            Verified Guide
                                        </Badge>
                                    </div>
                                     {guide.guideProfile?.address?.district && (
                                        <div className="flex items-center text-sm text-muted-foreground pt-1">
                                            <MapPin className="mr-1 h-4 w-4" />
                                            <span>{guide.guideProfile.address.district}</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-4">
                                <div className="p-3 bg-primary/5 rounded-md text-primary-foreground">
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                        <span className="text-primary">{getAvailabilityText()}</span>
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <UserIcon className="h-4 w-4" />
                                        <span>{guide.gender}</span>
                                    </div>
                                </div>
                                <GuideExpertiseTags guide={guide} request={request} />
                            </CardContent>
                            <CardFooter>
                                <Button 
                                    className="w-full" 
                                    onClick={() => handleSelectGuide(guide.uid)}
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting && selectedGuideId === guide.uid ? 'Notifying...' : (
                                        <>
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            Select Guide & Notify
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="flex justify-center">
                    <Card className="max-w-lg text-center">
                        <CardHeader>
                            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                                <Search className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle>No Perfect Matches Found Yet</CardTitle>
                            <CardDescription>
                                We couldn't find any guides who perfectly match all your criteria right now. New guides are joining all the time.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Alert>
                                <AlertTitle>What Happens Next?</AlertTitle>
                                <AlertDescription>
                                    Your request has been submitted to our wider guide network. We will notify you as soon as a guide accepts your request. You can check the status on your "My Bookings" page.
                                </AlertDescription>
                            </Alert>
                        </CardContent>
                        <CardFooter>
                             <Button asChild className="w-full">
                                <Link href="/traveler/my-bookings">Check My Bookings</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
