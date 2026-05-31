import { CloudUpload, Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isApiClientError } from "@/services/apiClient";
import {
  createBackup,
  downloadBackup,
  getBackupSchedule,
  listBackups,
  restoreBackup,
  updateBackupSchedule,
  type BackupItem,
  type BackupSchedule,
  type BackupScheduleUpdate,
} from "@/services/backupsClient";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { BackupNowDialog } from "./BackupNowDialog";
import { BackupScheduleCard } from "./BackupScheduleCard";
import { BackupsTable } from "./BackupsTable";

export function BackupsPage() {
  const [backupOpen, setBackupOpen] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextBackups, nextSchedule] = await Promise.all([listBackups(), getBackupSchedule()]);
      setError(null);
      setBackups(nextBackups);
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
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([listBackups(), getBackupSchedule()])
      .then(([nextBackups, nextSchedule]) => {
        if (!active) return;
        setError(null);
        setBackups(nextBackups);
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

  const handleCreateBackup = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await createBackup({ kind: "manual" });
      await refresh();
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
          items={backups}
          isLoading={isLoading}
          isSaving={isSaving}
          onRestore={handleRestore}
          onDownload={handleDownload}
        />
        <div className="rounded-xl border border-blue-200/60 bg-blue-50/60 p-4 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Storage Information</p>
              <p className="text-xs text-blue-700/90 dark:text-blue-200/80">
                Automated backups are retained for 30 days. To keep a backup longer, download it to
                your local machine.
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
