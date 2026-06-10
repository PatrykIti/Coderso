# TASK-418-07: Validation Docs Changelog And Live Smoke Closure
# FileName: TASK-418-07-Validation-Docs-Changelog-And-Live-Smoke-Closure.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** QA / Docs / Changelog / Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-418-02, TASK-418-03, TASK-418-04, TASK-418-05, TASK-418-06
**Status:** ✅ Done
**Completed:** 2026-06-10

---

## Overview

Close TASK-418 with targeted validation, real server/browser smoke tests, docs,
task board, changelog, and final drift audit. Parent TASK-418 may only move to
Done when every physical child is Done, Superseded, or Cancelled.

---

## Security Contract

- **Endpoint visibility:** verify existing internal/public route boundaries
  remain unchanged unless a child explicitly changed them.
- **Auth model:** verify admin session and preview token boundaries.
- **RBAC:** verify existing Pages/assistant permissions.
- **CSRF:** verify admin writes retain CSRF behavior.
- **Rate-limit bucket:** verify existing buckets remain in force.
- **Validation:** final checks must prove recursive Page documents and assistant
  outputs still reject unknown fields.
- **Anti-abuse controls:** final security validation must cover no public write
  endpoint, no secrets in browser state, and preserved sanitizer boundaries.

---

## Sub-Tasks

- [x] TASK-418-07-L01: Targeted lint, type, tests, and gates.
- [x] TASK-418-07-L02: Real admin and front Playwright smoke.
- [x] TASK-418-07-L03: Docs, changelog, board, and final drift closure.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest and Bun suites from all implementation leaves.
- `bun run gates:coderso`
- `bun run precommit`
- `coderso-dev-core-host` plus `playwright-cli`.

## Completion Notes

- TASK-418-07-L01, L02, and L03 are complete and recorded in changelog 1160.
- Validation included targeted Vitest/Bun suites, lint, typecheck,
  `bun run gates:coderso`, and real browser smoke through
  `coderso-dev-core-host` plus direct `playwright-cli`.
- The live smoke created a Page through the admin UI, inserted/edited Page v2
  sections/blocks, verified command palette viewport-safe scrolling and Close
  visibility, saved, previewed, published, checked public runtime output, and
  cleaned up smoke pages.

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_AUDIT_REPORT.md`
- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if route/action payloads change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus `_docs/_CHANGELOG/README.md`
