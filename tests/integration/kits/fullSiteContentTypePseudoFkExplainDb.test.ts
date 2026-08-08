import { test } from "bun:test";
import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";

import { db } from "../../../core/db/client";
import { listingQueries } from "../../../core/db/schema";
import { buildListingQueryContentTypeReferenceSelect } from "../../../core/services/content/typeService";
import { parseManagedEvidenceExplainMetrics } from "../../utils/fullSiteExplainMetrics";

const EXPLAIN_PROFILES = [
  {
    label: "small",
    listingQueryCount: 64,
    executionMs: 100,
    scannedRows: 5_000,
    sharedBuffers: 2_048,
  },
  {
    label: "representative-large",
    listingQueryCount: 10_000,
    executionMs: 250,
    scannedRows: 25_000,
    sharedBuffers: 20_480,
  },
] as const;

const FIXTURE_BATCH_SIZE = 500;

type ExplainProfile = (typeof EXPLAIN_PROFILES)[number];

const fixtureIdBatches = <T extends string>(ids: readonly T[]): readonly (readonly T[])[] => {
  const batches: T[][] = [];
  for (let offset = 0; offset < ids.length; offset += FIXTURE_BATCH_SIZE) {
    batches.push(ids.slice(offset, offset + FIXTURE_BATCH_SIZE));
  }
  return batches;
};

const cleanupOwnedListingQueries = async (ownedIds: readonly string[]): Promise<void> => {
  let cleanupFailed = false;
  const batches = fixtureIdBatches(ownedIds);

  for (const batch of batches) {
    try {
      await db.delete(listingQueries).where(inArray(listingQueries.id, [...batch]));
    } catch {
      cleanupFailed = true;
    }
  }

  for (const batch of batches) {
    try {
      const remaining = await db
        .select({ id: listingQueries.id })
        .from(listingQueries)
        .where(inArray(listingQueries.id, [...batch]))
        .limit(1);
      if (remaining.length > 0) cleanupFailed = true;
    } catch {
      cleanupFailed = true;
    }
  }

  if (cleanupFailed) throw new Error("content_type_pseudo_fk_explain_cleanup_failed");
};

const findListingQueryReference = (contentTypeId: string) =>
  db.transaction((tx) => buildListingQueryContentTypeReferenceSelect(tx, contentTypeId));

const compileListingQueryReferenceSelect = (contentTypeId: string) =>
  db.transaction((tx) =>
    Promise.resolve(buildListingQueryContentTypeReferenceSelect(tx, contentTypeId).toSQL())
  );

const assertMaximum = (actual: number, maximum: number): void => {
  if (!Number.isFinite(actual) || actual > maximum) {
    throw new Error("content_type_pseudo_fk_explain_budget_failed");
  }
};

const assertProfile = async (profile: ExplainProfile): Promise<void> => {
  const scope = randomUUID();
  const ownedIds = Array.from({ length: profile.listingQueryCount }, () => randomUUID());
  const matchingTargetId = randomUUID();
  const decoyTargetId = randomUUID();
  const absentTargetId = randomUUID();
  if (new Set([matchingTargetId, decoyTargetId, absentTargetId]).size !== 3) {
    throw new Error("content_type_pseudo_fk_explain_fixture_invalid");
  }

  try {
    for (const batch of fixtureIdBatches(ownedIds)) {
      const offset = ownedIds.indexOf(batch[0]!);
      await db.insert(listingQueries).values(
        batch.map((id, batchIndex) => {
          const index = offset + batchIndex;
          return {
            id,
            name: `Content type pseudo-FK ${profile.label} ${scope} ${index}`,
            query: {
              sourceConfig: {
                contentTypeId: index === 0 ? matchingTargetId : decoyTargetId,
              },
            },
          };
        })
      );
    }

    const matchingRows = await findListingQueryReference(matchingTargetId);
    if (matchingRows.length !== 1 || matchingRows[0]?.id !== ownedIds[0]) {
      throw new Error("content_type_pseudo_fk_explain_matching_result_invalid");
    }
    const absentRows = await findListingQueryReference(absentTargetId);
    if (absentRows.length !== 0) {
      throw new Error("content_type_pseudo_fk_explain_absent_result_invalid");
    }

    const compiled = await compileListingQueryReferenceSelect(absentTargetId);
    const parameters = compiled.params.map((value) => {
      if (typeof value !== "string" && typeof value !== "number") {
        throw new Error("content_type_pseudo_fk_explain_parameter_invalid");
      }
      return value;
    });
    const explainRows = await db.$client.unsafe(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${compiled.sql}`,
      parameters
    );
    const metrics = parseManagedEvidenceExplainMetrics(explainRows[0]?.["QUERY PLAN"]);
    console.info(
      "content type pseudo-FK EXPLAIN profile",
      JSON.stringify({
        label: profile.label,
        listingQueries: profile.listingQueryCount,
        executionMs: metrics.executionMs,
        emittedRows: metrics.emittedRows,
        scannedRows: metrics.scannedRows,
        sharedBuffers: metrics.sharedBuffers,
      })
    );

    assertMaximum(metrics.executionMs, profile.executionMs);
    if (metrics.emittedRows !== 0) {
      throw new Error("content_type_pseudo_fk_explain_root_rows_failed");
    }
    assertMaximum(metrics.scannedRows, profile.scannedRows);
    assertMaximum(metrics.sharedBuffers, profile.sharedBuffers);
  } finally {
    await cleanupOwnedListingQueries(ownedIds);
  }
};

test("listing-query content-type pseudo-FK SELECT satisfies no-migration EXPLAIN budgets", async () => {
  for (const profile of EXPLAIN_PROFILES) {
    await assertProfile(profile);
  }
}, 360_000);
