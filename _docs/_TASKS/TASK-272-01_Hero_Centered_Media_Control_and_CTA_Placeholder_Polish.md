# TASK-272-01: Hero Centered Media Control and CTA Placeholder Polish

# FileName: TASK-272-01_Hero_Centered_Media_Control_and_CTA_Placeholder_Polish.md

**Priority:** High
**Category:** Widgets + Hero + Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-256-01, TASK-256-02, TASK-272
**Status:** To Do

---

## Overview

Hide Hero inline-media border controls when the selected Hero variant is
`centered`, and align CTA URL helper placeholders with the current Hero defaults
and Wizard presets.

This leaf is intentionally narrow. It does not own shared color-field default
state, gradient activation, safe-link policy, or page-toolbar behavior.

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
| `core/admin/ui/widgets/editors/HeroEditors.tsx` | Gate `hero.style.mediaBorderColor`, `hero.style.mediaBorderWidth`, and `hero.style.mediaRadius` behind `selectedVariant !== "centered"`. Keep card border controls visible for every variant. Align Primary/Secondary CTA URL placeholders in Wizard and Visual mode with defaults or goal-specific examples. |
| `tests/vitest/widgets/heroEditors.test.tsx` | Assert server-rendered Visual editor markup omits inline-media border controls in `centered` and includes them in `split`/`media-left`. |
| `tests/vitest/ui/hero-editor-wave.test.tsx` | Assert the Visual/Wizard CTA URL fields expose consistent placeholders and no centered-only media-border controls. |
| `_docs/_WIDGETS/HERO.md` | Document that inline media frame styling applies only to split/media-left variants. |
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
const primaryCtaUrlPlaceholder = primary.href || heroDefaults.primaryCta?.href || "/signup";
const secondaryCtaUrlPlaceholder = secondary.href || heroDefaults.secondaryCta?.href || "/learn";
```

Error handling:

- Do not delete existing `style.mediaBorder*` values when switching to
  `centered`; hide only the irrelevant controls so switching back preserves
  authored split/media-left styling.
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

## Acceptance Criteria

- Centered Hero no longer shows inline media frame border/radius controls.
- Split and media-left still expose the inline media frame controls and preserve
  existing authored values.
- CTA URL placeholders are consistent between Wizard and Visual mode and do not
  imply a different saved URL.
- TASK-256 shared color/default and safe-link scope is not duplicated.
