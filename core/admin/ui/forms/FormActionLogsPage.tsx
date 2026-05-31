import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isApiClientError } from "@/services/apiClient";
import { cacheKeys } from "@/services/cachePolicy";
import {
  getForm,
  listFormActionRuns,
  retryFormActionRun,
  type FormActionRun,
  type FormActionRunStatus,
} from "@/services/formsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";
import { subscribeCacheEvents } from "@/utils/cacheBus";

const resolveFormId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const formsIndex = parts.findIndex((segment) => segment === "forms");
  if (formsIndex === -1) return null;
  return parts[formsIndex + 1] ?? null;
};

export function FormActionLogsPage() {
  const { navigate } = useAdminRouter();
  const [formId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveFormId(window.location.pathname);
  });
  const [formName, setFormName] = useState<string>("Form");
  const [statusFilter, setStatusFilter] = useState<FormActionRunStatus | "all">("all");
  const [runs, setRuns] = useState<FormActionRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!formId) return;
    setIsLoading(true);
    try {
      const [form, nextRuns] = await Promise.all([
        getForm(formId),
        listFormActionRuns(formId, {
          status: statusFilter === "all" ? undefined : statusFilter,
          limit: 200,
        }),
      ]);
      setFormName(form?.name ?? "Form");
      setRuns(nextRuns);
      setError(null);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to load action logs.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [formId, statusFilter]);

  useEffect(() => {
    if (!formId) return undefined;
    let active = true;
    Promise.all([
      getForm(formId),
      listFormActionRuns(formId, {
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 200,
      }),
    ])
      .then(([form, nextRuns]) => {
        if (!active) return;
        setFormName(form?.name ?? "Form");
        setRuns(nextRuns);
        setError(null);
      })
      .catch((err) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load action logs.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [formId, statusFilter]);

  useEffect(() => {
    if (!formId) return undefined;
    return subscribeCacheEvents((event) => {
      if (event.key !== cacheKeys.formActionRuns(formId)) return;
      refresh().catch(() => undefined);
    });
  }, [formId, refresh]);

  const stats = useMemo(() => {
    return runs.reduce(
      (acc, run) => {
        if (run.status === "success") acc.success += 1;
        if (run.status === "failed") acc.failed += 1;
        if (run.status === "skipped") acc.skipped += 1;
        return acc;
      },
      { success: 0, failed: 0, skipped: 0 }
    );
  }, [runs]);

  const retryRun = async (runId: string) => {
    setIsRetrying(runId);
    try {
      await retryFormActionRun(runId);
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Retry failed.");
      }
    } finally {
      setIsRetrying(null);
    }
  };

  return (
    <AdminShell
      activeHref="/admin/advanced/forms"
      breadcrumbs={["Content", "Forms", formName, "Action logs"]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PageHeader
          title="Form action logs"
          description="Review action execution and retry failed runs."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!formId) return;
                  navigate(`/advanced/forms/${encodeURIComponent(formId)}`);
                }}
              >
                Back to form
              </Button>
              <Button variant="outline" onClick={() => refresh()}>
                Refresh
              </Button>
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Success</p>
            <p className="text-xl font-semibold text-foreground">{stats.success}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Failed</p>
            <p className="text-xl font-semibold text-destructive">{stats.failed}</p>
          </div>
          <div className="rounded-lg border bg-card px-4 py-3 text-sm">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Skipped</p>
            <p className="text-xl font-semibold text-foreground">{stats.skipped}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Filter status</p>
            <p className="text-xs text-muted-foreground">Narrow down runs by execution status.</p>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setIsLoading(true);
              setStatusFilter(value as FormActionRunStatus | "all");
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="skipped">Skipped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load action logs</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">Action</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Attempt</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Error</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    Loading action runs...
                  </td>
                </tr>
              ) : runs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No action runs yet. Use Runtime preview in the form editor to trigger a test
                    submission.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="border-t">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{run.actionLabel}</p>
                      <p className="text-xs text-muted-foreground">{run.actionType}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                          run.status === "success"
                            ? "bg-emerald-100 text-emerald-800"
                            : run.status === "failed"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{run.attempt}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {run.errorMessage ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {run.status === "failed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isRetrying === run.id}
                          onClick={() => retryRun(run.id)}
                        >
                          {isRetrying === run.id ? "Retrying..." : "Retry"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}
