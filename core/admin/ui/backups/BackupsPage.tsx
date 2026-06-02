import { CloudUpload, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  getBackupScheduleCached,
  getCachedBackups,
  getCachedBackupSchedule,
  listBackupsCached,
  restoreBackup,
  updateBackupSchedule,
  type BackupIncludeOption,
  type BackupListResult,
  type BackupSchedule,
  type BackupScheduleUpdate,
} from "@/services/backupsClient";
import { cacheKeys } from "@/services/cachePolicy";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { ConfirmActionDialog } from "@/ui/shared/ConfirmActionDialog";
import { PageHeader } from "@/ui/shared/PageHeader";
import { subscribeCacheEvents } from "@/utils/cacheBus";

import { BackupNowDialog } from "./BackupNowDialog";
import { BackupScheduleCard } from "./BackupScheduleCard";
import { BackupsTable } from "./BackupsTable";

const backupPageSize = 10;
const backupPollingIntervalMs = 30_000;

const emptyBackupList: BackupListResult = {
  items: [],
  page: 1,
  limit: backupPageSize,
  total: 0,
  hasNext: false,
  hasPrevious: false,
  worker: {
    mode: "internal",
    healthy: true,
    queuedCount: 0,
    oldestQueuedAt: null,
    message: "CMS backup worker is ready.",
  },
};

