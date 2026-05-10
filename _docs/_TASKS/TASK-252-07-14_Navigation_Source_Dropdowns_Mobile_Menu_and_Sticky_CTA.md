# TASK-252-07-14: Navigation Source Dropdowns Mobile Menu and Sticky CTA

# FileName: TASK-252-07-14_Navigation_Source_Dropdowns_Mobile_Menu_and_Sticky_CTA.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02, TASK-252-07
**Status:** To Do

---

## Overview

Refine navigation source/manual links and logo grouping first; dropdowns, mobile
menu, and sticky CTA behavior stay Adapt-only through the current behavior
contract without client-owned routing hacks.

This is an execution leaf under `TASK-252-07`. It must not re-open the
research phase; use `_docs/_WIDGETS/tmp/navigation/MATRIX.md` and the widget README under
`_docs/_WIDGETS/tmp/navigation/` as the source evidence for Keep, Adapt,
and Reject decisions.

## Business Requirements

- Use `_docs/_WIDGETS/tmp/navigation/MATRIX.md` to bind the final option set to research decisions.
- Keep editor clarity separate from runtime ownership: source/display choices may be editable, but data resolution stays in existing service/runtime owners.
- Use shared TASK-252 editor controls and metadata without moving runtime-kernel behavior into Vitest-only code.
- Preserve cache, permission, public-write, and provider-secret boundaries for this widget family.

## Research Decisions

- Keep: only rows marked `Keep` in `_docs/_WIDGETS/tmp/navigation/MATRIX.md`; for this leaf, start from the current owner fields `logo`, `items`, `cta`, `linksSource`, `menuKey`, `behavior`, `layout`, `style` and add only the schema fields that the matrix explicitly keeps.
- Adapt: rows marked `Adapt` are conditional scope, not required scope. Treat dropdowns and sticky/mobile behavior through the current `behavior` contract as conditional; implement only when schema/defaults/normalizer/render/editor/tests move together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `navigation`.
- `Visual`: `Source`, `Links and dropdowns`, `Mobile menu`, `Sticky behavior`, `CTA/logo`.
- `Advanced`: `Route diagnostics`, `Legacy link mapping`.

## Sub-Tasks

- None. This is an execution leaf.

## Files to Change

- `core/widgets/core/navigation.tsx`
- `core/admin/ui/widgets/editors/NavigationEditors.tsx`
- Bun-owned route/security suites when public endpoint behavior changes.
- `tests/unit/widgets/validator.test.ts` when schema validation changes.
- `tests/vitest/widgets/navigation.test.tsx`
- `tests/vitest/ui/navigation-editor-wave.test.tsx`
- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/tmp/navigation/MATRIX.md` for evidence reference only; do not rewrite research
  unless implementation finds a concrete source mismatch.
- `_docs/_TASKS/TASK-252-07-14_Navigation_Source_Dropdowns_Mobile_Menu_and_Sticky_CTA.md` for status updates during execution.
- `_docs/_TASKS/README.md` on status changes.

## Implementation Pseudocode

```tsx
function normalizeNavigationData(data: NavigationData): NavigationData {
  return {
    logo: normalizeNavigationLogo(data.logo),
    items: normalizeNavigationItems(data.items),
    cta: normalizeNavigationCta(data.cta),
    linksSource: normalizeNavigationLinksSource(data.linksSource),
    menuKey: normalizeNavigationMenuKey(data.menuKey),
    behavior: normalizeNavigationBehavior(data.behavior),
    layout: normalizeNavigationLayout(data.layout),
    style: normalizeNavigationStyle(data.style),
  };
}

function NavigationVisualEditor(props: WidgetEditorProps<NavigationData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="navigation.navigation" title="Links source">
      <WidgetControlRow id="navigation.linksSource" label="Links source" data-widget-control="navigation.linksSource">
        <Select value={value.linksSource ?? "manual"} onChange={handleControlChange} />
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}
```

Implementation checklist:

- Read `_docs/_WIDGETS/tmp/navigation/MATRIX.md` before changing the schema or editor.
- Extend or reorganize `core/widgets/core/navigation.tsx` schema/defaults/normalizer/rendering
  only for fields approved by the research decisions above.
- Refactor `core/admin/ui/widgets/editors/NavigationEditors.tsx` to shared TASK-252 editor primitives from
  TASK-252-01; do not create widget-local replacements for sections, rows, info
  tips, or metadata.
- Keep legacy payloads non-destructive: missing new fields must normalize to the
  current rendered behavior.
- Add or update runtime/widget tests and editor-wave tests in the files listed
  above.

## Security Contract

- Visibility:
  - editor controls are internal admin UI;
  - rendered `navigation` output is public page/runtime output.
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
  - changed `navigation` schema fields must reject unknown fields and
    normalize legacy payloads through `core/widgets/core/navigation.tsx`.
- Anti-abuse:
  - admin route helpers remain canonical for admin links
  - hrefs must use safe URL/link normalization

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
- `bun run test:vitest -- tests/vitest/widgets/renderer.test.tsx` if renderer,
  slot, or shared output behavior changes.
- `bun run test:vitest -- tests/vitest/widgets/styleNoneTokens.test.tsx` if
  token/clear/default adjacency changes.
- Add Bun-owned route/security tests when endpoint behavior, public writes,
  provider fetches, or runtime-kernel scripts change.

## Documentation Updates Required

- `_docs/WIDGETS.md`
- `_docs/_WIDGETS/NAVIGATION.md`
- `_docs/_WIDGETS/README.md` if this leaf creates a missing widget doc page.
- `_docs/_TASKS/TASK-252-07-14_Navigation_Source_Dropdowns_Mobile_Menu_and_Sticky_CTA.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `navigation` editor exposes research-backed source/display/state controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
