import { Eye, MousePointerClick, Percent, Users } from "lucide-react";
import { type ComponentType } from "react";

import { StatCard } from "@/ui/shared/StatCard";

type Trend = "up" | "down" | "neutral";

export type KpiCardId = "visitors" | "pageviews" | "sessions" | "bounce";

export type KpiCard = {
  id: KpiCardId;
  label: string;
  value: string;
  change: string;
  trend: Trend;
};

const iconMap: Record<KpiCard["id"], ComponentType<{ className?: string }>> = {
  visitors: Users,
  pageviews: Eye,
  sessions: MousePointerClick,
  bounce: Percent,
};

// TASK-483-05-L02: KPI row ported to the shared StatCard, now bound to the four
// real traffic metrics from `buildTrafficKpiCards` (visitors / pageviews /
// sessions / bounce). No sparkline data exists on the overview, so the
// prototype's per-KPI spark is dropped.
export function KpiCards({ items }: { items: KpiCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((card) => {
        const Icon = iconMap[card.id];
        return (
          <StatCard
            key={card.id}
            label={card.label}
            value={card.value}
            delta={card.change}
            trend={card.trend === "neutral" ? "flat" : card.trend}
            icon={<Icon />}
          />
        );
      })}
    </div>
  );
}
