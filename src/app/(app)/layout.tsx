import { AppLogo } from '@/components/app-logo';
import { UserNav } from '@/components/user-nav';
import { User } from '@/lib/definitions';
import content from '@/app/content/home.json';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-50">
        <nav className="flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 w-full">
          <AppLogo />
        </nav>
        <div className="flex items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
          <UserNav user={user} />
        </div>
      </header>
      <main
        id="main-content"
        className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8"
      >
        {children}
      </main>
      <footer className="py-6 bg-background border-t">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center text-sm text-muted-foreground">
          <p>{content.footer.copyright}</p>
          <nav aria-label="Footer">
            <ul className="flex gap-4 mt-4 sm:mt-0">
              {content.footer.links.map((link) => (
                <li key={link.href}>
                  <Button variant="link" asChild className="p-0 h-auto">
                    <Link href={link.href}>{link.label}</Link>
                  </Button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}
