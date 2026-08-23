import type { ReactNode } from "react";
import { Wordmark } from "../../components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center">
          <Wordmark size="lg" />
        </div>
        {children}
      </div>
    </main>
  );
}
