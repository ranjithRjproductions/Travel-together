'use server';

import { redirect } from 'next/navigation';

export default async function CreateRequestRedirectPage() {
    // This page now solely redirects to the client-side handler page.
    // The actual draft creation is handled on the [requestId] page
    // when the requestId is 'new'.
    redirect('/traveler/request/new');
}
