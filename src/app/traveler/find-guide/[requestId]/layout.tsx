import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `Find a Guide | ${siteName}`,
  description: 'Select a verified guide who matches your travel needs and preferences.',
};

export default function FindGuideLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
