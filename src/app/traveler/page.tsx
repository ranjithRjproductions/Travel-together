
'use server';

import { redirect } from 'next/navigation';

// This page's sole purpose is to redirect any traffic
// from /traveler to the traveler dashboard.
export default function TravelerRootPage() {
  redirect('/traveler/dashboard');
}
