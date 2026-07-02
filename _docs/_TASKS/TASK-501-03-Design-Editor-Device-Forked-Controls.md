# TASK-501-03: Design Editor Device-Forked Controls
# FileName: TASK-501-03-Design-Editor-Device-Forked-Controls.md

**Parent Task:** TASK-501
**Priority:** High
**Category:** Admin UI / Content (Menus) / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-501-01 (resolve/patch/clear helpers + `orientation` enum — hard dependency), TASK-501-02 (`buildMenuDocumentPreviewCss` responsive flatten for the in-canvas mobile preview — its builder API must be merged before the canvas work here is verifiable)
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

Make the Menu Design panel actually EDIT per device. Today the `DeviceSwitcher`
(`MenuDesignEditor.tsx:882` state, `:1058` toolbar) only changes what the canvas
*shows* (`buildMenuDocumentPreviewCss(doc, device)`, `:378`); every writer is
flat — `setLayoutField` (`:418-432`) mutates `section.layout`, `setNavField`
(`:622-632`) mutates the `nav-items` block props via `patchBlock` (`:434-444`).

This subtask rewires the panel onto the 501-01 helpers so that:

1. **Device-forked appearance writes** — Desktop (and Tablet, which is
   base-mapped per the parent scoping decision) edits write the base;
   **Mobile** edits write the sparse `responsive.mobile` override via
   `patchMenuSectionForDevice(doc, sectionId, device, group, patch)` with
   `group ∈ {"layout","navProps"}`.
2. **Resolved display + base-diff badges** — panels display
   `resolveMenuSectionAppearanceForDevice(section, device)` values while
   override detection reads the BASE record via
   `readMenuSectionOverrideValue(section, "mobile", group, key)` — the Pages
   split (`pageEditorState.ts:31-54` `readSectionBreakpointOverride` /
   `hasResponsiveOverride`) ported to menus.
3. **`MenuResponsiveControlShell`** — a port of the Pages
   `ResponsiveControlShell` / `ResponsiveStateBadge` (`PageEditor.tsx:4786-4874`)
   wrapping every device-forkable control: Base/Override/Inherited badge +
   explicit Reset (`data-menu-responsive-reset`) that calls
   `clearMenuSectionOverride` (delete leaf, prune empty parents — NO
   auto-remove-on-equality).
4. **Orientation SegmentedControl** in the nav-items panel (new 501-01
   `orientation: "horizontal" | "vertical"` appearance field).
5. **Per-block mobile visibility toggle** — on Mobile every block gets a
   "Visible on mobile" `ToggleSwitch` (writes
   `setMenuBlockVisibleForDevice(doc, blockId, "mobile", visible)`); on
   Desktop, LEAF blocks (`cta-button`/`divider`/`spacer`) get a flat "Visible"
   toggle (writes the existing flat `visibility` slot) so "show only on
   mobile" is composable (flat `visible:false` + mobile override `true`).
6. **Scope cue** — the `CanvasEditor` `deviceContext` pill (`:1072`, rendered
   at `CanvasEditor.tsx:135-140` with `data-page-editor-canvas-context`)
   reads "Mobile (overrides)" / "Tablet (base)" / "Desktop (base)", mirroring
   the Pages "Editing: … (overrides)" strip (`PageEditor.tsx:2820-2824`).
7. **Undo/redo intact** — every write stays a pure
   `updateDoc((doc) => …helper(doc, …))` event-handler dispatch into the
   single `historyReducer` atom (`MenuDesignEditor.tsx:119-163`), so
   device-forked edits undo/redo exactly like flat ones. **No
   setState-in-effect** anywhere; all device-forked writes happen in event
   handlers keyed on the current `device` state.

**Explicitly NOT device-forked:** content fields — brand `mode`/`href`/logo,
cta `label`/`href`/`variant`, utility labels — remain FLAT writes via the
existing `patchBlock` on every device (the responsive contract covers only
`layout`, `navProps`, and `visibility`). These controls are NOT wrapped in
`MenuResponsiveControlShell` (no badge — they are device-invariant by
contract), so the badge's presence itself communicates "this control forks".

