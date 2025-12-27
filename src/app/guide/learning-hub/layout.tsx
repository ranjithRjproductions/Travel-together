import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function GuideLearningHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  } else if (user.role !== 'Guide') {
    // This is a critical role check. If a Traveler somehow lands here,
    // redirect them to their correct dashboard.
    redirect('/traveler/dashboard');
  }

  return <AppLayout user={user}>{children}</AppLayout>;
}
