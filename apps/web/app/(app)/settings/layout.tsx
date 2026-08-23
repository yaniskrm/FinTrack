import type { ReactNode } from "react";
import { SettingsNav } from "../../../components/settings/settings-nav";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <SettingsNav />
      {children}
    </div>
  );
}
