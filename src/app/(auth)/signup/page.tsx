import { SignupForm } from './signup-form';
import content from '@/app/content/signup.json';
import homeContent from '@/app/content/home.json';
import type { Metadata } from 'next';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `${content.pageTitle} | ${siteName}`,
};

export default function SignupPage() {
  return <SignupForm />;
}
