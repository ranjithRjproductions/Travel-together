'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  User,
  MapPin,
  Phone,
  Accessibility,
  ArrowLeft
} from 'lucide-react';
import { CardHeader, CardTitle } from '@/components/ui/card';

const navigation = [
  { name: 'Profile Information', href: '/profile/settings', icon: User },
  { name: 'My Address', href: '/profile/settings/address', icon: MapPin },
  { name: 'Contact Details', href: '/profile/settings/contact', icon: Phone },
  { name: 'Disability Disclosure', href: '/profile/settings/disability', icon: Accessibility },
];

export default function ProfileSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentPage = navigation.find(item => item.href === pathname);

  return (
    <div className="grid md:grid-cols-[250px_1fr] gap-8 items-start">
      <nav className="flex flex-col gap-2" aria-label="Profile Settings">
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
      </nav>
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} aria-label="Go back">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">{currentPage?.name || 'Profile Settings'}</CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  );
}
