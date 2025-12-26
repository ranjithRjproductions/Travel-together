import { LoginForm } from './login-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  return (
    <>
      {searchParams?.message && (
        <Alert className="mb-4 bg-primary/10 border-primary/50 text-primary-foreground">
          <Info className="h-4 w-4" />
          <AlertTitle>Heads up!</AlertTitle>
          <AlertDescription>{searchParams.message}</AlertDescription>
        </Alert>
      )}
      <LoginForm />
    </>
  );
}
