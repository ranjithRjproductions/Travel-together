'use client';

import { CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function GuideExpertisePage() {
  // TODO: Implement Guide Expertise form as specified.
  return (
    <div>
        <CardDescription className="mb-6">
            Detail your experience and training in assisting travelers with disabilities.
        </CardDescription>
        <Skeleton className="h-96 w-full" />
        <p className="text-center text-muted-foreground mt-4">Guide Expertise form coming soon.</p>
    </div>
  );
}
