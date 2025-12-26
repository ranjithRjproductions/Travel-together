import { LoginForm } from './login-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import content from '@/app/content/login.json';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: content.pageTitle,
};

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const successMessage = searchParams?.message === 'Account created successfully! Please log in.' 
    ? content.successMessage 
    : searchParams?.message;

  return (
    <>
      {successMessage && (
        <Alert className="mb-4 bg-primary/10 border-primary/50 text-primary-foreground">
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}
      <LoginForm />
    </>
  );
}
