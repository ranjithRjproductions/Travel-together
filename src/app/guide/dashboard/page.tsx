import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Star, Edit, PlusCircle, Users, Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import content from '@/app/content/guide-dashboard.json';

export default async function GuideDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const profileImage = PlaceHolderImages.find((img) => img.id === 'guide-profile');
  const avatar1 = PlaceHolderImages.find((img) => img.id === 'traveler-avatar-1');

  const upcomingTours = [
    { name: "Coastal City Walking Tour", date: "Oct 15, 2024", travelers: 4, status: "Confirmed" },
    { name: "Mountain Hiking Adventure", date: "Nov 5, 2024", travelers: 2, status: "Confirmed" },
  ];

  const bookingRequests = [
    { name: "Alex Doe", tour: "Ancient Ruins Exploration", avatar: avatar1 },
  ];

  return (
    <div className="grid gap-4 md:gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold">{content.welcome.replace('{name}', user.name.split(' ')[0])}</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <PlusCircle aria-hidden="true" className="mr-2 h-4 w-4" />
            {content.createTourButton}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <section aria-labelledby="guide-profile-heading">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle id="guide-profile-heading">{content.profileTitle}</CardTitle>
              <Button variant="secondary" size="sm">
                  <Edit aria-hidden="true" className="mr-2 h-4 w-4"/>
                  {content.editProfileButton}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col items-center text-center gap-4">
              <Avatar className="h-24 w-24">
                {profileImage && <AvatarImage src={profileImage.imageUrl} alt="" data-ai-hint={profileImage.imageHint} />}
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                  <h2 className="text-xl font-semibold">{user.name}</h2>
                  <p className="text-muted-foreground">{content.profileDescription}</p>
              </div>
              <div className="flex items-center gap-1" aria-label={`Rating: ${content.rating}`}>
                  {Array(5).fill(0).map((_, i) => <Star key={i} className={`h-5 w-5 ${i < 4 ? 'text-accent fill-accent' : 'text-muted-foreground'}`} aria-hidden="true" />)}
                   <span className="text-muted-foreground ml-2">({content.rating})</span>
              </div>
            </CardContent>
          </Card>
        </section>
        
        <section aria-labelledby="activity-feed-heading" className="lg:col-span-2">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader>
              <CardTitle id="activity-feed-heading">{content.activityFeedTitle}</CardTitle>
              <CardDescription>{content.activityFeedDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div aria-labelledby="upcoming-tours-heading">
                <h3 id="upcoming-tours-heading" className="font-semibold mb-2">{content.upcomingToursTitle}</h3>
                <div className="space-y-4">
                {upcomingTours.map((tour, i) => (
                  <div key={i} className="flex justify-between items-center">
                      <div>
                          <p className="font-medium">{tour.name}</p>
                          <p className="text-sm text-muted-foreground">{tour.date}</p>
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm" aria-label={`${tour.travelers} travelers`}>
                              <Users className="h-4 w-4" aria-hidden="true" />
                              <span>{tour.travelers}</span>
                          </div>
                          <Badge variant={tour.status === 'Confirmed' ? 'default' : 'secondary'} className="bg-primary/20 text-primary">{tour.status}</Badge>
                      </div>
                  </div>
                ))}
                </div>
              </div>
              <Separator />
              <div aria-labelledby="new-bookings-heading">
                  <h3 id="new-bookings-heading" className="font-semibold mb-2">{content.newBookingsTitle}</h3>
                   {bookingRequests.map((req, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-secondary/50">
                          <div className="flex items-center gap-3">
                              <Avatar>
                                  {req.avatar && <AvatarImage src={req.avatar.imageUrl} alt="" data-ai-hint={req.avatar.imageHint} />}
                                  <AvatarFallback>{req.name.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                  <p><span className="font-semibold">{req.name}</span> requested to book</p>
                                  <p className="text-sm text-muted-foreground">&quot;{req.tour}&quot;</p>
                              </div>
                          </div>
                          <div className="flex gap-2">
                               <Button size="sm" className="bg-primary">{content.acceptButton}</Button>
                               <Button size="sm" variant="outline">{content.declineButton}</Button>
                          </div>
                      </div>
                   ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
