'use client';

import { useState, useEffect } from 'react';
import { BellPlus, BellOff, Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { getMessaging, getToken } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';

export function EnableNotificationsButton() {
    const { firebaseApp, firestore, user } = useFirebase();
    const { toast } = useToast();
    const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
            setPermission(Notification.permission);
        }
    }, []);

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
    
    if (permission === 'granted') {
        return (
            <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground">
                <BellPlus className="mr-2 h-4 w-4" />
                <span>Notifications Enabled</span>
            </div>
        );
    }
    
     if (permission === 'denied') {
        return (
             <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground">
                <BellOff className="mr-2 h-4 w-4" />
                <span>Notifications Blocked</span>
            </div>
        );
    }

    if (permission === 'unsupported') {
        return null; // Don't show button if notifications aren't supported
    }

    return (
        <Button
            variant="ghost"
            className="w-full justify-start"
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
                    <span>Enable Notifications</span>
                </>
            )}
        </Button>
    );
}
