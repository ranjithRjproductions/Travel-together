'use client';

import { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { type TravelRequest } from '@/lib/definitions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, CreditCard, User, Calendar, Clock, MapPin, University, Hospital, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

declare const Razorpay: any;

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
                     <div className="space-y-4">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                     <div className="space-y-4">
                        <Skeleton className="h-5 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="text-right space-y-2 pt-4">
                         <Skeleton className="h-5 w-24 ml-auto" />
                         <Skeleton className="h-10 w-32 ml-auto" />
                    </div>
                </CardContent>
                 <CardFooter>
                    <Skeleton className="h-12 w-full" />
                </CardFooter>
            </Card>
        </div>
    );
}

const InfoRow = ({ label, value, icon: Icon }: { label: string, value?: React.ReactNode, icon?: React.ElementType }) => {
    if (!value) return null;
    return (
        <div className="flex items-start">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground mr-3 mt-1 flex-shrink-0" />}
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    );
};


export default function CheckoutPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.requestId as string;
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();

    const requestDocRef = useMemo(() => {
        if (!firestore || !requestId) return null;
        return doc(firestore, 'travelRequests', requestId);
    }, [firestore, requestId]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<TravelRequest>(requestDocRef);

    const isLoading = isUserLoading || isRequestLoading;
    
    const handlePayment = async () => {
        if (!request || !user || !requestDocRef) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load payment details. Please try again.",
            });
            return;
        }

        const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        if (!razorpayKeyId) {
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "Payment gateway is not configured.",
            });
            return;
        }
        
        const amountInRupees = Number(request.estimatedCost);
        if (isNaN(amountInRupees) || amountInRupees <= 0) {
             toast({
                variant: "destructive",
                title: "Invalid Amount",
                description: "The payment amount must be greater than zero.",
            });
            return;
        }
        
        const amountInPaise = amountInRupees * 100;

        const options = {
            key: razorpayKeyId,
            amount: amountInPaise,
            currency: "INR",
            name: "Let's Travel Together",
            description: `Payment for Request ID: ${request.id}`,
            image: "/logo.png",
            handler: function (response: any) {
                toast({
                    title: "Payment Submitted!",
                    description: "Your booking is being confirmed. Redirecting...",
                });
                router.push('/traveler/my-bookings');
            },
            prefill: {
                name: user.displayName || "Traveler",
                email: user.email || "",
                method: "upi", // Prefill UPI as the payment method
            },
            notes: {
                requestId: request.id,
            },
            theme: {
                color: "#FACC15", // Use accent color for the theme
            },
        };
        const rzp = new Razorpay(options);
        rzp.open();
    }

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
    
    const PurposeIcon = request.purposeData?.purpose === 'education' ? University : request.purposeData?.purpose === 'hospital' ? Hospital : ShoppingCart;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                 <h1 className="font-headline text-3xl font-bold">Payment Invoice</h1>
                 <Button variant="outline" onClick={() => router.push('/traveler/my-bookings')}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Bookings
                </Button>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <PurposeIcon className="h-6 w-6 text-primary" />
                        {getRequestTitle(request)}
                    </CardTitle>
                    <CardDescription>
                         Invoice for booking confirmed on {request.acceptedAt ? format(request.acceptedAt.toDate(), 'PPP') : 'N/A'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h3 className="font-semibold">Guide Details</h3>
                            <InfoRow label="Guide Name" value={request.guideData?.name} icon={User} />
                        </div>
                        <div className="space-y-4">
                             <h3 className="font-semibold">Service Details</h3>
                            <InfoRow label="Date" value={request.requestedDate ? format(new Date(request.requestedDate), 'PPPP') : 'N/A'} icon={Calendar}/>
                            <InfoRow label="Time" value={`${request.startTime} - ${request.endTime}`} icon={Clock} />
                        </div>
                    </div>

                    <Separator />

                    <div>
                        <h3 className="font-semibold mb-4">Cost Breakdown</h3>
                        <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                             <div className="flex justify-between items-center">
                                <span>Guide Service Fee</span>
                                <span className="font-semibold">₹{(request.estimatedCost || 0).toFixed(2)}</span>
                            </div>
                             <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Taxes & Platform Fees</span>
                                <span className="font-semibold">₹0.00</span>
                            </div>
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="flex justify-end items-center text-right">
                         <div>
                            <p className="text-muted-foreground">Total Amount Due</p>
                            <p className="text-2xl font-bold">₹{(request.estimatedCost || 0).toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex-col gap-4">
                     <Button size="lg" className="w-full" onClick={handlePayment}>
                        <CreditCard className="mr-2 h-5 w-5" />
                        Pay ₹{(request.estimatedCost || 0).toFixed(2)} Securely
                    </Button>
                     <Alert variant="default" className="text-center">
                        <AlertDescription>
                            You will be redirected to Razorpay to complete your payment. All transactions are secure and encrypted.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </Card>
        </div>
    )
}
