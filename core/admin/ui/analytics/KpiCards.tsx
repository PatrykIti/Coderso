import { FileText, Image, Layers } from "lucide-react";
import { type ComponentType } from "react";

import { StatCard } from "@/ui/shared/StatCard";

type Trend = "up" | "down" | "neutral";

export type KpiCard = {
  id: "publishedPages" | "entries" | "media";
  label: string;
  value: string;
  change: string;
  trend: Trend;
};

const iconMap: Record<KpiCard["id"], ComponentType<{ className?: string }>> = {
  publishedPages: FileText,
  entries: Layers,
  media: Image,
};

// TASK-479-26-L03: KPI row ported to the shared StatCard. Binds the three real
// `buildAnalyticsKpiCards` metrics (label/value/change/trend) — no sparkline data
// exists on the overview, so the prototype's per-KPI spark is dropped.
export function KpiCards({ items }: { items: KpiCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
