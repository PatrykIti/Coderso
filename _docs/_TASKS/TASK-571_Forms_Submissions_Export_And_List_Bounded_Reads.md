# TASK-571: Forms Submissions Export And List Bounded Reads

**Status:** ⏳ To Do
**Started:**
**Completed:**
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
rule. The sibling admin list route serves the same unbounded list and the
submissions page paginates the full in-memory set client-side (N1).

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

- Export: streaming response OR async job/artifact with stable keyset cursor
  (`created_at, id`), bounded batches, byte cap, and backpressure.
- List: keyset-cursor metadata page (no full payload materialization),
  deterministic ordering, bounded page size; client paginates server-side pages.
- Tests: multi-batch row budget, hard size-limit test, cursor no-gap/no-dup,
  query-shape (list loads only consumed columns).

## Fix Strategy

Prefer an async export job writing a file in bounded batches and returning a
controlled link/state, or a true streaming response; either way the DB read is
bounded with a stable cursor. The list route becomes a bounded keyset read.

## Security Contract

- Endpoints unchanged: `internal` admin, `forms:read` (export) and existing
  list permission.
- Query has explicit allowlist + schema enum (keep).
- Export intentionally excludes `ip`/`userAgent`; CSV keeps formula injection
  guard (keep).
- Any new job/artifact link is short-lived, scoped, and not publicly indexable.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest export bounds + formula guard; Bun route tests when `DATABASE_URL`
  available.
- Route registration + `map*Error` coverage.

## Notes

- M-490-01 blocks treating the export as scalable; N1 is the same unbounded
  read on the list surface.
