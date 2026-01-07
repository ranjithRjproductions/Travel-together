
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TravelerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: This server component is the authority for this route's authentication.
  // Per docs/REDIRECT_CONTRACT.md, all auth redirects for /traveler/* must happen here.
  // Do NOT add client-side auth redirects for this page.
  const user = await getUser();

  // If there's no session, middleware should have already redirected.
  // This is a server-side check for robustness.
  if (!user) {
    redirect('/login');
  } 
  
  // This is the strict validation. If the user's role is not 'Traveler',
  // redirect them to their correct dashboard.
  if (user.role !== 'Traveler') {
    if (user.role === 'Guide') {
      redirect('/guide/dashboard');
    } else if (user.isAdmin) {
      redirect('/admin');
    } else {
      // Fallback for unknown roles
      redirect('/login');
    }
  }

  // If the role is correct, render the layout with the user's data.
  return <AppLayout user={user}>{children}</AppLayout>;
}
