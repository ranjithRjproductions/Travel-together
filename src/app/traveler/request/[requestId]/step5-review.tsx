'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { differenceInMinutes, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { submitTravelRequest } from '@/lib/actions';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, MapPin, Bus, Train, Plane, Car, Clock, Building, University, ShoppingCart, Star, CalendarIcon, Hospital, CheckCircle, PackageOpen } from 'lucide-react';
import { format } from 'date-fns';

const InfoRow = ({ label, value, icon: Icon, hide = false }: { label: string, value?: React.ReactNode, icon?: React.ElementType, hide?: boolean }) => {
    if (hide || !value) return null;
    return (
        <div className="flex items-start">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground mr-3 mt-1 flex-shrink-0" />}
            <div className="flex-grow">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="font-medium">{value}</p>
            </div>
        </div>
    );
};

const ServiceDetailsReview = ({ purposeData }: { purposeData: TravelRequest['purposeData'] }) => {
    if (!purposeData) return null;
    const { purpose, subPurposeData } = purposeData;

    let subDetails;
    if (purpose === 'education' && subPurposeData) {
        subDetails = (
            <>
                <InfoRow label="Support Type" value={subPurposeData.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support'} />
                <InfoRow label="Institute Name" value={subPurposeData.collegeName} />
                <InfoRow label="Institute Address" value={`${subPurposeData.collegeAddress?.street}, ${subPurposeData.collegeAddress?.district}`} />
                <InfoRow label="Scribe Subjects" value={subPurposeData.scribeSubjects?.join(', ')} hide={subPurposeData.subPurpose !== 'scribe'} />
            </>
        );
    } else if (purpose === 'hospital' && subPurposeData) {
        subDetails = (
            <>
                <InfoRow label="Hospital Name" value={subPurposeData.hospitalName} />
                <InfoRow label="Hospital Address" value={`${subPurposeData.hospitalAddress?.street}, ${subPurposeData.hospitalAddress?.district}`} />
                <InfoRow 
                    label="Appointment" 
                    value={subPurposeData.bookingDetails?.isAppointmentPrebooked === 'yes' 
                        ? `Pre-booked: ${subPurposeData.bookingDetails.startTime} - ${subPurposeData.bookingDetails.endTime}`
                        : `Not Pre-booked, Visiting Time: ${subPurposeData.bookingDetails?.visitingTime}`
                    } 
                />
            </>
        );
    } else if (purpose === 'shopping' && subPurposeData) {
         subDetails = (
            <>
                <InfoRow label="Shopping Type" value={subPurposeData.shopType === 'particular' ? 'A particular shop' : 'General shopping in an area'} />
                <InfoRow 
                  label="Location" 
                  value={subPurposeData.shopType === 'particular' 
                    ? `${subPurposeData.shopName}, ${subPurposeData.shopAddress?.street}, ${subPurposeData.shopAddress?.district}, ${subPurposeData.shopAddress?.pincode}` 
                    : `${subPurposeData.shoppingArea?.area}, ${subPurposeData.shoppingArea?.district}`} 
                />
                 <InfoRow 
                    label="Agreement" 
                    value="User agreed not to ask the guide to carry things." 
                    icon={CheckCircle}
                    hide={!subPurposeData.agreeNotToCarry}
                />
            </>
        );
    }
    
    const PurposeIcon = purpose === 'education' ? University : purpose === 'hospital' ? Hospital : ShoppingCart;

    return (
         <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <PurposeIcon className="h-5 w-5" />
                Service & Location
            </h3>
            <InfoRow label="Purpose" value={<span className="capitalize">{purpose}</span>} />
            {subDetails}
        </section>
    );
};

const TravelDetailsReview = ({ request }: { request: TravelRequest }) => {
    const { travelMediumData, pickupData } = request;
    if (!travelMediumData || !pickupData) return null;

    const { travelMedium, isTicketPrebooked, vehicleInfo, time } = travelMediumData;
    const { pickupType, hotelDetails, stationName, pickupTime } = pickupData;

    const TravelIcon = travelMedium === 'bus' ? Bus : travelMedium === 'train' ? Train : travelMedium === 'flight' ? Plane : Car;

    return (
        <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Travel & Meeting
            </h3>
            <InfoRow 
                label="Travel Medium" 
                value={<span className="capitalize">{travelMedium}</span>}
                icon={TravelIcon}
            />
            <InfoRow label="Ticket Pre-booked" value={isTicketPrebooked} hide={travelMedium === 'car'} />
            <InfoRow label="Bus Name/Number" value={`${vehicleInfo?.busName || ''} ${vehicleInfo?.busNumber ? `/ ${vehicleInfo.busNumber}` : ''}`} hide={!vehicleInfo?.busName && !vehicleInfo?.busNumber} />
            <InfoRow label="Train Name/Number" value={`${vehicleInfo?.trainName || ''} ${vehicleInfo?.trainNumber ? `/ ${vehicleInfo.trainNumber}` : ''}`} hide={!vehicleInfo?.trainName && !vehicleInfo?.trainNumber} />
            <InfoRow label="Flight Number" value={vehicleInfo?.flightNumber} hide={!vehicleInfo?.flightNumber} />
            <InfoRow label="Arrival/Departure Time" value={time} hide={isTicketPrebooked !== 'yes'} />
            
            <Separator className="my-4" />
            
            <InfoRow label="Meeting Point" value={<span className="capitalize">{pickupType?.replace(/_/g, ' ')}</span>} icon={Star} />
            <InfoRow label="Pickup Time" value={pickupTime} hide={pickupType === 'destination'} />
            <InfoRow label="Hotel Name/Room" value={`${hotelDetails?.name || ''} ${hotelDetails?.roomNumber ? `/ Room #${hotelDetails.roomNumber}` : ''}`} hide={pickupType !== 'hotel' || !hotelDetails?.name} />
            <InfoRow label="Station/Airport Name" value={stationName} hide={!stationName || !['bus_stand', 'railway_station', 'airport'].includes(pickupType || '')} />
        </section>
    );
};

const getStatusBadge = (status: TravelRequest['status']) => {
    switch (status) {
        case 'pending': return <Badge variant="secondary">Waiting for Approval</Badge>;
        case 'confirmed': return <Badge variant="default">Guide Assigned</Badge>;
        case 'completed': return <Badge variant="outline">Completed</Badge>;
        case 'cancelled': return <Badge variant="destructive">Cancelled</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
}


export function Step5Review({ request, userData }: { request: TravelRequest, userData: UserData }) {
    const router = useRouter();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const calculateCostForDisplay = () => {
        const { purposeData, pickupData, startTime, endTime, requestedDate } = request;

        let serviceStartTimeStr: string | undefined, serviceEndTimeStr: string | undefined;
        
        const isPrebookedHospital = purposeData?.purpose === 'hospital' &&
                                  purposeData.subPurposeData?.bookingDetails?.isAppointmentPrebooked === 'yes';

        if (pickupData?.pickupType === 'destination') {
             if (isPrebookedHospital) {
                serviceStartTimeStr = purposeData.subPurposeData.bookingDetails.startTime;
             } else {
                serviceStartTimeStr = startTime;
             }
        } else {
            serviceStartTimeStr = pickupData?.pickupTime;
        }
        
        if (isPrebookedHospital) {
            serviceEndTimeStr = purposeData.subPurposeData.bookingDetails.endTime;
        } else {
            serviceEndTimeStr = endTime;
        }


        if (!serviceStartTimeStr || !serviceEndTimeStr || !requestedDate) return { cost: 0, details: ''};
        
        const baseDate = parseISO(requestedDate);
        const start = new Date(baseDate);
        const [startHours, startMinutes] = serviceStartTimeStr.split(':').map(Number);
        start.setHours(startHours, startMinutes, 0, 0);

        const end = new Date(baseDate);
        const [endHours, endMinutes] = serviceEndTimeStr.split(':').map(Number);
        end.setHours(endHours, endMinutes, 0, 0);

        if (end <= start) return { cost: 0, details: ''};

        const durationInMinutes = differenceInMinutes(end, start);
        if (durationInMinutes <= 0) return { cost: 0, details: ''};
        
        const durationInHours = durationInMinutes / 60;
        let cost = 0;

        if (durationInHours <= 3) {
            cost = durationInHours * 150;
        } else {
            const baseCost = 3 * 150;
            const additionalHours = durationInHours - 3;
            const additionalCost = additionalHours * 100;
            cost = baseCost + additionalCost;
        }

        const details = `Calculated from ${serviceStartTimeStr} to ${serviceEndTimeStr} at ₹150/hr for first 3 hours and ₹100/hr thereafter.`;

        return { cost, details };
    };
    
    const { cost: estimatedCost, details: costDetails } = request.estimatedCost ? { cost: request.estimatedCost, details: '' } : calculateCostForDisplay();

    const handleSubmit = async () => {
        setIsSubmitting(true);
        const result = await submitTravelRequest(request.id);

        if (result.success) {
            toast({
                title: "Request Submitted!",
                description: "Your request has been sent to available guides.",
            });
            router.push('/traveler/my-requests');
            router.refresh(); // Refresh the page to get the latest status
        } else {
            toast({
                title: "Submission Failed",
                description: result.message,
                variant: 'destructive',
            });
        }
        setIsSubmitting(false);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{request.status === 'draft' ? 'Step 5: Review & Submit' : 'Request Summary'}</CardTitle>
                <CardDescription>
                    {request.status === 'draft' 
                        ? 'Please review all the details below before submitting your request.'
                        : 'This is a summary of your submitted request.'
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                <section className="space-y-4">
                    <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Traveler Information
                    </h3>
                    <InfoRow label="Name" value={userData.name} />
                    <InfoRow label="Gender" value={<span className='capitalize'>{userData.gender}</span>} />
                    <InfoRow label="Disability Type" value={userData.disability?.mainDisability === 'hard-of-hearing' ? 'Hard of Hearing' : userData.disability?.mainDisability === 'visually-impaired' ? 'Visually Impaired' : 'Not Disclosed'} />
                </section>

                <Separator />
                
                <ServiceDetailsReview purposeData={request.purposeData} />

                <Separator />

                <section className="space-y-4">
                     <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Date & Duration
                     </h3>
                     <InfoRow label="Date" value={request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'Not set'} />
                     <InfoRow label="Time" value={request.startTime && request.endTime ? `${request.startTime} - ${request.endTime}` : 'Not set'} icon={Clock} />
                </section>
                
                 <Separator />

                <TravelDetailsReview request={request} />

                <Separator />

                <section className="text-center">
                    <p className="text-muted-foreground">Estimated Cost</p>
                    <p className="text-3xl font-bold">₹{estimatedCost.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground px-4">
                      {costDetails}
                    </p>
                </section>

                {request.status !== 'draft' && (
                    <div className="pt-4 text-center">
                        <h3 className="text-lg font-semibold">Status</h3>
                        {getStatusBadge(request.status)}
                    </div>
                )}


                 {request.status === 'draft' && (
                    <div className="pt-4 space-y-4">
                        <div className="flex items-start space-x-2 p-4 bg-secondary/50 rounded-lg">
                            <PackageOpen className="h-5 w-5 text-muted-foreground mt-1" />
                            <p className="text-sm text-muted-foreground">
                            By submitting, you confirm all details are correct. The estimated cost is for the guide's time and does not include other expenses like tickets or fuel.
                            </p>
                        </div>
                        <Button 
                            size="lg" 
                            className="w-full" 
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                        >
                            {isSubmitting ? 'Submitting...' : 'Confirm & Submit Request'}
                        </Button>
                    </div>
                 )}
            </CardContent>
        </Card>
    );
}
