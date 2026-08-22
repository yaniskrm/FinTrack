import type { HealthScore } from "@fintrack/core";
import { Card } from "../ui/card";

// Fixed status palette (dataviz skill) — never themed. Paired with a label so
// meaning never rests on color alone.
const HEALTH: Record<HealthScore["label"], { text: string; color: string }> = {
  excellent: { text: "Excellent", color: "#0ca30c" },
  good: { text: "Bon", color: "#0ca30c" },
  fair: { text: "Correct", color: "#fab219" },
  poor: { text: "Fragile", color: "#ec835a" },
  critical: { text: "Critique", color: "#d03b3b" },
};

export function HealthTile({ score, label }: Pick<HealthScore, "score" | "label">) {
  const status = HEALTH[label];

  return (
    <Card className="gap-3 p-5">
      <p className="text-sm text-muted-foreground">Score de santé</p>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-foreground">{score}</span>
        <span className="text-sm text-muted-foreground">/ 100</span>
        <span
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: `${status.color}1f`, color: status.color }}
        >
          <span aria-hidden className="size-1.5 rounded-full" style={{ backgroundColor: status.color }} />
          {status.text}
        </span>
      </div>

      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${String(score)}%`, backgroundColor: status.color }}
        />
      </div>
    </Card>
  );
}
