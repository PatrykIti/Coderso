# 1196 - TASK-476-01 Page Editor Mark Re-Color Replacement

**Date:** 2026-06-26
**Version:** Unreleased
**Tasks:** TASK-476 (in progress), TASK-476-01

## Key Changes

### Page V2 Authoring (inline text marks)

- Fixed re-coloring a fragment: applying a **different** color/highlight (or link
  href) to an already-marked selection now **replaces** it in a single click,
  instead of first clearing it back to the block default and requiring a second
  click. Applying the **same** value over the same range still toggles it off, and
  bold/italic keep their pure toggle. Root cause was a value-blind `exactMatch`
  (matched on `type + from + to` only) that took the toggle-off branch for a
  same-range different-color re-apply.
- Extracted the mark-application logic out of the `PageEditor` component into the
  marks domain owner as `applyBlockTextMark(text, currentMarks, mark)` in
  `core/services/pages/pageDocumentV2.ts` (alongside `normalizeBlockTextMarks`),
  with a `PageBlockTextMarkInput` type. `PageEditor` now imports it. This keeps
  the contract logic in the domain module and makes it unit-testable as pure
  Bun-free logic.

### Tests

- Added `applyBlockTextMark` coverage in
  `tests/vitest/pages/page-document-v2.test.ts`: different color over the same
  range replaces (length 1, not empty); same color toggles off; bold toggles;
  a different-type mark on the same range is retained.

## Validation

- `bun --cwd core lint` — pass.
- `bun --cwd core lint:types` — pass.
- `bunx vitest run` — `page-document-v2` 48/48 (incl. the new case), plus
  `page-authoring-canvas` / `page-renderer-v2` / `page-editor-control-registry` /
  `page-editor-xss-guards` 86/86.
- Live smoke (`coderso-dev-core-host` restarted + `playwright-cli`, real input):
  color a fragment, re-color with a different swatch in one click → replaces;
  same swatch twice → clears. No page saved or published.

## Notes

- Part of TASK-476 (inline mark UX corrections). The remaining child TASK-476-02
  (live in-edit mark feedback — applied marks are still painted only after edit
  exits) stays **To Do**; the TASK-476 parent remains In Progress until it lands.
