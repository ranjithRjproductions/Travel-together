
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';

export default async function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  } 
  
  // A layout MUST only protect its own routes. It must not redirect to other roles.
  // If the user is not a guide, this route is not found for them.
  if (user.role !== 'Guide') {
    notFound();
  }

  return <AppLayout user={user}>{children}</AppLayout>;
}
