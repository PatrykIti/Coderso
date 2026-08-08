import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../core/db/schema";
import { buildFullSiteRollbackActionV1 } from "../../../core/services/kits/fullSiteInstallTypes";
import {
  buildManagedResourceEvidenceBatchQuery,
  buildManagedResourceEvidenceQuery,
  createLegacyInstallLedger,
  MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT,
} from "../../../core/services/kits/legacyInstallRunPersistence";

const normalizeSql = (value: string): string => value.toLowerCase().replace(/\s+/gu, " ").trim();

test("managed evidence direct query remains one bounded run-driven lateral SELECT", async () => {
  const query = buildManagedResourceEvidenceQuery({
    packageKey: `query-shape-${randomUUID()}`,
    kind: "form",
    key: "bounded-evidence",
  });
  const compiled = query.toSQL();
  const normalized = normalizeSql(compiled.sql);

  expect(normalized.split(";").filter(Boolean)).toHaveLength(1);
  expect(normalized.match(/not exists/gu)).toHaveLength(1);
  expect(normalized.match(/\bexists\b/gu)).toHaveLength(2);
  expect(normalized.match(/after_snapshot/gu)).toHaveLength(1);
  expect(normalized.match(/ as "candidate_item_id"/gu)).toHaveLength(1);
  expect(normalized.match(/ as "candidate_item_created_at"/gu)).toHaveLength(1);
  expect(normalized.match(/ as "candidate_run_id"/gu)).toHaveLength(1);
  expect(normalized).toContain(
    'from "solution_kit_install_runs" "managed_candidate_run" inner join lateral'
  );
  expect(normalized).toContain('"managed_candidate_item"."run_id" = "managed_candidate_run"."id"');
  expect(normalized).toContain('"managed_candidate_item"."resource_type" =');
  expect(normalized).toContain('"managed_candidate_item"."resource_key" =');
  expect(normalized).toContain('"managed_candidate_item"."status" =');
  expect(normalized).toContain('"managed_candidate_item"."operation" in');
  expect(normalized).toContain('"managed_rollback_run"."rollback_of_run_id" =');
  expect(normalized).toContain('"managed_rollback_item"."run_id" = "managed_rollback_run"."id"');
  expect(normalized).toContain(
    'select "candidate_run_id", "solution_kit_install_items"."after_snapshot"'
  );
  expect(normalized).toContain('"solution_kit_install_items"."id" = "candidate_item_id"');
  expect(normalized).toContain("limit $1");
  expect(compiled.params).toContain(1);
  expect(await query).toEqual([]);
});

test("managed evidence batch compiles one bounded ordinal-preserving winner query", () => {
  expect(MANAGED_EVIDENCE_LATERAL_REQUEST_LIMIT).toBe(1);
  const resources = Array.from({ length: 512 }, (_, index) => ({
    identity: `setting:key-${index}` as const,
    kind: "setting" as const,
    key: `key-${index}`,
  }));
  const compiled = buildManagedResourceEvidenceBatchQuery({
    packageKey: "batch-evidence",
    resources,
  }).toSQL();
  const normalized = normalizeSql(compiled.sql);
  const singleCompiled = buildManagedResourceEvidenceBatchQuery({
    packageKey: "single-evidence",
    resources: resources.slice(0, 1),
  }).toSQL();
  const singleNormalized = normalizeSql(singleCompiled.sql);

  expect(normalized.split(";").filter(Boolean)).toHaveLength(1);
  expect(singleNormalized.split(";").filter(Boolean)).toHaveLength(1);
  expect(normalized).toContain("with request as");
  expect(normalized).toContain("jsonb_to_recordset");
  expect(normalized).toContain("batch_ranked as");
  expect(normalized).toContain("row_number() over");
  expect(normalized).toContain("partition by batch_request.ordinal");
  expect(normalized).toContain("batch_winner as");
  expect(normalized).not.toContain("left join lateral");
  expect(normalized).toContain('batch_winner.run_id as "runid"');
  expect(normalized).toContain('batch_winner.resource_id as "resourceid"');
  expect(normalized).toContain("batch_winner.ordinal = request.ordinal");
  expect(normalized).toContain("order by request.ordinal asc");
  expect(compiled.params.filter((value) => value === "batch-evidence")).toHaveLength(1);
  expect(singleNormalized).toContain("left join lateral");
  expect(singleNormalized).not.toContain("batch_ranked as");
  expect(singleNormalized).toContain('winner.run_id as "runid"');
  expect(singleNormalized).toContain('winner.resource_id as "resourceid"');
  expect(singleNormalized.match(/limit 1/gu)).toHaveLength(2);
  expect(singleNormalized).toContain("order by request.ordinal asc");
  expect(singleCompiled.params.filter((value) => value === "single-evidence")).toHaveLength(1);
});

