import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import content from '@/app/content/traveler-dashboard.json';
import { PlusCircle } from 'lucide-react';

export default async function TravelerDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-4 md:gap-8">
      <h1 className="font-headline text-3xl font-bold">
        {content.welcome.replace('{name}', user.name.split(' ')[0])}
      </h1>

      <section aria-labelledby="create-request-heading">
        <Card className="bg-primary/10 border-primary/20">
          <CardHeader>
            <CardTitle id="create-request-heading">
              {content.createRequest.title}
            </CardTitle>
            <CardDescription>
              {content.createRequest.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button>
              <PlusCircle aria-hidden="true" /> {content.createRequest.cta}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="my-requests-heading">
        <Card>
          <CardHeader>
            <CardTitle id="my-requests-heading">
              {content.myRequests.title}
            </CardTitle>
            <CardDescription>{content.myRequests.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              [Your travel requests will be listed here]
            </p>
          </CardContent>
        </Card>
      section>
    </div>
  );
}
