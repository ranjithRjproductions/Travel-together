
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
import { TravelerActions } from './traveler-actions';


async function getTravelers() {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'Traveler').get();
    if (usersSnapshot.empty) {
      return [];
    }

    const travelers = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data
        } as User & { id: string };
    });
    return travelers;

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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {travelers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No travelers found.
                </TableCell>
              </TableRow>
            ) : (
              travelers.map((traveler) => (
                <TableRow key={traveler.id}>
                  <TableCell className="font-medium">{traveler.name}</TableCell>
                  <TableCell>{traveler.email}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <TravelerActions traveler={traveler} />
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
