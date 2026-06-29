import { Database } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type BackupScheduleCardProps = {
  schedule: BackupSchedule | null;
  isLoading: boolean;
  isSaving: boolean;
  onSave: (update: BackupScheduleUpdate) => void;
};

// TASK-479-26-L04: schedule card ported to the soft SectionCard look. Controls +
// the existing `onSave({ frequency, storageDriver })` wiring are unchanged; the
// prototype's "next backup scheduled for …" line is dropped (no `nextRunAt` on
// the real BackupSchedule).
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

  const handleSave = () => {
    if (!schedule) return;
    onSave({
      frequency,
      storageDriver,
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
        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            disabled={isLoading || isSaving || !schedule}
            onClick={handleSave}
          >
            {isSaving ? "Saving..." : "Update Schedule"}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
