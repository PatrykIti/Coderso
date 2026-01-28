import { CalendarDays } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { AnalyticsCharts } from "./AnalyticsCharts";
import { KpiCards } from "./KpiCards";
import { TopContentTable } from "./TopContentTable";
import { TopContentDrawer } from "./TopContentDrawer";

export function AnalyticsPage() {
  const [topContentOpen, setTopContentOpen] = useState(false);

  return (
    <AdminShell
      activeHref="/admin/analytics"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground">Analytics</span>
        </div>
      }
      topbarActions={
        <Select defaultValue="30">
          <SelectTrigger className="h-9">
            <CalendarDays className="h-4 w-4" />
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="ytd">Year to date</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Analytics Overview"
          description="Monitor traffic, conversions, and content performance."
        />
        <KpiCards />
        <AnalyticsCharts />
        <TopContentTable onViewAll={() => setTopContentOpen(true)} />
      </div>
      <TopContentDrawer
        open={topContentOpen}
        onOpenChange={setTopContentOpen}
      />
    </AdminShell>
  );
}
