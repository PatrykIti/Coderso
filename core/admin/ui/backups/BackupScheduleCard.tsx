import { Database } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/ui/shared/SectionCard";
import type {
  BackupFrequency,
  BackupIncludeOption,
  BackupSchedule,
  BackupScheduleUpdate,
  BackupStorageDriver,
} from "@/services/backupsClient";

const frequencyOptions = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
] as const;

const storageOptions: Array<{ id: BackupStorageDriver; label: string }> = [
  { id: "local", label: "Local Storage" },
  { id: "s3", label: "Amazon S3" },
  { id: "azure", label: "Azure Blob" },
];

// Scheduled include set. `users` stays OFF by default: it is sensitive and
// encrypted-only (04 guard); operators opt in explicitly.
const scheduleIncludeOptions: Array<{
  id: BackupIncludeOption;
  label: string;
  defaultChecked: boolean;
}> = [
  { id: "database", label: "Database snapshot", defaultChecked: true },
  { id: "media", label: "Media assets", defaultChecked: true },
  { id: "settings", label: "Settings & tokens", defaultChecked: true },
  { id: "users", label: "Users & roles", defaultChecked: false },
];

const defaultScheduleInclude = scheduleIncludeOptions
  .filter((item) => item.defaultChecked)
  .map((item) => item.id);

type BackupScheduleCardProps = {
  schedule: BackupSchedule | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (update: BackupScheduleUpdate) => void;
};

export function BackupScheduleCard({
  schedule,
  isLoading,
  isSaving,
  onSave,
}: BackupScheduleCardProps) {
  const [frequency, setFrequency] = useState<BackupFrequency>(schedule?.frequency ?? "daily");
  const [storageDriver, setStorageDriver] = useState<BackupStorageDriver>(
    schedule?.storageDriver ?? "local"
  );
  const [include, setInclude] = useState<BackupIncludeOption[]>(
    schedule?.include?.length ? schedule.include : defaultScheduleInclude
  );

  const toggleInclude = (id: BackupIncludeOption, checked: boolean | "indeterminate") => {
    setInclude((current) => {
      if (checked === true) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((item) => item !== id);
    });
  };

  const handleSave = () => {
    if (!schedule) return;
    onSave({
      frequency,
      storageDriver,
      include,
    });
  };

  return (
    <SectionCard
      title="Automatic backups"
      description="Configure automated backups for your database and assets."
      icon={<Database />}
      action={
        <Badge
          variant={schedule?.enabled ? "success" : "secondary"}
          className="gap-1.5 text-[10px] font-semibold uppercase tracking-wide"
        >
          <span
            className={cn(
              "size-1.5 rounded-full",
              schedule?.enabled ? "bg-success" : "bg-muted-foreground"
            )}
          />
          {schedule
            ? schedule.enabled
              ? "Auto-backup active"
              : "Auto-backup paused"
            : "Loading schedule"}
        </Badge>
      }
    >
      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Frequency
          </p>
          <div className="flex gap-1 rounded-xl bg-muted p-1">
            {frequencyOptions.map((option) => {
              const isActive = option.id === frequency;
              return (
                <Button
                  key={option.id}
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={cn(
                    "flex-1 rounded-lg",
                    isActive ? "bg-card text-foreground shadow-soft" : "text-muted-foreground"
                  )}
                  disabled={isLoading || isSaving}
                  onClick={() => setFrequency(option.id)}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Storage Target
          </p>
          <Select
            value={storageDriver}
            onValueChange={(value) => setStorageDriver(value as BackupStorageDriver)}
            disabled={isLoading || isSaving}
          >
            <SelectTrigger className="w-full">
              <Database className="size-4 text-muted-foreground" />
              <SelectValue placeholder="Storage target" />
            </SelectTrigger>
            <SelectContent>
              {storageOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Include
          </p>
          <div className="space-y-2">
            {scheduleIncludeOptions.map((item) => (
              <label key={item.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={include.includes(item.id)}
                  onCheckedChange={(checked) => toggleInclude(item.id, checked)}
                  disabled={isLoading || isSaving}
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
          {include.includes("users") ? (
            <p className="text-xs text-destructive">
              Users &amp; roles are sensitive and require BACKUP_ENCRYPTION_PASSPHRASE to run
              unattended.
            </p>
          ) : null}
          {include.length === 0 ? (
            <p className="text-xs text-destructive">Select at least one section.</p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex items-end justify-end">
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:w-auto"
          disabled={isLoading || isSaving || !schedule || include.length === 0}
          onClick={handleSave}
        >
          {isSaving ? "Saving..." : "Update Schedule"}
        </Button>
      </div>
    </SectionCard>
  );
}