test("shared ledger preserves omitted V1 evidence and honors an explicit null clear", async () => {
  const ledger = createLegacyInstallLedger();
  const run = await ledger.createRun({
    packageKey: `ledger-action-${randomUUID()}`,
    actorId: null,
    dryRun: false,
  });
  const rollbackAction = buildFullSiteRollbackActionV1({
    identity: "page:home",
    dependencies: ["form:contact"],
  });
  const base = {
    runId: run.id,
    position: 0,
    kind: "page" as const,
    key: "home",
    operation: "create" as const,
    beforeSnapshot: null,
    afterSnapshot: { id: randomUUID() },
    error: null,
  };
  try {
    await ledger.recordItem({ ...base, status: "planned", rollbackAction });
    await ledger.recordItem({ ...base, status: "success" });
    const [preserved] = await ledger.listItems(run.id);
    expect(preserved?.rollbackAction).toEqual(rollbackAction);
    await ledger.recordItem({ ...base, status: "success", rollbackAction: null });
    const [cleared] = await ledger.listItems(run.id);
    expect(cleared?.rollbackAction).toBeNull();
  } finally {
    await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, run.id));
  }
});

test("listRawItems preserves source values and stable position/id order", async () => {
  const ledger = createLegacyInstallLedger();
  const runId = randomUUID();
  const now = new Date();
  try {
    await db.insert(solutionKitInstallRuns).values({
      id: runId,
      kitId: `raw-ledger-${randomUUID()}`,
      mode: "apply",
      status: "failed",
      options: {},
      summary: {},
      createdAt: now,
      updatedAt: now,
    });
    const tiedIds = [randomUUID(), randomUUID()].sort();
    await db.insert(solutionKitInstallItems).values([
      {
        id: tiedIds[1],
        runId,
        position: 1,
        resourceType: "unknown-kind",
        resourceKey: "second",
        operation: "hostile-operation",
        status: "hostile-status",
        beforeSnapshot: ["raw-array"],
        afterSnapshot: "raw-scalar",
        rollbackAction: null,
        error: "raw-error",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: tiedIds[0],
        runId,
        position: 0,
        resourceType: "page",
        resourceKey: "first",
        operation: "create",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: randomUUID() },
        rollbackAction: { schemaVersion: 1, dependencies: [] },
        error: null,
        createdAt: now,
        updatedAt: now,
      },
    ]);

    const rows = await ledger.listRawItems(runId);
    expect(rows.map((row) => row.key)).toEqual(["first", "second"]);
    expect(rows[1]).toEqual({
      position: 1,
      kind: "unknown-kind",
      key: "second",
      operation: "hostile-operation",
      status: "hostile-status",
      beforeSnapshot: ["raw-array"],
      afterSnapshot: "raw-scalar",
      rollbackAction: null,
      error: "raw-error",
    });
  } finally {
    await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, runId));
  }
});

test("listRawItems rejects a 513th source row without truncation", async () => {
  const ledger = createLegacyInstallLedger();
  const runId = randomUUID();
  const now = new Date();
  try {
    await db.insert(solutionKitInstallRuns).values({
      id: runId,
      kitId: `raw-cap-${randomUUID()}`,
      mode: "apply",
      status: "failed",
      options: {},
      summary: {},
      createdAt: now,
      updatedAt: now,
    });
    await db.insert(solutionKitInstallItems).values(
      Array.from({ length: 513 }, (_, position) => ({
        runId,
        position,
        resourceType: "page",
        resourceKey: `page-${position}`,
        operation: "create",
        status: "success",
        createdAt: now,
        updatedAt: now,
      }))
    );

    await expect(ledger.listRawItems(runId)).rejects.toThrow(
      "site_package_rollback_invalid_source"
    );
  } finally {
    await db.delete(solutionKitInstallRuns).where(eq(solutionKitInstallRuns.id, runId));
  }
});
