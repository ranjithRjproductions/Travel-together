
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { createRazorpayOrder } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, CreditCard, User, Calendar, Clock, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { AriaLive } from '@/components/ui/aria-live';

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
    const [isProcessing, setIsProcessing] = useState(false);
    const [ariaLiveMessage, setAriaLiveMessage] = useState('');

    const requestDocRef = useMemo(() => {
        if (!firestore || !requestId) return null;
        return doc(firestore, 'travelRequests', requestId);
    }, [firestore, requestId]);
    
    const { data: request, isLoading: isRequestLoading } = useDoc<TravelRequest>(requestDocRef);

    const travelerDocRef = useMemo(() => {
        if (!firestore || !request?.travelerId) return null;
        return doc(firestore, 'users', request.travelerId);
    }, [firestore, request?.travelerId]);

    const { data: traveler, isLoading: isTravelerLoading } = useDoc<UserData>(travelerDocRef);


    const isLoading = isUserLoading || isRequestLoading || isTravelerLoading;
    
    const handlePayment = async () => {
        if (!request || !user || !traveler) {
            toast({ variant: "destructive", title: "Error", description: "Request details not loaded." });
            return;
        }

        setIsProcessing(true);
        setAriaLiveMessage('Initializing payment...');

        const orderResult = await createRazorpayOrder(requestId);

        if (!orderResult.success || !orderResult.order) {
            toast({ variant: "destructive", title: "Payment Error", description: orderResult.message });
            setIsProcessing(false);
            setAriaLiveMessage(`Payment Error: ${orderResult.message}`);
            return;
        }

        const { id: order_id, key, amount, currency } = orderResult.order;

        const options = {
            key,
            amount: Number(amount),
            currency,
            name: "Let's Travel Together",
            description: `Payment for Booking`,
            order_id,
            handler: async function () {
                setAriaLiveMessage('Payment Successful! Confirming booking...');
                toast({
                    title: "Payment Successful!",
                    description: "Your booking is confirmed. You will be redirected shortly.",
                });
                router.push('/traveler/my-bookings?payment_success=true');
            },
            prefill: {
                name: traveler.name || "Traveler",
                email: traveler.email || "",
                contact: traveler.contact?.primaryPhone || "",
            },
            notes: {
                requestId,
            },
            theme: {
                color: "#45934A",
            },
        };
        
        try {
            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                toast({
                    variant: 'destructive',
                    title: 'Payment Failed',
                    description: response.error.description || 'Something went wrong.',
                });
                setIsProcessing(false);
                setAriaLiveMessage(`Payment Failed: ${response.error.description}`);
            });
            setAriaLiveMessage('Redirecting to Razorpay...');
            rzp.open();
        } catch (error) {
            console.error("Razorpay error: ", error);
             toast({ variant: 'destructive', title: 'Error', description: 'Could not open payment window.' });
             setIsProcessing(false);
             setAriaLiveMessage('Error: Could not open payment window.');
        }
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
    
    return (
        <div className="max-w-2xl mx-auto">
            <AriaLive message={ariaLiveMessage} />
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
                        {getRequestTitle(request)}
                    </CardTitle>
                    <CardDescription>
                         Invoice for booking confirmed on {request.acceptedAt && typeof request.acceptedAt.toDate === 'function' ? format(request.acceptedAt.toDate(), 'PPP') : 'N/A'}
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
                            <InfoRow label="Date" value={request.requestedDate ? format(parseISO(request.requestedDate), 'PPPP') : 'N/A'} icon={Calendar}/>
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
                     <Button size="lg" className="w-full" onClick={handlePayment} disabled={isProcessing}>
                        {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                        {isProcessing ? 'Processing...' : `Pay ₹${(request.estimatedCost || 0).toFixed(2)} Securely`}
                    </Button>
                     <Alert>
                        <AlertDescription className="text-center">
                            You will be redirected to Razorpay to complete your payment. All transactions are secure and encrypted.
                        </AlertDescription>
                    </Alert>
                </CardFooter>
            </Card>
        </div>
    )
}
