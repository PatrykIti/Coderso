import { Database, FileText, Image, RefreshCw, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isApiClientError } from "@/services/apiClient";
import { getDashboardData } from "@/services/dashboardClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { Donut } from "@/ui/shared/Charts";
import { AdminLink } from "@/ui/shared/AdminLink";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionCard } from "@/ui/shared/SectionCard";
import { RecentEditsTable } from "@/ui/dashboard/RecentEditsTable";
import { SecurityStatusCard } from "@/ui/dashboard/SecurityStatusCard";
import { SiteHealthCard } from "@/ui/dashboard/SiteHealthCard";
import { StatCard } from "@/ui/dashboard/StatCard";
import type {
  DashboardPayload,
  DashboardSecuritySummary,
  DashboardStorageSummary,
  DashboardTotals,
} from "../../../services/dashboard/dashboardTypes";

const EMPTY_TOTALS: DashboardTotals = { pages: 0, entries: 0, media: 0, users: 0 };
const EMPTY_STORAGE: DashboardStorageSummary = {
  usedBytes: 0,
  limitBytes: null,
  usedPercent: null,
};
const EMPTY_SECURITY: DashboardSecuritySummary = { status: "ok", issues: 0, checks: [] };

// Content-breakdown segments map 1:1 to the four real `totals` fields. Each
// carries the chart color (token var) + legend dot (token utility) so the donut
// and its legend stay in lockstep with no fabricated percentages.
const CONTENT_SEGMENTS = [
  { key: "pages", label: "Pages", color: "var(--primary)", dot: "bg-primary" },
  { key: "entries", label: "Entries", color: "var(--info)", dot: "bg-info" },
  { key: "media", label: "Media", color: "var(--success)", dot: "bg-success" },
  { key: "users", label: "Users", color: "var(--warning)", dot: "bg-warning" },
] as const satisfies ReadonlyArray<{
  key: keyof DashboardTotals;
  label: string;
  color: string;
  dot: string;
}>;

export function DashboardPage() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const payload = await getDashboardData();
      setError(null);
      setData(payload);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load dashboard data.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getDashboardData()
      .then((payload) => {
        if (!active) return;
        setError(null);
        setData(payload);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load dashboard data.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = useMemo(() => {
    const totals = data?.totals ?? EMPTY_TOTALS;
    return [
      {
        label: "Pages",
        value: totals.pages.toLocaleString("en-US"),
        icon: <FileText className="size-5" />,
      },
      {
        label: "Entries",
        value: totals.entries.toLocaleString("en-US"),
        icon: <Database className="size-5" />,
      },
      {
        label: "Media",
        value: totals.media.toLocaleString("en-US"),
        icon: <Image className="size-5" />,
      },
      {
        label: "Users",
        value: totals.users.toLocaleString("en-US"),
        icon: <Users className="size-5" />,
      },
    ];
  }, [data]);

  const totals = data?.totals ?? EMPTY_TOTALS;
  const donutSegments = CONTENT_SEGMENTS.map((segment) => ({
    label: segment.label,
    value: totals[segment.key],
    color: segment.color,
  }));
  const donutTotal = donutSegments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <AdminShell activeHref="/admin">
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <PageHeader
          title="Dashboard"
          description="Welcome back, Admin. Here's what's happening today."
          actions={
            <Button
              variant="outline"
              onClick={() => {
                setIsLoading(true);
                setError(null);
                void refresh();
              }}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Dashboard unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} label={card.label} value={card.value} icon={card.icon} />
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Loading dashboard...
          </div>
        ) : null}

        <div aria-busy={isLoading} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <SectionCard
            className="lg:col-span-2"
            title="Recent Edits"
            padded={false}
            bodyClassName="p-0"
            action={
              <Button asChild variant="ghost" size="sm">
                <AdminLink href="/pages" prefetch>
                  All pages
                </AdminLink>
              </Button>
            }
          >
            <RecentEditsTable items={data?.recentEdits ?? []} />
          </SectionCard>

          <SectionCard title="Content breakdown" description="By type">
            <div className="flex flex-col items-center">
              <div className="relative">
                <Donut segments={donutSegments} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-semibold">
                    {donutTotal.toLocaleString("en-US")}
                  </span>
                  <span className="text-xs text-muted-foreground">items</span>
                </div>
              </div>
              <div className="mt-4 grid w-full grid-cols-2 gap-2 text-sm">
                {CONTENT_SEGMENTS.map((segment) => (
                  <div key={segment.key} className="flex items-center gap-2">
                    <span className={cn("size-2.5 rounded-full", segment.dot)} />
                    <span className="text-muted-foreground">{segment.label}</span>
                    <span className="ml-auto font-medium">
                      {totals[segment.key].toLocaleString("en-US")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SiteHealthCard
            storage={data?.storage ?? EMPTY_STORAGE}
            security={data?.security ?? EMPTY_SECURITY}
          />
          <SecurityStatusCard summary={data?.security ?? EMPTY_SECURITY} />
        </div>
      </div>
    </AdminShell>
  );
}
