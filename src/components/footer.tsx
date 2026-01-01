
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import content from '@/app/content/home.json';

export function Footer() {
  return (
    <>
      <div role="group" aria-label="Footer navigation" className="bg-background border-t">
        <div className="container mx-auto px-4 py-8">
          <nav aria-label="Footer">
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/blogs">Our Blogs</Link></Button></li>
              <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/about">About Us</Link></Button></li>
              <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/contact">Contact Us</Link></Button></li>
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
      </div>
      <footer className="bg-background border-t">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>Copyright © 2026 Let's Travel Together, Inc. All rights reserved.</p>
        </div>
      </footer>
    </>
  );
}
