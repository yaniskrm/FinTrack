import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 dark:bg-neutral-950">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-2xl font-bold tracking-tight text-indigo-600">
          FinTrack
        </p>
        {children}
      </div>
    </main>
  );
}
