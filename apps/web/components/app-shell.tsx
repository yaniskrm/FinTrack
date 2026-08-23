"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, LogOut, Menu, Shield, X } from "lucide-react";
import { signOutAction } from "../lib/auth/actions";
import { ThemeToggle } from "./theme-toggle";
import { Wordmark } from "./logo";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

const NAV = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/settings/security", label: "Sécurité", icon: Shield },
] as const;

export function AppShell({ email, children }: { email: string; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const handleClick = onNavigate ?? (() => undefined);
    return (
      <>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={handleClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center px-5">
          <Wordmark />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          <NavLinks />
        </nav>
        <div className="space-y-2 border-t p-3">
          <p className="truncate px-3 text-xs text-muted-foreground" title={email}>
            {email}
          </p>
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="size-4" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
          <Wordmark />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Menu"
              aria-expanded={open}
              onClick={() => {
                setOpen((o) => !o);
              }}
            >
              {open ? <X /> : <Menu />}
            </Button>
          </div>
        </header>

        {open && (
          <nav className="space-y-1 border-b bg-card px-3 py-2 md:hidden">
            <NavLinks
              onNavigate={() => {
                setOpen(false);
              }}
            />
            <form action={signOutAction} className="pt-1">
              <Button variant="ghost" size="sm" type="submit" className="w-full justify-start">
                <LogOut className="size-4" />
                Déconnexion
              </Button>
            </form>
          </nav>
        )}

        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
