
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  // If there's no session, redirect to login.
  if (!user) {
    redirect('/login');
  }

  // Strict validation: if the user is not an admin, render a 404 page.
  // This is the secure way to protect this route.
  if (!user.isAdmin) {
    notFound();
  }

  // If the user is an admin, render the admin-specific layout.
  return <AppLayout user={user}>{children}</AppLayout>;
}
