
'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function MyBookingsPage() {
  const router = useRouter();

  return (
    <div className="grid gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="font-headline text-3xl font-bold">My Bookings</h1>
        <Button
          variant="outline"
          onClick={() => router.push('/traveler/dashboard')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="inprogress">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inprogress">In Progress</TabsTrigger>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
            </TabsList>
            <TabsContent value="inprogress" className="mt-4">
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>
                  This is where you will find guides that match your submitted
                  requests.
                </p>
                <p className="text-sm">(Feature coming soon)</p>
              </div>
            </TabsContent>
            <TabsContent value="upcoming" className="mt-4">
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>
                  Your confirmed bookings with assigned guides will appear here.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              <div className="text-center text-muted-foreground border-2 border-dashed border-muted rounded-lg p-8">
                <p>
                  Your completed trips will be listed here, where you can rate
                  your guide.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
