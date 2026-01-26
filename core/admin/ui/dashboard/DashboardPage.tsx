import { Eye, HardDrive, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionHeader } from "@/ui/shared/SectionHeader";
import { RecentEditsTable } from "@/ui/dashboard/RecentEditsTable";
import { SecurityStatusCard } from "@/ui/dashboard/SecurityStatusCard";
import { SiteHealthCard } from "@/ui/dashboard/SiteHealthCard";
import { StatCard } from "@/ui/dashboard/StatCard";

export function DashboardPage() {
  return (
    <AdminShell activeHref="/admin">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Dashboard"
          description="Welcome back, Admin. Here's what's happening today."
          actions={
            <div className="flex items-center gap-3">
              <Button variant="outline">Upload Media</Button>
              <Button>New Page</Button>
            </div>
          }
        />

        <div className="grid gap-6 md:grid-cols-3">
          <StatCard
            label="Total Visitors"
            value="12,450"
            delta="+12% from last week"
            accent="success"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <StatCard
            label="Page Views"
            value="48,205"
            delta="Avg. 3.4 pages/session"
            icon={<Eye className="h-5 w-5" />}
          />
          <StatCard
            label="Storage Used"
            value="82%"
            delta=""
            accent="warning"
            icon={<HardDrive className="h-5 w-5" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <SectionHeader
                title="Recent Edits"
                action={<Button variant="ghost">View All</Button>}
              />
            </CardHeader>
            <CardContent>
              <RecentEditsTable />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <SiteHealthCard />
            <SecurityStatusCard />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
