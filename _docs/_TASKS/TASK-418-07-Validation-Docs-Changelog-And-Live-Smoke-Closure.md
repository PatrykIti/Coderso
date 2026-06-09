# TASK-418-07: Validation Docs Changelog And Live Smoke Closure
# FileName: TASK-418-07-Validation-Docs-Changelog-And-Live-Smoke-Closure.md

**Parent Task:** TASK-418
**Priority:** High
**Category:** QA / Docs / Changelog / Playwright
**Estimated Effort:** Large
**Dependencies:** TASK-418-02, TASK-418-03, TASK-418-04, TASK-418-05, TASK-418-06
**Status:** ⏳ To Do

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

- [ ] TASK-418-07-L01: Targeted lint, type, tests, and gates.
- [ ] TASK-418-07-L02: Real admin and front Playwright smoke.
- [ ] TASK-418-07-L03: Docs, changelog, board, and final drift closure.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Targeted Vitest and Bun suites from all implementation leaves.
- `bun run gates:coderso`
- `bun run precommit`
- `coderso-dev-core-host` plus `playwright-cli`.

---

## Documentation Updates Required

- `_docs/PAGE_EDITOR_V2_GAP_AUDIT.md`
- `_docs/PAGE_MODEL.md`
- `_docs/UI/pages-editor-new-approach/coderso-editor-spec.md`
- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CMS_SPEC.md`
- `_docs/CMS_API.md` if route/action payloads change.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` plus `_docs/_CHANGELOG/README.md`
