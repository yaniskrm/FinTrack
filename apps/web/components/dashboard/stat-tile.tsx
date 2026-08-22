import type { ReactNode } from "react";
import { Card } from "../ui/card";
import { cn } from "../../lib/utils";

export function StatTile({
  label,
  value,
  tone = "neutral",
  children,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "income" | "expense";
  children?: ReactNode;
}) {
  return (
    <Card className="gap-2 p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          "text-2xl font-semibold tracking-tight tabular-nums",
          tone === "income" && "text-success",
          tone === "expense" && "text-foreground",
        )}
      >
        {value}
      </p>
      {children}
    </Card>
  );
}
