
import type { Metadata } from 'next';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `Disability Expertise | Guide Settings | ${siteName}`,
};

export default function GuideExpertiseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