**Out of scope here:** schema/helpers (501-01), CSS emission + front renderer
`data-menu-block-id` stamping (501-02 — note the canvas `SelectableBlock`
already stamps `data-menu-block-id={id}` at `MenuDesignEditor.tsx:244`, so
the `data-menu-block-id` half of 501-02's dual-selector hide rules
(`[data-menu-block-id="X"],[data-block-id="X"]{display:none}`) gates the
canvas with zero renderer change in this file), tests-docs closure (501-04).

---

## Current State (verified against source, 2026-07-02)

- `MenuDesignEditor.tsx` (1145 lines): `device` state `:882`; `DeviceSwitcher`
  `:1058`; `deviceContext={{ value: device, label: DEVICE_LABELS[device] }}`
  `:1072`; canvas CSS `:378`. `MenuBarPanel` (`:446-607`) reads
  `doc.sections[0]?.layout ?? {}` directly (`:461`) and renders
  surface/border `ColorSwatchControl`, alignment `SegmentedControl`,
  paddingX/paddingY/borderWidth `SliderControl`, shadow `SegmentedControl`,
  sticky `ToggleSwitch`, the Add-block rail, and the Blocks list.
  `MenuBlockPanel` (`:609-856`) reads `block.props` directly for the
  nav-items controls (`:669-750`) and has NO visibility control for any block
  type today.
- Writers: `setLayoutField` `:418-432` (delete-on-undefined into
  `section.layout`), `patchBlock` `:434-444`, `setNavField` `:622-632`
  (delete-on-undefined into nav-items `props`). All flat.
- History: single `useReducer` atom `historyReducer` `:119-163`
  (`update` action takes a pure `(doc) => doc` updater; identity return is a
  no-op `:123`), `updateDoc` memoized dispatch `:890`.
- Pages reference (to port, NOT import — `ResponsiveControlShell` /
  `ResponsiveStateBadge` are module-private to `PageEditor.tsx:4770-4874` and
  their data attributes are page-scoped): badge states
  `type ResponsiveBadgeState = "base" | "override" | "inherited"` (`:4770`),
  shell computes `state = device === "desktop" ? "base" : override ?
  "override" : "inherited"` (`:4840`), Reset button carries
  `data-page-editor-responsive-reset` + `RotateCcw` icon, tooltip "Remove the
  {device} override and inherit the desktop value.". Chrome helpers ARE
  importable: `useEditorControlTone`, `editorControlFocusClassFor` (`:153`),
  `editorGhostButtonClassFor` (`:157`), `editorPanelOptionActiveClass`
  (`:137`) from `core/admin/ui/pages/editorControls/controlChrome.ts`.
- 501-01 helper contract this file consumes (normative source: TASK-501-01
  §3 signatures + doc comments — the parent §Contract sketch carries the
  shapes only, NOT the delete semantics):
  `resolveMenuSectionAppearanceForDevice(section, device): { layout: MenuBarLayout; navProps: NavItemsProps }`
  (base `navProps` sourced from the section's `nav-items` block props exactly
  like `collectMenuAppearance`, `menuDocumentCss.ts:71-77`),
  `readMenuSectionOverrideValue(section, "mobile", group, key)`,
  `patchMenuSectionForDevice(doc, sectionId, device, group, patch)`
  (desktop/tablet ⇒ base; `undefined` patch value ⇒ delete-key-from-target,
  PINNED in 501-01 §3's `applyPatch` (`delete next[key]`, both device paths)
  and its "Delete-on-undefined patch" test bullet: base-key delete on
  desktop/tablet, override-leaf delete + the same empty
  group ⇒ `mobile` ⇒ `responsive` prune chain as `clearMenuSectionOverride`
  on mobile — a plain `{ ...target, ...patch }` spread would instead store an
  own `undefined` key that clobbers the desktop value in the
  `{ ...base, ...override }` resolve merge while
  `readMenuSectionOverrideValue` returns `undefined` (badge "Inherited", no
  Reset button, undo deep-equality broken by the residue); 501-01 forbids
  that shape),
  `clearMenuSectionOverride(doc, sectionId, "mobile", group, key)`,
  `resolveMenuBlockVisibleForDevice(block, device)`,
  `setMenuBlockVisibleForDevice(doc, blockId, device, visible)` (mobile ⇒
  responsive record on ANY block type; desktop ⇒ flat `visibility` — leaf
  blocks only), `clearMenuBlockVisibilityOverride(doc, blockId, "mobile")`,
  plus `menuAppearanceOrientations = ["horizontal","vertical"]` and
  `orientation` in `NAV_ITEMS_PROP_KEYS` /
  `normalizeMenuAppearance.fieldNormalizers`.

