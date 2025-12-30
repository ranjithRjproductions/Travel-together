
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
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

import { User, Briefcase, UserPlus, AlertCircle } from 'lucide-react';
import { signup } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import content from '@/app/content/signup.json';
import Link from 'next/link';

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const disabled = pending || isSubmitting;

  return (
    <Button type="submit" className="w-full" disabled={disabled}>
      {disabled ? content.submitButtonSubmitting : (
        <>
          <UserPlus className="mr-2 h-4 w-4" aria-hidden />
          {content.submitButton}
        </>
      )}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get('email'));
    const password = String(formData.get('password'));

    if (!email.endsWith('@gmail.com') && !email.endsWith('@outlook.com')) {
        toast({
            variant: 'destructive',
            title: 'Invalid Email Domain',
            description: 'Please use a @gmail.com or @outlook.com email address to sign up.',
        });
        setIsSubmitting(false);
        return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      formData.append('uid', userCredential.user.uid);
      startTransition(() => formAction(formData));
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description:
          err.code === 'auth/email-already-in-use'
            ? 'Email already in use'
            : 'Something went wrong',
      });
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-labelledby="signup-title">
      <Card>
        <CardHeader>
          <CardTitle as="h1" id="signup-title" className="text-2xl font-headline">
            {content.title}
          </CardTitle>
          <CardDescription>{content.description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state?.success === false && state.message && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
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
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{content.passwordLabel}</Label>
            <Input id="password" name="password" type="password" required autoComplete="new-password"/>
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">{content.roleLabel}</legend>

            <RadioGroup name="role" defaultValue="Traveler" required>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="Traveler" id="role-traveler" />
                <Label htmlFor="role-traveler" className="font-normal">
                  <User className="inline h-4 w-4 mr-1" /> {content.roleTraveler}
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <RadioGroupItem value="Guide" id="role-guide" />
                <Label htmlFor="role-guide" className="font-normal">
                  <Briefcase className="inline h-4 w-4 mr-1" /> {content.roleGuide}
                </Label>
              </div>
            </RadioGroup>
          </fieldset>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <SubmitButton isSubmitting={isSubmitting} />
          <p className="text-sm text-center text-muted-foreground">
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
