
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { LogIn, AlertCircle } from 'lucide-react';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { useAuth, useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import content from '@/app/content/login.json';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={isSubmitting}>
      {isSubmitting ? (
        content.submitButtonSubmitting
      ) : (
        <>
          <LogIn className="mr-2 h-4 w-4" aria-hidden />
          {content.submitButton}
        </>
      )}
    </Button>
  );
}

function ResendVerificationButton({ email, onSendStart, onSendEnd }: { email: string, onSendStart: () => void, onSendEnd: () => void }) {
    const auth = useAuth();
    const { toast } = useToast();

    const handleResend = async () => {
        onSendStart();
        try {
            // This is a workaround to get a user object to resend verification.
            // It intentionally fails authentication to get the user context.
            await signInWithEmailAndPassword(auth, email, `dummy-password-for-resend-${Date.now()}`);
        } catch (error: any) {
            if (error.customData?._tokenResponse?.localId) {
                const userForVerification = { uid: error.customData._tokenResponse.localId, email: email };
                 // Re-create a minimal user object that sendEmailVerification can use.
                const mockUser = {
                    ...auth.currentUser,
                    uid: userForVerification.uid,
                    email: userForVerification.email,
                    emailVerified: false,
                    isAnonymous: false,
                    metadata: {},
                    providerData: [],
                    providerId: 'password',
                    tenantId: null,
                    delete: async () => {},
                    getIdToken: async () => '',
                    getIdTokenResult: async () => ({} as any),
                    reload: async () => {},
                    toJSON: () => ({}),
                };
                await sendEmailVerification(mockUser as any);
                toast({
                    title: 'Verification Email Sent',
                    description: `A new verification link has been sent to ${email}.`,
                });
            } else {
                // Fallback toast if the workaround fails.
                toast({
                    title: 'Verification Email Sent',
                    description: `If an account with ${email} exists, a new verification link has been sent.`,
                });
            }
        } finally {
            onSendEnd();
            if(auth.currentUser) await signOut(auth); // Ensure we don't leave a user logged in
        }
    };
    
    return (
        <Button variant="link" type="button" onClick={handleResend} className="p-0 h-auto">
            Resend verification link.
        </Button>
    );
}

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const auth = useAuth();
  const { firestore } = useFirebase();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setUnverifiedEmail(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      
      if (!user.emailVerified) {
          setError("Email not verified. Please check your inbox.");
          setUnverifiedEmail(email);
          await signOut(auth); // Log out the user immediately
          setIsSubmitting(false);
          return;
      }

      const idToken = await user.getIdToken();

      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        if (!firestore) throw new Error("Firestore not available");
        
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const redirectTo = userData.role === 'Guide' ? '/guide/dashboard' : '/traveler/dashboard';
          router.push(redirectTo);
        } else {
            throw new Error("User document not found.");
        }
      } else {
        throw new Error('Failed to create session.');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      let message = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'Invalid email or password.';
      } else if (err.message.includes("Please verify your email")) {
        message = err.message;
      }
      setError(message);
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-labelledby="login-title">
      <Card>
        <CardHeader>
          <CardTitle as="h1" id="login-title" className="text-2xl font-headline">
            {content.title}
          </CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Login Failed</AlertTitle>
              <AlertDescription>
                {error}
                {unverifiedEmail && <ResendVerificationButton email={unverifiedEmail} onSendStart={() => setIsResending(true)} onSendEnd={() => setIsResending(false)} />}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{content.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={content.emailPlaceholder}
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{content.passwordLabel}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={content.passwordPlaceholder}
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <SubmitButton isSubmitting={isSubmitting || isResending} />
          <p className="text-sm text-center text-muted-foreground">
            {content.signupPrompt}{' '}
             <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/signup">{content.signupLink}</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
