
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function AppLogo({ className, homeUrl = '/' }: { className?: string, homeUrl?: string }) {
  return (
    <Link href={homeUrl} className={cn("flex items-center gap-2 text-lg font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1", className)}>
      <Image 
        src="/logo.png" 
        alt="Let's Travel Together logo: a minimalist icon showing one person guiding another along a curved forward path, symbolizing shared and accessible travel." 
        width={60} 
        height={60}
        className="rounded-full"
      />
      <span className="font-headline text-primary hidden sm:inline-block" aria-hidden="true">Let&apos;s Travel Together</span>
      <span className="sr-only">Homepage</span>
    </Link>
  );
}
