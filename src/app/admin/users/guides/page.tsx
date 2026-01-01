
'use server';

import { db } from '@/lib/firebase-admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type User } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Eye } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';
import { Progress } from '@/components/ui/progress';
import { DeleteGuideButton } from './delete-guide-button';
import { ManageGuideStatusButtons } from './approve-reject-buttons';

const siteName = homeContent.meta.title.split('–')[0].trim();

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Manage Guides | ${siteName}`,
    description: 'Review, approve, and manage all guide accounts in the system.',
  };
}

type GuideWithStats = User & {
  id: string;
  onboardingState?: string;
  profileCompletion: number;
};

const calculateGuideProfileCompletion = (user: User, guideProfile: any): number => {
    let completedSteps = 0;
    const totalSteps = 5;

    // Step 1: Profile Information (from root user object)
    if (user.name && user.gender && user.photoURL) {
        completedSteps++;
    }
    // Steps 2-5: From guideProfile subcollection document
    if (guideProfile?.address) {
        completedSteps++;
    }
    if (guideProfile?.contact) {
        completedSteps++;
    }
    if (guideProfile?.disabilityExpertise) {
        completedSteps++;
    }
    if (guideProfile?.verification) {
        completedSteps++;
    }
    
    return Math.round((completedSteps / totalSteps) * 100);
}


async function getGuides(): Promise<GuideWithStats[]> {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'Guide').get();
    if (usersSnapshot.empty) {
      return [];
    }

    const guides = await Promise.all(usersSnapshot.docs.map(async (userDoc) => {
      const userData = { id: userDoc.id, uid: userDoc.id, ...userDoc.data() } as User & { id: string, uid: string };
      const guideProfileSnapshot = await db.collection('users').doc(userDoc.id).collection('guideProfile').limit(1).get();

      let onboardingState = 'not_started';
      let guideProfileData: any = null;
      if (!guideProfileSnapshot.empty) {
        guideProfileData = guideProfileSnapshot.docs[0].data();
        onboardingState = guideProfileData.onboardingState || 'unknown';
      }
      
      const profileCompletion = calculateGuideProfileCompletion(userData, guideProfileData);

      return {
        ...userData,
        onboardingState,
        profileCompletion,
      };
    }));

    return guides;
  } catch (error) {
    console.error("Error fetching guides:", error);
    return [];
  }
}


function StatusBadge({ status }: { status: string }) {
    let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
    switch(status) {
        case 'active':
            variant = 'default';
            break;
        case 'verification-pending':
            variant = 'secondary';
            break;
        case 'rejected':
            variant = 'destructive';
            break;
        case 'not_started':
        default:
            variant = 'outline';
            break;
    }
    return <Badge variant={variant} className="capitalize">{status.replace('-', ' ')}</Badge>;
}

export default async function ManageGuidesPage() {
  const guides = await getGuides();

  const guidesPending = guides.filter(g => g.onboardingState === 'verification-pending');
  const otherGuides = guides.filter(g => g.onboardingState !== 'verification-pending');


  return (
     <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>Manage Guides</CardTitle>
                <CardDescription>
                Review, approve, and manage all guide accounts. Guides pending verification are listed first.
                </CardDescription>
            </div>
            <Button asChild variant="outline">
                <Link href="/admin">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Profile Completion</TableHead>
              <TableHead className="text-center">Actions</TableHead>
              <TableHead className="text-center">View</TableHead>
              <TableHead className="text-center">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guides.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">No guides found.</TableCell>
                </TableRow>
            )}

            {guidesPending.map((guide) => (
              <TableRow key={guide.uid} className="bg-primary/5">
                <TableCell className="font-medium">{guide.name}</TableCell>
                <TableCell>{guide.email}</TableCell>
                <TableCell><StatusBadge status={guide.onboardingState || 'unknown'} /></TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={guide.profileCompletion} className="w-24"/>
                        <span className="text-xs text-muted-foreground">{guide.profileCompletion}%</span>
                    </div>
                </TableCell>
                <TableCell className="text-center">
                  <ManageGuideStatusButtons guide={guide} />
                </TableCell>
                <TableCell className="text-center">
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/guides/${guide.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                </TableCell>
                <TableCell className="text-center"><DeleteGuideButton guide={guide} /></TableCell>
              </TableRow>
            ))}

             {otherGuides.map((guide) => (
              <TableRow key={guide.uid}>
                <TableCell className="font-medium">{guide.name}</TableCell>
                <TableCell>{guide.email}</TableCell>
                <TableCell><StatusBadge status={guide.onboardingState || 'unknown'} /></TableCell>
                 <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={guide.profileCompletion} className="w-24"/>
                        <span className="text-xs text-muted-foreground">{guide.profileCompletion}%</span>
                    </div>
                </TableCell>
                <TableCell className="text-center">
                  <ManageGuideStatusButtons guide={guide} />
                </TableCell>
                <TableCell className="text-center">
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/guides/${guide.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                </TableCell>
                 <TableCell className="text-center"><DeleteGuideButton guide={guide} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
