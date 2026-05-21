# TASK-283-06: Section Responsive Spacing and Mobile Density

# FileName: TASK-283-06_Section_Responsive_Spacing_and_Mobile_Density.md

**Priority:** Medium
**Category:** Widgets + Section + Responsive Layout + Runtime Render + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-283, TASK-283-01
**Status:** To Do

---

## Overview

Add Section-owned responsive spacing controls so mobile and desktop padding can
be tuned without raw CSS.

This leaf covers report finding W6. It builds on TASK-283-01 so responsive
spacing uses the same bounded layout token model as base Section spacing.
Optional density affordances in the editor must stay as padding-only presets
over the same fields and must not create a second gap contract.

## Scope Boundary

In scope:

- mobile/desktop overrides for vertical and horizontal Section padding using
  bounded tokens;
- optional mobile density presets that only prefill the responsive padding
  fields defined in this leaf;
- deterministic fallback when no responsive override is set;
- editor controls that keep base spacing and responsive overrides readable.

Out of scope:

- arbitrary breakpoint configuration;
- per-device raw CSS or Tailwind class entry;
- global responsive editor shell changes;
- responsive `headingGap` or `regionGap` ownership, which stays in TASK-283-01;
- changing the shared preview-device switcher.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:70` - W6 responsive padding missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:292-300` - current mobile test shows
  fixed `px-6` behavior.

## Sub-Tasks

- [ ] Extend `SectionData.layout` with a small responsive spacing model such as
  `mobilePaddingBlock`, `mobilePaddingInline`, `desktopPaddingBlock`, and
  `desktopPaddingInline` or an equivalent explicit token object.
- [ ] Keep current `paddingBlock` and `paddingInline` as the base/default fields
  for backward compatibility.
- [ ] Render responsive classes through class maps only.
- [ ] Add Visual controls that expose responsive overrides without requiring
  users to manage raw breakpoints.
- [ ] If density presets are exposed in the editor, keep them as pure macros
  over the same responsive padding fields instead of adding responsive gap data.
- [ ] Add tests for default fixed spacing, mobile override classes, desktop
  override classes, and editor updates.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/section.tsx` | Extend layout schema/types/defaults/normalizer and render responsive padding classes. |
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add Visual controls for responsive spacing overrides and optional padding-only density presets. |
| `tests/vitest/widgets/section.test.tsx` | Add SSR assertions for legacy defaults and responsive class output. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor interaction coverage for responsive spacing controls. |
| `tests/unit/widgets/validator.test.ts` | Run and update when schema/defaults change. |

## Implementation Pseudocode

Responsive model:

```ts
type SectionResponsiveSpacing = {
  mobilePaddingBlock?: SectionPaddingBlock;
  mobilePaddingInline?: SectionPaddingInline;
  desktopPaddingBlock?: SectionPaddingBlock;
  desktopPaddingInline?: SectionPaddingInline;
};

const mobileDensityPresetMap = {
  compact: { mobilePaddingBlock: "sm", mobilePaddingInline: "sm" },
  balanced: { mobilePaddingBlock: "md", mobilePaddingInline: "md" },
  airy: { mobilePaddingBlock: "lg", mobilePaddingInline: "md" },
} as const;
```

Renderer flow:

```ts
function resolveSectionPaddingClasses(layout: SectionLayoutData): string {
  return joinClasses(
    paddingBlockClassMap[layout.paddingBlock],
    paddingInlineClassMap[layout.paddingInline],
    layout.responsive?.mobilePaddingBlock
      ? mobilePaddingBlockClassMap[layout.responsive.mobilePaddingBlock]
      : undefined,
    layout.responsive?.desktopPaddingBlock
      ? desktopPaddingBlockClassMap[layout.responsive.desktopPaddingBlock]
      : undefined
  );
}
```

Error handling:

- Unknown responsive tokens normalize to undefined so base spacing remains in
  effect.
- Responsive overrides must not remove base spacing classes unless an explicit
  token says `none`.
- Mobile density presets must write only the responsive padding fields defined
  in this leaf and must not fork `headingGap` or `regionGap` ownership away
  from TASK-283-01.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: responsive fields must be schema-bound with
  `additionalProperties: false`.
- Anti-abuse: no raw breakpoints, arbitrary class names, custom CSS strings, or
  scripts.
- Secret handling: no secrets in responsive layout data or diagnostics.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun test tests/unit/widgets/validator.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso`
- `bun run scan:security:strict`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with responsive spacing fields and fallback
  behavior.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` row W6 after validation.

## Acceptance Criteria

- Section can use mobile/desktop padding overrides without raw CSS.
- Legacy Section blocks keep current spacing when no responsive fields exist.
- Any density presets resolve to the same responsive padding fields instead of
  creating a second responsive gap contract.
- Responsive spacing controls are clear in Visual and covered by widget/editor
  tests.
