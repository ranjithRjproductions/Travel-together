

import { AppLogo } from '@/components/app-logo';
import { UserNav } from '@/components/user-nav';
import { type User } from '@/lib/definitions';
import { Footer } from './footer';

export default function AppLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  const getDashboardUrl = () => {
    if (user.role === 'Guide') {
      return '/guide/dashboard';
    }
    // For travelers and admins, the primary dashboard is the traveler one.
    return '/traveler/dashboard';
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
        <AppLogo homeUrl={getDashboardUrl()} />
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <div className="ml-auto flex-1 sm:flex-initial">
            <UserNav user={user} />
          </div>
        </div>
      </header>
      <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
