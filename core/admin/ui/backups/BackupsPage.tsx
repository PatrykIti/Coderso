import { CloudUpload, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  getBackupSchedule,
  listBackups,
  restoreBackup,
  updateBackupSchedule,
  type BackupIncludeOption,
  type BackupListResult,
  type BackupSchedule,
  type BackupScheduleUpdate,
} from "@/services/backupsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

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
    mode: "external",
    healthy: true,
    queuedCount: 0,
    oldestQueuedAt: null,
    message: "No backup jobs are waiting for the external backup worker.",
  },
};

export function BackupsPage() {
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupList, setBackupList] = useState<BackupListResult>(emptyBackupList);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isListLoading, setIsListLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadBackups = useCallback(
    async (next?: { page?: number; query?: string }) => {
      const requestedPage = next?.page ?? page;
      const requestedQuery = next?.query ?? query;
      setIsListLoading(true);
      try {
        const result = await listBackups({
          page: requestedPage,
          limit: backupPageSize,
          query: requestedQuery,
        });
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
        setIsListLoading(false);
      }
    },
    [page, query]
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextBackups, nextSchedule] = await Promise.all([
        listBackups({ page, limit: backupPageSize, query }),
        getBackupSchedule(),
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
      setIsLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    let active = true;
    Promise.all([listBackups({ page: 1, limit: backupPageSize }), getBackupSchedule()])
      .then(([nextBackupList, nextSchedule]) => {
        if (!active) return;
        setError(null);
        setBackupList(nextBackupList);
        setSchedule(nextSchedule);
      })
      .catch((err: unknown) => {
        if (!active) return;
        if (isApiClientError(err)) {
          setError(err.message);
        } else {
          setError("Failed to load backups.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const shouldPollBackups =
    !backupList.worker.healthy ||
    backupList.worker.queuedCount > 0 ||
    backupList.items.some((item) => item.status === "queued" || item.status === "running");

  useEffect(() => {
    if (!shouldPollBackups) return undefined;
    const interval = window.setInterval(() => {
      void loadBackups();
    }, backupPollingIntervalMs);
    return () => window.clearInterval(interval);
  }, [loadBackups, shouldPollBackups]);

  const handleCreateBackup = async (include: BackupIncludeOption[]) => {
    setIsSaving(true);
    setError(null);
    try {
      await createBackup({ kind: "manual", include });
      await loadBackups({ page: 1 });
      return true;
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to create backup.");
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
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to update backup schedule.");
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
      await refresh();
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to restore backup.");
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
      } else {
        setError("Backup is not ready for download.");
      }
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to download backup.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Delete this backup record?");
      if (!confirmed) return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await deleteBackup(id);
      const nextPage =
        backupList.items.length === 1 && backupList.hasPrevious ? Math.max(1, page - 1) : page;
      await loadBackups({ page: nextPage });
    } catch (err) {
      if (isApiClientError(err)) {
        setError(err.message);
      } else {
        setError("Failed to delete backup.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminShell activeHref="/admin/backups" showSearch={false} breadcrumbs={["Admin", "Backups"]}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Backups"
          description="Manage scheduled backups for your database and assets."
          actions={
            <Button className="gap-2" onClick={() => setBackupOpen(true)} disabled={isSaving}>
              <CloudUpload className="h-4 w-4" />
              Create Backup Now
            </Button>
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
          onRestore={handleRestore}
          onDownload={handleDownload}
          onDelete={handleDelete}
          onRefresh={() => void loadBackups()}
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
                Backup jobs are queued for the configured external worker. Completed backups become
                downloadable only when the worker publishes a secure artifact URL.
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
    </AdminShell>
  );
}
