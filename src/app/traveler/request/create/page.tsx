'use server';

import { redirect } from 'next/navigation';

export default async function CreateRequestRedirectPage() {
    // This page now solely redirects to the dynamic route handler.
    // The actual draft creation is handled client-side on the [requestId] page
    // to avoid race conditions with Firestore client-side hooks.
    redirect('/traveler/request/new');
}
