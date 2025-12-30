
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `Contact Details | ${siteName}`,
};

export default function ContactSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
