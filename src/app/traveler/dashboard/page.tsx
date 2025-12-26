import Image from 'next/image';
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
import { ArrowRight, Calendar, MapPin, Search, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import content from '@/app/content/traveler-dashboard.json';

export default async function TravelerDashboard() {
  const user = await getUser();
  if (!user) {
    redirect('/login');
  }

  const tripImage = PlaceHolderImages.find((img) => img.id === 'traveler-trip-1');
  const dest1 = PlaceHolderImages.find((img) => img.id === 'traveler-dest-1');
  const dest2 = PlaceHolderImages.find((img) => img.id === 'traveler-dest-2');
  const dest3 = PlaceHolderImages.find((img) => img.id === 'traveler-dest-3');
  const avatar1 = PlaceHolderImages.find((img) => img.id === 'traveler-avatar-1');
  const avatar2 = PlaceHolderImages.find((img) => img.id === 'traveler-avatar-2');
  const avatar3 = PlaceHolderImages.find((img) => img.id === 'traveler-avatar-3');

  const recommendedGuides = [
    { name: 'Elena', avatar: avatar1 },
    { name: 'Marco', avatar: avatar2 },
    { name: 'Aisha', avatar: avatar3 },
  ];
  const popularDestinations = [
    { name: 'Ancient Ruins', image: dest1 },
    { name: 'City Markets', image: dest2 },
    { name: 'Icy Summits', image: dest3 },
  ];

  return (
    <div className="grid gap-4 md:gap-8">
      <div className="flex items-center justify-between">
        <h1 className="font-headline text-3xl font-bold">{content.welcome.replace('{name}', user.name.split(' ')[0])}</h1>
        <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Search className="mr-2 h-4 w-4" aria-hidden="true" />
            {content.findTripButton}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <section aria-labelledby="next-adventure-heading" className="lg:col-span-2">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader>
              <CardTitle id="next-adventure-heading" className="flex items-center justify-between">
                  <span>{content.nextAdventureTitle}</span>
                  <Badge variant="secondary" className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {content.nextAdventureLocation}
                  </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" aria-hidden="true" />
                  <span>{content.nextAdventureDate}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {tripImage && (
                <div className="relative aspect-video w-full overflow-hidden rounded-lg">
                  <Image
                    src={tripImage.imageUrl}
                    alt={tripImage.description}
                    fill
                    className="object-cover"
                    data-ai-hint={tripImage.imageHint}
                  />
                </div>
              )}
              <p className="mt-4 text-muted-foreground">{content.nextAdventureDescription}</p>
            </CardContent>
            <CardFooter>
              <Button>
                  {content.viewTripButton}
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Button>
            </CardFooter>
          </Card>
        </section>

        <section aria-labelledby="recommended-guides-heading">
          <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <CardHeader>
              <CardTitle id="recommended-guides-heading" className="flex items-center gap-2"><Users className="h-5 w-5" aria-hidden="true"/> {content.recommendedGuidesTitle}</CardTitle>
              <CardDescription>{content.recommendedGuidesDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedGuides.map((guide, i) => (
                  <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                          <Avatar>
                              {guide.avatar && <AvatarImage src={guide.avatar.imageUrl} alt="" data-ai-hint={guide.avatar.imageHint}/>}
                              <AvatarFallback>{guide.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{guide.name}</span>
                      </div>
                      <Button variant="outline" size="sm">{content.viewProfileButton}</Button>
                  </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </div>

       <section aria-labelledby="popular-destinations-heading">
        <Card className="transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
          <CardHeader>
            <CardTitle id="popular-destinations-heading">{content.popularDestinationsTitle}</CardTitle>
            <CardDescription>{content.popularDestinationsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {popularDestinations.map((dest, i) => (
              <div key={i} className="relative group overflow-hidden rounded-lg">
                  {dest.image && <Image src={dest.image.imageUrl} alt={dest.image.description} width={400} height={300} className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-110" data-ai-hint={dest.image.imageHint}/>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 p-4">
                      <h3 className="text-white font-bold text-lg">{dest.name}</h3>
                  </div>
              </div>
            ))}
          </CardContent>
        </Card>
       </section>
    </div>
  );
}