---

## Implementation Plan (execution-ready)

All changes in `core/admin/ui/menus/MenuDesignEditor.tsx` unless noted.

### 1. `MenuResponsiveControlShell` + badge (port, ~70 lines)

```tsx
// After the SelectableBlock section (~:258). Menu-scoped data attributes.
import { RotateCcw } from "lucide-react";                       // extend :2-13 import
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  editorControlFocusClassFor,
  editorGhostButtonClassFor,
  editorPanelOptionActiveClass,
  useEditorControlTone,
} from "../pages/editorControls/controlChrome";

type MenuResponsiveBadgeState = "base" | "override" | "inherited";

// Tablet is BASE-mapped for menus (parent scoping decision) — the ONE
// deliberate divergence from the Pages shell, where tablet is an override
// breakpoint. Encode it in a single predicate used by badge + writers:
const isMenuOverrideDevice = (device: PageBreakpoint): device is "mobile" =>
  device === "mobile";

const menuResponsiveBadgeDescription = (state: MenuResponsiveBadgeState): string =>
  state === "base"
    ? "Editing the base value (applies to every device)."
    : state === "override"
      ? "Mobile override — this value replaces the desktop value below 640px."
      : "Inherited from desktop. Edit to create a mobile override.";

function MenuResponsiveStateBadge({ state }: { state: MenuResponsiveBadgeState }) {
  const tone = useEditorControlTone();
  // Same classes as PageEditor.tsx:4801-4812 (light-tone branch is the live
  // one — the menu panel is wrapped in EditorControlToneContext value="light",
  // MenuDesignEditor.tsx:1107); keep the dark branch for tone-parity.
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} data-menu-responsive-badge={state} className={/* per :4801-4812, editorControlFocusClassFor(tone), override ⇒ editorPanelOptionActiveClass */}>
          {state === "base" ? "Base" : state === "override" ? "Override" : "Inherited"}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
        {menuResponsiveBadgeDescription(state)}
      </TooltipContent>
    </Tooltip>
  );
}

function MenuResponsiveControlShell({
  device, override, label, onReset, children,
}: {
  device: PageBreakpoint;
  override: boolean;          // caller computed from BASE record, never resolved values
  label: string;              // accessible name + data hook value
  onReset: () => void;
  children: ReactNode;
}) {
  const tone = useEditorControlTone();
  const state: MenuResponsiveBadgeState = !isMenuOverrideDevice(device)
    ? "base"
    : override ? "override" : "inherited";
  return (
    <div className="grid min-w-0 gap-1" data-menu-responsive-field={state}>
      {children}
      <div className="flex min-h-6 items-center justify-between gap-2">
        <MenuResponsiveStateBadge state={state} />
        {state === "override" ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`Reset ${label} to inherited`}
                data-menu-responsive-reset={label}
                className={/* PageEditor.tsx:4858-4861 idiom: editorGhostButtonClassFor(tone) + editorControlFocusClassFor(tone) */}
                onClick={onReset}
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6} className="max-w-[240px]">
              Remove the mobile override and inherit the desktop value.
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
    </div>
  );
}
```

Error handling: `onReset` only renders when `state === "override"`, so
`clearMenuSectionOverride` never runs against a missing record; the 501-01
helpers are identity on unknown section/block ids, which the `update` reducer
action already treats as a no-op (`:123` identity check) — no history garbage.

### 2. Device-forked writers (replace `:418-432` + `:622-632`)

