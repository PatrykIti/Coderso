# TASK-283-04: Section Presets Variant Guidance and Width Copy

# FileName: TASK-283-04_Section_Presets_Variant_Guidance_and_Width_Copy.md

**Priority:** Medium
**Category:** Widgets + Section + Admin UI + Workflow
**Estimated Effort:** Large
**Dependencies:** TASK-256-05-01, TASK-283, TASK-283-01, TASK-283-03
**Status:** To Do

---

## Overview

Add Section-only presets and clearer editor guidance for variants, width labels,
and gradient behavior after TASK-256 repairs the existing width/bleed
truthfulness baseline.

This leaf covers report findings W1, U3, U4, and U6. It may add guided bleed or
fullscreen presets, but it must not restage the TASK-256 fix for current
`content`/`wide` duplicate CSS or misleading bleed copy.

## Scope Boundary

In scope:

- beginner-safe Section presets such as `standard content`, `framed panel`,
  `edge-to-edge`, `hero band`, and `two-column region group`;
- friendly width labels that include practical pixel/container hints while
  preserving schema token values;
- consistent Wizard/Visual variant selection UI, preferably reusing the same
  variant card model where space allows;
- guidance that explains gradient overrides background color without adding a
  generic global color-control system;
- optional preset application that updates multiple Section-owned fields
  atomically through `normalizeSectionData`.

Out of scope:

- fixing false current width classes or bleed behavior before TASK-256-05-01;
- global preset/template systems or cross-widget preset stores;
- arbitrary import/export formats.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:60` - W1 presets missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:243` - U3 max-width labels are
  technical Tailwind names.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:244` - U4 gradient/background
  override guidance missing.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:246` - U6 Wizard and Visual variant
  UI mismatch.
- `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md:208-216,373` - bleed behavior is
  confusing, but baseline truthfulness stays in TASK-256.

## Sub-Tasks

- [ ] Define a local `sectionPresetOptions` map in the Section editor owner or a
  small pure helper near the Section widget contract if tests need direct
  coverage.
- [ ] Make preset application update only Section-owned `heading`, `layout`,
  `style`, and `variant` fields that are already supported by completed
  prerequisite leaves.
- [ ] Replace technical max-width labels with friendly labels while preserving
  the persisted token IDs.
- [ ] Align Wizard and Visual variant selection interaction enough that the same
  choices communicate the same behavior.
- [ ] Add gradient/background guidance that is editor copy only unless TASK-256
  has landed final clear/default behavior.
- [ ] Add tests for preset payload updates, label rendering, and variant UI
  consistency.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/SectionEditors.tsx` | Add presets, friendlier labels, consistent variant UI, and gradient guidance. |
| `core/widgets/core/section.tsx` | Add shared pure preset data only if runtime/default tests need owner-level access; otherwise leave runtime untouched. |
| `tests/vitest/ui/section-editor-wave.test.tsx` | Add editor tests for preset application, width labels, gradient guidance, and Wizard/Visual variant consistency. |
| `tests/vitest/widgets/section.test.tsx` | Add only if presets move into pure widget-owner helpers. |

## Implementation Pseudocode

Preset data:

```ts
type SectionPresetId = "standard" | "framed" | "bleed" | "hero" | "regionGrid";

const sectionPresetOptions: Array<{
  id: SectionPresetId;
  label: string;
  description: string;
  variant: SectionVariantId;
  patch: Partial<SectionData>;
}> = [
  {
    id: "hero",
    label: "Hero band",
    description: "Tall section with centered heading and generous spacing.",
    variant: "bleed",
    patch: { layout: { minHeight: "hero", containerWidth: "full", maxWidth: "none" } },
  },
];
```

Preset application:

```ts
function applySectionPreset(current: SectionData, preset: SectionPresetOption): SectionData {
  return normalizeSectionData(mergeSectionPresetPatch(current, preset.patch));
}
```

Error handling:

- Presets must preserve existing child slot content and region IDs.
- Presets should not erase existing heading copy unless the user explicitly
  chooses a reset-style action in a later task.
- If a preset needs a field from another TASK-283 leaf that is not yet landed,
  hide or defer that preset until the dependency is complete.

## Security Contract

No API routes are added.

- Endpoint visibility/auth/RBAC/CSRF/rate-limit: unchanged.
- Reject-unknown validation: presets can only write fields already accepted by
  `sectionSchema`.
- Anti-abuse: no preset imports, raw JSON paste, arbitrary CSS, HTML, scripts,
  or user-supplied class names in this leaf.
- Secret handling: no secrets in presets, diagnostics, or docs.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/section-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/section.test.tsx` if pure preset
  helpers move into the widget owner.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run precommit`

## Documentation Updates Required

- Update `_docs/_WIDGETS/SECTION.md` with preset behavior and width label copy.
- Update `_docs/PLAYWRIGHT/REPORT_SECTION_WIDGET.md` rows W1, U3, U4, and U6
  after validation.

## Acceptance Criteria

- Section presets are local, bounded, and preserve existing slot content.
- Width labels are understandable without changing persisted token values.
- Wizard and Visual variant choices communicate the same product behavior.
- Tests cover preset updates and editor copy/label expectations.
