import { apiRequest } from "./apiClient";

export type BackupStatus = "queued" | "running" | "complete" | "failed";
export type BackupKind = "manual" | "scheduled";
export type BackupStorageDriver = "local" | "s3" | "azure";
export type BackupFrequency = "daily" | "weekly" | "monthly";

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

export async function listBackups() {
  const payload = await apiRequest<{ items: BackupItem[] }>("/backups", {
    method: "GET",
  });
  return payload.items;
}

export async function createBackup(input?: { kind?: BackupKind }) {
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

export async function restoreBackup(id: string) {
  return apiRequest<BackupItem>(
    `/backups/${id}/restore`,
    { method: "POST" },
    { withCsrf: true }
  );
}

export async function downloadBackup(id: string) {
  return apiRequest<{ url: string | null; path: string | null }>(
    `/backups/${id}/download`,
    { method: "GET" }
  );
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
