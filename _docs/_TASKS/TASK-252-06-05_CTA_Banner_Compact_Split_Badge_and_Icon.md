# TASK-252-06-05: CTA Banner Compact Split Badge and Icon

# FileName: TASK-252-06-05_CTA_Banner_Compact_Split_Badge_and_Icon.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime Render
**Estimated Effort:** Medium
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-06
**Status:** To Do

---

## Overview

Shape CTA Banner around centered/compact, split, high-contrast, and badge/icon CTA strip patterns first; background media stays bounded Adapt scope and countdown stays rejected.

This is an execution leaf under `TASK-252-06`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/cta-banner/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/cta-banner/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/cta-banner/MATRIX.md` to justify the final option list before changing schema or editor controls.
- Keep one widget type and express variation through bounded modes, presets, and item-level fields.
- Use shared TASK-252 editor sections/rows/metadata and keep repeated item controls accessible and stable for Playwright CLI.
- Preserve strict schemas, safe links/media, and backward-compatible render output for existing pages.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/cta-banner/MATRIX.md`; for this leaf, start from the current owner fields `content`, `actions`, `style` and add only the schema fields that the matrix explicitly keeps.
- Keep: centered CTA, split CTA layout, high-contrast band, and badge/icon CTA strip from `_docs/_WIDGETS/tmp/cta-banner/MATRIX.md`; add schema-owned badge/icon fields in `core/widgets/core/ctaBanner.tsx`.
- Adapt: background media/overlay, app-store style button groups, and reduced-motion-safe named animation presets remain conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: separate one-off widgets, raw HTML/script embeds, and unbounded visual/CSS controls.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `cta-banner`.
- `Visual`: `Mode`, `Copy`, `CTA buttons`, `Badge and icon`, `Tone`.
- `Advanced`: `Legacy layout mapping`, `Safe-link diagnostics`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/ctaBanner.tsx`
- `core/admin/ui/widgets/editors/CtaBannerEditors.tsx`
- `tests/vitest/widgets/renderer.test.tsx` if shared renderer output changes.
- `tests/vitest/widgets/styleNoneTokens.test.tsx` if token/clear adjacency changes.
- `tests/vitest/widgets/ctaBanner.test.tsx`
- `tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/_WIDGETS/tmp/cta-banner/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-06-05_CTA_Banner_Compact_Split_Badge_and_Icon.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeCtaBannerData(data: CtaBannerData): CtaBannerData {
  return {
    content: normalizeCtaBannerContent(data.content),
    actions: normalizeCtaBannerActions(data.actions),
    style: normalizeCtaBannerStyle(data.style),
  };
}

function CtaBannerVisualEditor(props: WidgetEditorProps<CtaBannerData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="cta-banner.content" title="Content and actions">
      <WidgetControlRow id="cta-banner.content.badge" label="Badge" data-widget-control="cta-banner.content.badge">
        <Input value={value.content?.badge ?? ""} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/cta-banner/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/ctaBanner.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/CtaBannerEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `cta-banner` output is public page/runtime output.
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
  - changed `cta-banner` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/ctaBanner.tsx`.
- Anti-abuse:
  - Link fields introduced or touched by this leaf must normalize through the
    widget safe-href helper before render; media fields must stay on the
    existing media-picker/storage ownership path when one exists; raw URL media
    fields must add bounded sanitization and tests before render.
  - No raw HTML, script embed, or unbounded class-name field is introduced.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun run test:vitest -- tests/vitest/widgets/ctaBanner.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/cta-banner-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/CTA_BANNER.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-06-05_CTA_Banner_Compact_Split_Badge_and_Icon.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `cta-banner` exposes research-backed modes/fields without creating duplicate widget types.
- Repeated item controls have stable labels and `data-widget-control` metadata.
- Runtime output remains backward compatible for saved pages.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
