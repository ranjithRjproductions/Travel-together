
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AppLogo({ className, homeUrl = '/' }: { className?: string, homeUrl?: string }) {
  return (
    <Link href={homeUrl} aria-label="Let's Travel Together - Homepage" className={cn("flex items-center gap-2 text-lg font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1", className)}>
      <div className="bg-primary text-primary-foreground p-2 rounded-full">
         <svg
          className="h-5 w-5"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
      </div>
      <span className="font-headline text-primary hidden sm:inline-block">Let&apos;s Travel Together</span>
    </Link>
  );
}
