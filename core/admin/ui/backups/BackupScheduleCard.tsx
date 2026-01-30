import { Database } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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

export function BackupScheduleCard({
  schedule,
  isLoading,
  isSaving,
  onSave,
}: BackupScheduleCardProps) {
  const [frequency, setFrequency] = useState<BackupFrequency>(
    schedule?.frequency ?? "daily"
  );
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
    <Card className="border-border/60">
      <CardHeader>
        <div className="space-y-2">
          <CardTitle className="text-base">Backup Schedule</CardTitle>
          <CardDescription>
            Configure automated backups for your database and assets.
          </CardDescription>
        </div>
        <CardAction>
          <Badge
            variant="outline"
            className={cn(
              "gap-2 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide",
              schedule?.enabled
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                : "border-muted-foreground/30 bg-muted/40 text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                schedule?.enabled ? "bg-emerald-500" : "bg-muted-foreground"
              )}
            />
            {schedule
              ? schedule.enabled
                ? "Auto-backup active"
                : "Auto-backup paused"
              : "Loading schedule"}
          </Badge>
        </CardAction>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Frequency
            </p>
            <div className="flex gap-2 rounded-lg bg-muted/60 p-1">
              {frequencyOptions.map((option) => {
                const isActive = option.id === frequency;
                return (
                  <Button
                    key={option.id}
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "flex-1 rounded-md",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground"
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Storage Target
            </p>
            <Select
              value={storageDriver}
              onValueChange={(value) => setStorageDriver(value as BackupStorageDriver)}
              disabled={isLoading || isSaving}
            >
              <SelectTrigger className="w-full">
                <Database className="h-4 w-4 text-muted-foreground" />
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
      </CardContent>
    </Card>
  );
}
