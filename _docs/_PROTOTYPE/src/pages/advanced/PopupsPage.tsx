import { Eye, Megaphone, Plus, Power, TrendingUp } from "lucide-react";

import { PageHeader } from "@/components/patterns/PageHeader";
import { StatCard } from "@/components/patterns/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Link } from "@/lib/router";
import { spark } from "@/lib/mock";

const TONES = [
  "bg-primary-soft text-primary-soft-foreground",
  "bg-info-soft text-info",
  "bg-success-soft text-success",
  "bg-warning-soft text-warning",
];

const POPUPS = [
  { name: "Newsletter signup", trigger: "Timed", impressions: "42,180", conversion: "7.8%", active: true },
  { name: "Exit discount", trigger: "Exit intent", impressions: "31,440", conversion: "9.1%", active: true },
  { name: "Cookie consent", trigger: "On load", impressions: "128,940", conversion: "—", active: true },
  { name: "Welcome offer", trigger: "Scroll", impressions: "18,920", conversion: "5.4%", active: false },
];

export function PopupsPage() {
  return (
    <div>
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            Popups
            <Badge variant="soft">Beta</Badge>
          </span>
        }
        description="Capture attention with timed, scroll, and exit-intent overlays."
        actions={
          <Link to="/advanced/popups/sample">
            <Button className="gap-1.5">
              <Plus className="size-4" /> New popup
            </Button>
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active" value="3" delta="+1" trend="up" icon={<Power />} spark={spark(3)} />
        <StatCard label="Impressions" value="221k" delta="+9.2%" trend="up" icon={<Eye />} spark={spark(8)} />
        <StatCard label="Avg conversion" value="6.2%" delta="+0.8%" trend="up" icon={<TrendingUp />} spark={spark(14)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {POPUPS.map((popup, index) => (
          <Card key={popup.name} className="flex h-full flex-col p-5">
            <div className="flex items-start justify-between">
              <span className={`flex size-12 items-center justify-center rounded-2xl ${TONES[index % TONES.length]}`}>
                <Megaphone className="size-6" />
              </span>
              <Switch defaultChecked={popup.active} aria-label={`Toggle ${popup.name}`} />
            </div>

            <div className="mt-4 font-display text-[15px] font-semibold">{popup.name}</div>
            <div className="mt-1.5">
              <Badge variant="soft">{popup.trigger}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Impressions</div>
                <div className="font-medium tabular-nums">{popup.impressions}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Conversion</div>
                <div className="font-medium tabular-nums text-success">{popup.conversion}</div>
              </div>
            </div>

            <Link to="/advanced/popups/sample" className="mt-4">
              <Button variant="soft" size="sm" className="w-full">
                Edit popup
              </Button>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
}