```tsx
// setLayoutField: same public signature, now (updateDoc, device)-curried.
const setLayoutField =
  (updateDoc: UpdateDoc, device: PageBreakpoint) =>
  <K extends keyof MenuBarLayout>(field: K, value: MenuBarLayout[K] | undefined) =>
    updateDoc((doc) => {
      const section = doc.sections[0];
      if (!section) return doc;
      // patchMenuSectionForDevice honors undefined ⇒ delete-key-from-target,
      // PINNED in 501-01 §3 (`applyPatch` deletes on undefined on BOTH the
      // base and the mobile paths, then prunes empty group/mobile/responsive
      // exactly like clearMenuSectionOverride — never an own undefined key).
      // Sole undefined emitter today: fontWeight "Theme"
      // (setNavField("fontWeight", undefined), :694-700): on desktop/tablet
      // it deletes the base key exactly like the current flat writers
      // (:418-432/:622-633); on mobile it deletes the fontWeight override
      // leaf ⇒ re-inherits the desktop value (same net effect as Reset for
      // that key; the badge flips to Inherited) — asserted in tests.
      return patchMenuSectionForDevice(doc, section.id, device, "layout", { [field]: value });
    });

// setNavField (inside MenuBlockPanel): drop the patchBlock body; route the
// SAME section-level helper with group "navProps". Desktop writes land in the
// nav-items block props (base), mobile in responsive.mobile.navProps.
// NORMATIVE write target (501-01 §3): patchMenuSectionForDevice targets the
// FIRST nav-items block (findIndex), REGARDLESS of which nav-items block is
// selected in MenuBlockPanel. For docs with >1 nav-items block this is a
// behavior change from today's patchBlock-by-selected-id: editing a second
// nav-items block's appearance controls writes the FIRST block's props;
// non-first nav-items blocks keep their props but stop being writable
// through these controls.
const setNavField = <K extends keyof NavItemsProps>(field: K, value: NavItemsProps[K] | undefined) =>
  updateDoc((doc) => {
    const section = doc.sections[0];
    if (!section) return doc;
    return patchMenuSectionForDevice(doc, section.id, device, "navProps", { [field]: value });
  });

// patchBlock (:434-444) stays byte-identical — content-only writes.
```

`MenuBarPanel` and `MenuBlockPanel` gain a `device: PageBreakpoint` prop,
threaded from the host (`:1110-1124`). All writes remain event-handler-only.

### 3. Resolved display + override wiring in `MenuBarPanel`

```tsx
const section = doc.sections[0];
const resolved = section
  ? resolveMenuSectionAppearanceForDevice(section, device)
  : { layout: {}, navProps: {} };
const layout = resolved.layout;                       // replaces :461 flat read
const layoutOverride = (key: keyof MenuBarLayout) =>
  section !== undefined &&
  readMenuSectionOverrideValue(section, "mobile", "layout", key) !== undefined;
const resetLayout = (key: keyof MenuBarLayout) => () =>
  updateDoc((doc) =>
    doc.sections[0] ? clearMenuSectionOverride(doc, doc.sections[0].id, "mobile", "layout", key) : doc
  );
```

Wrap each of the 8 existing controls (`:474-529`):

```tsx
<MenuResponsiveControlShell device={device} override={layoutOverride("surfaceColor")}
    label="Surface color" onReset={resetLayout("surfaceColor")}>
  <ColorSwatchControl … value={toSwatchValue(layout.surfaceColor ?? SHELL_APPEARANCE_DEFAULTS.surfaceColor)} … />
</MenuResponsiveControlShell>
// …identically for borderColor, alignment, paddingX, paddingY, borderWidth,
// shadow, sticky. Control bodies/handlers unchanged apart from `layout` now
// being the RESOLVED record and setField being device-forked.
```

The Add-block rail and Blocks list are untouched except the visibility
indicator (step 6).

### 4. Resolved display + override wiring in `MenuBlockPanel` (nav-items)

