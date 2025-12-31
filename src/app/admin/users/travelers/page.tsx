
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
import { type User } from '@/lib/definitions';
import { Button } from '@/components/ui/button';
import { DeleteTravelerButton } from './delete-traveler-button';
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export async function generateMetadata(): Promise<Metadata> {
    return {
        title: `Manage Travelers | ${siteName}`,
        description: 'View and manage all traveler accounts in the system.',
    };
}

type TravelerWithStats = User & {
  id: string;
  requestCount: number;
  draftCount: number;
  inProgressCount: number;
  pendingCount: number;
  profileCompletion: number;
};

const calculateProfileCompletion = (user: User): number => {
    let completedFields = 0;
    const totalFields = 6;

    if (user.name) completedFields++;
    if (user.photoURL) completedFields++;
    if (user.gender) completedFields++;
    if (user.address && user.address.addressLine1) completedFields++;
    if (user.contact && user.contact.primaryPhone) completedFields++;
    if (user.hasOwnProperty('disability')) completedFields++;

    return Math.round((completedFields / totalFields) * 100);
}


async function getTravelers(): Promise<TravelerWithStats[]> {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'Traveler').get();
    if (usersSnapshot.empty) {
      return [];
    }

    const travelersWithStats = await Promise.all(
        usersSnapshot.docs.map(async (doc) => {
            const userData = doc.data() as User;
            const travelerId = doc.id;
            
            const requestsSnapshot = await db.collection('travelRequests').where('travelerId', '==', travelerId).get();
            
            let draftCount = 0;
            let inProgressCount = 0; // 'confirmed'
            let pendingCount = 0;

            requestsSnapshot.forEach(doc => {
              const request = doc.data();
              switch (request.status) {
                case 'draft':
                  draftCount++;
                  break;
                case 'confirmed':
                  inProgressCount++;
                  break;
                case 'pending':
                  pendingCount++;
                  break;
              }
            });

            const requestCount = requestsSnapshot.size;
            const profileCompletion = calculateProfileCompletion(userData);

            return {
                id: travelerId,
                ...userData,
                requestCount,
                draftCount,
                inProgressCount,
                pendingCount,
                profileCompletion,
            } as TravelerWithStats;
        })
    );

    return travelersWithStats;

  } catch (error) {
    console.error("Error fetching travelers:", error);
    return [];
  }
}

export default async function ManageTravelersPage() {
  const travelers = await getTravelers();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Travelers</CardTitle>
        <CardDescription>
          View and manage all traveler accounts in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Total Requests</TableHead>
              <TableHead className="text-center">Drafts</TableHead>
              <TableHead className="text-center">In Progress</TableHead>
              <TableHead className="text-center">Pending</TableHead>
              <TableHead className="text-center">Profile Completion</TableHead>
              <TableHead className="text-center">View</TableHead>
              <TableHead className="text-center">Delete</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {travelers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground">
                  No travelers found.
                </TableCell>
              </TableRow>
            ) : (
              travelers.map((traveler) => (
                <TableRow key={traveler.id}>
                  <TableCell className="font-medium">{traveler.name}</TableCell>
                  <TableCell>{traveler.email}</TableCell>
                  <TableCell className="text-center">{traveler.requestCount}</TableCell>
                  <TableCell className="text-center">{traveler.draftCount}</TableCell>
                  <TableCell className="text-center">{traveler.inProgressCount}</TableCell>
                  <TableCell className="text-center">{traveler.pendingCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Progress value={traveler.profileCompletion} className="w-24"/>
                        <span className="text-xs text-muted-foreground">{traveler.profileCompletion}%</span>
                    </div>
                  </TableCell>
                   <TableCell className="text-center">
                     <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/travelers/${traveler.id}`}>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <DeleteTravelerButton traveler={traveler} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
