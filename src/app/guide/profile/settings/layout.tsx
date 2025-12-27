'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  User,
  MapPin,
  Phone,
  Accessibility,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

const guideNavigation = [
  { name: 'Profile Information', href: '/guide/profile/settings', icon: User },
  { name: 'Address Details', href: '/guide/profile/settings/address', icon: MapPin },
  { name: 'Contact Details', href: '/guide/profile/settings/contact', icon: Phone },
  { name: 'Disability Expertise', href: '/guide/profile/settings/expertise', icon: Accessibility },
  { name: 'Verification', href: '/guide/profile/settings/verification', icon: Sparkles },
];

export default function GuideProfileSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentPage = guideNavigation.find(item => pathname.startsWith(item.href));

  return (
    <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
      <nav className="hidden md:flex flex-col gap-2" aria-label="Guide Profile Settings">
        {guideNavigation.map((item) => (
          <Button
            key={item.name}
            variant={pathname.startsWith(item.href) ? 'default' : 'ghost'}
            asChild
            className="justify-start"
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              {item.name}
            </Link>
          </Button>
        ))}
      </nav>
      <main>
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 border-b">
              <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back to previous page">
                  <ArrowLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-2xl font-bold tracking-tight">
                <h1>{currentPage?.name || 'Guide Profile'}</h1>
              </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}
