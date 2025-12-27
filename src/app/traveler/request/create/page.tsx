'use server';

import { redirect } from 'next/navigation';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-admin';
import { getUser } from '@/lib/auth';

export default async function CreateRequestPage() {
    const user = await getUser();

    if (!user) {
        redirect('/login');
    }

    try {
        const newRequestRef = await addDoc(collection(db, 'travelRequests'), {
            travelerId: user.uid,
            status: 'draft',
            createdAt: serverTimestamp(),
            step1Complete: false,
            step2Complete: false,
            step3Complete: false,
            step4Complete: false,
        });

        redirect(`/traveler/request/${newRequestRef.id}`);

    } catch (error) {
        console.error("Failed to create travel request draft:", error);
        redirect('/traveler/dashboard?error=creation-failed');
    }

    return null; // This component will not render anything itself
}
