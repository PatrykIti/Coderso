# TASK-417-07-L03: Live Server And Playwright Smokes
# FileName: TASK-417-07-L03-Live-Server-And-Playwright-Smokes.md

**Parent Subtask:** TASK-417-07
**Priority:** High
**Category:** QA / Live Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-417-04, TASK-417-05, TASK-417-06
**Status:** ✅ Done

---

## Overview

Run real browser smoke tests through the local Coderso dev host after each
testable TASK-417 slice lands. Unit and integration suites are still required,
but Pages v2 must also be proven through the actual admin UI and public runtime
using `coderso-dev-core-host` and `playwright-cli`.

---

## Security Contract

- **Endpoint visibility:** no new endpoint; validation covers existing admin
  Pages routes, public page routes, and public `/preview` token consumption.
- **Auth model:** admin browser checks use credentials from `.env` without
  printing secrets; public runtime checks are anonymous except preview token
  consumption.
- **RBAC:** admin smoke runs under an account that can read/write/publish
  Pages and use assistant flows when those checks are executed.
- **CSRF:** admin UI actions must use the shipped browser/client flow so CSRF is
  obtained and sent by the existing client.
- **Rate-limit bucket:** live checks should use a single bounded session and
  avoid loops that can trip public/admin buckets.
- **Validation:** browser-submitted payloads must be v2 `sections[]` documents;
  legacy `blocks[]` writes are only tested as explicit rejection cases through
  route suites, not through the normal UI.
- **Anti-abuse controls:** do not log `.env` values, preview tokens, provider
  keys, or raw sensitive diagnostics; preview probe UI must show redacted target
  labels only.

---

## Sub-Tasks

- [x] After TASK-417-04 is testable, start `coderso-dev-core-host` and use
  `playwright-cli` to verify public v2 Page render, runtime preview, homepage,
  not-found behavior, and non-Page widget-template/detail-page rendering.
- [x] After TASK-417-05 is testable, use `playwright-cli` to log into admin,
  open Pages editor, confirm the old left/right widget panels are absent,
  insert a section/block through the new canvas/palette flow, edit via the
  floating toolbar/inspector, save, preview, publish, and verify toasts.
- [x] After TASK-417-06 is testable, use `playwright-cli` to verify assistant
  dry-run/execute for Page creation/refinement emits v2 sections and the public
  page renders without widget fallback.
- [x] Capture evidence paths or concise notes in TASK-417 closeout/changelog,
  including any skipped live checks with a concrete reason.

---

## Implementation Pseudocode

```sh
# Start or reuse the dev host. Do not print .env contents.
coderso-dev-core-host

# In a separate shell/session, source env only for commands that require it.
set -a && source .env && set +a

# Use playwright-cli against the running admin/public URLs from helper output,
# or set CODERSO_DEV_BASE_URL explicitly when the helper prints a non-default port.
BASE_URL="${CODERSO_DEV_BASE_URL:-http://127.0.0.1:3000}"
playwright-cli open "$BASE_URL/admin"
playwright-cli screenshot --filename artifacts/task-417-admin-editor.png
playwright-cli screenshot --filename artifacts/task-417-public-page.png
```

Expected data flow:

- The server process comes from `coderso-dev-core-host`.
- Browser actions go through the same admin client/cache/CSRF/session code that
  operators use.
- Public checks open the real rendered page and preview URL returned by admin.
- Evidence is recorded without leaking credentials, preview tokens, provider
  keys, or raw `.env` values.

Error handling:

- If the dev host fails to start, record logs and fix the runtime failure before
  claiming the affected slice is done.
- If DB/login credentials from `.env` are missing or invalid, record the exact
  missing capability without echoing secret values and keep the live smoke open.
- If Playwright catches console/page errors, fix them or split an explicit
  follow-up before TASK-417 closure.

Regression-test shape:

- Live admin smoke proves canvas-first Pages editing works end to end.
- Live public smoke proves published and preview Pages render v2 sections.
- Live non-Page smoke proves widget-template/detail-page surfaces still render
  `WidgetBlock[]` through the legacy widget boundary.

---

## Testing Requirements

- `coderso-dev-core-host`
- `playwright-cli` admin Page editor smoke.
- `playwright-cli` public v2 Page smoke.
- `playwright-cli` public preview smoke.
- `playwright-cli` non-Page widget-template/detail-page boundary smoke.

---

## Documentation Updates Required

- TASK-417 closeout notes.
- `_docs/_CHANGELOG/` entry validation section.

---

## Completion Notes

- Started the local stack with `coderso-dev-core-host`.
- Used `playwright-cli` to complete the real admin flow:
  - loaded `/admin/pages`,
  - created `Task 417 Playwright Smoke`,
  - opened the v2 Page editor,
  - inserted a Hero section through the command palette,
  - saved the draft and saw the existing `Draft saved.` toast,
  - published the page and saw the existing `Page published.` toast.
- Verified the public runtime at `/task-417-playwright-smoke` with Playwright:
  - `document.querySelector("[data-page-v2]")` returned true,
  - section markers included `hero`,
  - block markers included `heading`, `text`, and `button`,
  - browser console had zero errors and zero warnings after the final reload.
- Fixed two smoke-found implementation issues before closure:
  - browser import of `node:crypto` from `pageDocumentV2` broke Vite; replaced
    id generation with `globalThis.crypto.randomUUID()` plus fallback,
  - Page create drawer still submitted `data.blocks`; updated it to submit an
    empty v2 document.
