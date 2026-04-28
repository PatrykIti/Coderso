export type BackupStatus = "queued" | "running" | "complete" | "failed";
export type BackupKind = "manual" | "scheduled";
export type BackupStorageDriver = "local" | "s3" | "azure";
export type BackupFrequency = "daily" | "weekly" | "monthly";

export type BackupRecord = {
  id: string;
  status: BackupStatus;
  kind: BackupKind;
  storageDriver: BackupStorageDriver;
  artifactPath: string | null;
  sizeBytes: number | null;
  error: string | null;
  createdAt: Date;
  finishedAt: Date | null;
};

export type BackupSchedule = {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  retentionDays: number;
  storageDriver: BackupStorageDriver;
  createdAt: Date;
  updatedAt: Date;
};

export type BackupScheduleUpdate = {
  enabled?: boolean;
  frequency?: BackupFrequency;
  retentionDays?: number;
  storageDriver?: BackupStorageDriver;
};
