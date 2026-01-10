
'use server';

import { redirect } from 'next/navigation';

// This page's sole purpose is to redirect any traffic
// from /guide to the guide dashboard.
export default async function GuideRootPage() {
  redirect('/guide/dashboard');
}
