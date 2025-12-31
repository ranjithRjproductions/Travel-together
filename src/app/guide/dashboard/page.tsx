import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import content from '@/app/content/guide-dashboard.json';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `${content.pageTitle} | ${siteName}`,
};

export default async function GuideDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="grid gap-4 md:gap-8">
      <h1 className="font-headline text-3xl font-bold">
        {content.welcome.replace('{name}', user.name.split(' ')[0])}
      </h1>

      <section aria-labelledby="available-requests-heading">
        <Card>
          <CardHeader>
            <CardTitle id="available-requests-heading">
              {content.availableRequests.title}
            </CardTitle>
            <CardDescription>
              {content.availableRequests.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              [Available requests will be listed here]
            </p>
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
              [Accepted requests will be listed here]
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
