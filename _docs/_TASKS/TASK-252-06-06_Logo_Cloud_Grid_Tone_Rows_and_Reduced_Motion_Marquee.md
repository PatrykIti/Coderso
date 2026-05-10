# TASK-252-06-06: Logo Cloud Grid Tone Rows and Reduced Motion Marquee

# FileName: TASK-252-06-06_Logo_Cloud_Grid_Tone_Rows_and_Reduced_Motion_Marquee.md

**Priority:** Medium
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Add logo-cloud grid, intro, tone, and multi-row layout controls first; marquee remains Adapt-only and must include a reduced-motion fallback if implemented.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/logo-cloud/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md`; for this leaf, start from the current owner fields `header`, `logos`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: static responsive grid, intro text, grayscale/muted tone, and multi-row cloud behavior from `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md`; add schema-owned row/wrap controls in `core/widgets/core/logoCloud.tsx`.
- Adapt: dark/surface variants and marquee mode remain conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `logo-cloud`.
- `Visual`: `Layout`, `Logos`, `Tone`, `Rows`, `Motion`.
- `Advanced`: `Reduced-motion diagnostics`, `Legacy logo mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/logoCloud.tsx`
- `core/admin/ui/widgets/editors/LogoCloudEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/vitest/widgets/logoCloud.test.tsx`
- `tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-06_Logo_Cloud_Grid_Tone_Rows_and_Reduced_Motion_Marquee.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeLogoCloudData(data: LogoCloudData): LogoCloudData {
  return {
    header: normalizeLogoCloudHeader(data.header),
    logos: normalizeLogoCloudLogos(data.logos),
    style: normalizeLogoCloudStyle(data.style),
  };
}

function normalizeLogoCloudLogo(item: LogoCloudLogo, index: number): LogoCloudLogo {
  return {
    ...item,
    id: normalizeStableItemId(item.id, `logo-cloud-${index + 1}`),
  };
}

function LogoCloudVisualEditor(props: WidgetEditorProps<LogoCloudData>) {
  return (
    <WidgetEditorSection id="logo-cloud.logos" title="Logos">
      {props.value.logos.map((item, index) => (
        <WidgetControlRow key={item.id ?? index} id={`logo-cloud.logos.${index}.name`} label="Name" data-widget-control={`logo-cloud.logos.${index}.name`}>
          <Input value={item.name ?? ""} onChange={handleControlChange} />
        </WidgetControlRow>
      ))}
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/logo-cloud/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/logoCloud.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/LogoCloudEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `logo-cloud` output is public page/runtime output.
- Auth model:
  - no new endpoint is introduced by this leaf;
  - edits persist through existing authenticated admin page/template save flows.
- RBAC:
  - unchanged page/template/widget-template write permissions.
- CSRF:
  - unchanged admin write CSRF handling.
- Rate-limit bucket:
  - unchanged admin write buckets.
- Reject-unknown validation:
  - changed `logo-cloud` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/logoCloud.tsx`.
- Anti-abuse:
  - Link and media fields must keep existing safe URL/media validation.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/logoCloud.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/logo-cloud-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/LOGO_CLOUD.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-06_Logo_Cloud_Grid_Tone_Rows_and_Reduced_Motion_Marquee.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `logo-cloud` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
