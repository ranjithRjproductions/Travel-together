
import AppLayout from '@/components/app-layout';
import { getUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function GuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
