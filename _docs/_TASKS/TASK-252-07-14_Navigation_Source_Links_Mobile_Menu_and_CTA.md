# TASK-252-07-14: Navigation Source Links Mobile Menu and CTA

# FileName: TASK-252-07-14_Navigation_Source_Links_Mobile_Menu_and_CTA.md

**Priority:** High
**Category:** Widgets + Admin UI + Runtime + Security
**Estimated Effort:** Large
**Dependencies:** TASK-252-01, TASK-252-02
**Status:** Done
**Started:** 2026-05-12
**Completed:** 2026-05-12

---

## Overview

Refine navigation source/manual links, logo/CTA grouping, and accessible mobile
collapse first. Preserve the current sticky/transparent/collapse behavior
fields; only new dropdown/mega groups or expanded sticky/transparent behavior
stay Adapt-only through the current behavior contract without client-owned
routing hacks.

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

- Keep: source menu/manual links, logo/links/CTA grouping, and accessible
  mobile menu behavior from
  `_docs/_WIDGETS/tmp/navigation/MATRIX.md`; start from the current owner fields
  `logo`, `items`, `cta`, `linksSource`, `menuKey`, `behavior`, `layout`, and
  `style`, plus the existing `right` slot (`Right Actions`) exposed by the
  widget definition. Map research terms `collapse`/`offcanvas` onto the existing
  `behavior.mobileMode` enum (`expanded`, `drawer`, `minimal`) instead of
  adding a duplicate top-level field.
- Adapt: dropdown/mega groups and new sticky/transparent behavior expansion
  remain conditional; preserve existing `behavior.sticky`,
  `behavior.transparent`, and `behavior.collapseOnScroll` fields with
  non-destructive defaults unless this leaf intentionally migrates them with
  schema/defaults/normalizer/render/editor/tests together.
- Reject: arbitrary operators, client-owned provider/index config, raw scripts, and privileged settings in widget data.

## Editor Mode Ownership

- `Wizard`: first-run setup for the safest useful defaults for `navigation`.
- `Visual`: `Source`, `Links`, `Mobile menu`, `CTA/logo`, `Right Actions slot`.
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
- `_docs/_TASKS/TASK-252-07-14_Navigation_Source_Links_Mobile_Menu_and_CTA.md` for status updates during execution.
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
    behavior: normalizeNavigationBehavior({
      ...data.behavior,
      mobileMode: normalizeNavigationMobileMode(data.behavior?.mobileMode),
    }),
    layout: normalizeNavigationLayout(data.layout),
    style: normalizeNavigationStyle(data.style),
  };
}

function NavigationVisualEditor(props: WidgetEditorProps<NavigationData>) {
  const value = props.value;
  return (
    <WidgetEditorSection id="navigation.navigation" title="Links source">
      <WidgetControlRow id="navigation.linksSource" label="Links source">
        {(field) => (
          <Select value={value.linksSource ?? "manual"} onValueChange={(linksSource) => props.onChange(updateNavigationSource(value, { linksSource }))}>
            <SelectTrigger id={field.id} aria-describedby={field.describedById}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{/* manual/menu/pages options */}</SelectContent>
          </Select>
        )}
      </WidgetControlRow>
      <WidgetControlRow id="navigation.behavior.mobileMode" label="Mobile menu">
        {(field) => (
          <Select value={value.behavior?.mobileMode ?? "expanded"} onValueChange={(mobileMode) => props.onChange(updateNavigationBehavior(value, { mobileMode }))}>
            <SelectTrigger id={field.id} aria-describedby={field.describedById}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{/* expanded/drawer/minimal options */}</SelectContent>
          </Select>
        )}
      </WidgetControlRow>
    </WidgetEditorSection>
  );
}

function renderNavigationRuntime(data: NavigationData, slots: WidgetSlots, blockId: string) {
  const mobileMode = data.behavior?.mobileMode ?? "expanded";
  const mobilePanelId = `navigation-mobile-${blockId}`;
  return (
    <nav data-navigation-widget="1" data-navigation-mobile-mode={mobileMode}>
      {mobileMode !== "expanded" ? (
        <>
          <button
            type="button"
            data-navigation-mobile-toggle
            aria-expanded="false"
            aria-controls={mobilePanelId}
          >
            Menu
          </button>
          <div id={mobilePanelId} data-navigation-mobile-panel hidden>
            {/* Render the same normalized navigation links/CTA/right-slot actions for mobile. */}
          </div>
        </>
      ) : null}
    </nav>
  );
}

