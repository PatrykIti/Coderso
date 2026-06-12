# TASK-455-03: Validation Live Smoke And Closure
# FileName: TASK-455-03-Validation-Live-Smoke-And-Closure.md

**Parent Task:** TASK-455
**Priority:** High
**Category:** Pages / QA
**Estimated Effort:** Medium
**Dependencies:** TASK-455-02
**Status:** ✅ Done
**Started:** 2026-06-11
**Completed:** 2026-06-12

---

## Overview

Close the family with full-lane validation and a real-browser proof of the
client-site scenario: build a menu, build a footer template with link columns,
assign both in Site shell settings, and verify every public page renders them.

---

## Sub-Tasks

- [x] Run the targeted validation set and capture evidence.
- [x] Live smoke per pseudocode below.
- [x] Docs/board/changelog sync.

---

## Implementation Pseudocode

```text
Live smoke (coderso-dev-core-host + playwright-cli, .env creds):
1. Menus admin: create menu "Main" with 3 links (two pages + one external),
   publish it.
2. Page Templates: create "Site Footer" template — content section, columns=3,
   each column heading + list with link items; publish it.
3. Settings -> Site shell: pick "Main" + "Site Footer"; save.
4. Open two different published pages on the front: header nav with 3 links
   and the 3-column footer render on BOTH; mobile viewport (390px) shows the
   collapsed nav affordance and stacked footer columns.
5. Unpublish the menu -> nav disappears (footer stays); restore.
6. Editor preview shows the shell around the draft content.
```

Validation: full Vitest lane, Bun public-site suite, lint/types/root tsc,
`git diff --check`.

Error handling: any failed scenario blocks closure; fix in-family or split an
explicit follow-up with rationale.

Regression-test shape: closure adds evidence, not production code.

---

## Security Contract

- **Endpoint visibility:** no changes in this leaf.
- **Auth model / RBAC / CSRF / rate-limit / validation / anti-abuse:**
  unchanged.

---

## Testing Requirements

- Full Vitest lane + Bun public-site suite (env loaded).
- `bun --cwd core lint`, `bun --cwd core lint:types`, root tsc.
- Live smoke per pseudocode; evidence under `.tmp/phase25/`.

---

## Documentation Updates Required

- `docs/guide/` user note (set site menu + footer).
- `_docs/_TASKS/README.md` + `_docs/_CHANGELOG/` family entry.

---

## Completion Notes

Closure executed 2026-06-12: full lanes green (3993+ Vitest, Bun site-shell/settings/pages suites), live client scenario PASS (menu+footer on two pages, 390px stacking, unpublish fail-closed); evidence .tmp/phase25/. Editor preview dialog finding fixed post-smoke (probe trust + loopback validation, commit 7d975441).
