# TASK-244: Widget Visual Surface Clear Controls

# FileName: TASK-244_Widget_Visual_Surface_Clear_Controls.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Very Large
**Dependencies:** TASK-242
**Status:** To Do

---

## Overview

Add a consistent `Clear` control for widget visual surface fields that currently
force a background, gradient, overlay, surface, framed shell, or color treatment
without a product-facing way to remove it.

This is the follow-up to TASK-242. TASK-242 added `None` for token/select-style
controls such as spacing, width, radius, and typography. TASK-244 is different:
color and background fields should use `Clear`, because the user is clearing a
concrete style value rather than selecting a token named `none`.

The key product rule is that `Clear` must remove the style from the saved widget
configuration and from the rendered output. Do not save `"transparent"` as the
off state only to work around renderer defaults. `transparent` is still a valid
manual color value if a user deliberately types it, but the clear action itself
must not pin transparent into page/widget payloads.

Target every rendered widget with the real problem, not only Hero:

- Hero background gradient/color/media overlay.
- Custom screen widgets with hard-coded card/frame surfaces.
- Booking, listing, search, and commerce widgets with hard-coded framed shells.
- Composite/content/form widgets with forced card surfaces, overlays, or
  backgrounds.
- Global shell widgets where CTA/surface color fields have no clear affordance.

## Scope Policy

Target only visual surface problems in rendered widget output and their admin
editor controls.

In scope:

- background color;
- background gradient;
- media/image overlay;
- card/panel/frame/shell surface;
- caption overlay;
- highlighted/active surface color when it is a visual background;
- CTA/button background where the widget exposes the color as user-editable
  widget style.

Out of scope:

- admin-only chrome such as widget library cards, drawers, skeletons, and
  preview thumbnails;
- empty-state, warning, validation, and destructive/success message colors
  unless they are configurable widget style surfaces;
- spacing, size, radius, width, typography, and other token work already owned
  by TASK-242;
- structural choices such as variant, source, alignment, columns, ratios, and
  content modes;
- `section` runtime gradient behavior, which already omits the gradient when
  both gradient endpoints are empty. Section background-color clear semantics
  are in scope through TASK-244-02-03.

## Clear Semantics

Use `Clear` for color/background/overlay controls. Use `None` only for token
selects that represent a discrete off option, as implemented by TASK-242.

`Clear` is not a serialized token:

- the editor removes the corresponding property from `style`, `background`, or
  the owning nested object;
- the route/admin save payload does not contain `"transparent"` solely as an
  off sentinel;
- normalizers preserve the cleared/absent state for clear-capable fields;
- renderers omit the corresponding inline style/class entirely;
- tests assert absence of `background`, `backgroundColor`, `backgroundImage`,
  or overlay DOM where that is the contract.

If a widget currently relies on missing data to apply a visible default, the
implementer must audit actual persisted widget data before changing runtime
fallbacks. Prefer creation-time explicit defaults for new widgets and
backward-compatible legacy adapters for old saved data over storing transparent
sentinels.

Implementation must extend the existing widget contract in place. That means:

- update the owning widget type, schema, defaults, normalizer, renderer, editor,
  tests, and docs together;
- preserve strict reject-unknown schema behavior when adding `style` fields;
- reuse existing editor sections/helpers where they fit;
- do not add a second widget variant, route, save flow, or editor mode only to
  make `Clear` easier to implement.

## Current Inventory

Initial scan on 2026-04-30 found these real problem groups. Refresh line
references in TASK-244-01-01 before implementation.

| Group | Widgets | Problem |
|---|---|---|
| Hero and shared color controls | `hero`; shared color/gradient field helpers; `section` background clear plus no-regression | Hero gradient editor cannot clear `background.gradient`; Hero background color and media overlays lack a first-class clear affordance; Section background color currently falls back to transparent output instead of omission |
| Custom screen widgets | `screen-record-header`, `screen-field-value`, `screen-field-group`, `screen-two-column` | hard-coded `bg-gradient-*`, `bg-background/*`, and `bg-muted/*` frame surfaces with no style contract |
| Booking/listing/search widgets | `booking-calendar`, `appointment-form`, `listing-filters`, `search-box` | hard-coded framed shells and button backgrounds with no clearable widget surface model |
| Commerce widgets | `product-gallery`, `product-table`, `product-compare` | cards, tables, headers, and empty states force `bg-[var(--color-bg)]` surfaces without clear controls |
| Composite/content widgets | `grid-columns`, `gallery-mosaic`, `feature-grid`, `faq-accordion`, `pricing-plans`, `testimonials`, `team`, `stats-kpi`, `content-list`, `posts-feed`, `entry-teaser`, `cta-banner`, `logo-cloud`, `rich-text-section`, `timeline`, `compare-timeline` | column/card/panel/surface/overlay backgrounds are editable only as raw values or are forced in runtime |
| Form and global shell widgets | `contact`, `newsletter`, `form-embed`, `navigation`, `footer` | section/surface/CTA/button backgrounds need clear affordances and output omission semantics |
| Primitive panel widgets | `accordion`, `tabs`, `toggle-block` | active/panel/surface backgrounds are forced by style defaults without a consistent clear contract |

## Sub-Tasks

