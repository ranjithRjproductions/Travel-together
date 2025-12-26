'use client';

import { useState } from 'react';
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
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { login } from '@/lib/actions';
import content from '@/app/content/login.json';

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={isSubmitting} aria-live="polite">
      {isSubmitting ? content.submitButtonSubmitting : <><LogIn aria-hidden="true" className="mr-2" /> {content.submitButton}</>}
    </Button>
  );
}

export function LoginForm() {
  const { toast } = useToast();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClientLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await userCredential.user.getIdToken(true);
      // Instead of processing the response, we just call the action.
      // The action will handle the redirect.
      await login(idToken);
      
      // If the action redirects, the code below won't execute.
      // If it returns due to an error that doesn't redirect, we might need to handle it.
      // However, the current action always redirects.

    } catch (error: any) {
        let message = 'An unexpected error occurred.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = 'Invalid email or password.';
        }
        setError(message);
        toast({
            variant: "destructive",
            title: "Login Failed",
            description: message,
        });
        setIsSubmitting(false);
    }
  };


  return (
    <form onSubmit={handleClientLogin} aria-labelledby="login-title">
      <Card>
        <CardHeader>
          <CardTitle>
            <h1 id="login-title" className="font-headline text-2xl">{content.title}</h1>
          </CardTitle>
          <CardDescription>
            {content.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div role="alert" aria-live="assertive">
            {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{content.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={content.emailPlaceholder}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{content.passwordLabel}</Label>
            <Input id="password" name="password" type="password" placeholder={content.passwordPlaceholder} required autoComplete="current-password" />
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
