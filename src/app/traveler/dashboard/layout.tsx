
import type { Metadata } from 'next';
import content from '@/app/content/traveler-dashboard.json';
import homeContent from '@/app/content/home.json';

const siteName = homeContent.meta.title.split('–')[0].trim();

export const metadata: Metadata = {
  title: `${content.pageTitle} | ${siteName}`,
};

export default function TravelerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
