
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';

export default async function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // If there's no session, redirect to login.
  if (!user) {
    redirect('/login');
  } 
  
  // Strict validation: if the user is not a Guide, render a 404 page.
  // This prevents rendering of the wrong dashboard and stops redirect loops.
  if (user.role !== 'Guide') {
    notFound();
  }

  // If the role is correct, render the layout.
  return <AppLayout user={user}>{children}</AppLayout>;
}
