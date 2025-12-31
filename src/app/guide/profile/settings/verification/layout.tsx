
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `Verification | Guide Settings | ${siteName}`,
};

export default function GuideVerificationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