const downloadBackupContent = (payload: {
  content?: string;
  contentType?: string;
  fileName?: string;
}) => {
  if (typeof document === "undefined") return false;
  if (!payload.content) return false;
  const blob = new Blob([payload.content], {
    type: payload.contentType ?? "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = payload.fileName ?? "coderso-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
  return true;
};

const createInitialBackupsState = () => {
  const backupList = getCachedBackups({ page: 1, limit: backupPageSize }) ?? emptyBackupList;
  const schedule = getCachedBackupSchedule();
  return {
    backupList,
    schedule,
    hasCache: Boolean(schedule && getCachedBackups({ page: 1, limit: backupPageSize })),
  };
};

export function BackupsPage() {
  const [initialState] = useState(createInitialBackupsState);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupList, setBackupList] = useState<BackupListResult>(initialState.backupList);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(initialState.schedule);
  const [isLoading, setIsLoading] = useState(!initialState.hasCache);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingBulkDeleteIds, setPendingBulkDeleteIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadBackups = useCallback(
    async (next?: { page?: number; query?: string; force?: boolean; background?: boolean }) => {
      const requestedPage = next?.page ?? page;
      const requestedQuery = next?.query ?? query;
      if (!next?.background) setIsListLoading(true);
      try {
        const request = {
          page: requestedPage,
          limit: backupPageSize,
          query: requestedQuery,
          ...(next?.force === undefined ? {} : { force: next.force }),
        };
        const result = await listBackupsCached(request);
        setError(null);
        setBackupList(result);
        setPage(result.page);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load backups.");
        }
      } finally {
        if (!next?.background) setIsListLoading(false);
      }
    },
    [page, query]
  );

  const refresh = useCallback(
    async (options?: { force?: boolean; background?: boolean }) => {
      if (!options?.background) setIsLoading(true);
      try {
        const [nextBackups, nextSchedule] = await Promise.all([
          listBackupsCached({
            page,
            limit: backupPageSize,
            query,
            ...(options?.force === undefined ? {} : { force: options.force }),
          }),
          getBackupScheduleCached({ force: options?.force }),
        ]);
        setError(null);
        setBackupList(nextBackups);
        setSchedule(nextSchedule);
      } catch (err) {
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load backups.");
        }
      } finally {
        if (!options?.background) setIsLoading(false);
      }
    },
    [page, query]
  );

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      if (!active) return;
      if (!initialState.hasCache) setIsLoading(true);
      try {
        const [nextBackups, nextSchedule] = await Promise.all([
          listBackupsCached({
            page: 1,
            limit: backupPageSize,
            ...(!initialState.hasCache ? { force: true } : {}),
          }),
          getBackupScheduleCached(!initialState.hasCache ? { force: true } : undefined),
        ]);
        if (!active) return;
        setError(null);
        setBackupList(nextBackups);
        setSchedule(nextSchedule);
      } catch (err) {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load backups.");
        }
      } finally {
        if (active && !initialState.hasCache) setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [initialState.hasCache]);

  useEffect(() => {
    return subscribeCacheEvents((event) => {
      if (event.key === cacheKeys.backupSchedule || event.key.startsWith("backups:list:")) {
        void refresh({ force: event.action === "invalidate", background: true });
      }
    });
  }, [refresh]);

  const shouldPollBackups =
    !backupList.worker.healthy ||
    backupList.worker.queuedCount > 0 ||
    backupList.items.some((item) => item.status === "queued" || item.status === "running");

  useEffect(() => {
    if (!shouldPollBackups) return undefined;
    const interval = window.setInterval(() => {
      void loadBackups({ force: true, background: true });
    }, backupPollingIntervalMs);
    return () => window.clearInterval(interval);
  }, [loadBackups, shouldPollBackups]);

  const handleCreateBackup = async (include: BackupIncludeOption[]) => {
    setIsSaving(true);
    setError(null);
    try {
      const backup = await createBackup({ kind: "manual", include });
      const cached = getCachedBackups({ page: 1, limit: backupPageSize, query });
      if (cached) {
        setBackupList(cached);
        setPage(cached.page);
      } else {
        await loadBackups({ page: 1 });
      }
      if (backup.status === "failed") {
        const message = backup.error ?? "Backup failed.";
        setError(message);
        toast.error(message);
        return false;
      }
      toast.success("Backup created.");
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to create backup.";
        setError(message);
        toast.error(message);
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleQueryChange = (nextQuery: string) => {
    setQuery(nextQuery);
    setPage(1);
    void loadBackups({ page: 1, query: nextQuery });
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    void loadBackups({ page: nextPage });
  };

  const handleScheduleUpdate = async (next: BackupScheduleUpdate) => {
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateBackupSchedule(next);
      setSchedule(updated);
      toast.success("Backup schedule updated.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to update backup schedule.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestore = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await restoreBackup(id);
      await refresh({ force: true });
      toast.success("Backup restore started.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to restore backup.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      const payload = await downloadBackup(id);
      if (payload.url && typeof window !== "undefined") {
        window.open(payload.url, "_blank", "noopener,noreferrer");
        toast.success("Backup download opened.");
      } else if (downloadBackupContent(payload)) {
        toast.success("Backup downloaded.");
      } else {
        const message = "Backup is not ready for download.";
        setError(message);
        toast.error(message);
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to download backup.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const runDelete = async (id: string) => {
    setIsSaving(true);
    setError(null);
    try {
      await deleteBackup(id);
      const nextPage =
        backupList.items.length === 1 && backupList.hasPrevious ? Math.max(1, page - 1) : page;
      const cached = getCachedBackups({ page: nextPage, limit: backupPageSize, query });
      if (cached) {
        setBackupList(cached);
        setPage(cached.page);
      } else {
        await loadBackups({ page: nextPage });
      }
      setSelectedIds((current) => current.filter((itemId) => itemId !== id));
      toast.success("Backup deleted.");
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Failed to delete backup.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
      setPendingDeleteId(null);
    }
  };

  const runBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const results = await Promise.allSettled(ids.map((id) => deleteBackup(id)));
      const failed = results.filter((result) => result.status === "rejected").length;
      const succeeded = results.length - failed;
      const cached = getCachedBackups({ page, limit: backupPageSize, query });
      if (cached) {
        setBackupList(cached);
        setPage(cached.page);
      } else {
        await loadBackups({ page });
      }
      if (failed > 0) {
        const message =
          succeeded > 0
            ? `Deleted ${succeeded} backup${succeeded === 1 ? "" : "s"}; failed ${failed}.`
            : `Failed to delete ${failed} backup${failed === 1 ? "" : "s"}.`;
        setError(message);
        toast.error(message);
      } else {
        toast.success(`${succeeded} backup${succeeded === 1 ? "" : "s"} deleted.`);
      }
      setSelectedIds([]);
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
        toast.error(err.message);
      } else {
        const message = "Bulk backup delete failed.";
        setError(message);
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
      setPendingBulkDeleteIds([]);
    }
  };

  const visibleIds = backupList.items.map((item) => item.id);
  const visibleSelectedIds = selectedIds.filter((id) => visibleIds.includes(id));
  const selectedCount = visibleSelectedIds.length;
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const handleToggleBackup = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleToggleAll = () => {
    setSelectedIds((current) =>
      isAllSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : Array.from(new Set([...current, ...visibleIds]))
    );
  };

  return (
    <AdminShell activeHref="/admin/backups" showSearch={false} breadcrumbs={["Admin", "Backups"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Backups"
          description="Create, download, and manage CMS backup artifacts."
          actions={
            <div className="flex flex-wrap justify-end gap-2">
              {selectedCount > 0 ? (
                <>
                  <span className="flex items-center text-sm font-semibold text-foreground">
                    {selectedCount} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingBulkDeleteIds(visibleSelectedIds)}
                    disabled={isSaving}
                  >
                    Delete selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                    Clear
                  </Button>
                </>
              ) : null}
              <Button className="gap-2" onClick={() => setBackupOpen(true)} disabled={isSaving}>
                <CloudUpload className="h-4 w-4" />
                Create
              </Button>
            </div>
          }
        />
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Backups unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <BackupScheduleCard
          key={schedule?.id ?? "backup-schedule"}
          schedule={schedule}
          isLoading={isLoading}
          isSaving={isSaving}
          onSave={handleScheduleUpdate}
        />
        <BackupsTable
          result={backupList}
          query={query}
          isLoading={isLoading || isListLoading}
          isSaving={isSaving}
          selectedIds={visibleSelectedIds}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          onToggleAll={handleToggleAll}
          onToggleBackup={handleToggleBackup}
          onRestore={handleRestore}
          onDownload={handleDownload}
          onDelete={setPendingDeleteId}
          onRefresh={() => void loadBackups({ force: true })}
          onPageChange={handlePageChange}
          onQueryChange={handleQueryChange}
        />
        <div className="rounded-xl border border-blue-200/60 bg-blue-50/60 p-4 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Storage Information</p>
              <p className="text-xs text-blue-700/90 dark:text-blue-200/80">
                Backup jobs run inside the CMS. Completed local backups download through the
                authenticated admin API; remote artifacts open only when a configured storage URL is
                available.
              </p>
            </div>
          </div>
        </div>
      </div>
      <BackupNowDialog
        open={backupOpen}
        onOpenChange={setBackupOpen}
        onCreate={handleCreateBackup}
        isSubmitting={isSaving}
      />
      <ConfirmActionDialog
        open={Boolean(pendingDeleteId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="Delete backup?"
        description="Delete this backup record and its owned local artifact when one exists. This cannot be undone."
        confirmLabel="Delete"
        confirmingLabel="Deleting..."
        isConfirming={isSaving}
        onConfirm={() => {
          if (!pendingDeleteId) return undefined;
          return runDelete(pendingDeleteId);
        }}
      />
      <ConfirmActionDialog
        open={pendingBulkDeleteIds.length > 0}
        onOpenChange={(open) => {
          if (!open) setPendingBulkDeleteIds([]);
        }}
        title="Delete selected backups?"
        description={`Delete ${pendingBulkDeleteIds.length} backup${pendingBulkDeleteIds.length === 1 ? "" : "s"} and owned local artifacts when present. This cannot be undone.`}
        confirmLabel="Delete selected"
        confirmingLabel="Deleting..."
        isConfirming={isSaving}
        onConfirm={() => runBulkDelete(pendingBulkDeleteIds)}
      />
    </AdminShell>
  );
}
