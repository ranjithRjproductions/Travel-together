
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Users, FileText } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-4 md:gap-8">
      <div className="space-y-1.5">
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome, {user.name}. This is the central control panel for the application.
        </p>
      </div>

      <section aria-labelledby="management-modules-heading">
         <h2 id="management-modules-heading" className="text-xl font-semibold tracking-tight mb-4">Management Modules</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0">
              <Users className="h-8 w-8 text-primary" />
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View, approve, and manage traveler and guide accounts.
              </CardDescription>
            </CardContent>
            <CardFooter className="flex gap-2">
                <Button asChild>
                    <Link href="/admin/users/guides">Manage Guides</Link>
                </Button>
                 <Button asChild variant="secondary">
                    <Link href="/admin/users/travelers">Manage Travelers</Link>
                </Button>
            </CardFooter>
          </Card>
          <Card className="bg-muted/30">
            <CardHeader className="flex-row items-center gap-4 space-y-0">
               <FileText className="h-8 w-8 text-muted-foreground" />
              <CardTitle>Request Management</CardTitle>
            </CardHeader>
            <CardContent>
               <CardDescription>
                Monitor, assign, and manage all travel requests. (Coming Soon)
              </CardDescription>
            </CardContent>
             <CardFooter>
                <Button disabled>Manage Requests</Button>
            </CardFooter>
          </Card>
        </div>
      </section>
    </div>
  );
}
