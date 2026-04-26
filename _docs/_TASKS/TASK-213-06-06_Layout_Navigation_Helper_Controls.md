# TASK-213-06-06: Layout Navigation Helper Controls
# FileName: TASK-213-06-06_Layout_Navigation_Helper_Controls.md

**Priority:** Medium
**Category:** Layout/Navigation Widgets + Admin/UI + Wizard UX
**Estimated Effort:** Medium
**Dependencies:** TASK-213-06, TASK-213-05-02
**Status:** To Do

---

## Overview

Fix the helper-control gaps for Split Layout, Stack, Toggle Block, Navigation,
and Footer from the per-widget audit.

Business outcome: editors understand wrapper/slot widgets and navigation/social
settings from the Wizard without needing Advanced just to identify what a slot,
links source, default toggle pane, or social row means.

Technical contract: keep these as bounded helper/control upgrades over existing
widget schemas. Do not add fake labels that are not persisted/rendered. Dynamic
social/link controls must use schema-owned arrays and deterministic add/remove
limits.

## Sub-Tasks

No child task files.

## Files to Change

- `core/admin/ui/widgets/editors/SplitLayoutEditors.tsx`
- `core/admin/ui/widgets/editors/StackEditors.tsx`
- `core/admin/ui/widgets/editors/ToggleBlockEditors.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- `core/admin/ui/widgets/editors/FooterEditors.tsx`
- `core/widgets/core/splitLayout.tsx`
- `core/widgets/core/stack.tsx`
- `core/widgets/core/toggleBlock.tsx`
- `core/widgets/core/navigation.tsx`
- `core/widgets/core/footer.tsx`
- `tests/vitest/widgets/splitLayout.test.tsx`
- `tests/vitest/widgets/stack.test.tsx`
- `tests/vitest/widgets/toggleBlock.test.tsx`
- `tests/vitest/widgets/navigation.test.tsx`
- `tests/vitest/widgets/footer.test.tsx`
- `tests/vitest/ui/split-layout-editor-wave.test.tsx`
- `tests/vitest/ui/stack-editor-wave.test.tsx`
- `tests/vitest/ui/toggle-block-editor-wave.test.tsx`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `tests/vitest/ui/footer-editor-wave.test.tsx`

## Implementation Direction

Split Layout / Stack helper copy:

```tsx
<Input label="Left slot label" value={slotLabels.left} onChange={setLeftLabel} />
<Input label="Right slot label" value={slotLabels.right} onChange={setRightLabel} />
<p className="text-xs text-muted-foreground">
  Slot labels help editors identify nested content; layout spacing stays in Visual.
</p>
```

Toggle Block default state:

```tsx
<Select label="Default visible pane" value={normalized.defaultPane} onValueChange={setDefaultPane}>
  <SelectItem value="primary">Primary</SelectItem>
  <SelectItem value="secondary">Secondary</SelectItem>
</Select>
```

Navigation links-source helper:

```tsx
<Select label="Links source" value={normalized.linksSource} onValueChange={setLinksSource} />
<p className="text-xs text-muted-foreground">
  Manual links use the rows below. Menu source reads from saved Menus.
</p>
```

Footer social controls:

```tsx
<RepeatableSocialLinks
  value={normalized.socialLinks}
  maxItems={8}
  onAdd={addSocialLink}
  onRemove={removeSocialLink}
/>
```

If a helper label is purely editor-only, keep it in editor metadata/help copy.
If it renders publicly or affects runtime structure, add it to the widget owner
schema/defaults/normalizer first.

## Security Contract

- Visibility: internal admin editor; normalized widget output may render
  publicly.
- Auth/RBAC/CSRF/rate-limit: unchanged page/template editor contracts.
- Reject-unknown validation:
  - any new slot/social/default-state fields must be schema-owned and
    normalized before UI exposure.
- Anti-abuse:
  - link/social URLs must use existing safe URL handling;
  - dynamic add/remove controls must clamp item counts and preserve stable ids;
  - helper copy must not expose private route/menu internals.

## Testing Requirements

- Widget tests:
  - Split Layout/Stack helper fields normalize or remain editor-only by
    contract;
  - Toggle Block default pane renders deterministically;
  - Navigation links-source helper does not change source semantics;
  - Footer social add/remove stays bounded and uses accessible labels.
- UI editor tests:
  - paired link/social inputs have per-field labels;
  - add/remove controls preserve row identity and focusable labels.
- Manual Playwright:
  - add each widget, inspect helper copy/control behavior, save/reopen, and
    verify runtime output when fields affect rendering.

## Documentation Updates Required

- `_docs/PLAYWRIGHT/SUMMARY-WIDGETS.md`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/SPLIT_LAYOUT.md`
- `_docs/_WIDGETS/STACK.md`
- `_docs/_WIDGETS/README.md` for Toggle Block index coverage because no
  dedicated Toggle Block widget doc exists in the current checkout
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/FOOTER.md`

## Acceptance Criteria

1. Wrapper/layout widgets provide clear slot/default-state guidance.
2. Navigation and Footer controls have accessible, bounded link/social editing.
3. Schema-owned runtime fields are normalized and tested before UI exposure.
