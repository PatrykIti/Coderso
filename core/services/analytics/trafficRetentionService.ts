// Traffic retention & privacy enforcement (TASK-483-06-L01; bounded batches per
// TASK-551-06-L01).
//
// Bounds data retention for the real traffic analytics pipeline: prunes raw
// pageviews/sessions older than a configurable window so hashed `visitor_hash`
// identifiers never accumulate indefinitely. This is the privacy backstop — no
// raw PII (IP/User-Agent/full referrer) was ever stored, so there is nothing
// else to purge; pruning simply ages out the salted, non-PII rows.
//
// TASK-551-06-L01: retention no longer rides the write path. The inline
// process-local gate was removed from trafficRepository.recordTrafficEvent, which
// now persists and returns, so a request write executes zero prune SQL; the
// scheduler (TASK-551-06-L03) invokes pruneExpiredTraffic() instead. Every
// cutoff delete is a BOUNDED batch — at most `batchSize` oldest rows per batch
// and at most `maxBatchesPerRun` batches per invocation, oldest first — so a
// single invocation can never run an unbounded delete. The former opportunistic
// inline trigger is removed outright (search-history precedent): the old no-op
// export is gone — no callers, no re-export, no replacement stub. The
// deprecated ANALYTICS_PRUNE_INLINE_DISABLED / ANALYTICS_PRUNE_INLINE_ENABLED
// keys stay accepted as warning-once no-ops owned by retention policy
// initialization and are never read here.

import {
  countExpiredPageviewsBatch,
  countExpiredSessionsBatch,
  deleteOldestPageviewsBatch,
  deleteOldestSessionsBatch,
} from "./trafficRepository";

// Local trivial date helper (matches the private consts in analyticsService.ts /
// trafficAggregationService.ts — duplicated rather than entangling the modules).
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// Retention window: default 365 days, clamped to [30, 1095]. Configured via the
// canonical ANALYTICS_RETENTION_DAYS env var. Compatibility contract locked by
// TASK-551-06-L01: Number(raw) is evaluated first — absent or a non-finite
// result resolves to 365, and a finite result is floored then clamped, so
// fractions, empty strings, hex/exponent forms, and explicit out-of-range
// values never reject startup.
export function resolveRetentionDays(): number {
  const raw = Number(process.env.ANALYTICS_RETENTION_DAYS);
  if (!Number.isFinite(raw)) return 365;
  return Math.min(Math.max(Math.floor(raw), 30), 1095);
}

// Batch bounds of one retention invocation. The retention policy owner parses
// the global RETENTION_BATCH_SIZE / RETENTION_MAX_BATCHES_PER_RUN knobs once and
// passes the typed values in; this module never re-reads them. The defaults
// mirror the canonical knob defaults.
export type TrafficBatchLimits = Readonly<{
  batchSize: number; // rows per batch (canonical default 500, bound 1..2_000)
  maxBatchesPerRun: number; // batches per invocation (canonical default 10, bound 1..100)
}>;

const DEFAULT_BATCH_LIMITS: TrafficBatchLimits = { batchSize: 500, maxBatchesPerRun: 10 };

// Hard cap on any single candidate query (TASK-551-06-L01 policy: every
// candidate read — apply or dry-run — is bounded by LIMIT <= 2,000). The policy
// owner validates `batchSize` against the same bound; the clamp here only
// defends direct callers that hand-build oversized limits.
const CANDIDATE_LIMIT_HARD_CAP = 2_000;

export type TrafficRetentionOptions = Readonly<{ dryRun?: boolean }>;

export type TrafficRetentionResult = Readonly<{
  pageviews: number;
  sessions: number;
  dryRun: boolean;
}>;

// Repository seam — MANDATORY for shared-DB test safety. The bounded batch
// deletes and their dry-run candidate reads are injectable. In production they
// default to the repository's bounded oldest-ID deletes / observational reads.
// Tests therefore NEVER call this with the real repo against the ONE shared
// remote test Postgres: they inject pure stubs (policy/ordering/limits) or
// fixture-SCOPED batch deletes (real FK cascade).
export type TrafficBatchPruners = {
  // Apply mode: delete at most `limit` oldest expired rows, return the count.
  deleteOldestPageviewsBatch: (cutoff: Date, limit: number) => Promise<number>;
  deleteOldestSessionsBatch: (cutoff: Date, limit: number) => Promise<number>;
  // Dry-run: the identical candidate query, zero deletes, observational count.
  countExpiredPageviews: (cutoff: Date, limit: number) => Promise<number>;
  countExpiredSessions: (cutoff: Date, limit: number) => Promise<number>;
};

const realBatches: TrafficBatchPruners = {
  deleteOldestPageviewsBatch: (cutoff, limit) => deleteOldestPageviewsBatch(cutoff, limit),
  deleteOldestSessionsBatch: (cutoff, limit) => deleteOldestSessionsBatch(cutoff, limit),
  countExpiredPageviews: (cutoff, limit) => countExpiredPageviewsBatch(cutoff, limit),
  countExpiredSessions: (cutoff, limit) => countExpiredSessionsBatch(cutoff, limit),
};

export async function pruneExpiredTraffic(
  now = new Date(),
  batches: TrafficBatchPruners = realBatches,
  limits: TrafficBatchLimits = DEFAULT_BATCH_LIMITS,
  options: TrafficRetentionOptions = {}
): Promise<TrafficRetentionResult> {
  const dryRun = options.dryRun === true;
  const cutoff = addDays(now, -resolveRetentionDays());
  const candidateLimit = Math.min(limits.batchSize, CANDIDATE_LIMIT_HARD_CAP);
  // Firm order (TASK-551-06-L01 matrix): bounded oldest-first pageview batches
  // (created_at ASC, id ASC) first — they bound old pageviews that belong to
  // still-retained sessions — then bounded oldest-first session batches
  // (last_seen_at ASC, id ASC), whose remaining pageviews go via the FK
  // onDelete: "cascade" defined in TASK-483-01-L02.
  if (dryRun) {
    // Dry-run (TASK-551-06-L01): the same cutoff/ordering/LIMIT candidate query
    // as apply mode, but ZERO deletes and no destructive row lock. Dry-run never
    // advances the candidate set, so repeating the read would only re-count the
    // same rows — each family is observed once, which keeps the counts exact.
    // They stay observational (concurrent writes can move them), and `dryRun`
    // is reported so the caller can surface that limitation without row data.
    const pageviews = await batches.countExpiredPageviews(cutoff, candidateLimit);
    const sessions = await batches.countExpiredSessions(cutoff, candidateLimit);
    return { pageviews, sessions, dryRun: true };
  }
  const pageviews = await drainBatches(batches.deleteOldestPageviewsBatch, cutoff, limits);
  const sessions = await drainBatches(batches.deleteOldestSessionsBatch, cutoff, limits);
  return { pageviews, sessions, dryRun: false };
}

// Drains at most `maxBatchesPerRun` bounded batches of at most `batchSize`
// oldest rows, stopping at the first short batch (nothing older remains, so
// repeated completed runs issue exactly one zero-row probe batch).
async function drainBatches(
  deleteBatch: (cutoff: Date, limit: number) => Promise<number>,
  cutoff: Date,
  limits: TrafficBatchLimits
): Promise<number> {
  let deleted = 0;
  for (let batch = 0; batch < limits.maxBatchesPerRun; batch += 1) {
    const removed = await deleteBatch(cutoff, limits.batchSize);
    deleted += removed;
    if (removed < limits.batchSize) break;
  }
  return deleted;
}
