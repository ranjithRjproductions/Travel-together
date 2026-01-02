
'use client';

import { useState, useEffect } from 'react';
import { BellPlus, BellOff, Loader2, Check } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';

export function EnableNotificationsButton() {
    const { firebaseApp, firestore, user } = useFirebase();
    const { toast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);

    useEffect(() => {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPermission('unsupported');
            return;
        }
        setPermission(Notification.permission);
        
        // Check if token already exists for this browser
        const checkSubscription = async () => {
            if (!firebaseApp || !user) return;
            const messaging = getMessaging(firebaseApp);
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
            if (!vapidKey) return;
            const currentToken = await getToken(messaging, { vapidKey }).catch(() => null);
            if (currentToken && firestore) {
                const userDocRef = doc(firestore, 'users', user.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const tokens = userDoc.data().fcmTokens || [];
                    if (tokens.includes(currentToken)) {
                        setIsSubscribed(true);
                    }
                }
            }
        };

        if (Notification.permission === 'granted') {
             checkSubscription();
        }

    }, [firebaseApp, user, firestore]);

    const handleRequestPermission = async () => {
        if (!firebaseApp || !firestore || !user || permission === 'unsupported') {
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
                const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
                if (!vapidKey) {
                    throw new Error("VAPID key not configured.");
                }
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    const userDocRef = doc(firestore, 'users', user.uid);
                    await updateDoc(userDocRef, {
                        fcmTokens: arrayUnion(currentToken),
                    });
                    setIsSubscribed(true);
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
        } catch (error: any) {
            console.error('Error requesting notification permission:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not enable notifications. Please try again.',
            });
        } finally {
            setIsProcessing(false);
        }
    };
    
    if (isSubscribed || permission === 'granted') {
        return (
            <Button variant="secondary" disabled>
                <Check className="mr-2 h-4 w-4" />
                Enabled
            </Button>
        );
    }
    
     if (permission === 'denied') {
        return (
             <Button variant="outline" disabled>
                <BellOff className="mr-2 h-4 w-4" />
                Blocked
            </Button>
        );
    }

    if (permission === 'unsupported') {
        return <Button disabled>Unsupported</Button>;
    }

    return (
        <Button
            onClick={handleRequestPermission}
            disabled={isProcessing}
            aria-live="polite"
        >
            {isProcessing ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                </>
            ) : (
                <>
                    <BellPlus className="mr-2 h-4 w-4" />
                    <span>Enable</span>
                </>
            )}
        </Button>
    );
}
