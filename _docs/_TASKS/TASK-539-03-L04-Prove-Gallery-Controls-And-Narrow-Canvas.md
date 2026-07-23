# TASK-539-03-L04: Prove Gallery Controls and Narrow Canvas

# FileName: TASK-539-03-L04-Prove-Gallery-Controls-And-Narrow-Canvas.md

**Parent Subtask:** TASK-539-03
**Priority:** High
**Category:** Pages / Vitest / Admin UX Proof
**Estimated Effort:** Medium
**Dependencies:** TASK-539-03-L01, TASK-539-03-L02, TASK-539-03-L03
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Test ownership

Own only:

- additive cross-file cases in
  `tests/vitest/pages/page-editor-control-registry.test.ts`,
  `tests/vitest/pages/page-editor-control-ui-model.test.ts`, and
  `tests/vitest/ui/page-editor-v2-flow.test.tsx`

`tests/vitest/ui/page-editor-gallery-items-control.test.tsx` already exists and is owned
by TASK-539-03-L02; run it read-only here. Do not re-baseline any source-owner assertion
that passed in L01-L03.

## Implementation Pseudocode

### Test Shape

- Registry contains one gallery-items control and imports exact
  `PAGE_LAYER_Z_CLAMP` 0..20; remove the stale test expectation of 40.
- Pure conditions show/hide filter categories, parallax intensity, and divider
  width/alignment from effective sibling values, including tablet/mobile overrides.
- Unknown input kinds still resolve to unsupported and malformed conditions fail
  closed without throwing.
- Gallery add/edit/remove emits only `PageGalleryItemV2`; image selection resolves to
  URL, never asset ID; late request results cannot overwrite a newer selection.
- Alt/caption/category controls have deterministic accessible names. Mounting with an
  unmatched external URL or legacy category performs no implicit `onChange`.
- PageEditor renders the dedicated control and no longer uses ListItemsControl for
  gallery items.
- At simulated 320/390/480 widths, an open inspector does not apply 300px inline/right
  clearance; desktop retains it. Inspector remains closable and Page dirty state is
  unchanged.
- Span controls are hidden only in unsupported placement contexts and remain present
  for actual grid-item targets.

Do not merely assert class-string presence for the runtime smoke handoff: include a
small DOM geometry fixture where feasible, while TASK-539-08 owns real browser bounds.

## Validation

```bash
bun run test:vitest -- tests/vitest/pages/page-editor-control-registry.test.ts tests/vitest/pages/page-editor-control-ui-model.test.ts tests/vitest/ui/page-editor-gallery-items-control.test.tsx tests/vitest/ui/page-editor-v2-flow.test.tsx
bun --cwd core lint:types
bun --cwd core lint
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
git diff --check
```

Rerun each named failing file alone before classifying the failure.
