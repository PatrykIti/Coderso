export type PostsBackfillMismatchCode =
  | "slug_conflict"
  | "missing_post_after_upsert"
  | "field_parity_mismatch"
  | "seo_parity_mismatch"
  | "revision_count_mismatch"
  | "preview_token_count_mismatch"
  | "term_assignment_count_mismatch"
  | "revision_version_conflict"
  | "post_newer_than_legacy";

export type PostsBackfillMismatch = {
  legacyEntryId: string;
  code: PostsBackfillMismatchCode;
  message: string;
};

export type PostsBackfillFailure = {
  legacyEntryId: string;
  error: string;
};

export type PostsBackfillSyncStats = {
  legacy: number;
  inserted: number;
  updated: number;
  existing: number;
};

export type PostsBackfillReport = {
  dryRun: boolean;
  startedAt: string;
  finishedAt: string | null;
  totals: {
    legacyPosts: number;
    processed: number;
    inserted: number;
    updated: number;
    skipped: number;
    failed: number;
  };
  revisions: PostsBackfillSyncStats;
  previewTokens: PostsBackfillSyncStats;
  termAssignments: PostsBackfillSyncStats;
  mismatches: PostsBackfillMismatch[];
  failures: PostsBackfillFailure[];
};

export function createPostsBackfillReport(
  dryRun: boolean,
  startedAt = new Date()
): PostsBackfillReport {
  return {
    dryRun,
    startedAt: startedAt.toISOString(),
    finishedAt: null,
    totals: {
      legacyPosts: 0,
      processed: 0,
      inserted: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
    },
    revisions: {
      legacy: 0,
      inserted: 0,
      updated: 0,
      existing: 0,
    },
    previewTokens: {
      legacy: 0,
      inserted: 0,
      updated: 0,
      existing: 0,
    },
    termAssignments: {
      legacy: 0,
      inserted: 0,
      updated: 0,
      existing: 0,
    },
    mismatches: [],
    failures: [],
  };
}

export function markLegacyPost(report: PostsBackfillReport) {
  report.totals.legacyPosts += 1;
}

export function markPostInsert(report: PostsBackfillReport) {
  report.totals.processed += 1;
  report.totals.inserted += 1;
}

export function markPostUpdate(report: PostsBackfillReport) {
  report.totals.processed += 1;
  report.totals.updated += 1;
}

export function markPostSkipped(report: PostsBackfillReport) {
  report.totals.processed += 1;
  report.totals.skipped += 1;
}

export function markPostFailed(
  report: PostsBackfillReport,
  failure: PostsBackfillFailure
) {
  report.totals.processed += 1;
  report.totals.failed += 1;
  report.failures.push(failure);
}

export function mergeSyncStats(
  report: PostsBackfillReport,
  bucket: "revisions" | "previewTokens" | "termAssignments",
  stats: PostsBackfillSyncStats
) {
  report[bucket].legacy += stats.legacy;
  report[bucket].inserted += stats.inserted;
  report[bucket].updated += stats.updated;
  report[bucket].existing += stats.existing;
}

export function recordBackfillMismatch(
  report: PostsBackfillReport,
  mismatch: PostsBackfillMismatch
) {
  report.mismatches.push(mismatch);
}

export function finalizePostsBackfillReport(
  report: PostsBackfillReport,
  finishedAt = new Date()
) {
  report.finishedAt = finishedAt.toISOString();
  return report;
}
