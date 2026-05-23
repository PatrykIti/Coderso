# TASK-336-11: Hero Mode Ownership and Legacy Control Migration

# FileName: TASK-336-11_Hero_Mode_Ownership_and_Legacy_Control_Migration.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI
**Estimated Effort:** Large
**Dependencies:** TASK-336-01, TASK-336-02, TASK-336-03
**Status:** To Do

---

## Overview

Migrate Hero to the v2 editor contract and remove legacy control duplication
between Visual and Advanced.

Hero is a P1 widget because it is highly visible and can carry many overlapping
controls: copy, CTA, media, background, overlay, alignment, spacing, and button
style. Advanced must not become a second Hero design panel.

## Ownership Decision

- `Wizard` owns initial Hero variant, headline seed, primary CTA seed, and
  onboarding guidance.
- `Visual` owns headline/subtitle/CTA copy, media, background, overlay, gradient,
  alignment, section surface, buttons, spacing, and daily presentation.
- `Advanced` owns anchor/technical ids, read-only resolved design tokens,
  accessibility diagnostics, media diagnostics, and layout/runtime summaries.

## Sub-Tasks

- [ ] Inventory Hero legacy controls and writable paths.
- [ ] Add or update `hero` `editorContract` metadata.
- [ ] Migrate local `EditorSection`/raw rows to shared primitives.
- [ ] Move all end-user design controls to Visual.
- [ ] Convert Advanced duplicate design controls into read-only summaries.
- [ ] Preserve public Hero rendering and accessibility semantics.
- [ ] Add focused Vitest UI tests.
- [ ] Add Playwright admin and public smoke screenshots.

## Files to Change

| File | Required change |
|---|---|
| `core/widgets/core/hero.tsx` | Add/update `editorContract`; preserve schema/defaults/runtime. |
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Migrate to shared sections/control rows and remove Advanced duplication. |
| `tests/vitest/widgets/hero.test.tsx` | Cover runtime/normalize behavior if touched. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Cover mode ownership, DOM metadata, and Advanced read-only summaries. |
| `_docs/_WIDGETS/HERO.md` | Document final mode ownership. |

## Implementation Pseudocode

```tsx
function HeroVisualEditor(props: WidgetEditorProps<HeroData>) {
  return (
    <WidgetEditorModeRoot mode="visual" widgetType="hero">
      <WidgetEditorSection mode="visual" sectionId="hero-copy" role="content" title="Copy and CTAs">
        <WidgetControlRow path="headline"><HeadlineControl {...props} /></WidgetControlRow>
        <WidgetControlRow path="cta.primary"><PrimaryCtaControl {...props} /></WidgetControlRow>
      </WidgetEditorSection>
      <WidgetEditorSection mode="visual" sectionId="hero-surface" role="visual" title="Surface">
        <HeroSurfaceControls value={props.value.style} onChange={updateStyle} />
      </WidgetEditorSection>
    </WidgetEditorModeRoot>
  );
}
```

Data flow:

- Wizard seeds a usable Hero.
- Visual owns every public-facing and design-facing Hero edit.
- Advanced reads normalized Hero data for diagnostics and technical summaries.
- Public runtime remains schema/default-driven.

Error handling:

- Missing media must show visual guidance, not broken public markup.
- Invalid CTA hrefs must keep existing safe-href behavior.
- Advanced token summaries must not become editable style controls.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate limit: unchanged.
- Reject-unknown validation: preserve strict Hero schema.
- Anti-abuse: no public write changes.
- Secret handling: no secrets in diagnostics or screenshots.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/hero.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/editorContract.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Playwright CLI smoke for `hero` admin modes and public fixture.

Regression-test shape:

- Visual owns CTA/media/background/overlay/button style paths.
- Advanced exposes only technical/read-only Hero summaries.
- Wizard remains setup-focused.
- Existing public Hero accessibility and safe-link behavior stays green.

## Documentation Updates Required

- Update Hero widget docs.
- Update Playwright report rows for Hero P1 closure.
- Keep `_docs/_TASKS/README.md` synchronized when status changes.

## Acceptance Criteria

- Hero no longer has duplicated writable design controls in Advanced.
- Legacy local editor markup is migrated to shared metadata where touched.
- Tests prove the final ownership split.

