
'use server';

import { db } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import { type User, type TravelRequest } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon, Phone, MapPin, Accessibility, Calendar, View, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { DeleteProfileInfoButton } from './delete-profile-info-button';
import { DeleteRequestButton } from './delete-request-button';

// This is a Firestore server-side Timestamp
interface FirestoreTimestamp {
  _seconds: number;
  _nanoseconds: number;
  toDate(): Date;
}

// Update TravelRequest to expect the server-side timestamp
type ServerTravelRequest = Omit<TravelRequest, 'createdAt'> & {
  createdAt: FirestoreTimestamp | string; // Can be either on the server
};


async function getTravelerDetails(userId: string) {
    const userDocRef = db.collection('users').doc(userId);
    const requestsQuery = db.collection('travelRequests').where('travelerId', '==', userId);

    const [userDoc, requestsSnapshot] = await Promise.all([
        userDocRef.get(),
        requestsQuery.get()
    ]);

    if (!userDoc.exists) {
        return null;
    }

    const user = { uid: userDoc.id, ...userDoc.data() } as User & { uid: string };
    
    const requests = requestsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServerTravelRequest))
        .sort((a, b) => {
            // Safely convert Firestore Timestamps or date strings to JS Dates for comparison
            const dateA = a.createdAt && typeof (a.createdAt as any).toDate === 'function' ? (a.createdAt as FirestoreTimestamp).toDate().getTime() : (a.createdAt ? new Date(a.createdAt as string).getTime() : 0);
            const dateB = b.createdAt && typeof (b.createdAt as any).toDate === 'function' ? (b.createdAt as FirestoreTimestamp).toDate().getTime() : (b.createdAt ? new Date(b.createdAt as string).getTime() : 0);
            return dateB - dateA;
        });

    return { user, requests };
}

function InfoItem({ label, value, defaultText = 'Not provided' }: { label: string, value: any, defaultText?: string }) {
    if (!value) return null;
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-sm">{value || defaultText}</p>
        </div>
    );
}

