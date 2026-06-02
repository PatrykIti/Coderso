# TASK-352: Import Export Tools Report Remediation
# FileName: TASK-352_Import_Export_Tools_Report_Remediation.md

**Priority:** High
**Category:** Admin Tools + Import Export + API + Validation + UI + QA + Docs
**Estimated Effort:** Very Large
**Dependencies:** TASK-347
**Status:** Done (2026-06-01)

---

## Overview

Close every Import / Export finding from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_IMPORT_EXPORT.md` plus
Import/Export-specific Claude UX feedback from
`_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_CLAUDE_UX_REVIEW.md`.

The deep pass proved a valid JSON bundle can roundtrip and restore the original
configuration. The remaining issues are:

- Export option checkboxes do not affect downloads.
- Export cards advertise Content Types, Pages, and Media, while the current
  bundle contains settings, menus, theme profiles, admin themes, and redirects.
- Per-card option chevrons and Activity Log are UI-only.
- Visible file-type copy advertises CSV/ZIP while the input/parser only accept
  JSON.
- Preview accepts malformed IDs that apply later rejects with a raw 500.
- Recent Imports search is not wired.
- Failed/in-progress import rows lack failure reasons, retry, and progress
  semantics.

## Source Findings

| Area | Current evidence | Owner files |
|---|---|---|
| Export options | `ExportCards` uses uncontrolled checkboxes; `ImportExportPage.handleExport` ignores target and always calls full `exportConfig()`. | `core/admin/ui/import-export/ExportCards.tsx`, `core/admin/ui/import-export/ImportExportPage.tsx`, `core/admin/services/importExportClient.ts`, `core/services/tools/importExportService.ts` |
| Import validation | `importBundleSchema` accepts optional IDs as plain strings; `importConfig` passes invalid menu IDs to UUID columns. | `core/server/validation/importExportSchemas.ts`, `core/services/tools/importExportService.ts` |
| Activity/history | Activity Log has no handler; `importHistory` is static; Recent Imports search input is uncontrolled. | `core/admin/ui/import-export/ImportExportPage.tsx`, `core/admin/ui/import-export/ImportDropzone.tsx` |
| File types | Copy says JSON/CSV/ZIP; input `accept` is `.json`; parser uses `JSON.parse`. | `core/admin/ui/import-export/ImportDropzone.tsx` |

## Sub-Tasks

- [x] TASK-352-01: Export Target and Include Options Contract
- [x] TASK-352-02: Import Bundle Validation and Error Mapping
- [x] TASK-352-03: Import Activity History, Progress, Failure Reason, and Retry UX
- [x] TASK-352-04: Import Export File-Type and Options-Control Truthfulness
- [x] TASK-352-05: Import Export QA, Docs, and Closure

## Closure Notes

Done (2026-06-01):

- Export cards now match the real supported configuration bundle surfaces:
  Site Settings, Navigation Menus, Theme Configuration, and Redirect Rules.
- Export target/include options are controlled in the UI, serialized by the
  admin client, validated at the route boundary, and reflected in bundle shape.
- Partial exports carry `scope` metadata so importing a targeted bundle mutates
  only the selected sections instead of treating omitted sections as deletes.
- Import preview/apply share UUID, duplicate-route, duplicate-redirect, admin
  theme reference, and redirect validation, with known domain failures mapped
  to `ApiError` responses.
- Recent Imports is session-local, searchable, shows real operation status,
  progress and failure reason, and offers a truthful `Upload again` action
  instead of static CSV/ZIP fixture rows.
- CSV/ZIP copy was removed; the import surface is JSON-only until real parsers
  and backend contracts exist.
- Export loading is scoped per card, so one slow download does not disable the
  other supported export targets.
- Import apply runs inside a DB transaction and invalidates only the imported
  resource-family caches after success.
- Recent Imports hydrates from `tools:import:history` browser cache; export
  bundle payloads and uploaded bundle contents stay uncached.

## Implementation Order

1. Land export target/include contract first because it changes route/service
   payloads and download shape.
2. Land import validation/error mapping before adding richer activity/retry UI.
3. Land activity/progress/retry and file-type/control truthfulness.
4. Close with JSON roundtrip, malformed-bundle rejection, and UI interaction
   proof.

## Security Contract

Import/export routes are internal admin settings operations:

- Endpoint visibility: internal admin under `/admin/api/tools/*`.
- Auth model: session cookie.
- RBAC: `settings:read` for export/preview and `settings:write` for apply.
- CSRF: required for import preview/apply POSTs; export GET does not require
  CSRF unless converted to POST.
- Rate-limit bucket: `admin_read` for export/preview reads and `admin_write`
  for apply.
- Reject-unknown validation: every bundle and export request must keep
  `additionalProperties: false`, UUID format checks where IDs are accepted, and
  bounded arrays.
- Anti-abuse: no public write.
- Secret handling: exports must redact or omit backend-only secrets and imports
  must not echo raw secret values in errors/history rows.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun test tests/unit/tools/importExport.test.ts`
- `bun test tests/integration/routes/importExport.test.ts`
- `bun run test:vitest -- tests/vitest/admin/importExportClient.test.ts tests/vitest/ui/import-export.test.tsx`
- Focused Playwright Import / Export pass for export options, invalid JSON,
  malformed bundle, valid bundle roundtrip, activity/search/progress states

## Documentation Updates Required

- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_IMPORT_EXPORT.md`
- `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md`
- Import/export user guide if file types, export targets, or activity behavior
  changes
- `_docs/CMS_API.md`, `_docs/ARCHITECTURE.md`, and `_docs/SECURITY_SPEC.md` if
  export target shape, import activity storage, retry behavior, or secret
  redaction policy changes
- `_docs/ADMIN_CACHE.md` and `_docs/ADMIN_CACHE_MAP.md` for cached Recent
  Imports and uncached export/upload payload boundaries
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`

## Acceptance Criteria

- Every visible export option either changes the export or is not presented as
  interactive.
- No export card claims Content Types/Pages/Media unless the service can export
  those resources.
- Import preview rejects malformed bundles before apply.
- Errors are user-facing and machine-readable, not raw DB 500s.
- Recent Imports/activity/progress rows are real or explicitly marked static /
  unavailable.
