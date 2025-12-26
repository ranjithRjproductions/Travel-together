import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AppLogo } from '@/components/app-logo';
import { LogIn, UserPlus } from 'lucide-react';
import content from './content/home.json';

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'landing-hero');

  return (
    <>
      <header className="absolute top-0 left-0 w-full p-4 sm:p-6 z-10">
        <AppLogo />
      </header>
      <main className="flex flex-col min-h-screen">
        <div className="relative flex-grow flex items-center justify-center text-center text-white">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"></div>
          <div className="relative z-10 px-4 flex flex-col items-center">
            <h1 className="text-4xl md:text-6xl font-headline font-bold mb-4 drop-shadow-lg">
              {content.heading}
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mb-8 drop-shadow-md">
              {content.subheading}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform duration-300 hover:scale-105">
                <Link href="/signup">
                  <UserPlus aria-hidden="true" />
                  {content.getStartedButton}
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="transition-transform duration-300 hover:scale-105">
                <Link href="/login">
                  <LogIn aria-hidden="true" />
                  {content.loginButton}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
