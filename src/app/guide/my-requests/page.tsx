

'use server';

import { ArrowLeft, CheckCircle, Clock, CreditCard, FileText, Loader2, MapPin, Search, User, View, X } from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { type TravelRequest, type User as UserData } from '@/lib/definitions';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getGuideRequests, respondToTravelRequest } from '@/lib/actions';
import { RespondToRequestButtons } from './respond-buttons';


function RequestListSkeleton() {
    return (
        <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
            ))}
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

const getRequestSubTitle = (request: TravelRequest): string | null => {
    const { purposeData } = request;
    if (purposeData?.purpose === 'education' && purposeData.subPurposeData?.subPurpose) {
        return purposeData.subPurposeData.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support';
    }
    if (purposeData?.purpose === 'hospital') {
      return `Appointment at ${purposeData.subPurposeData?.hospitalName}`;
    }
     if (purposeData?.purpose === 'shopping') {
      return `Shopping at ${purposeData.subPurposeData?.shopName || purposeData.subPurposeData?.shoppingArea?.area}`;
    }
    return null;
}


function InProgressRequests({ requests }: { requests: TravelRequest[] }) {
    if (requests.length === 0) {
      return (
          <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>New requests and bookings awaiting payment will appear here.</p>
          </div>
      );
    }
    
    const isAwaitingAction = (status: TravelRequest['status']) => status === 'guide-selected';
    const isAwaitingPayment = (status: TravelRequest['status'], paidAt: any) => (status === 'confirmed' && !paidAt) || status === 'payment-pending';

    return (
      <div className="space-y-4">
        {requests.map(request => (
          <Card key={request.id} className={isAwaitingAction(request.status) ? 'bg-primary/5 border-primary/20' : ''}>
              <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                  <div className="sm:col-span-2 space-y-1">
                      <h3 className="font-semibold">{getRequestTitle(request)}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}</span>
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {request.startTime} - {request.endTime}</div>
                           <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {request.purposeData?.subPurposeData?.collegeAddress?.district || request.purposeData?.subPurposeData?.hospitalAddress?.district || request.purposeData?.subPurposeData?.shoppingArea?.district}</div>
                      </div>
                  </div>
                  <div className="sm:text-right flex items-center justify-end gap-2">
                       <Button asChild variant="secondary" size="sm">
                        <Link href={`/traveler/request/${request.id}`}><View className="mr-2 h-4 w-4" /> Details</Link>
                      </Button>
                  </div>
              </CardContent>
              {isAwaitingAction(request.status) && (
                <CardFooter className="flex gap-2">
                    <RespondToRequestButtons requestId={request.id} />
                </CardFooter>
              )}
               {isAwaitingPayment(request.status, request.paidAt) && (
                <CardFooter>
                    <div className="flex items-center justify-start gap-2 text-amber-600 font-semibold text-sm">
                        {request.status === 'payment-pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                        <span>Awaiting payment from {request.travelerData?.name || 'traveler'}</span>
                    </div>
                </CardFooter>
              )}
          </Card>
        ))}
      </div>
  );
}

function UpcomingRequests({ requests }: { requests: TravelRequest[] }) {
    if (!requests || requests.length === 0) {
      return (
          <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
            <p>Your upcoming paid bookings will appear here.</p>
          </div>
      );
    }
    
    return (
        <div className="space-y-4">
        {requests.map(request => (
            <Card key={request.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex-grow space-y-2">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={request.travelerData?.photoURL} alt={request.travelerData?.name} />
                                <AvatarFallback>{(request.travelerData?.name || 'T').split(' ')[0][0]}</AvatarFallback>
                            </Avatar>
                            <span className="font-semibold">{(request.travelerData?.name || 'Traveler').split(' ')[0]}</span>
                        </div>
                        <div className="pl-10 space-y-1">
                            <p className="text-sm font-semibold capitalize">
                                {getRequestSubTitle(request) || getRequestTitle(request)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {request.requestedDate ? format(parseISO(request.requestedDate), 'PPP') : 'N/A'}, {request.startTime} - {request.endTime}
                            </p>
                            <p className="text-sm font-semibold">
                                Amount Paid: ₹{request.estimatedCost?.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center self-start sm:self-center">
                         <Button asChild variant="secondary" size="sm">
                            <Link href={`/traveler/request/${request.id}`}><View className="mr-2 h-4 w-4" /> Details</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ))}
        </div>
    );
}

export default async function MyGuideRequestsPage() {

  const { inProgress, upcoming, past } = await getGuideRequests();

  return (
    <div className="grid gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Requests</h1>
        <Button variant="outline" asChild>
            <Link href="/guide/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      </div>

        <Tabs defaultValue="upcoming">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="inprogress">In Progress</TabsTrigger>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="inprogress" className="mt-4">
                <InProgressRequests requests={inProgress} />
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
                <UpcomingRequests requests={upcoming} />
            </TabsContent>
            <TabsContent value="past" className="mt-4">
                <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>Your completed trips will be listed here.</p>
                </div>
            </TabsContent>
        </Tabs>
    </div>
  );
}