Same pattern with `group = "navProps"` around the 9 existing nav controls
(`:671-748`): values read from `resolved.navProps.<key> ?? fallback`
(fallbacks unchanged: `SHELL_APPEARANCE_DEFAULTS.*`, `FONT_SIZE_FALLBACK`,
`FONT_WEIGHT_INHERIT` mapping), `override` / `onReset` per key via
`readMenuSectionOverrideValue` / `clearMenuSectionOverride`. `MenuBlockPanel`
needs the section handle — thread `doc` (or `section`) alongside `block`.
Write-target note (normative, 501-01 §3): these nav appearance controls write
the FIRST nav-items block via `patchMenuSectionForDevice` even when a
different nav-items block is selected — see the `setNavField` comment in §2.

Brand/cta/utility content inputs (`:752-847`) stay UNwrapped and keep
`patchBlock` (device-invariant content; see Overview).

### 5. Orientation SegmentedControl (nav-items panel)

```tsx
const orientationLabels: Record<string, string> = { horizontal: "Horizontal", vertical: "Vertical" };
// First control in the nav-items grid (before "Item gap"), same shell wrap:
<MenuResponsiveControlShell device={device} override={navOverride("orientation")}
    label="Orientation" onReset={resetNav("orientation")}>
  <SegmentedControl
    label="Orientation"
    value={resolved.navProps.orientation ?? "horizontal"}
    options={menuAppearanceOrientations}               // 501-01 export
    optionLabels={orientationLabels}
    onChange={(next) => setNavField("orientation", next as NavItemsProps["orientation"])}
  />
</MenuResponsiveControlShell>
```

Default `"horizontal"` displayed ⇒ no write until the user changes it (CSS
zero-emission for the default is 501-02's contract, not this file's).

### 6. Per-block visibility toggle + list indicator

In `MenuBlockPanel`, after the header row (`:636-667`), for EVERY block type:

```tsx
const visibleOnDevice = resolveMenuBlockVisibleForDevice(block, device);
const visibilityOverride =
  isMenuOverrideDevice(device) && block.responsive?.mobile?.visibility !== undefined;

{isMenuOverrideDevice(device) ? (
  <MenuResponsiveControlShell device={device} override={visibilityOverride}
      label="Visible on mobile"
      onReset={() => updateDoc((doc) => clearMenuBlockVisibilityOverride(doc, block.id, "mobile"))}>
    <ToggleSwitch label="Visible on mobile" value={visibleOnDevice}
      onChange={(next) => updateDoc((doc) => setMenuBlockVisibleForDevice(doc, block.id, "mobile", next))} />
  </MenuResponsiveControlShell>
) : block.type === "cta-button" || block.type === "divider" || block.type === "spacer" ? (
  // Leaf-block check. NOTE: menuDocumentV2.ts exports NO leaf predicate —
  // `isMenuLeafBlockType` (:380-381) and `MENU_LEAF_BLOCK_TYPES` (:71) are
  // module-private, so the editor inlines the three types verbatim; the
  // source of truth stays MENU_LEAF_BLOCK_TYPES and a vitest divergence
  // guard (see Test Plan) fails if the lists drift apart.
  // Flat visibility on desktop/tablet — LEAF blocks only (native blocks have
  // no flat visibility slot; menuDocumentV2.ts:364-365 key lists). Enables
  // "show only on mobile": flat visible:false + mobile override true.
  <ToggleSwitch label="Visible" value={block.visibility?.visible ?? true}
    onChange={(next) => updateDoc((doc) => setMenuBlockVisibleForDevice(doc, block.id, "desktop", next))} />
) : null}
```

Canvas interplay: `SelectableBlock` already stamps `data-menu-block-id`
(`:244`), so 501-02's flattened preview rule hides a mobile-hidden block on
the Mobile canvas — the block then remains reachable through the `MenuBarPanel`
Blocks list (`:558-603`). Add a discoverability indicator to each list row:
when `resolveMenuBlockVisibleForDevice(block, device) === false`, render an
`EyeOff` icon (lucide) with `data-menu-block-hidden={block.id}` and
`aria-label="Hidden on {DEVICE_LABELS[device]}"` next to the block label.
Pure render derivation from `doc` + `device` — no effect, no state.

### 7. Scope cue

```tsx
// :1072 —
deviceContext={{
  value: device,
  label: isMenuOverrideDevice(device)
    ? `${DEVICE_LABELS[device]} (overrides)`
    : `${DEVICE_LABELS[device]} (base)`,
}}
```

