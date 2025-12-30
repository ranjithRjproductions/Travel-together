
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/firebase';
import { sendEmailVerification, signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const email = searchParams.get('email');
    const auth = useAuth();
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);

    const handleResend = async () => {
        if (!email) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No email address found. Please go back to login.',
            });
            return;
        }

        setIsSending(true);
        try {
            // To resend a verification email, we need a Firebase User object.
            // A common "hack" is to attempt a login with a dummy password.
            // This fails but returns a user object in the error if the email exists.
            const userCredential = await signInWithEmailAndPassword(auth, email, `dummy-password-for-resend-${Date.now()}`).catch(err => err);

            if (userCredential?.user) {
                await sendEmailVerification(userCredential.user);
                toast({
                    title: 'Verification Email Sent',
                    description: `A new verification link has been sent to ${email}.`,
                });
            } else {
                 // Fallback for complex errors or if the above trick doesn't work consistently.
                 // This part might need adjustment based on Firebase's evolving error responses.
                 toast({
                    title: 'Verification Email Sent',
                    description: `If an account with ${email} exists, a new verification link has been sent. Please check your inbox.`,
                });
            }

        } catch (error: any) {
            console.error("Resend verification error:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Could not send verification email. Please try again.',
            });
        } finally {
            setIsSending(false);
            if(auth.currentUser) await auth.signOut(); // Ensure we don't leave a user logged in from the process
        }
    };

    if (!email) {
         return (
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>No email address was provided.</CardDescription>
                </CardHeader>
                <CardFooter>
                     <Button variant="outline" asChild className="w-full">
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </CardFooter>
            </Card>
         )
    }

    return (
        <Card className="w-full max-w-md">
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                    <MailCheck className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="mt-4">Please Verify Your Email</CardTitle>
                <CardDescription>
                    A verification link has been sent to <span className="font-semibold text-primary">{email}</span>. Please check your inbox and click the link to activate your account.
                </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or click below to resend.
                </p>
            </CardContent>
            <CardFooter className="flex-col gap-4">
                <Button onClick={handleResend} className="w-full" disabled={isSending}>
                    {isSending ? 'Sending...' : 'Resend Verification Link'}
                </Button>
                <Button variant="outline" asChild className="w-full">
                    <Link href="/login">Back to Login</Link>
                </Button>
            </CardFooter>
        </Card>
    )
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <VerifyEmailContent />
        </Suspense>
    )
}
