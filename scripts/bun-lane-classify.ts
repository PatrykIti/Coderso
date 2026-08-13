/**
 * Static lane-file classifier for the Bun test lane (TASK-557-01-L01).
 *
 * Walks the exact `test:bun` lane set from package.json (`tests/unit`,
 * `tests/integration/{routes,runtime,server,store,plugins,analytics}`,
 * `tests/perf`, `tests/security`) and classifies every `*.test.{ts,tsx}` file
 * into `perf` / A / B / C using only static signals (no DB access):
 *
 * - `perf`: path override, checked FIRST. Any file under `tests/perf/` is
 *   `perf` regardless of DB usage; the perf-lane policy routes by bucket.
 * - `A`: DB-free. No `core/db/{client,schema}` import and no `await db.`
 *   reference.
 * - `C`: DB-backed and touches shared mutable state (global settings keys via
 *   `setSetting`/`setSettings` in hooks, the singleton `backup_schedules`
 *   table, or the fixed `4dd7f4d4` detailPageId literal).
 * - `B`: DB-backed but self-scoped (own-row `randomUUID()` keys plus
 *   delete-only cleanup) or not obviously shared.
 *
 * Emits `tests/bun-lane-manifest.json` with `{generatedAt, rows}`; the rows are
 * the single source of truth for the TASK-557-05 partitioner. An unreadable
 * file rejects with a named error (`manifest_read_failed:<path>`) and aborts
 * the whole run so the manifest can never silently drift.
 *
 * Run from the repo root: `bun scripts/bun-lane-classify.ts`.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const LANE_DIRS = [
  "tests/unit",
  "tests/integration/routes",
  "tests/integration/runtime",
  "tests/integration/server",
  "tests/integration/store",
  "tests/integration/plugins",
  "tests/integration/analytics",
  "tests/integration/toolchain",
  "tests/perf",
  "tests/security",
] as const;

const PERF_DIR = "tests/perf/";
const EXT = /\.test\.(ts|tsx)$/;
const MANIFEST_PATH = "tests/bun-lane-manifest.json";

type Bucket = "perf" | "A" | "B" | "C";
type BucketRow = { file: string; bucket: Bucket; weightMs?: number; conflictKey?: string };

// C signals: shared settings keys, singleton tables, first-admin, fixed literal
const C_SETTING_KEYS = [
  "site.contentRoutes",
  "site.cacheTtlSeconds",
  "site.previewEnabled",
  "site.navigationMenuId",
  "site.footerTemplateId",
  "site.homepageId",
  "site.adminBaseUrl",
  "auth.sessionTtlDays",
  "auth.resetTtlMinutes",
] as const;
const C_TABLES = ["backup_schedules"] as const;
const C_LITERALS = ["4dd7f4d4"] as const;

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
  let src: string;
  try {
    src = await readFile(file, "utf8");
  } catch (cause) {
    throw new Error(`manifest_read_failed:${file}`, { cause });
  }
  // perf path override FIRST: the perf-lane policy routes by bucket value, and
  // tests/perf/* must never be merged into A/B workers.
  if (file.startsWith(PERF_DIR)) return { file, bucket: "perf", weightMs: 0 };
  const hasDb =
    /from\s+["'](?:\.\.\/)+core\/db\/(?:client|schema)["']/.test(src) || /await\s+db\./.test(src);
  if (!hasDb) return { file, bucket: "A", weightMs: 0 };

  const hitsC =
    C_SETTING_KEYS.some((k) => src.includes(k)) ||
    C_TABLES.some((t) => src.includes(t)) ||
    C_LITERALS.some((l) => src.includes(l)) ||
    (/setSetting|setSettings/.test(src) && /beforeAll|beforeEach/.test(src));
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

async function main(): Promise<void> {
  const files = await collectLaneFiles();
  const rows = await Promise.all(files.map(classify));
  await writeFile(
    MANIFEST_PATH,
    JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)
  );
  const counts: Record<Bucket, number> = { A: 0, B: 0, C: 0, perf: 0 };
  for (const row of rows) counts[row.bucket] += 1;
  console.log(`[bun-lane-classify] files=${rows.length} buckets=${JSON.stringify(counts)}`);
}

// export for tests; importing this module must never write the manifest
if (import.meta.main) {
  await main();
}
export { collectLaneFiles, classify, LANE_DIRS };
