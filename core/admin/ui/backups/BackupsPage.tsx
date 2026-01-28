import { CloudUpload, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { AdminShell } from "@/ui/layouts/AdminShell";
import { PageHeader } from "@/ui/shared/PageHeader";

import { BackupNowDialog } from "./BackupNowDialog";
import { BackupScheduleCard } from "./BackupScheduleCard";
import { BackupsTable } from "./BackupsTable";

export function BackupsPage() {
  const [backupOpen, setBackupOpen] = useState(false);

  return (
    <AdminShell
      activeHref="/admin/backups"
      showSearch={false}
      breadcrumbs={
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Admin</span>
          <span>/</span>
          <span className="text-foreground">Backups</span>
        </div>
      }
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <PageHeader
          title="Backups"
          description="Manage scheduled backups for your database and assets."
          actions={
            <Button className="gap-2" onClick={() => setBackupOpen(true)}>
              <CloudUpload className="h-4 w-4" />
              Create Backup Now
            </Button>
          }
        />
        <BackupScheduleCard />
        <BackupsTable />
        <div className="rounded-xl border border-blue-200/60 bg-blue-50/60 p-4 text-blue-900 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">
              <Info className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Storage Information</p>
              <p className="text-xs text-blue-700/90 dark:text-blue-200/80">
                Automated backups are retained for 30 days. To keep a backup
                longer, download it to your local machine.
              </p>
            </div>
          </div>
        </div>
      </div>
      <BackupNowDialog open={backupOpen} onOpenChange={setBackupOpen} />
    </AdminShell>
  );
}
