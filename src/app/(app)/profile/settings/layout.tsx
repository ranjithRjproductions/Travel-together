'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  User,
  MapPin,
  Phone,
  Accessibility,
} from 'lucide-react';

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
        <CardContent className="pt-6">{children}</CardContent>
      </Card>
    </div>
  );
}
