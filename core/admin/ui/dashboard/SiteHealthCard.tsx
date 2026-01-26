import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const metrics = [
  { label: "Performance Score", value: 98 },
  { label: "Uptime (30d)", value: 99 },
  { label: "Database Load", value: 12 },
];

export function SiteHealthCard() {
  return (
    <Card className="border-border/60">
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Site Health</h3>
          <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs font-medium text-emerald-700">
            Good
          </span>
        </div>
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="font-medium">{metric.value}%</span>
              </div>
              <Progress value={metric.value} className="h-2" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
