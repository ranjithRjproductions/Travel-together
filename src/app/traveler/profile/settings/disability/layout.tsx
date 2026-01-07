
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `Disability Disclosure | Traveler Settings | ${siteName}`,
};

export default function DisabilitySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
