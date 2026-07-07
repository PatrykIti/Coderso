import type { ExportBundle } from "../tools/importExportTypes";

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
  artifactKey: string | null;
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

export type BackupPruneResult = {
  prunedCount: number;
  prunedIds: string[];
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
  nextRunAt: Date | null;
  lastRunAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BackupScheduleUpdate = {
  enabled?: boolean;
  frequency?: BackupFrequency;
  retentionDays?: number;
  storageDriver?: BackupStorageDriver;
};

// A single snapshot table is stored as an opaque array of DB rows. The rows are
// re-validated per-column at restore time (dates revived, unknown-key strict
// parse) — the artifact carries them verbatim from `buildDatabaseSnapshot`.
export type BackupArtifactTableRows = Record<string, unknown>[];

// Database snapshot section of the artifact — mirrors `buildDatabaseSnapshot`
// (`backupService.ts`) one-to-one. Each table is an array of rows (or absent /
// null when the section was not captured).
//
// IMPORTANT (FK-cascade completeness): the set MUST include EVERY cascade-child
// AND every RESTRICT/NO-ACTION child transitively reachable from a snapshot
// parent. `replaceSnapshotTables()` deletes all of these tables inside one tx;
// any cascade child left out would be silently wiped by ON DELETE CASCADE (data
// loss), and any RESTRICT child left out would block the parent delete (restore
// fails). Keep this in lock-step with `buildDatabaseSnapshot` + `snapshotTableOrder`.
export type BackupArtifactDatabase = {
  pages: BackupArtifactTableRows;
  contentTypes: BackupArtifactTableRows;
  contentEntries: BackupArtifactTableRows;
  posts: BackupArtifactTableRows;
  media: BackupArtifactTableRows;
  menus: BackupArtifactTableRows;
  menuItems: BackupArtifactTableRows;
  themeProfiles: BackupArtifactTableRows;
  themeRoutes: BackupArtifactTableRows;
  redirects: BackupArtifactTableRows;
  // Cascade / RESTRICT children of the snapshot parents (must be captured +
  // restored, else the delete phase destroys or blocks on them).
  pageRevisions: BackupArtifactTableRows;
  detailPageDocuments: BackupArtifactTableRows;
  detailPageRevisions: BackupArtifactTableRows;
  customScreens: BackupArtifactTableRows;
  customScreenEntryPresentationOverrides: BackupArtifactTableRows;
  contentRevisions: BackupArtifactTableRows;
  contentTaxonomies: BackupArtifactTableRows;
  contentTerms: BackupArtifactTableRows;
  contentTermAssignments: BackupArtifactTableRows;
  postRevisions: BackupArtifactTableRows;
  postPreviewTokens: BackupArtifactTableRows;
  postTermAssignments: BackupArtifactTableRows;
};

// The `version: 1` JSON artifact produced by `createBackupArtifact`. Settings are
// an `ExportBundle` (deep-validated by `validateBundle` via `importConfigTx` at
// restore time); media is metadata only (no file bytes).
export type BackupArtifact = {
  version: 1;
  id: string;
  createdAt: string;
  include: BackupIncludeOption[];
  storageDriver: BackupStorageDriver;
  database: BackupArtifactDatabase | null;
  settings: ExportBundle | null;
  media: { note: string; items: BackupArtifactTableRows } | null;
};

export type BackupRestoreInput = {
  confirm?: boolean;
};

// Aggregate storage-usage snapshot over the whole `backups` table. Numeric
// aggregates + the active-driver enum label only — no artifact paths, keys, or
// credentials. `quotaBytes` is the server-owned threshold (null when unset) and
// `overQuota` is a pure signal (this leaf never blocks new backups).
export type BackupStorageUsage = {
  totalBytes: number;
  backupCount: number;
  byStatus: Record<BackupStatus, { count: number; bytes: number }>;
  byDriver: Record<BackupStorageDriver, { count: number; bytes: number }>;
  activeDriver: BackupStorageDriver;
  quotaBytes: number | null;
  overQuota: boolean;
};