`data-page-editor-canvas-context={device}` (shared `CanvasEditor.tsx:138`)
stays the machine hook; tests assert the label text.

### 8. Undo/redo — verification only, no reducer change

`historyReducer` snapshots whole documents; `patchMenuSectionForDevice` /
`setMenuBlockVisibleForDevice` / `clearMenuSectionOverride` return new
documents (or identity on no-op). Nothing to change — regression tests pin:
mobile edit → undo restores a doc with NO `responsive` member; redo restores
the sparse override; a desktop edit after a mobile edit undoes independently.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/endpoint/RBAC/migration — the document rides the existing validated
`PATCH /menus/:id` write path.** Verified for this subtask:

- Every write in this file ends in the SAME `updateMenu(menuId, { document: doc })`
  call (`MenuDesignEditor.tsx:934`/`:947`) — `menuUpdateSchema`
  (`core/server/validation/menuSchemas.ts:12`) already allows
  `document: { type: ["object","null"] }` (`:30`) with service-side strict
  validation, so this subtask adds ZERO endpoint, RBAC rule, or migration.
- Schema-first: the editor never invents shapes — it only calls the 501-01
  `normalize*`-backed helpers (`patchMenuSectionForDevice`,
  `setMenuBlockVisibleForDevice`, `clearMenuSectionOverride`,
  `clearMenuBlockVisibilityOverride`) whose outputs round-trip
  `normalizeMenuDocumentV2ForWrite` (reject-unknown,
  `MenuDocumentError`+path). Non-destructive legacy: docs without
  `responsive` render and edit exactly as today (desktop path is byte-flat
  writes); deterministic contracts: sparse override records, explicit Reset
  (no auto-remove-on-equality), prune-on-clear.
- React hooks rules: no setState-in-effect is introduced; all device-forked
  writes and Resets are event-handler dispatches into the existing
  `useReducer` atom; the hidden-block indicator and badges are pure render
  derivations of `doc` + `device`.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI; extend `tests/vitest/ui/menu-design-editor.test.tsx`
— happy-dom + `createRoot` harness with the hoisted `menusClientState` mock
already in place):**

- **Device-forked layout write:** switch DeviceSwitcher to Mobile, change
  "Horizontal padding"; Save; assert the `updateMenu` payload document has
  `sections[0].layout` UNCHANGED and
  `sections[0].responsive.mobile.layout.paddingX` set (sparse — no sibling
  keys). Desktop edit of the same control writes `sections[0].layout.paddingX`
  and creates NO `responsive` member.
- **Device-forked nav write:** on Mobile, change "Item gap"; assert nav-items
  block `props` unchanged + `responsive.mobile.navProps.itemGap` set.
- **First-nav-items write target (>1 nav-items):** doc seeded with TWO
  nav-items blocks; select the SECOND and edit a nav appearance control ⇒ the
  FIRST block's `props` mutate (Desktop) / section `responsive.mobile.navProps`
  is written (Mobile); the second block's `props` stay byte-identical
  (normative per 501-01 §3).
- **Tablet writes base:** on Tablet, edit a control; assert the base mutated,
  no `responsive` record, and the badge reads "Base"
  (`data-menu-responsive-badge="base"`).
- **Resolved display vs base badge:** doc seeded with base `paddingX: 8` +
  `responsive.mobile.layout.paddingX: 24` — on Mobile the slider shows 24 and
  `data-menu-responsive-field="override"`; a NON-overridden sibling control
  shows the base value with state "inherited"; on Desktop all badges "base".
- **Reset:** click `[data-menu-responsive-reset="Horizontal padding"]` on
  Mobile; assert the override leaf is gone, empty `mobile`/`responsive`
  records pruned from the saved document, badge flips to "inherited", and the
  displayed value re-inherits the desktop value. Reset button absent when no
  override and absent on Desktop.
