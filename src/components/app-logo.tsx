import { Plane } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export function AppLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2 text-lg font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md p-1", className)}>
      <div className="bg-primary text-primary-foreground p-2 rounded-full">
         <Plane className="h-5 w-5" />
      </div>
      <span className="font-headline text-primary hidden sm:inline-block">Let&apos;s Travel Together</span>
    </Link>
  );
}
