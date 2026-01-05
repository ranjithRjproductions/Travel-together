
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect, notFound }from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  // A layout MUST only protect its own routes. It must not redirect to other roles.
  // If the user is not an admin, this route is not found for them.
  if (!user.isAdmin) {
    notFound();
  }

  // If the user is an admin, render the admin-specific layout.
  return <AppLayout user={user}>{children}</AppLayout>;
}
