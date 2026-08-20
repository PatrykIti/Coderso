import { useEffect, useState } from "react";
import { Search } from "lucide-react";

import { isApiClientError } from "@/services/apiClient";
import { getSearchPerformance } from "@/services/seoClient";
import type { SeoSearchPerformance } from "../../../services/seo/seoTypes";

// TASK-493-05-L01: search-performance summary panel (top queries + totals).
// Additive render host for the /seo/search-performance read endpoint; the
// table/drawer and the 4-up stat row stay owned by SeoManagerPage.
export function SeoPerformancePanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [performance, setPerformance] = useState<SeoSearchPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSearchPerformance({ limit: 5 })
      .then((result) => {
        if (active) setPerformance(result);
      })
      .catch((err) => {
        if (active) {
          setError(isApiClientError(err) ? err.message : "Failed to load search performance.");
        }
      });
    return () => {
      active = false;
    };
  }, [refreshKey]);

  const totals = performance?.totals;
  const topQueries = performance?.topQueries ?? [];
  const hasData = Boolean(
    totals && (totals.totalImpressions > 0 || totals.totalClicks > 0 || topQueries.length > 0)
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Search className="size-4 text-muted-foreground" />
        Search performance
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !performance ? (
        <p className="text-sm text-muted-foreground">Loading search performance...</p>
      ) : !hasData ? (
        <p className="text-sm text-muted-foreground">
          No search performance data yet. Run “Sync performance” to fetch data from Google Search
          Console.
        </p>
      ) : totals ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Impressions</span>
              <span className="font-display text-2xl font-semibold tracking-tight">
                {totals.totalImpressions}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Clicks</span>
              <span className="font-display text-2xl font-semibold tracking-tight">
                {totals.totalClicks}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">CTR</span>
              <span className="font-display text-2xl font-semibold tracking-tight">
                {Math.round(totals.averageCtr * 100)}%
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Position</span>
              <span className="font-display text-2xl font-semibold tracking-tight">
                {totals.averagePosition}
              </span>
            </div>
          </div>

          {topQueries.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Top queries
              </span>
              <ul className="flex flex-col divide-y divide-border">
                {topQueries.map((query) => (
                  <li
                    key={query.query}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="min-w-0 truncate">{query.query}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {query.clicks} clicks · {query.impressions} impressions
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
