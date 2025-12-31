
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

async function getTravelers() {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'Traveler').get();
    if (usersSnapshot.empty) {
      return [];
    }

    const travelers = usersSnapshot.docs.map(doc => doc.data() as User);
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {travelers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  No travelers found.
                </TableCell>
              </TableRow>
            ) : (
              travelers.map((traveler) => (
                <TableRow key={traveler.uid}>
                  <TableCell className="font-medium">{traveler.name}</TableCell>
                  <TableCell>{traveler.email}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
