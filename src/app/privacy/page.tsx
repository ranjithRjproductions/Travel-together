
import { AppLogo } from '@/components/app-logo';
import { Footer } from '@/components/footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-4 sm:p-6">
        <AppLogo />
      </header>
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-lg text-muted-foreground">
            This page is under construction. Our full privacy policy will be detailed here soon.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
