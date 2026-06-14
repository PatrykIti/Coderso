# TASK-464-07-L02: Final Parity Security Docs And Changelog Closure
# FileName: TASK-464-07-L02-Final-Parity-Security-Docs-And-Changelog-Closure.md

**Parent Subtask:** TASK-464-07
**Priority:** High
**Category:** Pages / Admin UI / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-464-07-L01
**Status:** ⏳ To Do

---

## Overview

Close TASK-464 with final parity, security, docs, board, and changelog
validation. This leaf proves the modularized editor still behaves identically
for Pages, Page Templates, and Menu Design.

Hard constraint: no UX/UI changes.

---

## Sub-Tasks

- [ ] Run targeted Vitest and pure helper suites.
- [ ] Run lint, typecheck, admin build, and admin boundary guard.
- [ ] Run local security scans where tooling is available.
- [ ] Run real browser parity smoke for Pages, Page Templates, and Menu Design.
- [ ] Update docs, task statuses, board, changelog, and changelog index.

---

## Implementation Pseudocode

```ts
async function closeTask464() {
  await run("bun --cwd core lint");
  await run("bun --cwd core lint:types");
  await run("bun --cwd core build:admin");
  await run("bun run check:admin-boundary");
  await run("bun run test:vitest -- <targeted suites>");
  await runSecurityScansIfAvailable();
  await runBrowserParitySmoke(["pages", "page-templates", "menu-design"]);
  updateTaskBoardAndChangelog("TASK-464");
}
```

Expected data flow:

- Validation evidence is recorded in task/changelog closeout.
- Any remaining drift is fixed or split into explicit follow-up tasks before
  closing parent tasks.

Error handling:

- If a broad suite fails for unrelated pre-existing reasons, isolate and record
  it; do not close TASK-464 without targeted green evidence for touched
  contracts.
- If local scanner tooling is missing, state which scan remains CI-only.

Regression-test shape:

- Existing and new module tests pass.
- Browser smoke covers select/edit/panel/layers/command/template/save/preview
  paths without visible UX change.

---

## Security Contract

- No new endpoints.
- No route auth/RBAC/CSRF/rate-limit changes.
- Security scans or CI-equivalent gates must cover the final extracted modules.
- No scanner allowlist changes without documented owner/reason/expiry/ticket.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/page-templates-surface.test.tsx tests/vitest/ui/menu-design-editor-flow.test.tsx`
- All targeted pure suites added by TASK-464.
- `bun run scan:security:strict` where local tooling is available.
- Real browser smoke for Pages, Page Templates, and Menu Design.
- `bun run precommit` before manual commit.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md`
- `_docs/CMS_SPEC.md` if reusable CMS authoring rules changed.
- `_docs/SECURITY_SPEC.md` if sanitizer/scanner policy changed.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md`
