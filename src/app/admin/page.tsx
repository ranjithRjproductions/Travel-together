
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-4 md:gap-8">
      <h1 className="font-headline text-3xl font-bold">
        Admin Dashboard
      </h1>
      <p className="text-muted-foreground">
        Welcome, {user.name}. This is the central control panel for the application.
      </p>

      <section aria-labelledby="quick-actions-heading">
        <Card>
          <CardHeader>
            <CardTitle id="quick-actions-heading">
              Management Modules
            </CardTitle>
            <CardDescription>
              Select a module to manage different parts of the application.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              [Management modules for Users and Requests will be listed here]
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
