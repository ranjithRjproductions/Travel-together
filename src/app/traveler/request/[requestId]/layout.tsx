import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `New Travel Request | ${siteName}`,
};

export default function CreateRequestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
