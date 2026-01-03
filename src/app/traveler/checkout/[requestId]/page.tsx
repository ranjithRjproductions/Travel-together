
'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { type TravelRequest } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, CreditCard, MapPin } from 'lucide-react';
import { format } from 'date-fns';

function CheckoutPageSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-10 w-32" />
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                     <div className="space-y-2">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="text-center space-y-2 pt-4">
                         <Skeleton className="h-5 w-24 mx-auto" />
                         <Skeleton className="h-10 w-32 mx-auto" />
                    </div>
                    <Skeleton className="h-12 w-full mt-4" />
                </CardContent>
            </Card>
        </div>
    );
}

export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.requestId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();

    const requestDocRef = useMemo(() => {
        if (!firestore || !requestId) return null;
        return doc(firestore, 'travelRequests', requestId);
    }, [firestore, requestId]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<TravelRequest>(requestDocRef);

    const isLoading = isUserLoading || isRequestLoading;

    if (isLoading) {
        return <CheckoutPageSkeleton />;
    }

    if (!request || !user || user.uid !== request.travelerId) {
        return (
            <div className="text-center py-10">
                <p>Unable to load booking details.</p>
                <Button variant="link" onClick={() => router.push('/traveler/my-bookings')}>Go back</Button>
            </div>
        );
    }
    
    const getRequestTitle = (request: TravelRequest): string => {
        const { purposeData } = request;
        if (!purposeData?.purpose) return 'Untitled Request';
        let title = `${purposeData.purpose.charAt(0).toUpperCase() + purposeData.purpose.slice(1)}`;
        if (purposeData.purpose === 'education' && purposeData.subPurposeData?.subPurpose) {
            title += `: ${purposeData.subPurposeData.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support'}`;
        }
        return title;
    };
    
    const getLocationInfo = (request: TravelRequest) => {
        const { purposeData } = request;
        if (!purposeData) return null;

        switch (purposeData.purpose) {
        case 'education':
            return { name: purposeData.subPurposeData?.collegeName, district: purposeData.subPurposeData?.collegeAddress?.district };
        case 'hospital':
            return { name: purposeData.subPurposeData?.hospitalName, district: purposeData.subPurposeData?.hospitalAddress?.district };
        case 'shopping':
            if (purposeData.subPurposeData?.shopType === 'particular') {
                return { name: purposeData.subPurposeData?.shopName, district: purposeData.subPurposeData?.shopAddress?.district };
            }
            return { name: purposeData.subPurposeData?.shoppingArea?.area, district: purposeData.subPurposeData?.shoppingArea?.district };
        default:
            return null;
        }
  };

  const locationInfo = getLocationInfo(request);

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="font-headline text-3xl font-bold">Checkout</h1>
                 <Button variant="outline" onClick={() => router.push('/traveler/my-bookings')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Bookings
                </Button>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>{getRequestTitle(request)}</CardTitle>
                    <CardDescription>
                         for {request.requestedDate ? format(new Date(request.requestedDate), 'PPP') : 'N/A'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {locationInfo && (
                         <div className="space-y-2">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4" /> Location</p>
                            <p className="font-semibold">{locationInfo.name}, {locationInfo.district}</p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Guide</p>
                        <p className="font-semibold">{request.guideData?.name || 'Guide not assigned'}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Time</p>
                        <p>{request.startTime} - {request.endTime}</p>
                    </div>

                    <div className="text-center border-t pt-6">
                        <p className="text-muted-foreground">Amount to Pay</p>
                        <p className="text-4xl font-bold">₹{request.estimatedCost?.toFixed(2)}</p>
                    </div>

                    <Alert>
                        <CreditCard className="h-4 w-4" />
                        <AlertTitle>Secure Payment</AlertTitle>
                        <AlertDescription>
                            You will be redirected to Razorpay to complete your payment securely.
                        </AlertDescription>
                    </Alert>

                     <Button size="lg" className="w-full">
                        Proceed to Payment
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
