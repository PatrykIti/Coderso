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

- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:95,161` covers
  split-layout variant/data ratio desync.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:121-125` is routed to
  TASK-256-02 for shared `none`/zero token semantics; this leaf may only consume
  that final shared helper if variant controls need the resolved token state.
- `_docs/PLAYWRIGHT/REPORT_SPLIT_LAYOUT_WIDGET.md:133,153,174-182,202,209-214`
  is routed out of this shared leaf: mobile/reverse product behavior belongs to
  TASK-285-01, pane-slot guidance and Split Layout empty-state copy belong to
  TASK-285-03 after TASK-256-03 lands the render-context gate, and Split Layout
  Advanced diagnostics belong to TASK-285-04.
- `_docs/PLAYWRIGHT/REPORT_STACK_WIDGET.md:111-165,219-225` covers
  variant/data direction desync, duplicate zero tokens, Wizard mobile direction,
  Advanced variant drift, and the matching critical/high-priority summary rows.

## Sub-Tasks

- [ ] Make split-layout variant changes emit an atomic variant+ratio data patch.
- [ ] Make stack variant changes emit an atomic variant+direction data patch.
- [ ] Preserve legacy ratio/direction fields that are not active, but do not
  show them as active controls for the wrong variant.
- [ ] Consume TASK-256-02 token helpers only where this leaf must avoid
  contradictory variant-adjacent token state; do not add Split Layout gap-label
  product copy here.
- [ ] Leave Split Layout `keep` mobile-ratio communication and
  `Reverse on mobile` product guidance to TASK-285-01.
- [ ] Leave Split Layout pane-slot copy to TASK-285-03 and shared public
  placeholder gating to TASK-256-03.

## Files to Change

| File | Lines | Required change |
|---|---:|---|
| `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx` | variant and ratio controls | Emit atomic variant+data patches through the shared TASK-256-01 path; do not own mobile/reverse copy, Split Layout gap labels, pane-slot guidance, or Advanced diagnostics here. |
| `core/widgets/core/splitLayout.tsx` | normalizer/default helpers only if needed | Reuse owner normalization for variant ratio defaults; do not implement public placeholder gating or mobile product behavior in this leaf. |
| `core/admin/ui/widgets/editors/StackEditors.tsx` | variant, direction, Wizard/Advanced sections | Emit atomic variant+data patches and make mobile direction controls truthful. |
| `core/widgets/core/stack.tsx` | renderer data resolution | Keep rendered direction deterministic and aligned with normalized data. |
| `tests/vitest/ui/split-layout-editor-wave.test.tsx` | existing suite | Add variant/ratio atomic-update regressions only. |
| `tests/vitest/widgets/splitLayout.test.tsx` | existing suite | Add ratio/default helper assertions only if owner helpers change. |
| `tests/vitest/ui/stack-editor-wave.test.tsx` | existing suite | Add variant/direction and Advanced ownership assertions. |
| `tests/vitest/widgets/stack.test.tsx` | existing suite | Add direction/default helper assertions only if owner helpers change. |

## Implementation Pseudocode

```tsx
function handleSplitVariantChange(nextVariant: SplitLayoutVariantId) {
  const current = normalizeSplitLayoutData(value, variant);
  const nextData = normalizeSplitLayoutData(
    {
      ...current,
      ratio: {
        ...current.ratio,
        desktop: nextVariant,
        tablet: nextVariant,
      },
    },
    nextVariant
  );
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
- Split Layout mobile/reverse, pane-slot copy, and Advanced diagnostics are
  intentionally left to TASK-285 leaves after this shared variant patch exists.

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
- Run `bun run gates:coderso` for the completed implementation leaf.
- Run `bun run scan:security:strict`.
- Run `bun run precommit` before any manual commit or task closure commit.

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

- Split-layout variant changes cannot leave stale desktop/tablet ratio data
  visible as active.
- Stack variant changes cannot leave stale direction data visible as active.
- Duplicate zero/off token choices are resolved by TASK-256-02 and consumed here
  only if they affect variant-adjacent state.
- Public slot placeholder safety is resolved by TASK-256-03; Split Layout
  product copy is resolved by TASK-285-03.
