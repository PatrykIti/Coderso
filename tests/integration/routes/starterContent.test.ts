// TASK-482-06-L01: Bun lifecycle lane for `starterContentService`. Kit
// install/rollback is plugin/lifecycle work → MUST be Bun.
//
// Shared REMOTE test DB rules (pinned): this suite runs a REAL install against
// the shared Postgres, so it is strictly self-restoring. Because the curated
// default starter blueprint reuses the "local-service-business" catalog id and
// therefore installs into REAL site slugs, teardown NEVER blind-deletes content
// by slug (which could clobber shared data). Instead it uses the service's own
// `rollbackStarterContent` (reverses via before-snapshots) and restores the
// exact pre-test `site.*` values captured in beforeAll. Dry-run run/items/audit
// rows (which every dry-run persists) are cleaned by tracked run id.

import { afterAll, beforeAll, expect, test } from "bun:test";
import { inArray, sql } from "drizzle-orm";

import { db } from "../../../core/db/client";
import {
  auditLogs,
  menus,
  pages,
  solutionKitInstallItems,
  solutionKitInstallRuns,
  users,
} from "../../../core/db/schema";
import {
  DEFAULT_STARTER_KIT_DEFINITION,
  applyStarterContent,
  previewStarterContent,
  rollbackStarterContent,
} from "../../../core/services/setup/starterContentService";
import { listSolutionKitInstallRuns } from "../../../core/services/kits/solutionKitsInstallService";
import { getSetting } from "../../../core/services/settings/settingsService";
import { hasTable } from "../../utils/db";

const kitId = DEFAULT_STARTER_KIT_DEFINITION.id;

async function canConnect() {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

const hasDb =
  Boolean(process.env.DATABASE_URL) &&
  (await canConnect()) &&
  (await hasTable("solution_kit_install_runs"));
const testIfDb = hasDb ? test : test.skip;
const hookTimeoutMs = 90_000;
const testTimeoutMs = 120_000;

const trackedRunIds = new Set<string>();
const appliedRunIds = new Set<string>();

let priorSnapshot = {
  homepageId: null as string | null,
  navigationMenuId: null as string | null,
};

// The install run's actor_id has an FK to users.id, so the apply test uses an
// existing user (the first admin) rather than a synthetic id.
let actorId: string | null = null;

const readShellSnapshot = async () => ({
  homepageId: (await getSetting("site.homepageId")) as string | null,
  navigationMenuId: (await getSetting("site.navigationMenuId")) as string | null,
});

const runIdsForKit = async () => {
  const runs = await listSolutionKitInstallRuns({ kitId, limit: 200 });
  return new Set(runs.map((run) => run.id));
};

// Run `op`, then track any solution-kit install runs it created for this kit.
const trackNewRuns = async <T>(op: () => Promise<T>): Promise<T> => {
  const before = await runIdsForKit();
  const result = await op();
  const after = await runIdsForKit();
  for (const id of after) {
    if (!before.has(id)) trackedRunIds.add(id);
  }
  return result;
};

const countRows = async (table: typeof pages | typeof menus) => {
  const [row] = await db.select({ value: sql<number>`count(*)::int` }).from(table);
  return row?.value ?? 0;
};

const restoreShell = async () => {
  await rollbackStarterContentSettings(priorSnapshot);
};

// Restore site.* directly (used as a final safety net; the happy-path test uses
// rollbackStarterContent which restores them from the run snapshot).
const rollbackStarterContentSettings = async (snapshot: typeof priorSnapshot) => {
  const { setSettings } = await import("../../../core/services/settings/settingsService");
  await setSettings({
    "site.homepageId": snapshot.homepageId,
    "site.navigationMenuId": snapshot.navigationMenuId,
  });
};

beforeAll(async () => {
  if (!hasDb) return;
  priorSnapshot = await readShellSnapshot();
  const [firstUser] = await db.select({ id: users.id }).from(users).limit(1);
  actorId = firstUser?.id ?? null;
}, hookTimeoutMs);

afterAll(async () => {
  if (!hasDb) return;

  // Safety net: reverse any applied run that a failing test left in place.
  for (const runId of appliedRunIds) {
    try {
      await trackNewRuns(() => rollbackStarterContent({ sourceRunId: runId }));
    } catch {
      // best-effort
    }
  }

  // Restore the exact pre-test shell settings.
  await restoreShell();

  // Delete every install run/items row this suite created (incl. dry-run rows)
  // and their audit records — keyed strictly by tracked run id.
  const runIds = [...trackedRunIds];
  if (runIds.length > 0) {
    await db.delete(solutionKitInstallItems).where(inArray(solutionKitInstallItems.runId, runIds));
    for (const runId of runIds) {
      await db.delete(auditLogs).where(sql`${auditLogs.metadata}->>'runId' = ${runId}`);
    }
    await db.delete(solutionKitInstallRuns).where(inArray(solutionKitInstallRuns.id, runIds));
  }

  trackedRunIds.clear();
  appliedRunIds.clear();
}, hookTimeoutMs);

testIfDb(
  "previewStarterContent produces a plan with no content/template writes",
  async () => {
    const pagesBefore = await countRows(pages);
    const menusBefore = await countRows(menus);

    const summary = await trackNewRuns(() => previewStarterContent({ blueprintKey: "default" }));

    // Plan is non-empty (dry-run planned the kit's resources).
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.planned).toBeGreaterThan(0);

    // No content/template rows were written by the dry-run.
    expect(await countRows(pages)).toBe(pagesBefore);
    expect(await countRows(menus)).toBe(menusBefore);
  },
  testTimeoutMs
);

testIfDb(
  "applyStarterContent seeds content, wires site.* shell, and rollback restores prior values",
  async () => {
    if (!actorId) {
      // No users on the shared DB → cannot satisfy the actor FK; skip safely.
      return;
    }
    const applyResult = await trackNewRuns(() =>
      applyStarterContent({ blueprintKey: "default" }, actorId!)
    );
    appliedRunIds.add(applyResult.runId);

    expect(applyResult.runId).toBeTruthy();

    // The two shell refs are now wired to seeded records.
    const afterApply = await readShellSnapshot();
    expect(typeof afterApply.homepageId).toBe("string");
    expect(afterApply.homepageId).toBeTruthy();
    expect(typeof afterApply.navigationMenuId).toBe("string");
    expect(afterApply.navigationMenuId).toBeTruthy();

    // The apply persisted an audit record carrying the run id only (no payload).
    const [auditRow] = await db
      .select()
      .from(auditLogs)
      .where(sql`${auditLogs.metadata}->>'runId' = ${applyResult.runId}`);
    expect(auditRow).toBeTruthy();

    // Rollback reverses the seeds AND restores the pre-apply site.* values.
    await trackNewRuns(() => rollbackStarterContent({ sourceRunId: applyResult.runId }));
    appliedRunIds.delete(applyResult.runId);

    const afterRollback = await readShellSnapshot();
    expect(afterRollback.homepageId).toBe(priorSnapshot.homepageId);
    expect(afterRollback.navigationMenuId).toBe(priorSnapshot.navigationMenuId);
  },
  testTimeoutMs
);

testIfDb("unknown kit id is rejected with starter_kit_unknown", async () => {
  await expect(previewStarterContent({ kitId: "does-not-exist" })).rejects.toThrow(
    "starter_kit_unknown"
  );
});