function ProfileSection({ user }: { user: User & { uid: string } }) {
    const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    return (
        <Card>
            <CardHeader className="flex flex-row items-center gap-4">
                 <Avatar className="h-16 w-16">
                    <AvatarImage src={user.photoURL} alt={user.photoAlt || `Photo of ${user.name}`} />
                    <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle as="h2" className="text-2xl">{user.name}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><UserIcon className="h-4 w-4" /> Personal</h3>
                        <InfoItem label="Gender" value={user.gender} />
                    </div>
                     <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><Phone className="h-4 w-4" /> Contact</h3>
                        <InfoItem label="Primary Phone" value={user.contact?.primaryPhone} />
                        <InfoItem label="WhatsApp" value={user.contact?.whatsappNumber} />
                    </div>
                </div>
                 <Separator />
                <div className="space-y-4">
                     <h3 className="font-semibold flex items-center gap-2"><MapPin className="h-4 w-4" /> Address</h3>
                     {user.address ? (
                        <p className="text-sm">
                            {user.address?.addressLine1}<br/>
                            {user.address?.addressLine2 && <>{user.address.addressLine2}<br/></>}
                            {user.address?.city}, {user.address?.state} {user.address?.postalCode}<br/>
                            {user.address?.country}
                        </p>
                     ) : (
                        <p className="text-sm text-muted-foreground">No address provided.</p>
                     )}
                </div>
                 <Separator />
                 <div className="space-y-4">
                    <div className="flex justify-between items-start">
                        <h3 className="font-semibold flex items-center gap-2"><Accessibility className="h-4 w-4" /> Disability Disclosure</h3>
                         <DeleteProfileInfoButton traveler={user} />
                    </div>
                    {user.disability ? (
                        <>
                            <InfoItem label="Disability Type" value={user.disability?.mainDisability === 'visually-impaired' ? 'Visually Impaired' : user.disability?.mainDisability === 'hard-of-hearing' ? 'Hard of Hearing' : 'Not Disclosed'} />
                            {user.disability?.mainDisability === 'visually-impaired' && (
                                <>
                                    <InfoItem label="Vision Status" value={user.disability.visionSubOption} />
                                    <InfoItem label="Impairment Percentage" value={`${user.disability.visionPercentage}%`} />
                                </>
                            )}
                            {user.disability?.mainDisability === 'hard-of-hearing' && (
                                <>
                                    <InfoItem label="Impairment Percentage" value={`${user.disability.hearingPercentage}%`} />
                                    <InfoItem label="Requires Sign Language" value={user.disability.requiresSignLanguageGuide ? 'Yes' : 'No'} />
                                </>
                            )}
                            {user.disability?.documentName && <InfoItem label="Document" value={<a href={user.disability.documentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">{user.disability.documentName}</a>} />}
                        </>
                    ) : (
                        <p className="text-sm text-muted-foreground">No disability information provided.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function getRequestStatusBadge(status: TravelRequest['status']) {
    const variants = {
        draft: 'outline',
        pending: 'secondary',
        confirmed: 'default',
        completed: 'outline',
        cancelled: 'destructive'
    } as const;
    return <Badge variant={variants[status]} className="capitalize">{status.replace('-', ' ')}</Badge>;
}

const getRequestTitle = (request: ServerTravelRequest): string => {
    const { purposeData } = request;
    if (!purposeData?.purpose) return 'Untitled Request';

    let title = `${purposeData.purpose.charAt(0).toUpperCase() + purposeData.purpose.slice(1)}`;
    if (purposeData.purpose === 'education' && purposeData.subPurposeData?.subPurpose) {
        title += `: ${purposeData.subPurposeData.subPurpose === 'scribe' ? 'Scribe for Exam' : 'Admission Support'}`;
    }
    return title;
};

function RequestsSection({ requests }: { requests: ServerTravelRequest[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle as="h2">Travel Requests ({requests.length})</CardTitle>
                <CardDescription>A history of all requests submitted by this traveler.</CardDescription>
            </CardHeader>
            <CardContent>
                {requests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">This traveler has not submitted any requests yet.</p>
                ) : (
                    <div className="space-y-4">
                        {requests.map(request => {
                            // Safely convert createdAt to a Date object for formatting
                            const createdAtDate = request.createdAt && typeof (request.createdAt as any).toDate === 'function' 
                                ? (request.createdAt as FirestoreTimestamp).toDate() 
                                : request.createdAt ? new Date(request.createdAt as string) : null;

                            return (
                                <div key={request.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                    <div className="flex-grow">
                                        <h4 className="font-semibold capitalize">{getRequestTitle(request)}</h4>
                                        <p className="text-sm text-muted-foreground">
                                            Created on {createdAtDate ? format(createdAtDate, 'PP') : 'date unknown'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        {getRequestStatusBadge(request.status)}
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={`/traveler/request/${request.id}`}><View className="mr-2 h-4 w-4" /> View</Link>
                                        </Button>
                                        <DeleteRequestButton requestId={request.id} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function DangerZoneSection({ userId }: { userId: string }) {
    return (
        <Card className="border-destructive">
            <CardHeader>
                <CardTitle as="h2" className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 border border-dashed rounded-lg">
                    <div>
                        <h4 className="font-semibold">Delete Travel Requests</h4>
                        <p className="text-sm text-muted-foreground">Permanently delete all of this user's travel requests.</p>
                    </div>
                    <Button variant="destructive" disabled>Delete Requests</Button>
                </div>
            </CardContent>
        </Card>
    );
}


export default async function TravelerDetailPage({ params }: { params: { userId: string } }) {
  const data = await getTravelerDetails(params.userId);

  if (!data) {
    notFound();
  }

  const { user, requests } = data;

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
             <h1 className="font-headline text-3xl font-bold tracking-tight">Traveler Details</h1>
             <Button asChild variant="outline">
                <Link href="/admin/users/travelers"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link>
             </Button>
        </div>

        <ProfileSection user={user} />
        <RequestsSection requests={requests} />
        <DangerZoneSection userId={user.uid} />
    </div>
  );
}
