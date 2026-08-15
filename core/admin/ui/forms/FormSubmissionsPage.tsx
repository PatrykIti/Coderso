import { CalendarDays, Inbox, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  exportFormSubmissions,
  getFormDetailCached,
  listFormSubmissions,
  type FormSubmission,
  type FormSubmissionsExport,
  type FormSubmissionsExportFormat,
} from "@/services/formsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";
import { StatCard } from "@/ui/shared/StatCard";
import { StatusBadge } from "@/ui/shared/StatusBadge";
import { useAdminRouter } from "@/ui/contexts/AdminRouterContext";

const PAGE_SIZE = 20;

const resolveFormId = (pathname: string) => {
  const parts = pathname.split("/").filter(Boolean);
  const formsIndex = parts.findIndex((segment) => segment === "forms");
  if (formsIndex === -1) return null;
  return parts[formsIndex + 1] ?? null;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Module-level helper so the (impure) `Date.now()` read stays out of the render
// body — the stat band recomputes only when `submissions` changes.
const countSubmissionsThisWeek = (submissions: FormSubmission[]) => {
  const since = Date.now() - WEEK_MS;
  return submissions.filter((submission) => new Date(submission.createdAt).getTime() >= since)
    .length;
};

const formatPayloadValue = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// Reused Blob/anchor download (same shape as analytics TopPagesDrawer.downloadTextFile).
const downloadExportFile = (file: FormSubmissionsExport) => {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") {
    throw new Error("download_unavailable");
  }
  const blob = new Blob([file.content], { type: file.contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

/**
 * Read-only form submissions list (client-readiness FIX 2): the data already
 * lands through the public submit endpoint and the admin API, but had no admin
 * screen. Mirrors the Form action logs page shape (route under the form,
 * fetch-on-open via the admin client, Back/Refresh header actions). There is
 * no submissions cache key in `cachePolicy` on purpose — the surface is
 * read-only and always shows fresh data; only the form detail (name + field
 * labels) hydrates through the existing cached client.
 */
export function FormSubmissionsPage() {
  const { navigate } = useAdminRouter();
  const [formId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return resolveFormId(window.location.pathname);
  });
  const [formName, setFormName] = useState<string>("Form");
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState<FormSubmissionsExportFormat | null>(null);

  const load = useCallback(async () => {
    if (!formId) return;
    const [detail, items] = await Promise.all([
      getFormDetailCached(formId),
      listFormSubmissions(formId),
    ]);
    return { detail, items };
  }, [formId]);

  const applyResult = useCallback((result: Awaited<ReturnType<typeof load>>) => {
    if (!result) return;
    setFormName(result.detail?.form.name ?? "Form");
    setFieldLabels(
      Object.fromEntries((result.detail?.fields ?? []).map((field) => [field.name, field.label]))
    );
    setSubmissions(result.items ?? []);
    setError(null);
  }, []);

  const handleLoadError = useCallback((err: unknown) => {
    if (isApiClientError(err)) {
      setError(err.message);
    } else {
      setError("Failed to load submissions.");
    }
  }, []);

  // Initial fetch-on-open: `isLoading` starts true, so the effect only flips
  // it off at the async boundary (no synchronous setState in the effect body).
  useEffect(() => {
    if (!formId) return undefined;
    let active = true;
    load()
      .then((result) => {
        if (active) applyResult(result);
      })
      .catch((err) => {
        if (active) handleLoadError(err);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applyResult, formId, handleLoadError, load]);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      applyResult(await load());
      setPage(0);
    } catch (err) {
      handleLoadError(err);
    } finally {
      setIsLoading(false);
    }
  }, [applyResult, handleLoadError, load]);

  const handleExport = useCallback(
    async (format: FormSubmissionsExportFormat) => {
      if (!formId || exporting) return;
      setExporting(format);
      setError(null);
      try {
        downloadExportFile(await exportFormSubmissions(formId, format));
      } catch (err) {
        setError(isApiClientError(err) ? err.message : "Failed to export submissions.");
      } finally {
        setExporting(null);
      }
    },
    [exporting, formId]
  );

  // The admin client has no server-side pagination for submissions, so the
  // list paginates client-side. The API returns newest first.
  const pageCount = Math.max(1, Math.ceil(submissions.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSubmissions = useMemo(
    () => submissions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
    [currentPage, submissions]
  );

  // Stat band — pure render-time derivation from the already-loaded
  // `submissions` (no fetch, no caching of submission payloads).
  const stats = useMemo(() => {
    const total = submissions.length;
    const thisWeek = countSubmissionsThisWeek(submissions);
    const spam = submissions.filter((submission) => submission.status === "spam").length;
    return { total, thisWeek, spam };
  }, [submissions]);

  return (
    <AdminShell
      activeHref="/admin/advanced/forms"
      breadcrumbs={["Content", "Forms", formName, "Submissions"]}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <PageHeader
          title="Form submissions"
          description="Review what visitors submitted through this form (read-only)."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={isLoading || submissions.length === 0 || exporting !== null}
                onClick={() => handleExport("csv")}
              >
                {exporting === "csv" ? "Exporting…" : "Export CSV"}
              </Button>
              <Button
                variant="outline"
                disabled={isLoading || submissions.length === 0 || exporting !== null}
                onClick={() => handleExport("json")}
              >
                {exporting === "json" ? "Exporting…" : "Export JSON"}
              </Button>
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

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load submissions</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={String(stats.total)} icon={<Inbox />} />
          <StatCard label="This week" value={String(stats.thisWeek)} icon={<CalendarDays />} />
          <StatCard label="Spam" value={String(stats.spam)} icon={<ShieldAlert />} />
        </div>

        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-48 px-4 py-3 text-left">Received</th>
                <th className="px-4 py-3 text-left">Submission</th>
                <th className="w-28 px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    Loading submissions...
                  </td>
                </tr>
              ) : submissions.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                    No submissions yet. Publish the form and embed it on a page to start collecting
                    responses.
                  </td>
                </tr>
              ) : (
                visibleSubmissions.map((submission) => (
                  <tr key={submission.id} className="border-t align-top">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(submission.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <dl className="grid gap-1">
                        {Object.entries(submission.payload).map(([key, value]) => (
                          <div key={key} className="flex flex-wrap gap-1">
                            <dt className="font-medium text-foreground">
                              {fieldLabels[key] ?? key}:
                            </dt>
                            <dd className="break-all text-muted-foreground">
                              {formatPayloadValue(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={submission.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Page {currentPage + 1} of {pageCount} ({submissions.length} submissions)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
