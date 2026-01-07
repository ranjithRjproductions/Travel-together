
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: This server component is the authority for this route's authentication.
  // Per docs/REDIRECT_CONTRACT.md, all auth redirects for /admin/* must happen here.
  // Do NOT add client-side auth redirects for this page.
  const user = await getUser();

  // If there's no session, redirect to login.
  if (!user) {
    redirect('/login');
  }

  // Strict validation: if the user is not an admin, redirect them
  // to their correct dashboard.
  if (!user.isAdmin) {
    if (user.role === 'Traveler') {
      redirect('/traveler/dashboard');
    } else if (user.role === 'Guide') {
      redirect('/guide/dashboard');
    } else {
      // Fallback for unknown roles
      redirect('/login');
    }
  }

  // If the user is an admin, render the admin-specific layout.
  return <AppLayout user={user}>{children}</AppLayout>;
}
