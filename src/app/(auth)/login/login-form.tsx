
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

import { LogIn, AlertCircle, MailCheck } from 'lucide-react';
import { signInWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import content from '@/app/content/login.json';
import Link from 'next/link';

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

function VerifyEmailCard({ email, onResend, onBackToLogin }: { email: string; onResend: () => void; onBackToLogin: () => void; }) {
    const [isResending, setIsResending] = useState(false);

    const handleResend = async () => {
        setIsResending(true);
        await onResend();
        setIsResending(false);
    };

    return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                    <MailCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-4">Please Verify Your Email</CardTitle>
                <CardDescription>
                    Your account is not active yet. A verification link was sent to <span className="font-semibold text-primary">{email}</span>. Please click the link to verify your account before logging in.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or click below to resend.
                </p>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <Button onClick={handleResend} className="w-full" disabled={isResending}>
                    {isResending ? 'Sending...' : 'Resend Verification Link'}
                </Button>
                <Button variant="outline" onClick={onBackToLogin} className="w-full">
                    Back to Login
                </Button>
            </CardFooter>
        </Card>
    );
}

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const handleResendVerification = async () => {
    if (!auth.currentUser) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find a user to send verification to. Please try logging in again."
        });
        return;
    }
    try {
        await sendEmailVerification(auth.currentUser);
        toast({
            title: 'Verification Email Sent',
            description: `A new verification link has been sent to ${auth.currentUser.email}.`,
        });
    } catch (err: any) {
         toast({
            variant: "destructive",
            title: "Error",
            description: "There was a problem sending the verification email. Please try again in a moment.",
        });
    }
  };

  const handleBackToLogin = async () => {
    if (auth.currentUser) {
        await signOut(auth);
    }
    setShowVerifyEmail(false);
    setUserEmail('');
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setShowVerifyEmail(false);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));
    setUserEmail(email);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;
      
      if (!user.emailVerified) {
          setShowVerifyEmail(true);
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
        const { isAdmin, role } = await res.json();
        
        if (isAdmin) {
          router.push('/admin');
        } else if (role === 'Guide') {
          router.push('/guide/dashboard');
        } else {
          router.push('/traveler/dashboard');
        }
      } else {
        throw new Error('Failed to create session.');
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      // Clean up any temporary auth state if login fails for other reasons
      if (auth.currentUser) {
        await signOut(auth);
      }
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      setIsSubmitting(false);
    }
  };

  if (showVerifyEmail) {
      return (
          <VerifyEmailCard 
            email={userEmail}
            onResend={handleResendVerification}
            onBackToLogin={handleBackToLogin}
          />
      );
  }

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
              <AlertDescription>{error}</AlertDescription>
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{content.passwordLabel}</Label>
               {/* <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push('/forgot-password')}
              >
                Forgot password?
              </Button> */}
            </div>
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
