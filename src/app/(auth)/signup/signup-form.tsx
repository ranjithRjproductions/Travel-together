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
import Link from 'next/link';
import { User, Briefcase, UserPlus } from 'lucide-react';
import { signup } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { pending } = useFormStatus();
  const disabled = isSubmitting || pending;
  return (
    <Button type="submit" className="w-full" disabled={disabled}>
       {disabled ? 'Creating account...' : <><UserPlus className="mr-2" /> Create Account</>}
    </Button>
  );
}

export function SignupForm() {
  const [state, formAction] = useActionState(signup, null);
  const { toast } = useToast();
  const auth = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state?.success === false && state.message) {
      toast({
        variant: 'destructive',
        title: 'Signup Failed',
        description: state.message,
      });
      setIsSubmitting(false);
    }
  }, [state, toast]);

  const handleClientSignup = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUid = userCredential.user.uid;
      
      // Add UID to formData before calling the server action
      formData.append('uid', newUid);

      // Programmatically call the server action inside a transition
      startTransition(() => {
        formAction(formData);
      });

    } catch (error: any) {
      let message = 'An unexpected error occurred.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'This email is already associated with an account.';
      } else if (error.code === 'auth/weak-password') {
        message = 'The password is too weak. Please use at least 6 characters.';
      }
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: message,
      });
      setIsSubmitting(false);
    }
  };


  return (
      <form onSubmit={handleClientSignup}>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Create an Account</CardTitle>
            <CardDescription>
              Join our community of travelers and guides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {state?.success === false && state.message && (
               <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
             )}
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" placeholder="Alex Doe" required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="alex@example.com" required />
            </div>

            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required />
            </div>

            <div className="space-y-3">
                <Label>I am a...</Label>
                <RadioGroup name="role" required defaultValue="Traveler" className="flex flex-col space-y-1">
                    <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value="Traveler" id="role-traveler" />
                        <Label htmlFor="role-traveler" className="font-normal flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" /> Traveler
                        </Label>
                    </div>
                    <div className="flex items-center space-x-3 space-y-0">
                        <RadioGroupItem value="Guide" id="role-guide" />
                        <Label htmlFor="role-guide" className="font-normal flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" /> Guide
                        </Label>
                    </div>
                </RadioGroup>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <SubmitButton isSubmitting={isSubmitting || isPending}/>
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Button variant="link" asChild className="p-0 h-auto">
                 <Link href="/login">Log in</Link>
              </Button>
            </p>
          </CardFooter>
        </Card>
      </form>
  );
}
