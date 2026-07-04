# TASK-475-02: Validation, Docs, And Closure
# FileName: TASK-475-02-Validation-Docs-And-Closure.md

**Parent Task:** TASK-475
**Priority:** High
**Category:** Pages / Page Editor V2 / Canvas
**Estimated Effort:** Small
**Dependencies:** TASK-475-01, TASK-475-03
**Status:** ✅ Done
**Completed:** 2026-06-25

> **Completion note (2026-06-25):** Validation lanes green — `bun --cwd core lint`,
> `bun --cwd core lint:types`, `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx`
> (9/9) plus broader page-editor suites (146/146), and `bun run gates:coderso`
> baseline. Real-input live smoke passed (color applies to fragment + renders on
> exit; URL field focuses/types/applies sanitized anchor; single-click-to-edit).
> Changelog `1195` added + indexed; `_docs/PAGE_MODEL.md` updated; board synced.
> No page saved or published.

---

## Overview

Close the TASK-475 family: run the validation lanes, perform the real-input live
smoke, update docs, add the changelog entry, and synchronize the board. This file
owns no production code (pseudocode N/A).

## Scope

1. **Validation lanes**
   - `bun --cwd core lint`
   - `bun --cwd core lint:types`
   - `bunx vitest run tests/vitest/ui/page-authoring-canvas.test.tsx` (the new
     real-input regression tests from TASK-475-01 must pass; confirm they fail on
     the pre-fix tree to prove they bite).
   - `bun run gates:coderso` baseline.
   - Record any skipped lane with the reason.

2. **Live smoke (real input)** — `coderso-dev-core-host` + `playwright-cli` with
   real mouse/keyboard on a throwaway page:
   - double-click a heading → select a fragment → click a color swatch → only the
     fragment recolors;
   - select another fragment → bold/italic/highlight → applies to the fragment;
   - click the link URL field → type a URL → apply → fragment becomes a sanitized
     anchor;
   - clean up (Undo / discard draft); do not publish. Capture the evidence note.

3. **Docs**
   - Update `_docs/PAGE_MODEL.md` only if any author-facing contract wording about
     the inline mark toolbar needs correcting (no model/schema change expected).
   - No `_docs/ADMIN_CACHE*.md`, API, security, widget-pack, or release-gate docs
     are affected (no routes/cache/schema touched) — state this explicitly in the
     closeout.

4. **Changelog** — add the next entry in `_docs/_CHANGELOG/` (next free number;
   `1194` is the latest at task creation, re-confirm before writing) and update
   `_docs/_CHANGELOG/README.md`, summarizing: real-input swatch/mark fix via live
   selection snapshot, link-input focus fix, and the new regression tests.

5. **Board closure**
   - Mark TASK-475-01, TASK-475-03, TASK-475-02 `✅ Done` with `**Completed:**` dates.
   - Move TASK-475 to `✅ Done` only after all children are Done.
   - Move the four TASK-475 rows from **To Do** to **Done** in
     `_docs/_TASKS/README.md` and update **Statistics**.

6. **Drift pass** — if external-agent consultation/commits are used, run the
   read-only post-implementation drift pass per root `AGENTS.md` on the final tree
   (task contract, board/changelog sync, code boundaries, security invariants,
   the masked-test risk) and resolve or split any finding.

## Acceptance

- All listed validation lanes green (or skips justified).
- Real-input live smoke passes and is recorded.
- Changelog + board + statistics synchronized; parent and children consistent.
- Audit note `_TMP-PAGE-EDITOR-COLOR-TOOLBAR-LIVE-AUDIT-2026-06-25.md` referenced
  in the changelog closeout as the originating evidence.
