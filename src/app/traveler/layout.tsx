import { AppLogo } from '@/components/app-logo';
import { UserNav } from '@/components/user-nav';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TravelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  } else if (user.role !== 'Traveler') {
    // This is a critical role check. If a Guide somehow lands here,
    // redirect them to their correct dashboard.
    redirect('/guide/dashboard');
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
          <AppLogo />
        </nav>
        <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <UserNav user={user} />
        </div>
      </header>
      <main id="main-content" className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
