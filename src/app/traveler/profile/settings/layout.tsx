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
} from 'lucide-react';

const navigation = [
  { name: 'Profile Information', href: '/traveler/profile/settings', icon: User },
  { name: 'My Address', href: '/traveler/profile/settings/address', icon: MapPin },
  { name: 'Contact Details', href: '/traveler/profile/settings/contact', icon: Phone },
  { name: 'Disability Disclosure', href: '/traveler/profile/settings/disability', icon: Accessibility },
];

export default function ProfileSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  const currentPage = navigation.find(item => item.href === pathname);

  return (
    <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
      <nav className="hidden md:flex flex-col gap-2" aria-label="Profile Settings">
        {navigation.map((item) => (
          <Button
            key={item.name}
            variant={pathname === item.href ? 'default' : 'ghost'}
            asChild
            className="justify-start"
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Link>
          </Button>
        ))}
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
