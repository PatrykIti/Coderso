# TASK-352-05: Import Export QA, Docs, and Closure
# FileName: TASK-352-05_Import_Export_QA_Docs_and_Closure.md

**Priority:** Medium
**Category:** Import Export + Playwright + Docs + Changelog
**Estimated Effort:** Medium
**Dependencies:** TASK-352-01, TASK-352-02, TASK-352-03, TASK-352-04
**Status:** Done (2026-06-01)

---

## Overview

Close the Import / Export remediation family after export options, import
validation, activity/history, and UI-control truthfulness are proven.

## Sub-Tasks

- Re-run valid JSON export/import roundtrip and restore the original bundle.
- Re-run invalid JSON and malformed-ID bundle checks.
- Exercise export target/include selections and verify bundle shape.
- Exercise Activity Log/recent history/search/progress/retry behavior.
- Update reports, task board, and changelog with final evidence.

## Files To Change

| File | Required change |
|---|---|
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_IMPORT_EXPORT.md` | Add final resolution notes and evidence. |
| `_docs/PLAYWRIGHT/31-05-2026-tools/REPORT_TOOLS_SECTION_OVERVIEW.md` | Update Import / Export classification. |
| `docs/guide/screens/` | Update Import / Export user docs if export targets, formats, or activity behavior changes. |
| `_docs/_TASKS/TASK-352_Import_Export_Tools_Report_Remediation.md` | Add closure notes. |
| `_docs/_TASKS/README.md` | Move family rows at closure. |
| `_docs/_CHANGELOG/*` | Add final implementation changelog. |

## Implementation Pseudocode

```text
1. Download a baseline full JSON bundle.
2. Download each targeted export and verify shape.
3. Upload invalid JSON and assert user-facing parse error.
4. Upload malformed bundle with invalid IDs and assert preview rejects it.
5. Upload valid modified bundle, preview, apply, verify via follow-up export.
6. Restore original bundle.
7. Exercise activity/search/progress/retry states.
8. Update reports and closure docs.
```

Data flow:

- Playwright uses the visible UI for export/import.
- API follow-up export verifies persisted state and restoration.

Error handling:

- Always restore the original bundle after mutation proof.
- If restoration fails, stop closure and record the exact recovery state.
- Do not leave test menu/routes/settings rows in shared DB.

Regression-test shape:

- Unit validation tests for bundle normalization.
- Route tests for export/import schemas.
- UI tests for controls and activity states.
- Playwright integrated roundtrip.

## Security Contract

No additional route changes are expected in this closure leaf.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit remain as implemented by code
  leaves.
- Export/import evidence must not include secrets or raw bundle contents in
  reports.

## Testing Requirements

- All tests required by TASK-352-01 through TASK-352-04.
- Focused Playwright Import / Export pass.
- `git diff --check`
- `bun run precommit` or configured commit hook.

## Documentation Updates Required

- Import / Export report and overview report.
- User guide if visible behavior changes.
- Task board and changelog indexes.

## Acceptance Criteria

- Import / Export report has no unclassified findings.
- Valid JSON roundtrip still works.
- Malformed bundles fail during preview/apply validation with user-safe errors.
- Activity/history and UI-only controls are resolved or truthfully unavailable.
- Source references in reports point to current `core/admin/services/*` and
  `core/server/routes/*` paths before the family is closed.

## Closure Notes

Done (2026-06-01): focused Bun/Vitest/lint/typecheck coverage passed for the
route, service, client, and UI contracts. Focused Chromium proof was run after
implementation to verify target/include export, invalid JSON and malformed-ID
rejection, valid JSON preview/apply/restore, local activity search/progress,
and disabled unavailable controls.
