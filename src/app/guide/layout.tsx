
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: This server component is the authority for this route's authentication.
  // Per docs/REDIRECT_CONTRACT.md, all auth redirects for /guide/* must happen here.
  // Do NOT add client-side auth redirects for this page.
  const user = await getUser();

  // If there's no session, middleware should have already redirected.
  if (!user) {
    redirect('/login');
  } 
  
  // Strict validation: if the user is not a Guide, redirect them
  // to their correct dashboard.
  if (user.role !== 'Guide') {
     if (user.role === 'Traveler') {
      redirect('/traveler/dashboard');
    } else if (user.isAdmin) {
      redirect('/admin');
    } else {
      // Fallback for unknown roles
      redirect('/login');
    }
  }

  // If the role is correct, render the layout.
  return <AppLayout user={user}>{children}</AppLayout>;
}
