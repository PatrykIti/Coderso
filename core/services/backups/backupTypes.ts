export type BackupStatus = "queued" | "running" | "complete" | "failed";
export type BackupKind = "manual" | "scheduled";
export type BackupStorageDriver = "local" | "s3" | "azure";
export type BackupFrequency = "daily" | "weekly" | "monthly";

export const backupIncludeOptions = ["database", "media", "settings"] as const;
export type BackupIncludeOption = (typeof backupIncludeOptions)[number];

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

export type BackupCreateInput = {
  kind?: BackupKind;
  include?: BackupIncludeOption[];
};

export type BackupListQuery = {
  page?: number;
  limit?: number;
  query?: string;
};

export type BackupWorkerHealth = {
  mode: "internal" | "external";
  healthy: boolean;
  queuedCount: number;
  oldestQueuedAt: Date | null;
  message: string;
};

export type BackupListResult = {
  items: BackupRecord[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  worker: BackupWorkerHealth;
};

export type BackupDeleteResult = {
  ok: true;
  id: string;
};

export type BackupDownload = {
  url: string | null;
  path: string | null;
  fileName?: string;
  contentType?: string;
  content?: string;
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
