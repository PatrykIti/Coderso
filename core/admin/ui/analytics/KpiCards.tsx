import { Eye, FileText, MousePointerClick, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Trend = "up" | "down";

type KpiCard = {
  id: string;
  label: string;
  value: string;
  helper?: string;
  change: string;
  trend: Trend;
  icon: React.ComponentType<{ className?: string }>;
  iconStyles: string;
};

const trendStyles: Record<Trend, string> = {
  up: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  down: "border-rose-500/20 bg-rose-500/10 text-rose-600",
};

const kpiCards: KpiCard[] = [
  {
    id: "visits",
    label: "Unique Visits",
    value: "42,891",
    change: "12%",
    trend: "up",
    icon: Eye,
    iconStyles: "bg-primary/10 text-primary",
  },
  {
    id: "conversions",
    label: "Conversions",
    value: "2,405",
    change: "8.4%",
    trend: "up",
    icon: MousePointerClick,
    iconStyles: "bg-emerald-500/10 text-emerald-600",
  },
  {
    id: "top-page",
    label: "Top Page Views",
    value: "12,402",
    helper: "/blog/modern-ui-trends",
    change: "3%",
    trend: "down",
    icon: FileText,
    iconStyles: "bg-slate-500/10 text-slate-600",
  },
];

export function KpiCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {kpiCards.map((card) => {
        const Icon = card.icon;
        const TrendIcon = card.trend === "up" ? TrendingUp : TrendingDown;

        return (
          <Card key={card.id} className="border-border/60">
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    card.iconStyles
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <Badge
                  variant="outline"
                  className={cn("gap-1 text-xs font-semibold", trendStyles[card.trend])}
                >
                  <TrendIcon className="h-3 w-3" />
                  {card.change}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-semibold text-foreground">{card.value}</p>
                {card.helper ? (
                  <p className="text-xs text-muted-foreground">{card.helper}</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
