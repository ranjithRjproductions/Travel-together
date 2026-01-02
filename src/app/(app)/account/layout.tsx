
'use client';

import AppLayout from '@/components/app-layout';
import { useUser } from '@/firebase';
import { redirect, usePathname } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Settings, Bell, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

const accountNavigation = [
  { name: 'Profile', href: '/account', icon: UserIcon },
  { name: 'Notifications', href: '/account/notifications', icon: Bell },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  if (isUserLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col">
            <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                 <Skeleton className="h-10 w-40" />
                <div className="ml-auto flex-1 sm:flex-initial">
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>
            </header>
             <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                <Skeleton className="h-full w-full" />
             </main>
        </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  return (
    <AppLayout user={user}>
        <div className="space-y-1.5 mb-6">
            <h1 className="font-headline text-3xl font-bold tracking-tight">
                Account Settings
            </h1>
            <p className="text-muted-foreground">
                Manage your account settings, preferences, and notifications.
            </p>
        </div>
        <div className="grid md:grid-cols-[200px_1fr] gap-8 items-start">
            <nav className="hidden md:flex flex-col gap-2 text-sm text-muted-foreground" aria-label="Account Settings">
                {accountNavigation.map((item) => (
                <Button
                    key={item.name}
                    variant={pathname === item.href ? 'secondary' : 'ghost'}
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
            <main>{children}</main>
      </div>
    </AppLayout>
  );
}
