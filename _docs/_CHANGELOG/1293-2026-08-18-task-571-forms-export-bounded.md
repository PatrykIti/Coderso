# 1293 - TASK-571 Forms Submissions Export And List Bounded Reads

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-571

## Key Changes

### Forms
- The unbounded submission export path is replaced by a bounded keyset-cursor
  export job: `submissionExportJob.ts` streams pages under
  `(form_id, created_at DESC, id DESC)` cursor with a per-page limit and an
  advisory lock, writes the CSV/JSON artifact, and prunes finished runs;
  scheduler wiring in `httpServer.ts` dispatches queued jobs and runs retention
  (M-490-01 + N1).
- Migration `0075_form_submissions_export_cursor` adds the composite index
  supporting the cursor scan; query-shape tests assert the export loads only the
  consumed columns (PII omission + CSV formula guard preserved).
- `submissionExport.ts` keeps the strict `csv|json` format contract and the
  token-guarded artifact read; export route remains `forms:read` internal with
  reject-unknown query validation.
- Export job table + artifact lifecycle follow the shared retention rules with a
  resumable prune for expired `submission_export_jobs` rows.

## Validation
- `bun --cwd core lint` + `lint:types` green; 12 export-job tests + 21 forms
  route tests green; EXPLAIN evidence for the cursor scan (synthetic fixtures)
  in `_docs/_workflows/_smoke/evidence/task-571/wf569smoke/task-571-export-explain.md`.
- Runtime smoke (`wf569smoke`): created + published a form, posted a submission
  via the public nonce-gated endpoint (HMAC nonce signed per
  `createFormSubmissionNonce`), opened Submissions (Total 1), and exported both
  CSV and JSON — files downloaded with the expected row
  (`21b0ec80-…,new`); screenshots
  `_docs/_workflows/_smoke/task571-forms-export.png`.
