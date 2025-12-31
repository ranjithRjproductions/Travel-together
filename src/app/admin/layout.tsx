
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // This is the most critical check. If the user object from our trusted
  // server-side function doesn't have the `isAdmin` flag, they are
  // immediately redirected.
  if (!user.isAdmin) {
    // Redirect non-admins to their appropriate dashboard.
    const redirectUrl = user.role === 'Guide' ? '/guide/dashboard' : '/traveler/dashboard';
    redirect(redirectUrl);
  }

  // If the user is an admin, render the admin-specific layout.
  return <AppLayout user={user}>{children}</AppLayout>;
}