- [ ] TASK-244-01: Widget Surface Inventory and Clear Semantics
- [ ] TASK-244-02: Hero, Shared Color Fields, and Background Clear Controls
- [ ] TASK-244-03: Custom Screen and Operational Widget Surface Clear
- [ ] TASK-244-04: Composite, Content, Form, and Shell Widget Surface Clear
- [ ] TASK-244-05: Validation, Docs, Changelog, and Board Closure

## Files to Change

Runtime widget contracts and renderers:

- `core/widgets/core/*.tsx`
- shared widget helpers only if they remove real duplication and keep ownership
  clear

Admin widget editors:

- `core/admin/ui/widgets/editors/*.tsx`

Tests:

- `tests/vitest/widgets/*.test.tsx`
- `tests/vitest/ui/*editor-wave.test.tsx`
- existing `tests/unit/widgets/*.test.tsx` only where the current widget surface
  already uses a Bun-owned suite

Docs and board:

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/*.md`
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md`
- new changelog entry on closure

## Security Contract

- Visibility:
  - admin editor controls are internal admin UI;
  - rendered widget output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced;
  - widget edits keep the existing authenticated admin page/template save flow.
  - existing admin writes remain session-authenticated; API-key scope is not
    applicable because TASK-244 does not introduce an internal API-key mode.
- RBAC:
  - unchanged existing page/template/widget-template write permissions.
- CSRF:
  - unchanged existing admin save calls and CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - widget schemas must continue rejecting unknown fields;
  - clear-capable fields must accept absence/omission without reintroducing
    forced style output.
- Anti-abuse:
  - no public write surface is added;
  - nonce, signature/HMAC, and reCAPTCHA are not applicable because no public
    write endpoint is added.
  - renderers must not emit raw invalid class names from user-controlled color
    values;
  - user-provided style values stay inline-style values or validated tokens,
    not interpolated Tailwind class fragments.
- Compatibility:
  - existing saved widgets must keep their intended visual output unless a leaf
    documents a specific safe migration;
  - `Clear` must not be implemented by storing `"transparent"` as a fake off
    value.

## Implementation Order

1. Refresh the inventory from live code and classify every rendered widget
   surface as `clear-required`, `already-clearable`, `intentional-state`, or
   `exclude-admin-only`.
2. Add the clear semantics helper/model and update Hero first, because it is the
   visible regression source.
3. Add clearable frame/surface contracts to custom screen and operational
   widgets.
4. Add clear controls to composite, content, form, shell, and primitive panel
   widgets.
5. Update focused runtime/editor tests, docs, changelog, and board status.

## Implementation Pseudocode

Use a clearable style helper instead of transparent sentinels.

```ts
function resolveClearableStyleValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? value : undefined;
}

function omitUndefinedStyle<T extends Record<string, string | undefined>>(style: T): T | undefined {
  const entries = Object.entries(style).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) as T : undefined;
}

const backgroundColor = resolveClearableStyleValue(data.style?.surfaceColor);
const surfaceStyle = omitUndefinedStyle({ backgroundColor });
```

Editor clear actions must remove the property, not write `"transparent"`.
When a cleared object is also present in widget defaults, keep an empty object
override so the shared shallow default merge cannot re-materialize the cleared
field.

```ts
function clearStyleField<T extends { style?: Record<string, unknown> }>(
  value: T,
  key: string,
  keepEmptyStyleOverride = false
): T {
  const { [key]: _removed, ...nextStyle } = value.style ?? {};
  const style =
    Object.keys(nextStyle).length > 0
      ? nextStyle
      : keepEmptyStyleOverride
        ? {}
        : undefined;
  return {
    ...value,
    style,
  };
}
```

For nested Hero background fields:

```ts
function clearBackgroundField(
  value: HeroData,
  key: keyof NonNullable<HeroData["background"]>
) {
  const { [key]: _removed, ...nextBackground } = value.background ?? {};
  return {
    ...value,
    // Keep an empty object to override heroDefaults.background.
    background: Object.keys(nextBackground).length > 0 ? nextBackground : {},
  };
}
```

If a field must preserve a product default for newly inserted widgets, keep that
default in the widget creation defaults and tests, but do not make the runtime
normalizer reapply it after the editor has cleared the property.

## Testing Requirements

- Focused runtime tests proving cleared fields omit the corresponding style,
  class, or overlay node.
- Focused editor-wave tests proving each affected color/background/overlay field
  exposes `Clear` and that the emitted payload removes the field.
- Schema/normalizer tests for every new or newly-clearable style field proving
  configured values are accepted, cleared omission is preserved, unknown fields
  are rejected, and legacy/default behavior remains intentional.
- Backward-compatibility tests for representative existing/default widget data.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest widget/editor suites for every touched surface
- Bun-owned targeted suites where the current test owner is already under
  `tests/unit/widgets/*`
- `bun run gates:coderso` during final closure
- `git diff --check`

## Documentation Updates Required

- `_docs/WIDGETS.md`
- exact `_docs/_WIDGETS/*.md` files named by the implementation leaf for the
  widget being changed
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/README.md` and matching changelog entry on completion

## Acceptance Criteria

1. Every rendered widget with a forced visual surface has either a clear control
   or an explicit audited exclusion.
2. Color/background/overlay controls use `Clear`, not `None`.
3. `Clear` removes persisted style fields and rendered style output rather than
   storing `"transparent"` as the off state.
4. Existing saved widget data remains backward compatible.
5. Focused editor, runtime, lint, type, docs, and gate validation are recorded.
