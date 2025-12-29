'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import { redirect } from 'next/navigation';
import content from '@/app/content/traveler-dashboard.json';
import { PlusCircle, List } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

export default function TravelerDashboard() {
  const { user, isUserLoading } = useUser();

  if (isUserLoading) {
    return (
      <div className="grid gap-6 md:gap-8">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    redirect('/login');
    return null; // Ensure nothing else renders during redirect
  }

  return (
    <div className="grid gap-6 md:gap-8">
      <h1 className="font-headline text-3xl font-bold">
        {user.name ? (
          content.welcome.replace('{name}', user.name.split(' ')[0])
        ) : (
          <Skeleton className="h-10 w-64" />
        )}
      </h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle as="h2">{content.createRequest.title}</CardTitle>
            <CardDescription>
              {content.createRequest.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild size="lg" className="w-full">
              <Link href="/traveler/request/create">
                <PlusCircle aria-hidden="true" /> {content.createRequest.cta}
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle as="h2">{content.myRequests.title}</CardTitle>
            <CardDescription>{content.myRequests.description}</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex items-end">
            <Button asChild size="lg" className="w-full" variant="secondary">
              <Link href="/traveler/my-requests">
                <List aria-hidden="true" /> View My Requests
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
