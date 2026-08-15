# 1275 - TASK-490 Forms: Submissions Export (CSV/JSON)

**Date:** 2026-08-14
**Version:** Unreleased
**Tasks:** TASK-490, TASK-490-01, TASK-490-01-L01, TASK-490-01-L02, TASK-490-02, TASK-490-02-L01, TASK-490-02-L02, TASK-490-02-L03

## Key Changes

### Forms (admin)
- New internal `GET /forms/:id/submissions/export?format=csv|json` route (`forms:read`, strict reject-unknown query, format default `csv`): CSV has one column per form field (orderIndex order) plus any extra legacy payload keys; JSON mirrors the read model.
- `core/services/forms/submissionExport.ts` — pure deterministic builder with analytics-style CSV formula-injection guard; PII columns (`ip`/`userAgent`) deliberately omitted from both formats.
- Admin UI: additive Export CSV / Export JSON buttons on the Submissions page header (Blob/anchor download pattern matching the analytics `TopPagesDrawer`); page look/functionality otherwise unchanged.
- Docs: `_docs/CMS_API.md` Forms section + `_docs/SECURITY_SPEC.md` admin-read line updated.

## Validation
- `bun --cwd core lint` + `lint:types` green; Vitest 30/30 (builder 11, client 12, UI 7); Bun forms route integration 19/20 with the 1 failure a confirmed pre-existing shared-DB hook-timeout flake (fails identically on HEAD).
- Runtime smoke (wf490smoke, 5 scenarios): admin login, Forms → Submissions navigation, CSV download + content, JSON download + content, dark-mode parity; 0 console errors related to the change. Screenshots in `_docs/_workflows/_smoke/490-*`.
