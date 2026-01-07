'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  MapPin,
  Phone,
  Accessibility,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

const navigation = [
  { name: 'Profile Information', href: '/traveler/profile/settings', icon: User, exact: true },
  { name: 'My Address', href: '/traveler/profile/settings/address', icon: MapPin },
  { name: 'Contact Details', href: '/traveler/profile/settings/contact', icon: Phone },
  { name: 'Disability Disclosure', href: '/traveler/profile/settings/disability', icon: Accessibility },
  { name: 'Account Settings', href: '/traveler/profile/settings/account', icon: Settings },
];

export default function ProfileSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const currentPage = navigation
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find(item => pathname.startsWith(item.href));


  return (
    <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
      <nav className="hidden md:flex flex-col gap-2" aria-label="Profile Settings">
        {navigation.map((item) => {
           const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
           return (
              <Button
                key={item.name}
                variant={isActive ? 'default' : 'ghost'}
                asChild
                className="justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
           )
        })}
         <Button variant="outline" asChild className="justify-start mt-4">
            <Link href="/traveler/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
            </Link>
        </Button>
      </nav>
      <main>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 border-b">
              <CardTitle as="h1" className="text-2xl font-bold tracking-tight">
                {currentPage?.name || 'Profile Settings'}
              </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}
