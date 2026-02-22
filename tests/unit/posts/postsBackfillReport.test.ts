import { expect, test } from "bun:test";

import {
  createPostsBackfillReport,
  finalizePostsBackfillReport,
  markLegacyPost,
  markPostFailed,
  markPostInsert,
  markPostSkipped,
  markPostUpdate,
  mergeSyncStats,
  recordBackfillMismatch,
} from "../../../core/services/posts/migration/postsBackfillReport";

test("posts backfill report helpers aggregate totals and sync stats", () => {
  const startedAt = new Date("2026-02-22T10:00:00.000Z");
  const finishedAt = new Date("2026-02-22T10:05:00.000Z");
  const report = createPostsBackfillReport(true, startedAt);

  markLegacyPost(report);
  markPostInsert(report);
  markPostUpdate(report);
  markPostSkipped(report);
  markPostFailed(report, {
    legacyEntryId: "entry-4",
    error: "post_backfill_failed",
  });

  mergeSyncStats(report, "revisions", {
    legacy: 3,
    inserted: 1,
    updated: 1,
    existing: 1,
  });
  mergeSyncStats(report, "previewTokens", {
    legacy: 2,
    inserted: 2,
    updated: 0,
    existing: 0,
  });
  mergeSyncStats(report, "termAssignments", {
    legacy: 4,
    inserted: 2,
    updated: 1,
    existing: 1,
  });

  recordBackfillMismatch(report, {
    legacyEntryId: "entry-1",
    code: "field_parity_mismatch",
    message: "Data mismatch",
  });

  const finalized = finalizePostsBackfillReport(report, finishedAt);

  expect(finalized.dryRun).toBe(true);
  expect(finalized.startedAt).toBe(startedAt.toISOString());
  expect(finalized.finishedAt).toBe(finishedAt.toISOString());

  expect(finalized.totals).toEqual({
    legacyPosts: 1,
    processed: 4,
    inserted: 1,
    updated: 1,
    skipped: 1,
    failed: 1,
  });

  expect(finalized.revisions).toEqual({
    legacy: 3,
    inserted: 1,
    updated: 1,
    existing: 1,
  });
  expect(finalized.previewTokens).toEqual({
    legacy: 2,
    inserted: 2,
    updated: 0,
    existing: 0,
  });
  expect(finalized.termAssignments).toEqual({
    legacy: 4,
    inserted: 2,
    updated: 1,
    existing: 1,
  });

  expect(finalized.mismatches).toHaveLength(1);
  expect(finalized.failures).toEqual([
    {
      legacyEntryId: "entry-4",
      error: "post_backfill_failed",
    },
  ]);
});
