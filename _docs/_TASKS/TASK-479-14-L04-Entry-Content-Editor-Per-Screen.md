# TASK-479-14-L04: Entry Content Editor (Per-Screen Presentation)
# FileName: TASK-479-14-L04-Entry-Content-Editor-Per-Screen.md

**Priority:** Medium
**Category:** Admin UI / Custom Screens / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479-06, TASK-479-14-L02
**Status:** ⏳ To Do
**Parent Subtask:** TASK-479-14
**Started:** `<set when work begins>`
**Completed:** `<set at closure>`

---

## Overview

Restyle the **entry content editor** — the surface shown when someone opens a
single entry inside a published screen — to the prototype look: the
**screen-defined** entry layout (the sections composed in L02's builder) rendered
as a calm `rounded-2xl` document card, populated with the real record, with inline
content editing driven by a **compact bottom formatting floating toolbar**.
Crucially, the presentation is PER-SCREEN: the same component renders a Projects
entry as a checklist-led layout and a Clients entry as an activity-feed layout,
because each screen owns its `EntryLayout` sections.

- **Goal:** `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` (+
  `CustomScreenEntryCanvas.tsx`, `ScreenRuntimeRenderer.tsx`) reads like
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEntryEditorPreview.tsx` — the
  screen's sections (Header / Fields grid / Rich text / Related·checklist /
  Related·activity) rendered with the record's values, the currently-edited rich
  block ring-highlighted, and a bottom `CanvasEditor` panel formatting toolbar
  (Bold/Italic/Underline/Strike · Heading/List/Link/Color · Align) — while
  preserving the entry draft model, presentation overrides, validation, autosave/
  dirty-state, capability gating, and cache wiring.
- **Owning module/service:**
  `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx`,
  `CustomScreenEntryCanvas.tsx`, `ScreenRuntimeRenderer.tsx`; data via the entry
  draft helpers `customScreenEntryDraft.ts`, the presentation-override service
  `core/services/customScreens/screenEntryPresentationOverrides.ts`,
  `normalizeCustomScreenDefinitionForRead`, the `AuthoringCanvasFrame`
  (`@/ui/authoring`), and `cacheKeys.customScreenEntryOverrides(screenId, entryId)`.
- **Source-of-truth docs:** prototype entry editor
  `_docs/_PROTOTYPE/src/pages/advanced/CustomScreenEntryEditorPreview.tsx` +
  `_docs/_PROTOTYPE/src/lib/screensMock.ts` (per-screen `entry.sections` +
  `related.variant`); floating-panel pattern
  `_docs/_PROTOTYPE/src/components/patterns/CanvasEditor.tsx` (`panelPosition="bottom"`);
  the live real-input findings on inline mark toolbars in
  [[page-editor-color-toolbar-live-findings]]; tokens
  `_docs/_PROTOTYPE/src/styles/theme.css`; `_docs/DESIGN_TOKENS.md`;
  [[task-474-custom-screen-canvas-parity]].
- **Out of scope:** No change to the entry draft model, validation
  (`validateEntryDraft`), create/update payload builders
  (`buildEditorViewCreatePayload`/`buildEditorViewUpdatePayload`), the
  presentation-override schema/service, or which fields a screen binds. No change
  to the V4 definition normalization. The prototype is "Preview only" with mock
  checklist/activity data and mock copy — the real editor keeps real record values
  and real handlers; drop the "Preview only" badge.

---

## Security Contract

No endpoint or permission model changes (visual restyle only; preserves existing
routes, RBAC, cache, and adminPaths).

---

## Implementation Pseudocode

`CustomScreenEntryEditor` resolves params via `resolveCustomScreenEntryParams`,
normalizes the definition (`normalizeCustomScreenDefinitionForRead`), loads the
record, builds the entry draft (`customScreenEntryDraft.ts`), tracks
`draftOverrides` + `hasUnsavedPresentationChanges`, gates on
`resolveCustomScreenCapabilities`, and renders through `EditorShell` +
`AuthoringCanvasFrame` + `ScreenRuntimeRenderer`. Keep all of that; restyle the
header, the document canvas, the section rendering, and the formatting toolbar.

```tsx
// 1) Header — port the prototype PageHeader: breadcrumbs {screen.name} -> {title}
//    via AdminBreadcrumbs/AdminLink (canonical), description "Edit content ·
//    {singular} in the \"{screen.name}\" screen", actions = "Open in builder"
//    (AdminLink to the editor), "Save draft" (ghost), primary "Publish" (Rocket).
//    All keep REAL handlers (createEntry/updateEntry via the payload builders) and
//    the dirty/disabled state from the draft + hasUnsavedPresentationChanges.

// 2) Document canvas — wrap ScreenRuntimeRenderer / CustomScreenEntryCanvas in the
//    prototype document card on a warm canvas:
//      <div className="mx-auto max-w-2xl">
//        <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-card sm:p-8">
//          {definition.entry.sections.map(renderSection)}
//        </div>
//      </div>
//    The sections come from the REAL per-screen definition, so Projects vs Clients
//    differ automatically — do NOT hardcode the layout.

// 3) renderSection(section, record) — restyle each section type, populated with the
//    REAL record value (resolved through the existing field/column binding +
//    presentation overrides), NOT prototype mock copy:
//      header  -> title + StatusBadge(record.status) + owner chip + headerChips
//      fields  -> grid of muted tiles, each value rendered by column type
//                 (Progress / StatusBadge / Avatar / money / text)
//      richtext-> the inline-editable block; the ACTIVE block gets ring-2
//                 ring-primary/60 + an "Editing" badge; editing dispatches the REAL
//                 inline-edit/override flow (ScreenRuntimeRenderer interactionMode
//                 "inline"), NOT a fake textarea.
//      related (checklist|activity) -> the existing related-list renderer, restyled;
//                 the variant comes from the definition so per-screen presentation
//                 (Projects=checklist, Clients=activity) is preserved.

// 4) Formatting toolbar — bottom CanvasEditor panel (panelPosition="bottom"):
//      Aa label · Bold/Italic/Underline/Strikethrough · | · Heading/List/Link/
//      Color swatch · | · Align left/center.
//    Each button is wired to the REAL inline rich-text command for the selected
//    fragment. CRITICAL (regression guard from [[page-editor-color-toolbar-live-findings]]):
//    do NOT apply a toolbar-wide onMouseDown preventDefault that steals focus from
//    the editable region / URL input — that broke the page-editor inline toolbar
//    with real mouse/keyboard. Preserve selection on individual buttons only
//    (preventDefault per-button where needed) so swatch click, link URL input, and
//    live feedback work with REAL input, not just synthetic events.

// 5) Persistence: "Save draft"/"Publish" call the EXISTING create/update via
//    buildEditorView{Create,Update}Payload + validateEntryDraft; presentation/format
//    edits persist via the EXISTING override replace path keyed by
//    cacheKeys.customScreenEntryOverrides(screenId, entryId). No new payload.
```

**Data flow:** route params → `normalizeCustomScreenDefinitionForRead` (per-screen
sections) + record (cached) → entry draft + `draftOverrides` →
`AuthoringCanvasFrame`/`ScreenRuntimeRenderer` renders the screen-defined sections
populated with record values → inline edits update the draft / override working set
(setting dirty flags) → Save/Publish writes through the existing entry + override
paths. The restyle touches only JSX/classNames + the toolbar presentation.

**Dirty-state / drafts (preserve):** Do not change when the draft marks dirty,
`hasUnsavedPresentationChanges` derivation
(`savedPresentationKey !== draftPresentationKey`), the override
serialize/sort helpers, or the unsaved-changes guard. The restyle must not remount
the canvas (no key churn) or reset controlled inputs — keep component identities so
React preserves the in-progress edit + dirty flags.

**Cache (preserve):** Keep the `subscribeCacheEvents` guards
(`customScreensList`, `customScreenDetail(screenId)`,
`entryDetail(contentType.slug, entryId)`, `customScreenEntryOverrides(...)`) and the
existing refresh flow; respect the guard that refuses to clobber an in-progress
draft. No mount-force refetch.

**Per-screen presentation (preserve):** Projects vs Clients differ ONLY because the
definition's `entry.sections` + `related.variant` differ — the renderer must read
them from the real definition, never branch on a hardcoded screen id.

**Navigation constraint (preserve):** Breadcrumbs, "Open in builder", and any
back-to-list link route through `AdminLink`/`adminPaths`/the custom-screen route
helpers. Do not hand-build hrefs.

**React-hooks rules:** No new sync `setState` in effects; derive header chips /
active-block / toolbar state at render or via the existing reducers/refs. Reuse the
existing draft + override state as the single source of truth.

**Error handling:** Keep the existing validation field errors
(`validateEntryDraft`), capability-denied, load-error `<Alert>`, and not-found
branches and their copy; they inherit the new styling. No new error surfaces.

**Regression-test shape:** see L05 — render `CustomScreenEntryEditor` for a
Projects entry and a Clients entry; assert the document card carries
`rounded-2xl`/`shadow-card`, Projects shows the checklist related-list while
Clients shows the activity feed (per-screen), header shows the record title +
status, the bottom formatting toolbar exposes Bold/Link/Color, and that an inline
edit flips the draft/override dirty indicator (behavioral guard that the restyle
did not sever the draft/override wiring).

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/custom-screen-entry-editor-restyle.test.tsx`
  (new suite in L05)
- Existing entry-editor/draft suites MUST stay green:
  `NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui/custom-screen-entry-draft.test.ts tests/vitest/ui/custom-screen-record-interactions.test.tsx tests/vitest/ui/custom-screen-preview-owner.test.tsx`
- State explicitly in the summary if any suite was skipped or could not run.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md` — update status bucket + statistics on status change.
- `_docs/_CHANGELOG/` — add an entry on closure, linking `TASK-479` +
  `TASK-479-14-L04`.
- Record the bottom formatting-toolbar treatment + the explicit avoidance of the
  toolbar-wide `onMouseDown preventDefault` focus bug in the editor/design notes,
  cross-linking [[page-editor-color-toolbar-live-findings]] and
  [[task-474-custom-screen-canvas-parity]] so the page-editor and custom-screen
  inline toolbars stay consistent and regression-free.
