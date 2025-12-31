'use server';

import { db } from '@/lib/firebase-admin';
import {
  Table,
  TableBody,
  TableCaption,
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
import { updateGuideStatus } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

async function getGuides() {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'Guide').get();
    if (usersSnapshot.empty) {
      return [];
    }

    const guides: (User & { onboardingState?: string })[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data() as User;
      const guideProfileSnapshot = await db.collection('users').doc(userDoc.id).collection('guideProfile').limit(1).get();

      let onboardingState = 'not_started';
      if (!guideProfileSnapshot.empty) {
        const guideProfileData = guideProfileSnapshot.docs[0].data();
        onboardingState = guideProfileData.onboardingState || 'unknown';
      }

      guides.push({
        ...userData,
        onboardingState,
      });
    }

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
        default:
            variant = 'outline';
            break;
    }
    return <Badge variant={variant} className="capitalize">{status.replace('-', ' ')}</Badge>;
}

function ActionButtons({ guide }: { guide: User & { onboardingState?: string } }) {
    if (guide.onboardingState !== 'verification-pending') {
        return null;
    }

    const approveAction = updateGuideStatus.bind(null, guide.uid, 'active');
    const rejectAction = updateGuideStatus.bind(null, guide.uid, 'rejected');

    return (
        <div className="flex gap-2">
            <form action={approveAction}>
                <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                    <Check className="h-4 w-4" />
                    <span className="sr-only">Approve</span>
                </Button>
            </form>
            <form action={rejectAction}>
                 <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                    <X className="h-4 w-4" />
                    <span className="sr-only">Reject</span>
                </Button>
            </form>
        </div>
    );
}

export default async function ManageGuidesPage() {
  const guides = await getGuides();

  const guidesPending = guides.filter(g => g.onboardingState === 'verification-pending');
  const otherGuides = guides.filter(g => g.onboardingState !== 'verification-pending');


  return (
     <Card>
      <CardHeader>
        <CardTitle>Manage Guides</CardTitle>
        <CardDescription>
          Review, approve, and manage all guide accounts. Guides pending verification are listed first.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guidesPending.length === 0 && otherGuides.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No guides found.</TableCell>
                </TableRow>
            )}

            {guidesPending.map((guide) => (
              <TableRow key={guide.uid} className="bg-primary/5">
                <TableCell className="font-medium">{guide.name}</TableCell>
                <TableCell>{guide.email}</TableCell>
                <TableCell><StatusBadge status={guide.onboardingState || 'unknown'} /></TableCell>
                <TableCell className="text-right"><ActionButtons guide={guide} /></TableCell>
              </TableRow>
            ))}

             {otherGuides.map((guide) => (
              <TableRow key={guide.uid}>
                <TableCell className="font-medium">{guide.name}</TableCell>
                <TableCell>{guide.email}</TableCell>
                <TableCell><StatusBadge status={guide.onboardingState || 'unknown'} /></TableCell>
                <TableCell className="text-right"><ActionButtons guide={guide} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}