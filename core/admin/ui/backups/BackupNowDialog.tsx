import { CloudUpload, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import type { BackupIncludeOption } from "@/services/backupsClient";

type BackupNowDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (include: BackupIncludeOption[]) => Promise<boolean>;
  isSubmitting: boolean;
};

const includeOptions: Array<{ id: BackupIncludeOption; label: string; defaultChecked: boolean }> = [
  { id: "database", label: "Database snapshot", defaultChecked: true },
  { id: "media", label: "Media assets", defaultChecked: true },
  { id: "settings", label: "Settings & tokens", defaultChecked: false },
];

const defaultInclude = includeOptions.filter((item) => item.defaultChecked).map((item) => item.id);

export function BackupNowDialog({
  open,
  onOpenChange,
  onCreate,
  isSubmitting,
}: BackupNowDialogProps) {
  const [selected, setSelected] = useState<BackupIncludeOption[]>(defaultInclude);

  const toggleInclude = (id: BackupIncludeOption, checked: boolean | "indeterminate") => {
    setSelected((current) => {
      if (checked === true) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSelected(defaultInclude);
    onOpenChange(nextOpen);
  };

  const handleCreate = async () => {
    if (selected.length === 0) return;
    const ok = await onCreate(selected);
    if (ok) handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="flex flex-row items-start justify-between gap-4 border-b px-6 py-4 text-left">
          <div>
            <DialogTitle>Create Backup Now</DialogTitle>
            <DialogDescription>
              Select what should be included in the on-demand backup.
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(false)}
            aria-label="Close backup dialog"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div className="space-y-3 px-6 py-5">
          {includeOptions.map((item) => (
            <label key={item.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(item.id)}
                onCheckedChange={(checked) => toggleInclude(item.id, checked)}
              />
              <span>{item.label}</span>
            </label>
          ))}
          {selected.length === 0 ? (
            <p className="text-sm text-destructive">Select at least one backup section.</p>
          ) : null}
        </div>
        <Separator />
        <div className="flex flex-col gap-3 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            onClick={handleCreate}
            disabled={isSubmitting || selected.length === 0}
          >
            <CloudUpload className="h-4 w-4" />
            {isSubmitting ? "Starting..." : "Start Backup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
