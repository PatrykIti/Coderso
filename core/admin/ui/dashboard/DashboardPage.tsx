import { Database, FileText, HardDrive, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { isApiClientError } from "@/services/apiClient";
import { getDashboardData } from "@/services/dashboardClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { SectionHeader } from "@/ui/shared/SectionHeader";
import { RecentEditsTable } from "@/ui/dashboard/RecentEditsTable";
import { SecurityStatusCard } from "@/ui/dashboard/SecurityStatusCard";
import { SiteHealthCard } from "@/ui/dashboard/SiteHealthCard";
import { StatCard } from "@/ui/dashboard/StatCard";
import type { DashboardPayload } from "../../../services/dashboard/dashboardTypes";

const formatBytes = (value: number) => {
  if (value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
};

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
    const totals = data?.totals ?? { pages: 0, entries: 0, media: 0 };
    const storage = data?.storage ?? {
      usedBytes: 0,
      usedPercent: null as number | null,
    };

    return [
      {
        label: "Pages",
        value: totals.pages.toLocaleString("en-US"),
        icon: <FileText className="h-5 w-5" />,
        accent: "primary" as const,
      },
      {
        label: "Entries",
        value: totals.entries.toLocaleString("en-US"),
        icon: <Database className="h-5 w-5" />,
        accent: "success" as const,
      },
      {
        label: "Storage Used",
        value:
          storage.usedPercent === null
            ? formatBytes(storage.usedBytes)
            : `${storage.usedPercent}%`,
        delta: storage.usedPercent === null ? "No quota configured" : undefined,
        icon: <HardDrive className="h-5 w-5" />,
        accent: "warning" as const,
      },
    ];
  }, [data]);

  return (
    <AdminShell activeHref="/admin">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <PageHeader
          title="Dashboard"
          description="Welcome back, Admin. Here's what's happening today."
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setIsLoading(true);
                  setError(null);
                  void refresh();
                }}
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          }
        />

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Dashboard unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              delta={card.delta}
              accent={card.accent}
              icon={card.icon}
            />
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Loading dashboard...
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3" aria-busy={isLoading}>
          <Card className="border-border/60 lg:col-span-2">
            <CardHeader className="flex items-center justify-between">
              <SectionHeader
                title="Recent Edits"
                action={null}
              />
            </CardHeader>
            <CardContent>
              <RecentEditsTable items={data?.recentEdits ?? []} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <SiteHealthCard
              storage={
                data?.storage ?? {
                  usedBytes: 0,
                  limitBytes: null,
                  usedPercent: null,
                }
              }
              security={
                data?.security ?? {
                  status: "ok",
                  issues: 0,
                  checks: [],
                }
              }
            />
            <SecurityStatusCard
              summary={
                data?.security ?? {
                  status: "ok",
                  issues: 0,
                  checks: [],
                }
              }
            />
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
