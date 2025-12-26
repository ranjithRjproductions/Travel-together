import AppLayout from '@/app/(app)/layout';
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

  return <AppLayout user={user}>{children}</AppLayout>;
}
