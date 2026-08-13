# TASK-557-01-L01: Static Classifier and Committed Manifest
# FileName: TASK-557-01-L01-Static-Classifier-And-Committed-Manifest.md
**Parent Subtask:** TASK-557-01
**Priority:** High
**Category:** Testing / Tooling
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do
---
## Overview
Produce `scripts/bun-lane-classify.ts` that walks the exact lane file set from
`package.json` `test:bun` and classifies each file into A/B/C using the same
static signals the audit used, then writes a committed
`tests/bun-lane-manifest.json`. The manifest is the single source of truth for
TASK-557-05 partitioner. Classification must be deterministic and reproducible;
bucket labels: `A` (DB-free), `B` (DB-backed, self-scoped), `C` (shared mutable
state, needs isolation or serial order).

Classification signals (static, no DB calls):
- `C` first (strongest): file imports/uses `core/services/settings/settingsService`
  setters that mutate global keys (`site.contentRoutes`, `site.cacheTtlSeconds`,
  `site.previewEnabled`, `auth.sessionTtlDays`, `auth.resetTtlMinutes`,
  `site.navigationMenuId`, `site.footerTemplateId`, `site.homepageId`,
  `site.adminBaseUrl`), the singleton `backup_schedules` table
  (backupService/backups route/backupScheduler), starterContent first-admin
  assumption (`users` limit 1), or the fixed `4dd7f4d4` detailPageId literal.
  Also files with module-level `testIfDb` that snapshot/restore whole settings
  rows but mutate shared keys across files.
- `B`: imports `core/db/client` or `core/db/schema`, uses `testIfDb`, and only
  creates rows with `randomUUID()` keys + deletes its own rows (own-row
  cleanup).
- `A`: no `core/db` import, no `testIfDb`, no module-level `canConnect()`.
  A file that imports `core/db` but has no `testIfDb` and only pure tests is
  still `A` only if it never awaits a db query; the classifier should mark
  `A` when there is no `await db` reference.

## Implementation Pseudocode
```ts
// scripts/bun-lane-classify.ts
import { readdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const LANE_DIRS = [
  "tests/unit",
  "tests/integration/routes",
  "tests/integration/runtime",
  "tests/integration/server",
  "tests/integration/store",
  "tests/integration/plugins",
  "tests/integration/analytics",
  "tests/perf",
  "tests/security",
];
const EXT = /\.test\.(ts|tsx)$/;
const MANIFEST_PATH = "tests/bun-lane-manifest.json";

// C signals: shared settings keys, singleton tables, first-admin, fixed literal
const C_SETTING_KEYS = [
  "site.contentRoutes", "site.cacheTtlSeconds", "site.previewEnabled",
  "site.navigationMenuId", "site.footerTemplateId", "site.homepageId",
  "site.adminBaseUrl", "auth.sessionTtlDays", "auth.resetTtlMinutes",
];
const C_TABLES = ["backup_schedules"];
const C_LITERALS = ["4dd7f4d4"];

async function collectLaneFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const dir of LANE_DIRS) {
    const entries = await readdir(dir, { recursive: true });
    for (const rel of entries) {
      if (EXT.test(rel)) files.push(path.join(dir, rel));
    }
  }
  return files.sort(); // deterministic order
}

async function classify(file: string): Promise<BucketRow> {
  const src = await readFile(file, "utf8");
  const hasDb = /from\s+["'](?:\.\.\/)+core\/db\/(?:client|schema)["']/.test(src)
    || /await\s+db\./.test(src);
  if (!hasDb) return { file, bucket: "A", weightMs: 0 };

  const hitsC = C_SETTING_KEYS.some((k) => src.includes(k))
    || C_TABLES.some((t) => src.includes(t))
    || C_LITERALS.some((l) => src.includes(l))
    || /setSetting|setSettings/.test(src) && /beforeAll|beforeEach/.test(src);
  const cleansOwnRows = /delete\(|\.delete\(/.test(src) && /randomUUID/.test(src);

  if (hitsC) {
    return { file, bucket: "C", weightMs: 0, conflictKey: firstConflict(src) };
  }
  if (cleansOwnRows) return { file, bucket: "B", weightMs: 0 };
  return { file, bucket: "B", weightMs: 0 }; // DB-backed but not obviously shared
}

function firstConflict(src: string): string | undefined {
  const key = C_SETTING_KEYS.find((k) => src.includes(k));
  if (key) return key;
  const table = C_TABLES.find((t) => src.includes(t));
  if (table) return table;
  return C_LITERALS.find((l) => src.includes(l));
}

async function main() {
  const files = await collectLaneFiles();
  const rows = await Promise.all(files.map(classify));
  await writeFile(MANIFEST_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2));
  const counts = rows.reduce((acc, r) => (acc[r.bucket] = (acc[r.bucket] ?? 0) + 1, acc), {} as Record<string, number>);
  console.log(`[bun-lane-classify] files=${rows.length} buckets=${JSON.stringify(counts)}`);
}

// export for tests
export { collectLaneFiles, classify, LANE_DIRS };
void main();
```

Error handling: reject on unreadable file with a named error (`manifest_read_failed:<path>`); never guess a bucket for an unreadable file — abort so the manifest cannot silently drift.

Regression-test shape (`tests/unit/toolchain/bunLaneManifest.test.ts`):
- `collectLaneFiles()` returns the same set as a golden list derived from `git ls-files 'tests/**/*.test.ts*'` intersected with LANE_DIRS.
- `classify("tests/unit/settings/settingsService.test.ts")` is `C`; a pure file like `tests/unit/widgets/validator.test.ts` is `A`; `tests/unit/content/entryService.test.ts` is `B`.
- Manifest file on disk equals re-running the script on a clean tree (byte compare of the `rows` array, ignoring `generatedAt`).
- No row has `weightMs: 0` after TASK-557-01-L02 fills weights; until then the partitioner must fall back to bucket default weights.

## Testing Requirements
- `bun --cwd core lint` + `bun --cwd core lint:types` green.
- `bun test tests/unit/toolchain/bunLaneManifest.test.ts` green.
- Run `bun scripts/bun-lane-classify.ts` and confirm counts A≈222, B≈113, C≈30 (±5 allowed; the audit used slightly different signal sets). Record actual counts in the leaf handoff.

## Documentation Updates Required
- `tests/README.md`: manifest is the partitioner source of truth.
