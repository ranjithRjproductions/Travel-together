'use client';

import { useEffect } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { firebaseApp, firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window === 'undefined' || !firebaseApp || isUserLoading || !user) return;

    const requestPermission = async () => {
      try {
        const messaging = getMessaging(firebaseApp);
        
        // 1. Request Permission
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('Notification permission granted.');
          
          // 2. Get Token
          const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY });
          
          if (currentToken) {
            console.log('FCM Token:', currentToken);
            
            // 3. Save Token to Firestore
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
              fcmTokens: arrayUnion(currentToken)
            });

          } else {
            console.log('No registration token available. Request permission to generate one.');
          }
        } else {
          console.log('Unable to get permission to notify.');
        }

        // 4. Handle incoming foreground messages
        onMessage(messaging, (payload) => {
          console.log('Message received. ', payload);
          toast({
            title: payload.notification?.title,
            description: payload.notification?.body,
          });
        });

      } catch (error) {
        console.error('An error occurred while setting up notifications.', error);
      }
    };

    requestPermission();

  }, [firebaseApp, firestore, user, isUserLoading, toast]);

  return <>{children}</>;
}
