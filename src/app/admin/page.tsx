
'use server';

import { redirect } from 'next/navigation';

// This page's sole purpose is to redirect any traffic
// from /admin to the primary admin dashboard page.
export default async function AdminRootPage() {
  redirect('/admin/users/guides');
}
