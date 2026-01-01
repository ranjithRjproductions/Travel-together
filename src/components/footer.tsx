import Link from 'next/link';
import { Button } from '@/components/ui/button';
import content from '@/app/content/home.json';
import { AppLogo } from './app-logo';

export function Footer() {
  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <AppLogo />
            <p className="text-sm text-muted-foreground mt-4">
              Accessible journeys for everyone.
            </p>
          </div>
          <div className="col-span-1 md:col-start-3">
            <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
            <nav aria-label="Footer navigation">
              <ul className="space-y-2">
                {content.footer.links.map((link) => (
                  <li key={link.href}>
                    <Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary">
                      <Link href={link.href}>{link.label}</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
           <div className="col-span-1">
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
             <ul className="space-y-2">
                <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/about">About Us</Link></Button></li>
                <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/blogs">Our Blogs</Link></Button></li>
                <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/contact">Contact Us</Link></Button></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>{content.footer.copyright}</p>
        </div>
      </div>
    </footer>
  );
}