function bindNavigationMobileRuntime(root: HTMLElement) {
  // If `drawer` or `minimal` mode collapses mobile links, the public runtime
  // must attach delegated click and keyboard-safe handlers that update
  // aria-expanded, hidden panel state, and focus boundaries. The current
  // server-rendered output has no React handlers after renderToString.
}

const navigationSlotGroup: WidgetSlotControlGroup = {
  widgetType: "navigation",
  includeSlotIds: ["right"],
  sectionId: "navigation.slots",
  title: "Right Actions slot",
};
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
- Preserve the existing `right` slot (`Right Actions`) as a builder-owned slot
  surface. Do not move it into `NavigationData`, do not remove it from the
  widget definition, and do not duplicate slot add/remove logic in
  `NavigationEditors.tsx`; register `navigationSlotGroup` in the builder-level
  TASK-252-01 slot-control map and render it from `VisualPanel`/`BlockSettings`
  with stable `navigation.slots` metadata.
- Keep mobile behavior under `behavior.mobileMode`; valid values remain
  `expanded`, `drawer`, and `minimal`, and the legacy/default value remains
  `expanded`. Do not persist top-level `mobileMode` or invalid
  `collapse`/`offcanvas` values unless a schema migration updates defaults,
  normalizer, renderer, editor, and tests together.
- The current runtime renders a static mobile menu button. If this leaf claims
  accessible `drawer` or `minimal` collapse behavior, add the rendered
  `aria-expanded`/`aria-controls` panel contract plus an inline delegated
  runtime controller. Do not rely on React-only handlers for public navigation
  output.
- `drawer` and `minimal` must render the mobile toggle and panel even when there
  is no CTA and no `right` slot content; navigation links cannot become hidden
  without an opener. Derive the mobile panel id from the real renderer `blockId`
  (`WidgetRenderer` passes `blockId` into widget renderers), not from an
  undefined placeholder id.
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
  - all public navigation hrefs must pass `core/widgets/core/widgetSafeHref.ts`
    normalization
    before render, including item links, child links, and CTA hrefs: relative
    paths, hash links, and HTTP(S) URLs are allowed; `javascript:`, `data:`,
    `vbscript:`, protocol-relative URLs, and unknown protocols are rejected or
    normalized away.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun run gates:coderso` before marking this leaf `Done` or record the exact blocker.
- `bun test tests/unit/widgets/validator.test.ts` when schema validation, slot normalization, or widget validation changes.
- `bun run test:vitest -- tests/vitest/widgets/navigation.test.tsx`
- `bun run test:vitest -- tests/vitest/ui/navigation-editor-wave.test.tsx`
  must cover mobile-mode editor controls plus runtime markup for
  `aria-expanded`, `aria-controls`, hidden panel state, and the delegated
  controller when collapse/drawer behavior is implemented. Include a regression
  where `mobileMode` is `drawer` or `minimal` with no CTA and no `right` slot,
  proving the toggle and panel still render.
- Add navigation widget assertions that unsafe item, child, and CTA href
  payloads such as `javascript:alert(1)`, `data:text/html,...`, and
  `//evil.example` do not survive normalization or render as links.
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
- `_docs/_TASKS/TASK-252-07-14_Navigation_Source_Links_Mobile_Menu_and_CTA.md` status notes during execution.
- `_docs/_TASKS/README.md` on status changes.
- `_docs/_CHANGELOG/README.md` and a changelog entry only when the leaf is
  completed.

## Acceptance Criteria

- `navigation` editor exposes research-backed source, link, mobile-menu, CTA,
  and logo controls with stable metadata.
- Runtime/data source ownership remains in the existing backend or widget owner seam.
- Public-write/provider-secret boundaries are explicitly preserved in tests/docs when touched.
- Documentation names the research decisions that explain both added and
  rejected options.
- Validation commands and any skipped suites are recorded before marking this
  leaf `Done`.
