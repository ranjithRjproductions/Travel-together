
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useGuideMatcher } from '@/hooks/use-guide-matcher';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Search, UserCheck } from 'lucide-react';
import Link from 'next/link';

function GuideListSkeleton() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                 <Card key={i} className="flex flex-col">
                    <CardHeader className="flex-row items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-5 w-32" />
                           <Skeleton className="h-4 w-24" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow space-y-2">
                        <Skeleton className="h-4 w-full" />
                         <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-10 w-full" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    )
}


export default function FindGuidePage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.requestId as string;
    const { user: authUser } = useUser();
    const firestore = useFirestore();

    const requestDocRef = useMemoFirebase(() => {
        if (!firestore || !requestId) return null;
        return doc(firestore, 'travelRequests', requestId);
    }, [firestore, requestId]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<TravelRequest>(requestDocRef);

    const travelerDocRef = useMemoFirebase(() => {
        if (!firestore || !authUser) return null;
        return doc(firestore, 'users', authUser.uid);
    }, [firestore, authUser]);

    const { data: traveler, isLoading: isTravelerLoading } = useDoc<UserData>(travelerDocRef);
    
    // The guide matcher hook now encapsulates all the complex logic.
    const { matchedGuides, isLoading: areGuidesLoading } = useGuideMatcher(request, traveler);
    
    const isLoading = isRequestLoading || isTravelerLoading || areGuidesLoading;

    return (
        <div className="container mx-auto py-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Find Your Guide</h1>
            <p className="text-lg text-muted-foreground mb-8">
                We've found guides who match your specific needs. Choose the one that's right for you.
            </p>

            {isLoading ? (
                <GuideListSkeleton />
            ) : matchedGuides.length > 0 ? (
                 <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {matchedGuides.map(guide => (
                        <Card key={guide.uid} className="flex flex-col">
                            <CardHeader className="flex-row items-center gap-4">
                                 <Avatar className="h-12 w-12">
                                    <AvatarImage src={guide.photoURL} alt={guide.photoAlt || `Photo of ${guide.name}`} />
                                    <AvatarFallback>{guide.name.split(' ').map(n => n[0]).join('').toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle as="h2" className="text-lg">{guide.name}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-muted-foreground line-clamp-3">
                                    A brief bio about the guide will go here. They have experience in your requested areas and are ready to help.
                                </p>
                            </CardContent>
                            <CardFooter>
                                <Button className="w-full">
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Select Guide
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
