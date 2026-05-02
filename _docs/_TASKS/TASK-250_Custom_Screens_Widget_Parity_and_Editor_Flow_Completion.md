# TASK-250: Custom Screens Widget Parity and Editor Flow Completion
# FileName: TASK-250_Custom_Screens_Widget_Parity_and_Editor_Flow_Completion.md

**Priority:** High
**Category:** Coderso Custom Screens + Widgets + Admin/UI
**Estimated Effort:** Very Large
**Dependencies:** TASK-249, TASK-220, TASK-242, TASK-244
**Status:** To Do

---

## Overview

TASK-249 cut Custom Screens over to the V3 workspace flow, but the `screen-*`
widget family still lags behind the maturity of the shared widget system used
by public widgets like `Hero`.

The repo already uses one shared widget foundation:

- `WidgetDefinition`,
- shared widget registry and surface filtering,
- shared schema validation,
- shared `WidgetRenderer`,
- shared editor bundle contract (`wizard`, `visual`, `advanced`).

However, the current `screen-record-header`, `screen-field-value`,
`screen-field-group`, and `screen-two-column` widgets still show weaker editor
UX and weaker test coverage than `Hero` and other mature public widgets.

This follow-up closes that gap without inventing a second widget platform for
Custom Screens.

## Confirmed Problem Statement

The current editor/runtime problems for `admin-editor-view` are:

1. Screen widgets reuse the same widget foundation as `Hero`, but their editor
   layer does not use the same depth of approach.
2. `wizard`, `visual`, and `advanced` for screen widgets are currently aliases
   of the same editor instead of distinct editing experiences.
3. Screen widget metadata and runtime copy imply binding-aware record editing,
   but the widget editors themselves are still mostly literal-value forms and do
   not complement the current binding-panel contract well enough.
4. The dedicated record editor still contains renderer-specific branches instead
   of reusing one canonical widget render path end to end.
5. Screen widget registry/picker/test coverage is too thin, so UX drift is not
   caught early enough.
6. The current configuration surface for screen widgets is materially narrower
   than the team expects for content-type-specific record editing.

## Product Direction

Custom Screens should keep the shared widget foundation and become more
powerful, not more separate.

The target state is:

- same widget system as `Hero` and public widgets,
- richer editor experiences for `screen-*`,
- more flexible record-surface configuration where it helps per content type,
- no artificial UI simplification just because the surface is admin-only,
- any color, border, gradient, surface, or similar style control added or
  touched for `screen-*` must support `none` or `clear` semantics so admins can
  remove non-essential chrome instead of being forced into sticky defaults,
- stronger runtime parity between preview, builder canvas, and record editor,
- much broader test coverage for editor/runtime/registry seams.

The intended direction from this review is:

1. extend the screen widget family rather than replace it,
2. improve the split between widget settings and data mapping instead of
   duplicating the binding panel inside every widget editor,
3. add significant test coverage,
4. explicitly close the identified editor/runtime/registry gaps.

## Scope

This family covers only the `screen-*` widget family and the `admin-editor-view`
screen editor flow. It does not reopen the broader `TASK-249` route/cache
cutover, except where the dedicated record editor must stop duplicating widget
rendering behavior and instead use the canonical widget runtime path.

## Sub-Tasks

- [ ] TASK-250-01: Screen Widget Editor Architecture and Mode Parity
- [ ] TASK-250-01-01: Distinct Wizard, Visual, and Advanced Flows for `screen-*`
- [ ] TASK-250-01-02: Binding-Aware Editor Controls for `screen-record-header` and `screen-field-value`
- [ ] TASK-250-02: Screen Layout Widget Surface Expansion
- [ ] TASK-250-02-01: `screen-field-group` and `screen-two-column` Configuration Parity
- [ ] TASK-250-02-02: Selected Element Interaction and Element-Scoped Editing Flow
- [ ] TASK-250-03: Runtime and Registry Unification
- [ ] TASK-250-03-01: Canonical Widget Renderer Reuse in the Dedicated Record Editor
- [ ] TASK-250-03-02: `admin-editor-view` Registry, Picker, and Surface Contract Coverage
- [ ] TASK-250-04: QA, Docs, and Closure
- [ ] TASK-250-04-01: Screen Widget Editor/Runtime Test Matrix and Documentation Closure

## Implementation Order

1. Separate screen widget editor modes so the widget family stops using one
   shared catch-all form for every editor mode.
2. Add binding-friendly editor affordances to the screen widgets that currently
   pretend to be mapping-friendly but only expose literal text inputs, while
   keeping the binding panel as the owner of binding state.
3. Expand the layout/config surface for screen layout widgets where the current
   admin UX is too limited.
4. Remove runtime duplication between preview and dedicated record editor by
   reusing the canonical widget render path.
5. Add registry, picker, editor, runtime, and interaction coverage before
   closing docs/changelog.

## Security Contract

- Visibility: internal admin UI and existing internal admin API only.
- Auth model: authenticated admin session on the existing session-cookie admin
  API.
- RBAC:
  - widget/editor configuration writes still require `content:write`,
  - record edits still require `content:write`,
  - publish controls still require `content:publish`.
- CSRF:
  - no new public write path is introduced,
  - screen and entry writes continue through existing CSRF-backed admin clients.
- Rate-limit bucket:
  - unchanged current `admin_write` buckets.
- Reject-unknown validation:
  - all screen widget extensions continue through shared widget schema
    validation,
  - binding-aware controls must still normalize through the domain/service
    contract,
  - route modules remain orchestration-only if any route seam is touched.
- Style-removal rule:
  - any new or changed style control for colors, borders, gradients, panel
    chrome, or similar surfaces must use explicit `none` / `clear` semantics
    instead of requiring placeholder values such as `transparent` or empty
    strings.
- Anti-abuse:
  - no public endpoint, nonce flow, or reCAPTCHA flow is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- targeted Vitest suites for:
  - `screen-widgets-editor-wave`,
  - `screenWidgets`,
  - `custom-screen-binding-panel`,
  - `custom-screen-workspace-preview-dialog`,
  - `custom-screen-records`,
  - `custom-screens-page`,
  - any new screen-widget editor suites created for mode separation,
  - registry/picker coverage for `admin-editor-view`.
- Coverage must explicitly assert `none` / `clear` behavior for any newly added
  screen widget style controls.
- targeted Bun suites for:
  - widget registry/runtime contracts when the runtime path changes,
  - any changed route registration / `map*Error` seam if touched.
- `bun run gates:coderso` before closure when release-gated UX/runtime behavior
  changes.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- relevant `_docs/_WIDGETS/*` docs for `screen-*`
- `_docs/CONTENT_EDITOR_UX.md`
- `_docs/CMS_API.md` if editor/runtime semantics change
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion

## Acceptance Criteria

1. Screen widgets still use the same shared widget system as `Hero`, but their
   editor layer reaches comparable maturity where the product needs it.
2. `wizard`, `visual`, and `advanced` for `screen-*` are no longer aliases of
   one generic form.
3. Screen widgets with `selected-entry` semantics expose binding-aware editor
   affordances instead of text-only literal forms.
4. The dedicated record editor stops drifting away from canonical preview/widget
   rendering behavior.
5. Screen widget test coverage is materially expanded for registry, picker,
   runtime, preview, editor interaction, and `none` / `clear` style-removal
   seams.
