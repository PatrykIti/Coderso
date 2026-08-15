import { FileUp, KeyRound, TriangleAlert, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type BackupImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (input: { file: File; passphrase: string; restoreUsers: boolean }) => Promise<boolean>;
  isSubmitting: boolean;
};

export function BackupImportDialog({
  open,
  onOpenChange,
  onImport,
  isSubmitting,
}: BackupImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [restoreUsers, setRestoreUsers] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setFile(null);
      setPassphrase("");
      setRestoreUsers(false);
    }
    onOpenChange(nextOpen);
  };

  const handleImport = async () => {
    if (!file || passphrase.trim() === "") return;
    const ok = await onImport({ file, passphrase, restoreUsers });
    if (ok) handleOpenChange(false);
  };

  const canSubmit = file !== null && passphrase.trim() !== "" && !isSubmitting;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Import Backup</DialogTitle>
            <DialogDescription>
              Restore from a downloaded .cbk archive. Enable maintenance mode in Settings before
              importing.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(false)}
            aria-label="Close import dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label
              htmlFor="backup-import-file"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Backup file (.cbk)
            </label>
            <div className="relative">
              <FileUp className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="backup-import-file"
                type="file"
                accept=".cbk,.json,application/octet-stream,application/json"
                className="cursor-pointer pl-9 file:cursor-pointer"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Upload the encrypted archive previously downloaded from this admin.
            </p>
          </div>
          <div className="space-y-2">
            <label
              htmlFor="backup-import-passphrase"
              className="text-xs font-semibold uppercase text-muted-foreground"
            >
              Passphrase
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="backup-import-passphrase"
                type="password"
                className="pl-9"
                placeholder="Passphrase used to encrypt this backup"
                value={passphrase}
                onChange={(event) => setPassphrase(event.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={restoreUsers}
              onCheckedChange={(checked) => setRestoreUsers(checked === true)}
            />
            <span>Restore users &amp; roles (sensitive)</span>
          </label>
          <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              Import replaces the selected content and settings with the archive contents. The
              backup record list is not affected. This cannot be undone.
            </span>
          </div>
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={handleImport} disabled={!canSubmit}>
            <FileUp className="h-4 w-4" />
            {isSubmitting ? "Importing..." : "Import Backup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
