'use client';

import { useEffect } from 'react';
import { getMessaging, onMessage } from 'firebase/messaging';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { firebaseApp } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !firebaseApp || !('Notification' in window) || Notification.permission !== 'granted') {
        return;
    }
    
    let isMounted = true;

    try {
        const messaging = getMessaging(firebaseApp);

        // Handle incoming foreground messages
        const unsubscribe = onMessage(messaging, (payload) => {
          if (isMounted) {
              console.log('Message received. ', payload);
              toast({
                title: payload.notification?.title,
                description: payload.notification?.body,
              });
          }
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };

    } catch (error) {
        console.error('An error occurred while setting up foreground message listener.', error);
    }
    
  }, [firebaseApp, toast]);

  return <>{children}</>;
}
