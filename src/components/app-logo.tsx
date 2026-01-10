
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppLogo({ className, homeUrl = '/' }: { className?: string, homeUrl?: string }) {
  return (
    <Link href={homeUrl} aria-label="Let's Travel Together - Homepage" className={cn("flex items-center gap-2 text-lg font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1", className)}>
      <Image 
        src="/logo.png" 
        alt="Let's Travel Together logo" 
        width={40} 
        height={40}
        className="rounded-full"
      />
      <span className="font-headline text-primary hidden sm:inline-block">Let&apos;s Travel Together</span>
    </Link>
  );
}
