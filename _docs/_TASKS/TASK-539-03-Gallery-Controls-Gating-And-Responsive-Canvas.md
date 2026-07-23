# TASK-539-03: Gallery Controls, Gating, and Responsive Canvas

# FileName: TASK-539-03-Gallery-Controls-Gating-And-Responsive-Canvas.md

**Parent Task:** TASK-539
**Priority:** High
**Category:** Pages / Admin Editor / Responsive UX
**Estimated Effort:** Large
**Dependencies:** TASK-539-01, TASK-539-02; TASK-478/TASK-481 collision boundary resolved
**Status:** ⏳ To Do
**Changelog:** 1251 (pinned; create only at TASK-539 closure)

---

## Goal

Give the editor one shared, Bun-free answer for the real section-grid placement
target, expose canonical gallery controls, hide unreachable controls, and preserve
usable Page canvas width on narrow viewports.

## Leaves and strict land order

| Order | Leaf | Sole responsibility | Status |
|---|---|---|---|
| 1 | TASK-539-03-L05 | Shared grid-placement contract and focused proof | ⏳ To Do |
| 2 | TASK-539-03-L01 | Registry/UI-model vocabulary, gates, z clamp, and cohesive registry/test split | ⏳ To Do |
| 3 | TASK-539-03-L02 | Media URL, gallery-item, and gallery-category controls | ⏳ To Do |
| 4 | TASK-539-03-L03 | PageEditor wiring, cohesive editor/test split, and Page-local responsive clearance | ⏳ To Do |
| 5 | TASK-539-03-L04 | Additive TASK-539 editor proof suites only | ⏳ To Do |

Land exactly `L05 → L01 → L02 → L03 → L04`. L05 is the sole writer of the
placement module; editor, renderer, and responsive CSS are consumers only.

## Collision and ownership contract

Read the landed TASK-478/TASK-481 editor state before implementation. This subtask
must not edit `core/admin/ui/shared/CanvasEditor.tsx`, any Custom Screen file,
`core/admin/ui/pages/editor/PageAuthoringCanvas.tsx`, renderer/runtime/model/
sanitizer source, foreign tests, task indexes, or changelogs.

The grounded pre-task oversize seams are
`pageEditorControlRegistry.ts` (1,813 lines),
`page-editor-control-registry.test.ts` (1,893),
`PageEditor.tsx` (5,204), and `page-editor-v2-flow.test.tsx` (6,813).
Their owning leaves must split them by cohesive responsibility and retain explicit
stable facades; every resulting human-authored source/test file must be at most
1,000 physical lines.

## Security Contract

No route changes. Values still cross the existing internal Page write boundary with
session-cookie authentication, Page RBAC, CSRF protection, the `admin_write`
rate-limit bucket, strict reject-unknown validation, and the TASK-539-01 normalizer.
There is no API-key mode on this route. Controls never persist media IDs, privileged
records, secrets, or localStorage state. Visibility and placement helpers are UX only
and cannot replace server validation. No public write, nonce/HMAC, or captcha change
applies.

## Acceptance

- Gallery items and category tokens use dedicated canonical controls, never
  `ListItemsControl`.
- Base-only controls resolve conditions, displayed values, auxiliary inputs,
  defaults, shell state, override badges/resets, commits, and writes from the base
  target/device. Responsive controls resolve those same concerns from the effective
  active-device target/device. One `controlDevice =
  control.responsive ? activeDevice : "desktop"` decision owns both section and
  block control behavior; a base-only control never exposes a responsive-reset
  affordance.
- All four gallery props (`items`, `layout`, `filterable`, `filterCategories`) and
  all five divider props (`tone`, `thickness`, `gradient`, `width`, `align`) are
  base-only because the public responsive prop contract supports only heading/text
  alignment. Editing any of them while tablet/mobile is active updates the base
  document without creating or changing a responsive key, including when a legacy
  tablet/mobile override already exists.
- The media control is keyed/scoped by collision-safe tuple encoding of target kind
  + target ID + control ID. Gallery rows derive a second tuple scope from that parent
  plus an immutable non-index row identity, so target replacement, row removal, and
  remount cannot redirect a pending request even when URLs match.
- Gallery rows import and obey every model-owner limit: at most 120 rows,
  `PAGE_GALLERY_SRC_MAX=2,048`, 500-character alt, 2,000-character caption, and
  the category token/count/combined-string bounds. The gallery media control
  accepts a selected `MediaRecord.url` of exactly 2,048 characters and rejects
  2,049 without emitting or changing the row. Existing over-limit display values
  are never silently truncated during render and remain explicitly clearable.
- Divider, parallax, gallery-filter, and span controls appear only when reachable.
- Block registry behavior has one target/path: selected path, otherwise
  `[{index:0}]` when a first root exists. Fields, span placement, media scope, reset,
  and mutation all use that same pair; stale/empty targets fail closed.
- Placement classification uses all root blocks in Admin and exactly the public
  renderer's visible-root set in front/responsive CSS.
- Layer z imports the model-owned `PAGE_LAYER_Z_CLAMP` (`0..20`).
- An open inspector adds no rail reservation at 320/390/480px (normal `p-6` padding
  remains) and uses both `sm:pr-[300px]` and `lg:pr-[300px]` to reserve exactly
  300px from the `sm` breakpoint (`640px`) through `lg` and above despite the
  retained `lg:p-8`; closing it restores normal `p-6 lg:p-8` padding.
- Vitest proves the editor class/state/cascade contract; TASK-539-08 Playwright proves
  actual browser-computed padding and narrow overlay/close/reopen behavior.
- All split sources/tests remain independently runnable and at most 1,000 lines.

## Aggregate targeted validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bun run test:vitest -- \
  tests/vitest/pages/page-block-grid-placement.test.ts \
  tests/vitest/pages/page-editor-control-registry.test.ts \
  tests/vitest/pages/page-editor-control-registry-capabilities.test.ts \
  tests/vitest/pages/page-editor-control-registry-effects.test.ts \
  tests/vitest/pages/page-editor-control-registry-responsive.test.ts \
  tests/vitest/pages/page-editor-control-ui-model.test.ts \
  tests/vitest/ui/page-editor-media-url-control.test.tsx \
  tests/vitest/ui/page-editor-gallery-items-control.test.tsx \
  tests/vitest/ui/page-editor-gallery-category-tokens-control.test.tsx \
  tests/vitest/ui/page-editor-v2-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-authoring-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-controls-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-inline-edit-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-responsive-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-layout-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-persistence-flow.test.tsx \
  tests/vitest/ui/page-editor-v2-settings-flow.test.tsx \
  tests/vitest/pages/task-539-page-editor-controls.test.ts \
  tests/vitest/ui/task-539-page-editor-flow.test.tsx
bun --cwd core build:admin
bun run check:admin-boundary
bun run check:admin-bundle
node _docs/_workflows/task-539-implement.mjs --check-task-family-line-limit
git diff --check
```

Rerun any named failure once in isolation before classification.
