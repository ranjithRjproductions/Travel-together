import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, ClipboardCheck, CalendarPlus } from 'lucide-react';
import content from '@/app/content/learning-hub.json';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `${content.pageTitle} | ${siteName}`,
};

export default function LearningHubPage() {
  return (
    <div className="grid gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{content.description}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 items-start">
        {/* Training Modules */}
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{content.trainingModules.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{content.trainingModules.description}</CardDescription>
            <div className="mt-4 text-sm text-muted-foreground border-l-2 pl-4 italic">
              {content.trainingModules.placeholder}
            </div>
          </CardContent>
        </Card>

        {/* Assessment Test */}
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{content.assessment.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{content.assessment.description}</CardDescription>
             <div className="mt-4 text-sm text-muted-foreground border-l-2 pl-4 italic">
              {content.assessment.placeholder}
            </div>
          </CardContent>
          <CardFooter>
            <Button disabled>{content.assessment.cta}</Button>
          </CardFooter>
        </Card>

        {/* Interview Scheduling */}
        <Card>
          <CardHeader className="flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
              <CalendarPlus className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{content.interview.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>{content.interview.description}</CardDescription>
             <div className="mt-4 text-sm text-muted-foreground border-l-2 pl-4 italic">
              {content.interview.placeholder}
            </div>
          </CardContent>
          <CardFooter>
            <Button disabled>{content.interview.cta}</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
