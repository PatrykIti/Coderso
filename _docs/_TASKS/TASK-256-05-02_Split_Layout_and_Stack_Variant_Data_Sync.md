# TASK-256-05-02: Split Layout and Stack Variant Data Sync

# FileName: TASK-256-05-02_Split_Layout_and_Stack_Variant_Data_Sync.md

**Priority:** High
**Category:** Widgets + Layout + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-256-03, TASK-256-05
**Status:** To Do

---

## Overview

Repair the shared variant-bound data drift found in `split-layout` and `stack`.
Both reports show controls where the selected variant implies a ratio/direction,
but persisted `data` can disagree with what the renderer shows.

## Drift Evidence

- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:95,121-125,133,153,161`
  covers ratio/data desync, duplicate zero tokens, and mobile ratio/reverse
  behavior.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:174-182,202,209-214` covers
  redundant slot sections, Advanced duplication, `keep` tablet/mobile ratio
  communication, reverse-on-mobile truthfulness, and closure checklist.
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md:111,141,157,163,169-187,220-223`
  covers variant/data direction desync, duplicate zero tokens, Wizard mobile
  direction, and Advanced variant drift.

## Sub-Tasks

- [ ] Make split-layout variant changes emit an atomic variant+ratio data patch.
- [ ] Make stack variant changes emit an atomic variant+direction data patch.
- [ ] Preserve legacy ratio/direction fields that are not active, but do not
  show them as active controls for the wrong variant.
- [ ] Remove duplicate `None`/`0` token choices or normalize them through
  TASK-256-02.
- [ ] Communicate or block split-layout `keep` behavior where tablet ratio
  becomes the mobile ratio and `Reverse on mobile` has no effect.
- [ ] Replace redundant slot instructions with TASK-256-03 editor labels and
  public placeholder gating.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | variant, ratio, mobile behavior, Advanced sections | Emit atomic variant+data patches, hide duplicate zero choices, make `keep` mobile behavior truthful, and make Advanced ownership explicit. |
| `core/widgets/core/splitLayout.tsx` | 247-270 | Gate empty pane placeholders through render context and avoid public editor copy. |
| `core/admin/ui/widgets/editors/StackEditors.tsx` | variant, direction, Wizard/Advanced sections | Emit atomic variant+data patches and make mobile direction controls truthful. |
| `core/widgets/core/stack.tsx` | renderer data resolution | Keep rendered direction deterministic and aligned with normalized data. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | existing suite | Add variant/ratio, `keep` mobile behavior, reverse-on-mobile, and duplicate-token regressions. |
| `tests/vitest/widgets/splitLayout.test.tsx` | existing suite | Add public placeholder, ratio, and mobile-behavior assertions. |
| `tests/vitest/ui/stack-editor-wave.test.tsx` | existing suite | Add variant/direction and Advanced ownership assertions. |
| `tests/vitest/widgets/stack.test.tsx` | existing suite | Add direction and public placeholder assertions. |

## Implementation Pseudocode

```tsx
function handleSplitVariantChange(nextVariant: SplitLayoutVariantId) {
  const nextData = normalizeSplitLayoutData({
    ...value,
    layout: {
      ...value.layout,
      ratio: resolveDefaultRatioForVariant(nextVariant, value.layout?.ratio),
    },
  });
  applyVariantDataPatch(nextVariant, nextData);
}

function handleStackVariantChange(nextVariant: StackVariantId) {
  const nextData = normalizeStackData({
    ...value,
    direction: resolveDirectionForVariant(nextVariant, value.direction),
  });
  applyVariantDataPatch(nextVariant, nextData);
}

function applyVariantDataPatch(nextVariant: string, nextData: Record<string, unknown>) {
  if (onBlockPatch) {
    onBlockPatch((current) => ({
      ...current,
      variant: nextVariant,
      data: nextData,
    }));
    return;
  }

  onVariantChange?.(nextVariant);
  onChange(nextData);
}
```

Error handling:

- Unsupported variants normalize through the widget owner and keep still-valid
  legacy fields.
- Hidden inactive fields stay in data until normalization or explicit editor
  action removes them.
- Public placeholders render `null` unless TASK-256-03 context says preview.

## Git Scope Safeguards

- Run `git status --short --branch` before implementation, before staging, and before closure.
- For non-trivial or parallel leaf work, prefer a dedicated branch or worktree.
- Stage only the owner files listed in this task plus required docs/reports/changelog files.
- Verify `git diff --name-only --cached` before every commit so unrelated report or code edits stay out of scope.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: update validator tests if schemas change.
- Anti-abuse: no public admin instructions, duplicate IDs, or unsafe inline
  scripts in structural renderers.
- Secret handling: no secrets in widget data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/splitLayout.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/stack-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/stack.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts` if schemas/defaults change.
- `bun test tests/unit/widgets/registry.test.ts` if registry/default wiring changes.
- Run `bun --cwd core lint` and `bun --cwd core lint:types`.

## Documentation Updates Required

- Update `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md` and
  `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md`.
- Update `_docs/_WIDGETS/SPLIT_LAYOUT.md` and `_docs/_WIDGETS/STACK.md` when
  behavior changes.
- Update `_docs/WIDGETS.md` only if the shared variant update contract changes.

## Changelog Policy

- This task must not move to `Done` until it is covered by a changelog entry and `_docs/_CHANGELOG/README.md` is updated.
- A leaf may create its own changelog entry, or TASK-256-08 may create the final umbrella changelog entry that explicitly lists this task ID.

## Acceptance Criteria

- Split-layout variant changes cannot leave stale ratio data visible as active.
- Stack variant changes cannot leave stale direction data visible as active.
- Duplicate zero/off token choices are resolved consistently.
- Public runtime does not leak editor slot instructions.
