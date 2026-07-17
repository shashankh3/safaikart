import { CheckCircle2, Circle, Clock } from "lucide-react";
import { ORDER_STATUSES, statusColor } from "@/lib/format";

const TIMELINE = [
  "CONFIRMED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "CLEANING_IN_PROGRESS",
  "READY_FOR_DELIVERY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
] as const;

export function OrderTimeline({ status }: { status?: string }) {
  const currentIdx = TIMELINE.indexOf(status as (typeof TIMELINE)[number]);
  const isTerminal = status === "CANCELLED" || status === "REFUNDED";

  if (isTerminal) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
        <div className="text-xs uppercase font-semibold text-rose-800 tracking-wider mb-1">Order closed</div>
        <div className="text-sm text-rose-900">
          This order is <span className="font-semibold">{status}</span>.
        </div>
      </div>
    );
  }

  if (!ORDER_STATUSES.includes(status as (typeof ORDER_STATUSES)[number])) {
    return null;
  }

  return (
    <div className="rounded-xl border border-border p-4 bg-card">
      <div className="text-xs uppercase font-semibold text-muted-foreground tracking-wider mb-4">
        Progress
      </div>
      <ol className="space-y-3">
        {TIMELINE.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          return (
            <li key={step} className="flex items-center gap-3">
              {done ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : active ? (
                <div className="h-5 w-5 shrink-0 rounded-full bg-brand flex items-center justify-center">
                  <Clock className="h-3 w-3 text-gold animate-pulse" />
                </div>
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              )}
              <div
                className={
                  active
                    ? "text-sm font-semibold text-foreground"
                    : done
                    ? "text-sm text-muted-foreground line-through"
                    : "text-sm text-muted-foreground"
                }
              >
                {step.replace(/_/g, " ")}
              </div>
              {active && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full border ${statusColor(step)}`}>
                  now
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function slaBadge(status: string | undefined, createdAt: Date | null) {
  if (!createdAt) return null;
  if (status === "DELIVERED" || status === "CANCELLED" || status === "REFUNDED") return null;
  const ageMs = Date.now() - createdAt.getTime();
  const hours = Math.floor(ageMs / 3600000);
  if (hours < 6) return { label: `${hours}h`, tone: "ok" as const };
  if (hours < 24) return { label: `${hours}h`, tone: "warn" as const };
  const days = Math.floor(hours / 24);
  return { label: days > 0 ? `${days}d ${hours % 24}h` : `${hours}h`, tone: "danger" as const };
}
