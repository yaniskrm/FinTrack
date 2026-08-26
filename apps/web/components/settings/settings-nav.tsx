"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Download, Landmark, Shield, Tag, User } from "lucide-react";
import { cn } from "../../lib/utils";

const TABS = [
  { href: "/settings/account", label: "Compte", icon: User },
  { href: "/settings/security", label: "Sécurité", icon: Shield },
  { href: "/settings/accounts", label: "Comptes", icon: Landmark },
  { href: "/settings/categories", label: "Catégories", icon: Tag },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/export", label: "Export", icon: Download },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 border-b" aria-label="Sections des réglages">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
