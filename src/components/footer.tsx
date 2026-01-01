import Link from 'next/link';
import { Button } from '@/components/ui/button';
import content from '@/app/content/home.json';

export function Footer() {
  return (
    <footer className="bg-background border-t mt-auto">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-8">
             <div>
              <h3 className="font-semibold text-foreground mb-4">Company</h3>
               <ul className="space-y-2">
                  <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/blogs">Our Blogs</Link></Button></li>
                  <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/about">About Us</Link></Button></li>
                  <li><Button variant="link" asChild className="p-0 h-auto font-normal text-muted-foreground hover:text-primary"><Link href="/contact">Contact Us</Link></Button></li>
              </ul>
            </div>
            <div>
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
          </div>
        </div>
        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>© 2026 Let's Travel Together, Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
