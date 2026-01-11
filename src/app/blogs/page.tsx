
import { AppLogo } from '@/components/app-logo';
import { Footer } from '@/components/footer';

export default function BlogsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 sm:p-6">
        <AppLogo />
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Our Blogs</h1>
          <p className="text-lg text-muted-foreground">
            Our blog is coming soon! Check back for travel stories, tips, and updates from our community.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