- **fontWeight "Theme" on Mobile — full round-trip (delete-on-undefined):**
  with a mobile `fontWeight` override present, selecting "Theme" on Mobile
  deletes the override leaf (empty `mobile`/`responsive` records pruned from
  the saved doc, NO own `undefined` key anywhere — assert via
  `hasOwnProperty`), the segmented control re-inherits the desktop value,
  the badge flips to "inherited", the Reset button disappears (no override
  left to clear), and undo restores a doc deep-equal to the pre-"Theme" doc
  (override present again, badge back to "override"); on Desktop it deletes
  the base key exactly like today's flat writer (no `undefined` own-key in
  the nav-items `props`). The helper-level halves of this matrix (both-path
  delete + prune) are pinned in 501-01's "Delete-on-undefined patch" bullet.
- **Orientation:** segmented control renders Horizontal/Vertical with
  resolved default "horizontal"; selecting Vertical on Desktop writes
  nav-items `props.orientation`; on Mobile writes
  `responsive.mobile.navProps.orientation`; default selection performs no
  write.
- **Visibility:** on Mobile, toggle "Visible on mobile" off for the
  cta-button ⇒ `responsive.mobile.visibility.visible:false` on the block,
  flat `visibility` untouched; blocks-list row shows
  `data-menu-block-hidden`; Reset clears the record. On Desktop, leaf block
  shows the flat "Visible" toggle (writes flat `visibility.visible`), native
  blocks show none.
- **Leaf-list divergence guard:** the editor's inlined leaf-type check (step
  6) must equal schema truth without importing the private
  `MENU_LEAF_BLOCK_TYPES`: for EVERY type in the exported `menuBlockTypes`,
  run `normalizeMenuDocumentV2ForWrite` on a doc whose block of that type
  carries `visibility: { visible: false }` — assert the set of types that
  ACCEPT it (vs throw `MenuDocumentError`) is exactly
  `{"cta-button","divider","spacer"}`, i.e. the editor's inline list. A new
  leaf/native type added to the schema fails this test until step 6's list is
  updated.
- **Content stays flat:** on Mobile, edit the cta "Label" input ⇒ base
  `props.label` mutated, no `responsive` record, control carries no badge.
- **Undo/redo across forks:** mobile edit → undo ⇒ doc deep-equals the
  pre-edit doc (no `responsive` residue); redo restores the sparse override.
- **Scope cue:** canvas context pill reads "Mobile (overrides)" /
  "Tablet (base)" / "Desktop (base)".
- **No setState-in-effect regressions:** the existing lifecycle assertions of
  the suite keep passing (act-wrapped renders produce no warning spew).

**Bun lane:** none owned here — route/runtime persistence of `responsive`
payloads and CSS emission are covered by 501-01/501-02/501-04 suites
(`tests/integration/routes/menus.test.ts`,
`tests/unit/site/menu-document-render.test.tsx`,
`tests/unit/pages/siteShellCss.test.ts` byte-identity untouched).

**Gates before closure:** `bun --cwd core lint`, `bun --cwd core lint:types`,
full vitest. Live smoke (canvas override editing + Reset re-inherit) belongs
to 501-04's playwright pass.

---

## Acceptance Criteria

1. With DeviceSwitcher on Mobile, panel edits create sparse
   `responsive.mobile` records (layout, navProps, block visibility) and the
   Mobile canvas reflects them; Desktop/Tablet edits keep writing the flat
   base and the Desktop canvas is unchanged by mobile overrides.
2. Every device-forkable control shows the Base/Override/Inherited badge from
   BASE-record detection while displaying RESOLVED values; Reset
   (`data-menu-responsive-reset`) removes the override, prunes empty records,
   and re-inherits live.
3. Orientation SegmentedControl present in the nav-items panel; per-block
   mobile visibility toggle present for all block types on Mobile (+ flat
   leaf toggle on Desktop); hidden blocks flagged in the Blocks list.
4. Content controls (brand/cta/utility) remain flat and badge-less; undo/redo
   works across device-forked writes; no setState-in-effect.
5. Vitest matrix above green; lint + types green.

---

## Documentation Updates Required

- None owned here beyond code comments; the changelog entry, menuDocumentV2
  doc cross-links, and README/board/Statistics rows are 501-04 (closing
  agent) per the parent task.
