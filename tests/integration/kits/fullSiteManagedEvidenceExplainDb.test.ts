import { test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { solutionKitInstallItems, solutionKitInstallRuns } from "../../../core/db/schema";
import {
  buildManagedResourceEvidenceBatchQuery,
  findManagedResourceEvidenceBatch,
} from "../../../core/services/kits/legacyInstallRunPersistence";
import type { FullSiteResourceIdentity } from "../../../core/services/kits/fullSiteInstallTypes";
import { parseManagedEvidenceExplainMetrics } from "../../utils/fullSiteExplainMetrics";

const EXPLAIN_PROFILES = [
  {
    label: "small",
    candidates: 16,
    rollbacks: 8,
    rollbackItems: 6,
    executionMs: 100,
    scannedRows: 2_000,
    sharedBuffers: 2_048,
  },
  {
    label: "bounded-large",
    candidates: 512,
    rollbacks: 256,
    rollbackItems: 192,
    executionMs: 250,
    scannedRows: 20_000,
    sharedBuffers: 20_480,
  },
] as const;

type ExplainProfile = (typeof EXPLAIN_PROFILES)[number];

const cleanupExplainFixture = async (
  ownedItemIds: ReadonlySet<string>,
  ownedRunIds: ReadonlySet<string>
): Promise<void> => {
  let cleanupFailed = false;
  if (ownedItemIds.size > 0) {
    try {
      await db
        .delete(solutionKitInstallItems)
        .where(inArray(solutionKitInstallItems.id, [...ownedItemIds]));
    } catch {
      cleanupFailed = true;
    }
  }
  if (ownedRunIds.size > 0) {
    try {
      await db
        .delete(solutionKitInstallRuns)
        .where(inArray(solutionKitInstallRuns.id, [...ownedRunIds]));
    } catch {
      cleanupFailed = true;
    }
  }
  if (ownedItemIds.size > 0) {
    try {
      const remainingItems = await db
        .select({ id: solutionKitInstallItems.id })
        .from(solutionKitInstallItems)
        .where(inArray(solutionKitInstallItems.id, [...ownedItemIds]))
        .limit(1);
      if (remainingItems.length > 0) cleanupFailed = true;
    } catch {
      cleanupFailed = true;
    }
  }
  if (ownedRunIds.size > 0) {
    try {
      const remainingRuns = await db
        .select({ id: solutionKitInstallRuns.id })
        .from(solutionKitInstallRuns)
        .where(inArray(solutionKitInstallRuns.id, [...ownedRunIds]))
        .limit(1);
      if (remainingRuns.length > 0) cleanupFailed = true;
    } catch {
      cleanupFailed = true;
    }
  }
  if (cleanupFailed) throw new Error("managed_evidence_explain_cleanup_failed");
};

const assertBudget = (actual: number, maximum: number): void => {
  if (!Number.isFinite(actual) || actual > maximum) {
    throw new Error("managed_evidence_explain_budget_failed");
  }
};

const assertManagedResourceEvidenceExplainBudgets = async (profile: ExplainProfile) => {
  const scope = randomUUID();
  const packageKey = `managed-explain-${profile.label}-${scope}`;
  const resourceKey = `resource-${scope}`;
  const candidateRunIds = Array.from({ length: profile.candidates }, () => randomUUID());
  const candidateItemIds = Array.from({ length: profile.candidates }, () => randomUUID());
  const resourceIds = Array.from({ length: profile.candidates }, () => randomUUID());
  const rollbackRunIds = Array.from({ length: profile.rollbacks }, () => randomUUID());
  const rollbackItemIds = Array.from({ length: profile.rollbackItems }, () => randomUUID());
  const ownedItemIds = new Set<string>([...candidateItemIds, ...rollbackItemIds]);
  const ownedRunIds = new Set<string>([...candidateRunIds, ...rollbackRunIds]);
  const groupSize = profile.rollbacks / 4;
  const baseTime = Date.parse("2026-07-24T12:00:00.000Z");
  const candidateTime = (index: number) =>
    new Date(baseTime + (profile.candidates - index) * 1_000);

  try {
    await db.insert(solutionKitInstallRuns).values(
      candidateRunIds.map((id, index) => ({
        id,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { fullSitePackage: true },
        summary: {},
        error: null,
        createdAt: candidateTime(index),
        updatedAt: candidateTime(index),
        finishedAt: candidateTime(index),
      }))
    );
    await db.insert(solutionKitInstallItems).values(
      candidateItemIds.map((id, index) => ({
        id,
        runId: candidateRunIds[index]!,
        position: 0,
        resourceType: "form",
        resourceKey,
        operation: index % 2 === 0 ? "create" : "update",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: resourceIds[index], desired: { candidate: index } },
        rollbackAction: null,
        error: null,
        createdAt: candidateTime(index),
        updatedAt: candidateTime(index),
      }))
    );
    await db.insert(solutionKitInstallRuns).values(
      rollbackRunIds.map((id, index) => {
        const group = Math.floor(index / groupSize);
        const status =
          group === 0
            ? "success"
            : group === 1
              ? "failed"
              : group === 2
                ? "running"
                : index % 2 === 0
                  ? "failed"
                  : "running";
        return {
          id,
          kitId: packageKey,
          mode: "rollback",
          status,
          actorId: null,
          rollbackOfRunId: candidateRunIds[index]!,
          options: {},
          summary: {},
          error: status === "failed" ? "site_package_rollback_failed" : null,
          createdAt: new Date(baseTime + index * 10),
          updatedAt: new Date(baseTime + index * 10),
          finishedAt: status === "running" ? null : new Date(baseTime + index * 10),
        };
      })
    );
    await db.insert(solutionKitInstallItems).values(
      rollbackItemIds.map((id, itemIndex) => {
        const rollbackIndex = groupSize + itemIndex;
        return {
          id,
          runId: rollbackRunIds[rollbackIndex]!,
          position: 0,
          resourceType: "form",
          resourceKey,
          operation: "update",
          status: rollbackIndex < groupSize * 3 ? "success" : "failed",
          beforeSnapshot: null,
          afterSnapshot: null,
          rollbackAction: null,
          error: null,
          createdAt: new Date(baseTime + rollbackIndex * 10),
          updatedAt: new Date(baseTime + rollbackIndex * 10),
        };
      })
    );

    const winnerIndex = groupSize * 3;
    const expectedRunId = candidateRunIds[winnerIndex]!;
    const expectedResourceId = resourceIds[winnerIndex]!;
    const resources = [
      {
        identity: `form:${resourceKey}` as FullSiteResourceIdentity,
        kind: "form" as const,
        key: resourceKey,
      },
    ];
    const winnerRows = await findManagedResourceEvidenceBatch(db, {
      packageKey,
      resources,
    });
    const winner = winnerRows[0]?.evidence;
    if (!winner || winner.runId !== expectedRunId || winner.resourceId !== expectedResourceId) {
      throw new Error("managed_evidence_explain_winner_mismatch");
    }

    const compiled = buildManagedResourceEvidenceBatchQuery({
      packageKey,
      resources,
    }).toSQL();
    const explainParameters = compiled.params.map((value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error("managed_evidence_explain_parameter_invalid");
      }
      return value;
    });
    const explainRows = await db.$client.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${compiled.sql}`,
      explainParameters
    );
    const rawDocument = explainRows[0]?.["QUERY PLAN"];
    const parsed = parseManagedEvidenceExplainMetrics(rawDocument);
    const metrics = {
      label: profile.label,
      candidates: profile.candidates,
      rollbacks: profile.rollbacks,
      rollbackItems: profile.rollbackItems,
      ...parsed,
    };
    console.info("managed evidence EXPLAIN profile", JSON.stringify(metrics));
    assertBudget(metrics.executionMs, profile.executionMs);
    assertBudget(metrics.emittedRows, 1);
    assertBudget(metrics.scannedRows, profile.scannedRows);
    assertBudget(metrics.sharedBuffers, profile.sharedBuffers);
    return metrics;
  } finally {
    await cleanupExplainFixture(ownedItemIds, ownedRunIds);
  }
};

const assertManagedResourceEvidenceBatchWidthBudget = async () => {
  const scope = randomUUID();
  const packageKey = `managed-explain-width-${scope}`;
  const runIds = Array.from({ length: 512 }, () => randomUUID());
  const itemIds = Array.from({ length: 512 }, () => randomUUID());
  const resourceIds = Array.from({ length: 512 }, () => randomUUID());
  const resources = Array.from({ length: 512 }, (_, index) => ({
    identity: `form:width-${index}` as FullSiteResourceIdentity,
    kind: "form" as const,
    key: `width-${index}`,
  }));
  const ownedRunIds = new Set(runIds);
  const ownedItemIds = new Set(itemIds);
  const now = new Date("2026-07-24T13:00:00.000Z");
  try {
    await db.insert(solutionKitInstallRuns).values(
      runIds.map((id) => ({
        id,
        kitId: packageKey,
        mode: "apply",
        status: "success",
        actorId: null,
        rollbackOfRunId: null,
        options: { fullSitePackage: true },
        summary: {},
        error: null,
        createdAt: now,
        updatedAt: now,
        finishedAt: now,
      }))
    );
    await db.insert(solutionKitInstallItems).values(
      itemIds.map((id, index) => ({
        id,
        runId: runIds[index]!,
        position: 0,
        resourceType: "form",
        resourceKey: resources[index]!.key,
        operation: "create",
        status: "success",
        beforeSnapshot: null,
        afterSnapshot: { id: resourceIds[index], desired: {} },
        rollbackAction: null,
        error: null,
        createdAt: now,
        updatedAt: now,
      }))
    );

    const winners = await findManagedResourceEvidenceBatch(db, { packageKey, resources });
    if (winners.length !== resources.length) {
      throw new Error("managed_evidence_explain_winner_mismatch");
    }
    for (let index = 0; index < winners.length; index += 1) {
      const winner = winners[index]?.evidence;
      if (!winner || winner.runId !== runIds[index] || winner.resourceId !== resourceIds[index]) {
        throw new Error("managed_evidence_explain_winner_mismatch");
      }
    }

    const compiled = buildManagedResourceEvidenceBatchQuery({ packageKey, resources }).toSQL();
    const parameters = compiled.params.map((value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error("managed_evidence_explain_parameter_invalid");
      }
      return value;
    });
    const explainRows = await db.$client.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${compiled.sql}`,
      parameters
    );
    const metrics = parseManagedEvidenceExplainMetrics(explainRows[0]?.["QUERY PLAN"]);
    console.info(
      "managed evidence EXPLAIN profile",
      JSON.stringify({
        label: "batch-width",
        candidates: 512,
        rollbacks: 0,
        rollbackItems: 0,
        ...metrics,
      })
    );
    assertBudget(metrics.executionMs, 1_000);
    assertBudget(metrics.emittedRows, 512);
    assertBudget(metrics.scannedRows, 100_000);
    assertBudget(metrics.sharedBuffers, 100_000);
  } finally {
    await cleanupExplainFixture(ownedItemIds, ownedRunIds);
  }
};

test("managed evidence SELECT satisfies no-migration EXPLAIN budgets", async () => {
  for (const profile of EXPLAIN_PROFILES) {
    await assertManagedResourceEvidenceExplainBudgets(profile);
  }
  await assertManagedResourceEvidenceBatchWidthBudget();
}, 360_000);
