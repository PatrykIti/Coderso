# TASK-272-01: Hero Centered Media Control and CTA Placeholder Polish

# FileName: TASK-272-01_Hero_Centered_Media_Control_and_CTA_Placeholder_Polish.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-272, TASK-310-02
**Status:** Done (2026-05-19)

---

## Overview

Hide Hero inline-media border controls when the selected Hero variant is
`centered`, keep centered Hero media authoring available for background-media
use cases, and align CTA URL helper placeholders with the current Hero defaults
and Wizard presets.

This leaf is intentionally narrow. It does not own shared color-field
default-state or shared color-control behavior, gradient activation, safe-link
policy, or page-toolbar behavior.

## Source Findings

- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:126-129` - BUG-01 media border
  controls are visible in `centered` even though there is no inline media frame.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:201-202` - UX-08 CTA URL placeholder
  does not match the current field state.
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md:271-284` - priority summary.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Gate `hero.style.mediaBorderColor`, `hero.style.mediaBorderWidth`, and `hero.style.mediaRadius` behind `selectedVariant !== "centered"`. Keep card border controls visible for every variant, keep the inline-media controls visible for every inline-media variant including `media-center`, and keep centered Visual media authoring available so image-background Hero media can still be changed or cleared. Align Primary/Secondary CTA URL placeholders in Wizard and Visual mode with defaults or goal-specific examples. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert server-rendered Visual editor markup omits inline-media border controls in `centered` and includes them in `split`/`media-left`/`media-center`. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Assert the Visual/Wizard CTA URL fields expose consistent placeholders, no centered-only media-border controls, and centered Visual mode still allows media changes/clears for background-media use cases. |
| `_docs/_WIDGETS/HERO.md` | Document that inline media frame styling applies only to split/media-left/media-center variants, while centered still keeps media authoring for background-image behavior. |
| `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md` | Mark BUG-01/UX-08 fixed or record final evidence. |

## Implementation Pseudocode

```tsx
const showsInlineMediaFrameControls = selectedVariant !== "centered";

{showsInlineMediaFrameControls ? (
  <>
    <ColorField id="hero.style.mediaBorderColor" ... />
    <Select value={style.mediaBorderWidth ?? "1"} ... />
    <Select value={style.mediaRadius ?? "2xl"} ... />
  </>
) : null}
```

CTA placeholder policy:

```ts
const heroCtaPlaceholderExamples = {
  primary: "/signup",
  secondary: "/examples",
} as const;

const primaryCtaUrlPlaceholder = heroCtaPlaceholderExamples.primary;
const secondaryCtaUrlPlaceholder = heroCtaPlaceholderExamples.secondary;
```

Error handling:

- Do not delete existing `style.mediaBorder*` values when switching to
  `centered`; hide only the irrelevant controls so switching back preserves
  authored split/media-left styling.
- Do not hide the entire Visual `Media` section in `centered`; authors still
  need a direct way to edit or clear centered background media and remediate
  stale centered video payloads.
- Do not derive placeholder copy from `heroDefaults.primaryCta?.href` /
  `heroDefaults.secondaryCta?.href`, because the live defaults are `#` and do
  not help authors understand expected CTA paths.
- Do not introduce new safe-link validation. Keep `normalizeHeroHref` as the
  owner.
- Do not treat placeholder text as saved data.

## Security Contract

No API routes are added.

- Endpoint visibility: none.
- Auth/RBAC/CSRF/rate-limit: unchanged admin editing and public rendering.
- Reject-unknown validation: unchanged.
- Anti-abuse: no new user-authored HTML, script, URL policy, or class-name input.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/widgets/heroEditors.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/hero-editor-wave.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/_WIDGETS/HERO.md`
- `_docs/PLAYWRIGHT/REPORT_HERO_WIDGET.md`
- `_docs/_TASKS/TASK-272-01_Hero_Centered_Media_Control_and_CTA_Placeholder_Polish.md`
- `_docs/_TASKS/README.md` on status changes

## Final Evidence

- Closed on 2026-05-19 with centered Visual media authoring preserved,
  centered-only inline frame styling hidden, and CTA placeholder copy aligned
  across Wizard and Visual mode.
- Focused proof lives in `tests/vitest/widgets/heroEditors.test.tsx`,
  `tests/vitest/ui/hero-editor-wave.test.tsx`, and TASK-272-09.

## Acceptance Criteria

- Centered Hero no longer shows inline media frame border/radius controls.
- Centered Visual editing still allows authors to edit or clear Hero media for
  background-image use cases.
- Split, media-left, and media-center still expose the inline media frame
  controls and preserve existing authored values.
- CTA URL placeholders are consistent between Wizard and Visual mode and do not
  imply a different saved URL.
- Shared color/default-state, shared color-control, and safe-link scope are not
  duplicated here.
