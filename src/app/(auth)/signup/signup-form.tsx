
'use client';

import { useEffect, useState, useTransition } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';

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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import { User, Briefcase, UserPlus, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { signup } from '@/lib/actions';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import content from '@/app/content/signup.json';
import Link from 'next/link';

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || isSubmitting;

  return (
    <Button type="submit" className="w-full" disabled={disabled} aria-live="polite">
      {disabled ? (
        content.submitButtonSubmitting
      ) : (
        <>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
          {content.submitButton}
        </>
      )}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [_, startTransition] = useTransition();
  const { toast } = useToast();
  const auth = useAuth();

  useEffect(() => {
    if (state?.success === false && state.message) {
      toast({
        variant: 'destructive',
        title: content.errorTitle,
        description: state.message,
      });
      setIsSubmitting(false);
    }
  }, [state, toast]);

  const handleClientSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      formData.append('uid', userCredential.user.uid);

      startTransition(() => {
        formAction(formData);
      });
    } catch (error: any) {
      let message = 'Something went wrong. Please try again.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already registered.';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password must be at least 6 characters.';
      }

      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: message,
      });

      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleClientSignup} aria-labelledby="signup-title">
      <Card>
        <CardHeader>
          <CardTitle as="h1" id="signup-title" className="font-headline text-2xl">
            {content.title}
          </CardTitle>

          <CardDescription>{content.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state?.success === false && state.message && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{content.errorTitle}</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{content.nameLabel}</Label>
            <Input id="name" name="name" required autoComplete="name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">{content.emailLabel}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{content.passwordLabel}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">
              {content.roleLabel}
            </legend>

            <RadioGroup name="role" defaultValue="Traveler" required>
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="Traveler" id="role-traveler" />
                <Label htmlFor="role-traveler" className="font-normal flex items-center gap-2">
                  <User className="h-4 w-4" aria-hidden="true" />
                  {content.roleTraveler}
                </Label>
              </div>

              <div className="flex items-center space-x-3">
                <RadioGroupItem value="Guide" id="role-guide" />
                <Label htmlFor="role-guide" className="font-normal flex items-center gap-2">
                  <Briefcase className="h-4 w-4" aria-hidden="true" />
                  {content.roleGuide}
                </Label>
              </div>
            </RadioGroup>
          </fieldset>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <SubmitButton isSubmitting={isSubmitting} />
          <p className="text-sm text-muted-foreground text-center">
            {content.loginPrompt}{' '}
            <Button variant="link" asChild className="p-0 h-auto">
              <Link href="/login">{content.loginLink}</Link>
            </Button>
          </p>
        </CardFooter>
      </Card>
    </form>
  );
}
