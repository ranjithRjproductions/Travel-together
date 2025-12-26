import { AppLogo } from "@/components/app-logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4">
       <div className="w-full max-w-sm">
        <div className="mb-6">
          <AppLogo />
        </div>
        {children}
      </div>
    </main>
  );
}
