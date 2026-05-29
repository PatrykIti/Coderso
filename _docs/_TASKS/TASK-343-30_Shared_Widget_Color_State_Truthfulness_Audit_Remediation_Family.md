# TASK-343-30: Shared Widget Color State Truthfulness Audit Remediation Family

# FileName: TASK-343-30_Shared_Widget_Color_State_Truthfulness_Audit_Remediation_Family.md

**Priority:** High
**Category:** Widgets + Shared Color Controls + Admin UI + QA + Docs
**Estimated Effort:** Large
**Dependencies:** TASK-343
**Status:** To Do

---

## Overview

Promote the shared color-state drift repeated across the 28-05 report wave:
theme tokens and pristine defaults are often labeled as saved custom colors,
fallback hex swatches imply concrete colors that are not actually saved, and
`Clear` can mean theme default, transparent, no inline value, or reset depending
on the widget without enough local explanation.

## Drift Evidence

- `_docs/PLAYWRIGHT/28-05-2026/REPORT_CONTENT_LIST_WIDGET.md:202-212`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FEATURE_GRID_WIDGET.md:203-215`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_FORM_EMBED_WIDGET.md:239-254`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_LOGO_CLOUD_WIDGET.md:222-282`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_NAVIGATION_WIDGET.md:318-333`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_SEARCH_BOX_WIDGET.md:284-390`
- `_docs/PLAYWRIGHT/28-05-2026/REPORT_TABS_WIDGET.md:205-215`
- Secondary/shared-only notes from deferred/current-state reports:
  `_docs/PLAYWRIGHT/28-05-2026/REPORT_DIVIDER_WIDGET.md`,
  `_docs/PLAYWRIGHT/28-05-2026/REPORT_GRID_COLUMNS_WIDGET.md`,
  `_docs/PLAYWRIGHT/28-05-2026/REPORT_SECTION_WIDGET.md`, and
  `_docs/PLAYWRIGHT/28-05-2026/REPORT_TESTIMONIALS_WIDGET.md`.

## Sub-Tasks

- [ ] Define one shared color-state vocabulary for `theme token`, `selected
  swatch`, `transparent`, `cleared`, `saved custom`, and `fallback preview`.
- [ ] Update shared color/clearable controls so fallback hex previews never imply
  a user-saved override by themselves.
- [ ] Provide per-widget override copy only where `Clear` intentionally means
  transparent or reset instead of theme default.
- [ ] Add cross-widget regression coverage for at least Content List, Search Box,
  Logo Cloud, Tabs, Navigation, Feature Grid, and Form Embed.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/widgets/editors/ClearableFields.tsx` | Standardize clear/default labels and contextual accessible names. |
| `core/admin/ui/widgets/editors/SharedColorControl.tsx` | Distinguish token, fallback, custom, transparent, and cleared states in the shared color control. |
| Affected widget editors | Adopt the shared vocabulary without duplicating local color logic. |
| `tests/vitest/ui/shared-color-control.test.tsx` | Extend existing shared color-control coverage for token/default/fallback truthfulness. |
| `tests/vitest/ui/clearable-fields.test.tsx` | Extend existing clearable-field coverage for contextual Clear labels and semantics. |
| Optional new cross-widget UI suite | Add only if cross-widget editor integration cannot be covered cleanly in the existing shared-control suites. |

## Implementation Pseudocode

```ts
type WidgetColorState =
  | { kind: "theme_token"; token: string; previewHex: string }
  | { kind: "selected_swatch"; value: string }
  | { kind: "transparent" }
  | { kind: "cleared"; fallback: "theme" | "transparent" | "inherit" }
  | { kind: "saved_custom"; value: string };

function describeSharedColorControlState(value: string | undefined, defaults: ColorDefaults): WidgetColorState {
  if (value === undefined || value === "") return { kind: "cleared", fallback: defaults.fallback };
  if (value === "transparent") return { kind: "transparent" };
  if (value.startsWith("var(") || value.startsWith("color-mix(")) {
    return { kind: "theme_token", token: value, previewHex: defaults.previewHex };
  }
  return isHexColor(value) ? { kind: "selected_swatch", value } : { kind: "saved_custom", value };
}
```

Build this helper on the existing shared-control primitives
`hasClearableFieldValue`, `isHexColorValue`, `resolveColorSwatchValue`, and the
per-widget `treatAsThemeDefaultValues` patterns instead of duplicating local
color parsing in every widget editor.

## Regression Test Shape

- Pristine token defaults are not labeled as saved custom overrides.
- Fallback swatches are described as previews, not stored values.
- `Clear` accessible names include field context and post-clear semantics.
- Widget-local override counters do not count default tokens as user overrides.

## Security Contract

No API routes are added. Do not widen accepted CSS values beyond each widget's
existing schema/normalizer allowlist.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run test:vitest -- tests/vitest/ui/shared-color-control.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/clearable-fields.test.tsx`
- Run the new cross-widget integration suite if one is added.
- Targeted widget tests for each touched widget surface.
- `git diff --check`

## Documentation Updates Required

- Update all affected `_docs/PLAYWRIGHT/28-05-2026/REPORT_*_WIDGET.md` files
  when implementation lands.
- Update affected `_docs/_WIDGETS/*.md` files only where user-facing color
  semantics change.
- Update `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

- Shared widget color controls report token/default/custom/transparent states
  truthfully across the audited widgets.
- Widget override counters and Clear labels stop treating pristine defaults as
  author-saved custom values.
