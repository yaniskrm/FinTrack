import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { Wordmark } from "./logo";

interface StatusPageProps {
  /** Small caps line above the title, e.g. "ERREUR 404". */
  eyebrow: string;
  title: string;
  description: string;
  /** Technical reference worth quoting to support (an error digest). Never an error message. */
  reference?: string | undefined;
  /** Actions (buttons / links). */
  children: ReactNode;
  /**
   * true  → a whole page of its own (404, global errors): brand mark + `<main>`.
   * false → rendered inside the authenticated shell, which already provides
   *         the `<main>` landmark and the navigation.
   */
  standalone?: boolean;
}

/** Shared layout of the 404 and error pages, in the app's own tokens. */
export function StatusPage({ eyebrow, title, description, reference, children, standalone = true }: StatusPageProps) {
  const Container = standalone ? "main" : "div";
  return (
    <Container
      className={cn(
        "flex flex-col items-center justify-center gap-6 px-6 py-12 text-center",
        standalone ? "min-h-screen bg-muted/40" : "min-h-[60vh]",
      )}
    >
      {standalone && <Wordmark size="lg" />}
      <div className="space-y-2">
        <p className="text-sm font-medium tracking-widest text-muted-foreground">{eyebrow}</p>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">{description}</p>
        {reference && <p className="text-xs text-muted-foreground">Référence : {reference}</p>}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
    </Container>
  );
}
