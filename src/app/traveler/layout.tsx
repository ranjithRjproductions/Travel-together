
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';

export default async function TravelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // If there's no session, middleware should have already redirected.
  // This is a server-side check for robustness.
  if (!user) {
    redirect('/login');
  } 
  
  // This is the strict validation. If the user's role is not 'Traveler',
  // this layout will render a 404 Not Found page. It does not redirect.
  if (user.role !== 'Traveler') {
    notFound();
  }

  // If the role is correct, render the layout with the user's data.
  return <AppLayout user={user}>{children}</AppLayout>;
}
