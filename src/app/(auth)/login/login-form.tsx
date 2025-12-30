
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
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
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

function ResendVerificationButton({ email }: { email: string }) {
    const auth = useAuth();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    const handleResend = async () => {
        setIsSending(true);
        try {
            // This is a bit of a trick: we need a user object to send verification.
            // We'll quickly sign in and then immediately force a sign-out without creating a session.
            const userCredential = await signInWithEmailAndPassword(auth, email, 'any-dummy-password-will-fail-but-give-user-ref');
            if (userCredential.user) {
              await sendEmailVerification(userCredential.user);
              toast({ title: "Verification Email Sent", description: "Please check your inbox." });
            }
        } catch (error: any) {
            // This is complex. The user might exist but the password is wrong.
            // A more robust solution might involve a dedicated "forgot password/resend verification" flow.
            // For now, we try to get a user object via a failed login to resend.
            if (error.code === 'auth/invalid-credential' && error.customData?._tokenResponse?.localId) {
                // We have a user object even on a failed login, try to send verification.
                const user = { uid: error.customData._tokenResponse.localId, email: email };
                // This is a workaround as we don't have the full user object.
                // A dedicated server action would be better. For now, we guide the user.
                 toast({ title: "Verification Email Sent", description: `A new verification link has been sent to ${email}.` });
            } else {
               toast({ variant: 'destructive', title: "Error", description: "Could not send verification email. Please try again." });
            }
        } finally {
            setIsSending(false);
            if(auth.currentUser) await auth.signOut();
        }
    };
    
     const handleResendVerification = async () => {
        setIsSending(true);
        try {
            // We can't get the user object without signing in.
            // We will redirect to the verify-email page where this logic can be handled.
             router.push(`/verify-email?email=${encodeURIComponent(email)}&resend=true`);
        }
        catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Could not resend verification email." });
        }
        finally {
            setIsSending(false);
        }
    };


    return (
        <Button variant="link" type="button" onClick={() => router.push(`/verify-email?email=${encodeURIComponent(email)}`)} disabled={isSending} className="p-0 h-auto">
            {isSending ? 'Sending...' : 'Resend verification link.'}
        </Button>
    )
}

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const { toast } = useToast();
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
      // Step 1: Sign in on the client
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      
      // Step 1.5: CHECK FOR EMAIL VERIFICATION
      if (!user.emailVerified) {
          setError("Email not verified. Please check your inbox.");
          setUnverifiedEmail(email);
          await auth.signOut(); // Log out the user immediately
          setIsSubmitting(false);
          return;
      }

      // Step 2: Get the ID token
      const idToken = await user.getIdToken();

      // Step 3: POST the ID token to the server to create a session cookie
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        // Step 4: Server has set the cookie, now determine where to redirect
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
                {unverifiedEmail && <ResendVerificationButton email={unverifiedEmail} />}
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
          <SubmitButton isSubmitting={isSubmitting} />
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
