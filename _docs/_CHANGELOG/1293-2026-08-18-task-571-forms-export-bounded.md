# 1293 - TASK-571 Forms Submissions Export And List Bounded Reads

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-571

## Key Changes

### Forms
- A bounded keyset-cursor export JOB is added: `submissionExportJob.ts` streams
  pages under `(form_id, created_at DESC, id DESC)` cursor with a per-page
  limit and an advisory lock, writes the CSV/JSON artifact, and prunes
  finished runs; scheduler wiring in `httpServer.ts` dispatches queued jobs and
  runs retention (M-490-01 + N1).
- Migration `0075_form_submissions_export_cursor` adds the composite index
  supporting the cursor scan; query-shape tests assert the export loads only the
  consumed columns (PII omission + CSV formula guard preserved).
- `submissionExport.ts` keeps the strict `csv|json` format contract and the
  token-guarded artifact read; the existing `GET /forms/:id/submissions/export`
  route remains `forms:read` internal with reject-unknown query validation.
- **Land-order note:** the route still invokes the legacy synchronous
  `buildFormSubmissionsExport` path. Rewiring `formsRoutes.ts` to the job
  orchestration (create/status/download) is single-writer-owned by
  TASK-551-03-L02 (⏳ To Do, contract-mandated land order); the job module,
  scheduler, table, and migration are fully landed and tested here.
- Export job table + artifact lifecycle follow the shared retention rules with a
  resumable prune for expired `submission_export_jobs` rows.

## Validation
- `bun --cwd core lint` + `lint:types` green; 12 export-job tests + 21 forms
  route tests green; EXPLAIN evidence for the cursor scan (synthetic fixtures)
  in `_docs/_workflows/_smoke/evidence/task-571/wf571-export-explain/task-571-export-explain.md`.
- Runtime smoke (`wf569smoke`): created + published a form, posted a submission
  via the public nonce-gated endpoint (HMAC nonce signed per
  `createFormSubmissionNonce`), opened Submissions (Total 1), and exported both
  CSV and JSON — files downloaded with the expected row
  (`21b0ec80-…,new`); screenshots
  `_docs/_workflows/_smoke/evidence/task-571/wf569smoke/task571-forms-export.png`.
- Toolchain journal suites (`bunLaneProvisioning`/`bunLaneProvision`/
  `runBunParallel`) aligned to the live 77-entry journal (0073/0075/0076/0078);
  `idx` contiguity assertion replaced by strict monotonicity + unique tags
  because concurrent sibling streams leave `idx` gaps (journal `idx` is
  allocated, not identity).
