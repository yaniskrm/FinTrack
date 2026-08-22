import type { SVGProps } from "react";
import { cn } from "../lib/utils";

/** FinTrack mark — three stacked bars. Inherits color via `currentColor`. */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      className={className}
      {...props}
    >
      <path d="M24 72 H76" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M24 50 H58" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
      <path d="M24 28 H36" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

/** Logo mark (gold) + wordmark (foreground) lockup. */
export function Wordmark({
  size = "md",
  className,
}: {
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Logo className={cn("text-primary", size === "lg" ? "size-8" : "size-6")} />
      <span
        className={cn(
          "font-bold tracking-tight text-foreground",
          size === "lg" ? "text-2xl" : "text-lg",
        )}
      >
        FinTrack
      </span>
    </span>
  );
}
