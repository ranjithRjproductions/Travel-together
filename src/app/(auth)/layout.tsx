import { AppLogo } from "@/components/app-logo";
import { Footer } from "@/components/footer";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <main
        id="main-content"
        className="flex-grow flex flex-col items-center justify-center p-4"
      >
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <AppLogo />
          </div>
          {children}
        </div>
      </main>
      <Footer />
    </div>
  );
}