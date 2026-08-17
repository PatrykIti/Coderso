# TASK-571: Forms Submissions Export And List Bounded Reads

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Changelog:** 1293 (pinned)
**Priority:** Medium
**Size:** Large

# FileName: TASK-571_Forms_Submissions_Export_And_List_Bounded_Reads.md

**Parent Task:** none
**Source Findings:** M-490-01 + N1 (audit `_TMP-audit-task-490-forms-export.md`, verified at HEAD `4e3dab15`)

## Purpose

The form submissions export performs an unbounded `select()` of all submissions,
awaits the whole list, maps it into a new array, builds the full CSV/JSON string
in memory, and returns one large HTTP envelope. For large forms this grows DB
load, process memory, and response size together, violating the bounded-read
rule.

**Scope boundary:** this task owns the EXPORT surface only. The sibling admin
list route (`GET /forms/:id/submissions`) has the same unbounded-read problem
(N1), but the bounded keyset list + server-side client pagination is owned by
**TASK-551-03-L02** (⏳ To Do, single writer for `submissionReadService.ts`,
`formsRoutes.ts`, `formSchemas.ts`, `formsClient.ts`,
`FormSubmissionsPage.tsx`). TASK-571 records a dependency: the export job/read
must reuse the same keyset cursor contract TASK-551-03-L02 establishes, and
TASK-571 lands AFTER it (land order pin). TASK-571 must NOT touch
`FormSubmissionsPage.tsx`, `formsClient.ts` list methods, or the list route.

## Evidence

- `core/services/forms/submissionService.ts:16-22` — unbounded `select()`.
- `core/services/forms/submissionExport.ts:142-168` — awaits full list, maps,
  builds entire CSV/JSON string in memory.
- `core/server/routes/formsRoutes.ts:708-717` — returns full envelope; `:719-721`
  list route serves the same unbounded list (N1).
- Positives verified (keep): `forms:read` at `:708`, enum/reject-unknown
  `:709-711`, PII omission + CSV formula guard `submissionExport.ts:14-18,31-38`,
  legacy payload keys preserved `:86-107`.

## Scope

- **Export only** (list surface deferred to TASK-551-03-L02; see Purpose).
- Async export job/artifact with stable keyset cursor (`created_at, id`),
  bounded batches (~5k rows/batch), byte cap, and backpressure; the DB read is
  bounded at the database boundary.
- **Deterministic ordering + index:** current order is `created_at DESC` with no
  `id` tiebreaker, and no composite index serves the keyset cursor
  (`form_submissions` has only `formIdx`, `createdIdx`, `statusIdx`). Add a
  composite index `(form_id, created_at DESC, id DESC)` with FULL migration
  artifacts (SQL + `meta/*_snapshot.json` + `meta/_journal.json` update), and
  specify `ORDER BY created_at DESC, id DESC` with the `id` tiebreaker in the
  cursor contract. Capture sanitized `EXPLAIN (ANALYZE, BUFFERS)` against
  small + large fixtures (no real submissions data in evidence).
- **CSV column strategy — explicit decision:** the current builder derives the
  column set by scanning ALL rows' payload keys before emitting the header
  (`submissionExport.ts:86-108`), so a single-pass streaming CSV cannot emit
  the header first without a prior full scan. Chosen approach: the async job
  runs a **column-collection first pass** (bounded keyset scan of payload keys
  only, no row materialization) and then streams rows in bounded batches,
  preserving the existing "no captured answer is silently dropped" contract
  (`:86-107`). JSON is streamed directly (header not required).
- Keep PII omission (`ip`/`userAgent` excluded) and the CSV formula injection
  guard (`submissionExport.ts:14-18,31-38`).
- Job/artifact lifecycle: scheduler/worker dispatch, temp artifact file,
  short-lived admin-scoped download link with TTL, and bounded retention/
  cleanup (reuse existing job/outbox infra patterns, no new competing loops).
- Tests: multi-batch row budget, hard size-limit test, cursor no-gap/no-dup,
  query-shape (export loads only consumed columns), index EXPLAIN evidence.

## Fix Strategy

Own the export in a bounded job module (e.g. `submissionExportJob.ts`) beside
`submissionExport.ts`:

```ts
// core/services/forms/submissionExportJob.ts (new; domain, DB-backed via db client)
export type SubmissionExportJobInput = { formId: string; format: "csv" | "json" };
export async function createSubmissionExportJob(input: SubmissionExportJobInput): Promise<{ jobId: string }>;
export async function runSubmissionExportJob(jobId: string): Promise<{ artifactKey: string; rowCount: number; bytes: number }>;
export async function listSubmissionExportJobs(formId: string): Promise<...>; // bounded
```

1. `createSubmissionExportJob` validates the form exists + `forms:read`,
   creates a job row (`status: "queued"`), and dispatches via the existing
   scheduler/outbox pattern (no new competing loop).
2. `runSubmissionExportJob`:
   - PASS A (columns, CSV only): bounded keyset scan reading only payload keys
     (`created_at, id` cursor, `~5k/batch`), union into a column set.
   - PASS B (rows): keyset scan over `ORDER BY created_at DESC, id DESC` using
     the new composite index; write each row to the temp artifact file with
     backpressure; enforce the byte cap; abort with a machine-readable
     `submission_export_too_large` on overflow.
   - Writes the artifact, records `rowCount`/`bytes`, transitions the job to
     `done` with a short-lived admin-scoped download token (TTL, not publicly
     indexable).
3. The export route becomes a thin orchestration: validate payload + RBAC,
   create the job, return `{ jobId, status }`; a follow-up status route polls
   the job and returns the download link when `done`.
4. CSV keeps formula guard + PII omission (reuse existing helpers).

The list route stays untouched (TASK-551-03-L02 owns it).

## Security Contract

- Endpoints unchanged: `internal` admin, `forms:read` for export; the job status
  poll and download link require `forms:read` and are scoped to the owning form.
- Query has explicit allowlist + schema enum (keep).
- Export intentionally excludes `ip`/`userAgent`; CSV keeps formula injection
  guard (keep).
- Any new job/artifact link is short-lived, scoped to the requesting admin
  session/permission, and not publicly indexable; artifact files have bounded
  retention and are cleaned up.
- Job rows never contain submission payloads; only `rowCount`/`bytes`/`status`.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Bun-free Vitest: export builder bounds, formula guard, PII omission
  (`tests/vitest/forms/submissionExport.test.ts` kept green).
- Bun DB lane (`DATABASE_URL` available, `set -a && source .env && set +a`):
  multi-batch row budget, byte-cap abort, cursor no-gap/no-dup, job lifecycle
  (queued → running → done/failed), short-lived link + retention cleanup,
  index EXPLAIN evidence; run the exact owning suites
  (`bun tests/unit/forms/...` or the named new job test file).
- Route registration + `map*Error` coverage for the new job/status routes.
- Sanitized `EXPLAIN (ANALYZE, BUFFERS)` for the keyset query against small +
  large fixtures (no real submissions data in evidence).

## Notes

- M-490-01 blocks treating the export as scalable; N1 is the same unbounded
  read on the list surface.
