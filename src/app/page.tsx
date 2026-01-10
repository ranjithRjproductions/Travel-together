

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { AppLogo } from '@/components/app-logo';
import { LogIn, UserPlus, ShieldCheck, UserCheck, Accessibility } from 'lucide-react';
import content from './content/home.json';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Footer } from '@/components/footer';

export default async function Home() {
  const user = await getUser();

  // If the user is authenticated, redirect them to their respective dashboard.
  if (user) {
    if (user.role === 'Guide') {
      redirect('/guide/dashboard');
    } else {
      redirect('/traveler/dashboard');
    }
  }

  // The rest of the component will only render for unauthenticated users.
  const heroImage = PlaceHolderImages.find((img) => img.id === 'landing-hero');
  const featureIcons = [
    <Accessibility key="a11y" aria-hidden="true" />,
    <UserCheck key="support" aria-hidden="true" />,
    <ShieldCheck key="guides" aria-hidden="true" />,
  ];

  return (
    <>
      <header className="absolute top-0 left-0 w-full p-4 sm:p-6 z-10 flex justify-between items-center">
        <AppLogo />
        <div className="flex items-center gap-2">
           <Button asChild size="sm" variant="secondary" className="transition-transform duration-300 hover:scale-105">
              <Link href="/login">
                <LogIn aria-hidden="true" />
                {content.header.secondaryCta.label}
              </Link>
            </Button>
            <Button asChild size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform duration-300 hover:scale-105 hidden sm:flex">
              <Link href="/signup">
                <UserPlus aria-hidden="true" />
                {content.header.primaryCta.label}
              </Link>
            </Button>
        </div>
      </header>
      <main id="main-content">
        <section aria-labelledby="hero-heading" className="relative flex min-h-[75vh] items-center justify-center text-center text-white">
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
            <h1 id="hero-heading" className="text-4xl md:text-6xl font-headline font-bold mb-4 drop-shadow-lg">
              {content.hero.heading}
            </h1>
            <p className="text-lg md:text-xl max-w-2xl mb-8 drop-shadow-md">
              {content.hero.description}
            </p>
            <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform duration-300 hover:scale-105">
              <Link href="/signup">
                <UserPlus aria-hidden="true" />
                {content.hero.primaryCta.label}
              </Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="features-heading" className="py-16 sm:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 id="features-heading" className="sr-only">Our Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 text-center">
              {content.features.map((feature, index) => (
                <div key={index} className="flex flex-col items-center">
                  <div className="bg-primary text-primary-foreground rounded-full p-4 mb-4">
                    {featureIcons[index]}
                  </div>
                  <h3 id={`feature-heading-${index}`} className="text-xl font-headline font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        <section aria-labelledby="trust-heading" className="py-16 sm:py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 id="trust-heading" className="text-3xl font-headline font-bold mb-4">{content.trust.heading}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{content.trust.description}</p>
          </div>
        </section>
        
        <section aria-labelledby="accessibility-heading" className="py-16 sm:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 text-center">
            <h2 id="accessibility-heading" className="text-3xl font-headline font-bold mb-4">{content.accessibility.heading}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">{content.accessibility.description}</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
