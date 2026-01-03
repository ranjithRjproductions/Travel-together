
'use server';

import { getAdminDb } from '@/lib/firebase-admin';
import { notFound } from 'next/navigation';
import { type User } from '@/lib/definitions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User as UserIcon, Phone, MapPin, Accessibility, ShieldCheck, Languages, CheckCircle, Car, PenLine } from 'lucide-react';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export async function generateMetadata({ params }: { params: { guideId: string } }): Promise<Metadata> {
  const db = getAdminDb();
  const userDoc = await db.collection('users').doc(params.guideId).get();
  const userName = userDoc.exists ? userDoc.data()?.name : 'Guide';
  return {
    title: `Details for Guide ${userName} | ${siteName}`,
  };
}

async function getGuideDetails(guideId: string) {
    const db = getAdminDb();
    const userDocRef = db.collection('users').doc(guideId);
    const guideProfileDocRef = userDocRef.collection('guideProfile').doc('guide-profile-doc');

    const [userDoc, guideProfileDoc] = await Promise.all([
        userDocRef.get(),
        guideProfileDocRef.get()
    ]);

    if (!userDoc.exists) {
        return null;
    }

    const user = { uid: userDoc.id, ...userDoc.data() } as User & { uid: string };
    const guideProfile = guideProfileDoc.exists ? guideProfileDoc.data() : null;

    return { user, guideProfile };
}

function InfoItem({ label, value, defaultText = 'Not provided', icon: Icon }: { label: string, value?: any, defaultText?: string, icon?: React.ElementType }) {
    if (!value && typeof value !== 'boolean') return null;
    const displayValue = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value || defaultText);
    return (
         <div className="flex items-start">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground mr-3 mt-0.5 flex-shrink-0" />}
            <div className="flex-grow">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-sm">{displayValue}</p>
            </div>
        </div>
    );
}

function InfoLink({ label, href, linkText }: { label: string, href?: string, linkText?: string }) {
    if (!href) return null;
    return (
        <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">
                {linkText || 'View Document'}
            </a>
        </div>
    )
}

function Section({ title, icon: Icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle as="h2" className="flex items-center gap-2 text-xl">
                    <Icon className="h-5 w-5" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {children}
            </CardContent>
        </Card>
    );
}

export default async function GuideDetailPage({ params }: { params: { guideId: string } }) {
  const data = await getGuideDetails(params.guideId);

  if (!data) {
    notFound();
  }

  const { user, guideProfile } = data;
  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
             <h1 className="font-headline text-3xl font-bold tracking-tight">Guide Details</h1>
             <Button asChild variant="outline">
                <Link href="/admin/users/guides"><ArrowLeft className="mr-2 h-4 w-4" /> Back to List</Link>
             </Button>
        </div>

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
            <CardContent>
                <InfoItem label="Gender" value={user.gender} />
            </CardContent>
        </Card>

        {guideProfile ? (
            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-8">
                    <Section title="Address Details" icon={MapPin}>
                        <p className="text-sm">
                            {guideProfile.address?.addressLine1}<br/>
                            {guideProfile.address?.addressLine2 && <>{guideProfile.address.addressLine2}<br/></>}
                            {guideProfile.address?.city}, {guideProfile.address?.district}, {guideProfile.address?.pincode}<br/>
                            {guideProfile.address?.country}
                        </p>
                        <InfoLink label="Address Proof" href={guideProfile.address?.addressProofUrl} />
                    </Section>

                     <Section title="Contact Details" icon={Phone}>
                        <InfoItem label="Primary Phone" value={guideProfile.contact?.primaryPhone} />
                        <InfoItem label="WhatsApp" value={guideProfile.contact?.whatsappNumber} />
                    </Section>

                     <Section title="Verification" icon={ShieldCheck}>
                        <InfoLink label="Government ID" href={guideProfile.verification?.governmentIdUrl} />
                        <InfoLink label="Proof of Qualification" href={guideProfile.verification?.proofDocumentUrl} />
                    </Section>
                </div>
                
                <div className="space-y-8">
                     <Section title="Disability & Language Expertise" icon={Accessibility}>
                        <InfoItem label="Has Experience with Disability?" value={guideProfile.disabilityExpertise?.hasDisabilityExperience} />
                        {guideProfile.disabilityExpertise?.hasDisabilityExperience === 'yes' && (
                            <>
                                <InfoItem label="Experience Type" value={guideProfile.disabilityExpertise?.experienceType} />
                                {guideProfile.disabilityExpertise?.experienceType === 'visually-impaired' && (
                                    <InfoItem label="Specialization" value={guideProfile.disabilityExpertise?.visionSupport?.specialization} />
                                )}
                                {guideProfile.disabilityExpertise?.experienceType === 'hearing-impaired' && (
                                    <InfoItem label="Knows Sign Language" value={guideProfile.disabilityExpertise?.hearingSupport?.knowsSignLanguage} />
                                )}
                            </>
                        )}
                        
                        {guideProfile.disabilityExpertise?.visionSupport?.willingToScribe === 'yes' && (
                            <div className="space-y-4 pt-4 mt-4 border-t">
                                <h4 className="text-md font-semibold flex items-center gap-2"><PenLine className="h-4 w-4" /> Scribe Expertise</h4>
                                <InfoItem label="Willing to act as Scribe?" value={guideProfile.disabilityExpertise.visionSupport.willingToScribe} />
                                <InfoItem label="Scribe Subjects" value={guideProfile.disabilityExpertise.visionSupport.scribeSubjects?.join(', ')} />
                            </div>
                        )}

                        <Separator />
                        <InfoItem label="Local Expertise Areas" value={guideProfile.disabilityExpertise?.localExpertise?.join(', ')} icon={MapPin} />
                        <InfoItem label="Reading Languages" value={guideProfile.disabilityExpertise?.readingLanguages?.join(', ')} icon={Languages} />
                        <InfoItem label="Writing Languages" value={guideProfile.disabilityExpertise?.writingLanguages?.join(', ')} icon={Languages} />
                         <Separator />
                         <InfoItem label="Willing to Use Own Vehicle" value={guideProfile.disabilityExpertise?.willingToUseVehicle} icon={Car} />
                        <InfoLink label="Driver's License" href={guideProfile.disabilityExpertise?.driversLicenseUrl} />
                         <Separator />
                         <InfoItem label="Agreed to Awareness Training" value={guideProfile.disabilityExpertise?.agreeToAwareness} icon={CheckCircle}/>
                         <InfoItem label="Agreed to Online Training & Interview" value={guideProfile.disabilityExpertise?.agreeToTraining} icon={CheckCircle}/>
                    </Section>
                </div>
            </div>
        ) : (
             <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    This guide has not completed their detailed profile yet.
                </CardContent>
            </Card>
        )}
    </div>
  );
}

    