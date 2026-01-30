import { FileText, Image, Layers, TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Trend = "up" | "down";

export type KpiCard = {
  id: "publishedPages" | "entries" | "media";
  label: string;
  value: string;
  change: string;
  trend: Trend;
};

const trendStyles: Record<Trend, string> = {
  up: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600",
  down: "border-rose-500/20 bg-rose-500/10 text-rose-600",
};

const iconMap: Record<KpiCard["id"], React.ComponentType<{ className?: string }>> = {
  publishedPages: FileText,
  entries: Layers,
  media: Image,
};

const iconStylesMap: Record<KpiCard["id"], string> = {
  publishedPages: "bg-primary/10 text-primary",
  entries: "bg-emerald-500/10 text-emerald-600",
  media: "bg-amber-500/10 text-amber-600",
};

export function KpiCards({ items }: { items: KpiCard[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {items.map((card) => {
        const Icon = iconMap[card.id];
        const TrendIcon = card.trend === "up" ? TrendingUp : TrendingDown;

        return (
          <Card key={card.id} className="border-border/60">
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    iconStylesMap[card.id]
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
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
