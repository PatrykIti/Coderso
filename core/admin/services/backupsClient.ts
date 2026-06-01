import { apiRequest } from "./apiClient";

export type BackupStatus = "queued" | "running" | "complete" | "failed";
export type BackupKind = "manual" | "scheduled";
export type BackupStorageDriver = "local" | "s3" | "azure";
export type BackupFrequency = "daily" | "weekly" | "monthly";
export type BackupIncludeOption = "database" | "media" | "settings";

export type BackupItem = {
  id: string;
  status: BackupStatus;
  kind: BackupKind;
  storageDriver: BackupStorageDriver;
  artifactPath: string | null;
  sizeBytes: number | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type BackupWorkerHealth = {
  mode: "external";
  healthy: boolean;
  queuedCount: number;
  oldestQueuedAt: string | null;
  message: string;
};

export type BackupListResult = {
  items: BackupItem[];
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
  hasPrevious: boolean;
  worker: BackupWorkerHealth;
};

export type BackupSchedule = {
  id: string;
  enabled: boolean;
  frequency: BackupFrequency;
  retentionDays: number;
  storageDriver: BackupStorageDriver;
  createdAt: string;
  updatedAt: string;
};

export type BackupScheduleUpdate = {
  enabled?: boolean;
  frequency?: BackupFrequency;
  retentionDays?: number;
  storageDriver?: BackupStorageDriver;
};

export type BackupListOptions = {
  page?: number;
  limit?: number;
  query?: string;
};

export type BackupCreatePayload = {
  kind?: BackupKind;
  include?: BackupIncludeOption[];
};

export async function listBackups(options: BackupListOptions = {}) {
  const params = new URLSearchParams({
    page: String(options.page ?? 1),
    limit: String(options.limit ?? 10),
  });
  if (options.query?.trim()) params.set("query", options.query.trim());
  return apiRequest<BackupListResult>(`/backups?${params}`, {
    method: "GET",
  });
}

export async function createBackup(input?: BackupCreatePayload) {
  return apiRequest<BackupItem>(
    "/backups",
    {
      method: "POST",
      body: JSON.stringify(input ?? {}),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
}

export async function deleteBackup(id: string) {
  return apiRequest<{ ok: true; id: string }>(
    `/backups/${id}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}

export async function restoreBackup(id: string) {
  return apiRequest<BackupItem>(`/backups/${id}/restore`, { method: "POST" }, { withCsrf: true });
}

export async function downloadBackup(id: string) {
  return apiRequest<{ url: string | null; path: string | null }>(`/backups/${id}/download`, {
    method: "GET",
  });
}

export async function getBackupSchedule() {
  return apiRequest<BackupSchedule>("/backups/schedule", { method: "GET" });
}

export async function updateBackupSchedule(payload: BackupScheduleUpdate) {
  return apiRequest<BackupSchedule>(
    "/backups/schedule",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    },
    { withCsrf: true }
  );
}
