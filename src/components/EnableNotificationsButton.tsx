'use client';

import { useState, useEffect } from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { BellPlus, BellOff, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFirebase } from '@/firebase';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function EnableNotificationsButton() {
    const isMobile = useIsMobile();
    const { firebaseApp, firestore, user } = useFirebase();
    const { toast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const handleRequestPermission = async () => {
        if (!firebaseApp || !firestore || !user || !('Notification' in window) || !('serviceWorker' in navigator)) {
            toast({
                variant: 'destructive',
                title: 'Unsupported Browser',
                description: 'Your browser does not support push notifications.',
            });
            return;
        }

        setIsProcessing(true);

        try {
            const currentPermission = await Notification.requestPermission();
            setPermission(currentPermission);

            if (currentPermission === 'granted') {
                const messaging = getMessaging(firebaseApp);
                const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });

                if (currentToken) {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    await updateDoc(userDocRef, {
                        fcmTokens: arrayUnion(currentToken),
                    });
                    toast({
                        title: 'Notifications Enabled',
                        description: 'You will now receive updates on your requests.',
                    });
                } else {
                    throw new Error('Could not get notification token.');
                }
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Notifications Blocked',
                    description: 'You have denied notification permissions. Please enable them in your browser settings if you change your mind.',
                });
            }
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not enable notifications. Please try again.',
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    // Only render on mobile devices
    if (!isMobile) {
        return null;
    }

    if (permission === 'granted') {
        return (
            <DropdownMenuItem disabled>
                <BellPlus />
                <span>Notifications Enabled</span>
            </DropdownMenuItem>
        );
    }
    
     if (permission === 'denied') {
        return (
             <DropdownMenuItem disabled>
                <BellOff />
                <span>Notifications Blocked</span>
            </DropdownMenuItem>
        );
    }

    return (
        <DropdownMenuItem onClick={handleRequestPermission} disabled={isProcessing}>
            {isProcessing ? <Loader2 className="animate-spin" /> : <BellPlus />}
            <span>Enable Notifications</span>
        </DropdownMenuItem>
    );
}
