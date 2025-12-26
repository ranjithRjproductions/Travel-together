import { SignupForm } from './signup-form';
import content from '@/app/content/signup.json';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: content.pageTitle,
};

export default function SignupPage() {
  return <SignupForm />;
}
