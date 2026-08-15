// TASK-511-06: legacy v1 `.json` restore unit, split out of backupService.ts to
// keep that module under the repository's 1,000-line gate. v2 `.cbk` restore is
// the Import flow (TASK-511-05, backupImport.ts); this module is retained for
// backwards-compatible in-place restore of v1 artifacts only.
import { getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../../db/client";
import {
  contentEntries,
  contentRevisions,
  contentTaxonomies,
  contentTermAssignments,
  contentTerms,
  contentTypes,
  customScreenEntryPresentationOverrides,
  customScreens,
  detailPageDocuments,
  detailPageRevisions,
  media,
  menuItems,
  menus,
  pageRevisions,
  pages,
  postPreviewTokens,
  postRevisions,
  postTermAssignments,
  posts,
  redirects,
  themeProfiles,
  themeRoutes,
} from "../../db/schema";
import { importConfigTx } from "../tools/importExportService";
import type { BackupArtifact, BackupArtifactDatabase } from "./backupTypes";

// Shared db.transaction shape (same derivation as backupService.ts).
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const BACKUP_ARTIFACT_VERSION = 1;

// Snapshot tables in FK-safe INSERT order (parents before children). Delete runs
// in the reverse order (children before parents). The reverse-delete ordering is
// also what resolves detail_page_documents' RESTRICT FK to content_types:
// detailPageDocuments (below) is deleted BEFORE contentTypes, so the parent
// delete never trips the RESTRICT.
const snapshotTableOrder: Array<{ key: keyof BackupArtifactDatabase; table: PgTable }> = [
  // Roots / top-level parents.
  { key: "pages", table: pages },
  { key: "contentTypes", table: contentTypes },
  { key: "media", table: media },
  { key: "menus", table: menus },
  { key: "themeProfiles", table: themeProfiles },
  { key: "redirects", table: redirects },
  // First-level children.
  { key: "contentEntries", table: contentEntries },
  { key: "posts", table: posts },
  { key: "menuItems", table: menuItems },
  { key: "themeRoutes", table: themeRoutes },
  { key: "pageRevisions", table: pageRevisions },
  { key: "detailPageDocuments", table: detailPageDocuments },
  { key: "customScreens", table: customScreens },
  { key: "contentTaxonomies", table: contentTaxonomies },
  // Deeper children (depend on the first-level children above).
  { key: "detailPageRevisions", table: detailPageRevisions },
  { key: "contentTerms", table: contentTerms },
  { key: "contentRevisions", table: contentRevisions },
  {
    key: "customScreenEntryPresentationOverrides",
    table: customScreenEntryPresentationOverrides,
  },
  { key: "postRevisions", table: postRevisions },
  { key: "postPreviewTokens", table: postPreviewTokens },
  // Junctions that depend on contentTerms (must come after it).
  { key: "contentTermAssignments", table: contentTermAssignments },
  { key: "postTermAssignments", table: postTermAssignments },
];

// JSON round-trips Date columns to ISO strings; drizzle's timestamp writer calls
// `.toISOString()` on insert, so revive `date`-typed columns back to `Date` before
// writing. Other column types (jsonb, uuid, text, numeric) round-trip verbatim.
const reviveRowsForInsert = (
  table: PgTable,
  rows: Record<string, unknown>[]
): Record<string, unknown>[] => {
  const columns = getTableColumns(table);
  return rows.map((row) => {
    const next: Record<string, unknown> = { ...row };
    for (const [key, column] of Object.entries(columns)) {
      const value = next[key];
      if (typeof value === "string" && column.dataType === "date") {
        next[key] = new Date(value);
      }
    }
    return next;
  });
};

// Transactional guarded delete+insert of every snapshot table inside the caller's
// `tx`. Exposed so tests can exercise the restore body inside a deliberately
// rolled-back transaction (the shared-DB dry-run seam) without committing.
export async function replaceSnapshotTables(
  tx: DbTransaction,
  database: BackupArtifactDatabase
): Promise<void> {
  // Delete children -> parents (reverse of the FK-safe insert order).
  for (const { table } of [...snapshotTableOrder].reverse()) {
    await tx.delete(table);
  }
  // Insert parents -> children so FK references always resolve.
  for (const { key, table } of snapshotTableOrder) {
    const rows = database[key];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    await tx.insert(table).values(reviveRowsForInsert(table, rows) as never);
  }
}

// The tx-scoped restore body: snapshot tables + settings, sharing ONE outer `tx`
// so the whole restore is genuinely all-or-nothing. Exposed for the rollback-scoped
// regression seam.
export async function restoreArtifactTx(
  tx: DbTransaction,
  artifact: BackupArtifact
): Promise<void> {
  if (artifact.database) {
    await replaceSnapshotTables(tx, artifact.database);
  }
  if (artifact.settings) {
    // Share the OUTER tx: importConfigTx is the transaction-aware body of
    // importConfig (still runs validateBundle + setSettingsTx). Do NOT call the
    // public importConfig() here — it opens its own db.transaction, which would
    // commit/rollback independently and break all-or-nothing.
    await importConfigTx(tx, artifact.settings);
  }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const BACKUP_ARTIFACT_TOP_LEVEL_KEYS = new Set([
  "version",
  "id",
  "createdAt",
  "include",
  "storageDriver",
  "database",
  "settings",
  "media",
]);

const BACKUP_SNAPSHOT_TABLE_KEYS: Array<keyof BackupArtifactDatabase> = [
  "pages",
  "contentTypes",
  "contentEntries",
  "posts",
  "media",
  "menus",
  "menuItems",
  "themeProfiles",
  "themeRoutes",
  "redirects",
  "pageRevisions",
  "detailPageDocuments",
  "detailPageRevisions",
  "customScreens",
  "customScreenEntryPresentationOverrides",
  "contentRevisions",
  "contentTaxonomies",
  "contentTerms",
  "contentTermAssignments",
  "postRevisions",
  "postPreviewTokens",
  "postTermAssignments",
];

// Strict, fail-closed parse of the stored artifact. Rejects unknown top-level
// keys, requires version === BACKUP_ARTIFACT_VERSION, and validates each snapshot
// table is an array (settings is deep-validated later by validateBundle via
// importConfigTx). No raw artifact data is written un-validated.
export function parseBackupArtifact(raw: string): BackupArtifact {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("backup_restore_invalid_artifact");
  }
  if (!isPlainObject(json)) throw new Error("backup_restore_invalid_artifact");
  for (const key of Object.keys(json)) {
    if (!BACKUP_ARTIFACT_TOP_LEVEL_KEYS.has(key)) {
      throw new Error("backup_restore_invalid_artifact");
    }
  }
  if (json.version !== BACKUP_ARTIFACT_VERSION) {
    throw new Error("backup_restore_invalid_artifact");
  }

  const { database, settings, media: mediaSection } = json;
  if (database !== null && database !== undefined) {
    if (!isPlainObject(database)) throw new Error("backup_restore_invalid_artifact");
    for (const key of BACKUP_SNAPSHOT_TABLE_KEYS) {
      const value = (database as Record<string, unknown>)[key];
      if (value !== undefined && value !== null && !Array.isArray(value)) {
        throw new Error("backup_restore_invalid_artifact");
      }
    }
  }
  if (settings !== null && settings !== undefined && !isPlainObject(settings)) {
    throw new Error("backup_restore_invalid_artifact");
  }
  if (mediaSection !== null && mediaSection !== undefined && !isPlainObject(mediaSection)) {
    throw new Error("backup_restore_invalid_artifact");
  }

  return json as BackupArtifact;
}
