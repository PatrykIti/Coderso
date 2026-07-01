# TASK-499-01: Menu Items Editor Restyle (three-pane prototype)
# FileName: TASK-499-01-Menu-Items-Editor-Restyle.md

**Priority:** High
**Category:** Admin UI / Content (Menus) / Visual Refresh
**Estimated Effort:** Large
**Dependencies:** TASK-479 (admin redesign tokens + shared primitives)
**Status:** ⏳ To Do
**Parent Task:** TASK-499

---

## Overview

Re-skin the items/routes editor (`/menus/:id`) to the prototype's single
three-pane `EditorPreviewFrame` chrome — a chrome bar (title + item count +
Undo/Redo slot), a typed **"Add items"** left rail, a dotted canvas of compact
rows, and an **always-on "Item settings"** right inspector — while preserving
ALL live behavior. This is a re-skin: the `MenuEditorPage` hook block (state /
effects / handlers) and the DnD/keyboard/parent/save logic stay intact; only the
chrome and the row/inspector presentation change.

- **Goal:** `core/admin/ui/menus/MenuEditorPage.tsx` renders the three-pane frame
  instead of `SplitShell` + `PageHeader` + two stacked `Card`s, with a typed rail
  and an always-on inspector, keeping `moveMenuItems`/`moveMenuItemToRoot`,
  keyboard move/indent/outdent, parent reparent, and `persistMenuEditorState`.
- **Owning modules:** `core/admin/ui/shared/EditorFrame.tsx` (new),
  `core/admin/ui/shared/EditorRail.tsx` (extend: route `disabled`/`title`-bearing
  items to the `<button>` branch + add disabled styling, so handler-less deferred
  Posts/Categories items are not silently dropped to the live-looking `<div>` branch — §1),
  `core/admin/ui/menus/{MenuEditorPage,MenuTree,MenuItemRow,MenuItemForm,MenuItemDrawer}.tsx`,
  `core/services/menus/menuItemSettings.ts` (+ `openInNewTab`, `variant`),
  `core/server/validation/menuSchemas.ts` (extend the `menuItemsSchema` per-item
  `settings` allowlist with `openInNewTab`/`variant` — the EXISTING
  `PUT /menus/:id/items` body schema, `:47-68`, is `additionalProperties:false`
  and currently allows ONLY `visibility`/`badge`/`description`/`icon`, so it would
  4xx the two new keys at the route boundary BEFORE `replaceMenuItems`/
  `normalizeMenuItemSettings` ever run — see §6),
  `core/services/navigation/navigationMenuMapping.ts` (settings → meta `target`/`variant`),
  `core/widgets/core/navigation.tsx` (`NavigationItemMeta.variant?` — the SOLE
  definition of `NavigationItemMeta` is here at `:46-54`, NOT in `siteShell.tsx`;
  `normalizeNavigationItemMeta` `:1394` and `navigationSchema`
  (`additionalProperties:false`) need NO change because the menu→`SiteHeaderNav`
  render path does not run them),
  `core/site/siteShell.tsx` (`SiteNavItem` button class ONLY — it imports just
  `NavigationItem` at `:8` and reads `meta.variant`; it does NOT own
  `NavigationItemMeta`).
  `AdminShell` is CONSUMED (outer wrapper), not edited.
- **Prototype to port from:** `_docs/_PROTOTYPE/src/pages/content/MenuEditorPreview.tsx`
  + `_docs/_PROTOTYPE/src/components/patterns/EditorPreviewFrame.tsx`.
- **Out of scope:** the Design tab (TASK-499-03/04); any change to the DnD
  intent math, the tree builder, the cache/refresh policy, or the menu routes.

> **Preserve untouched (real behavior the prototype only mimics):**
> DnD drop-intent resolution `MenuTree.tsx:139-166` → `moveMenuItems`
> (`MenuEditorPage.tsx:214-265`, intents `child|before|after`); keyboard
> move/indent/outdent `MenuTree.tsx:18-67`; parent reparent + reindex
> `handleSaveItem` (`:602-626`) / `moveMenuItemToRoot` (`:267-296`);
> Save/Publish/Discard lifecycle `persistMenuEditorState` (`:677-730`) +
> `buildMenuItemsPayload` (`:190-212`) → `replaceMenuItems`; cache refresh
> policy `:452-515`. **Do not weaken these or their tests.**

> **Row fidelity reconciliation (HARD CONSTRAINT — resolves the restyle vs.
> preserved-affordance conflict). Split the row's locked assertions into BEHAVIOR/A11Y
> (must stay byte-stable) vs pure PRESENTATION (must be COMPACTED toward the
> prototype).** The prototype row is deliberately light (`MenuEditorPreview.tsx:47-64`):
> a bare `size-4` `GripVertical`, NO letter/status avatar, `pl-8` + a single
> `CornerDownRight` for nesting (no text hint), one truncated mono URL subline, no
> per-row badges. The restyle MUST move the row **toward** that shape — NOT preserve
> today's heavy row inside a new frame. Preserving the heavy row and freezing its
> visual assertions "to keep the suites green" would repeat the Posts **D4/B6**
> "keep the old + protect it with frozen tests" pattern the owner rejected; the
> earlier "keep grip/avatar/description/hint byte-stable" phrasing is therefore
> **superseded** by this split. Concretely:
>
> **KEEP (behavior + a11y — the prototype omits these only because it is a STATIC
> mock; they are real affordances and MUST stay byte-stable, ZERO assertion edits):**
> - the **drag handle** as a `draggable` element with `data-menu-drag-handle` +
>   `aria-label="Drag ${label}"` (`MenuItemRow.tsx:142-161`) — gated at
>   `menu-item-row.test.tsx:57-59`. Only its VISUAL box compacts (below); the handle
>   stays a real draggable, aria-labelled control.
> - the keyboard **move up / move down / indent / outdent** toolbar
>   (`MenuItemRow.tsx:235-254`) — the ONLY non-drag reorder/nesting path — kept as a
>   compact hover/overflow toolbar; the `aria-label`s `Move up|Move down|Indent|Outdent ${label}`
>   stay byte-stable (gated at `menu-item-row.test.tsx:70-74`, `menu-tree.test.tsx:258-271`).
> - the **`CornerDownRight` nested-indent affordance** + its `data-menu-nested-indent`
>   marker (`MenuItemRow.tsx:162-169`) — this is the PROTOTYPE's own nesting cue, gated
>   at `menu-item-row.test.tsx:79-86`; keep it (it REPLACES the text hint below).
> - the **`RowDropIndicator` drop-line labels** ("Drop before" / "Drop after",
>   `MenuItemRow.tsx:51-141`) + the `data-menu-drop-line="${id}:${intent}"` and
>   "Drop as sub-menu" markers that surface the live DnD intent (gated at
>   `menu-item-row.test.tsx:98-113`, `menu-tree.test.tsx:150-180`).
> - the active-row selection hook `data-menu-row-active` + `bg-primary-soft/40`
>   (`menu-item-row.test.tsx:89-96`).
>
> **COMPACT toward the prototype (pure PRESENTATION — these row-VISUAL assertions
> are UPDATEABLE alongside the intentional restyle, NOT frozen):**
> - replace the 48px grip BOX (`flex h-12 w-12 … border bg-muted/40 … self-center`,
>   `MenuItemRow.tsx:144`) with a **bare `size-4` grip** on the (still-`draggable`,
>   still-aria-labelled) handle — UPDATE the `h-12`/`w-12`/`self-center`/
>   `[&_svg]:pointer-events-none` grip-box assertions (`menu-item-row.test.tsx:61-64`)
>   to the compacted grip.
> - **drop the 36px letter/status avatar** (`MenuItemRow.tsx:188-199`) — the label +
>   URL subline carry the row; keep the `AlertTriangle`/"Missing URL" ERROR affordance
>   (`:226-233`) as the only status marker.
> - **drop the redundant TEXT "Sub-item of X" hint** (`MenuItemRow.tsx:98,209-214`) —
>   `pl-8` + the kept `CornerDownRight` already convey nesting — and UPDATE the
>   `Sub-item of Home` assertion (`menu-item-row.test.tsx:68`, `menu-tree.test.tsx:124`)
>   accordingly. Collapse the subline to the truncated `href`/page path (mono), matching
>   the prototype.
>
> The must-stay-green bucket for the two row suites is therefore **behavior + a11y
> labels + DnD/nesting markers**, NOT the old visual byte-shape:
> `menu-item-row.test.tsx` / `menu-tree.test.tsx` keep ALL of their
> DnD/keyboard/marker assertions with ZERO edits; only the enumerated pure-VISUAL
> assertions (grip-box dims, avatar, the "Sub-item of X" text) are updated to match
> the restyle. No functional affordance and no DnD/a11y marker is removed or
> relocated off the row.

---

## Security Contract

No NEW endpoint and no RBAC change. Items continue to persist through the
existing `PUT /menus/:id/items` → `replaceMenuItems` (per-item `settings` jsonb)
and metadata through `updateMenu`. The ONE route-schema touch is additive and
strict: the EXISTING `menuItemsSchema` per-item `settings` object
(`menuSchemas.ts:47-68`, `additionalProperties:false`) gains two optional keys —
`openInNewTab: { type: "boolean" }` and `variant: { enum: ["link", "button"] }`
(§6) — mirroring how `visibility`/`badge` were added in TASK-458; without this the
body is rejected (4xx) before any service code runs. The TWO model additions —
`openInNewTab` and `variant` on `MenuItemSettings` — are additive and fail-soft:
they ride the existing per-item `settings` jsonb (no migration;
`menu_items.settings` is `jsonb NOT NULL DEFAULT {}`), are dropped when malformed
by `normalizeMenuItemSettings`, and are
presentation-only — `openInNewTab` only ever sets the front link's
`target="_blank" rel="noopener noreferrer"` (already honored at
`siteShell.tsx:99-100`), and `variant: "button"` only ever applies a
server-rendered button class in `SiteNavItem` (absent ⇒ `"link"` ⇒ byte-identical
to today; the `buildSiteShellCss(null)` default path is untouched). No new public
surface.

---

## Implementation Pseudocode

### 1. New shared `EditorFrame.tsx` (frame wrapper only — REUSE the shipped rail)

The rail primitives already EXIST as shared, wireable exports: TASK-497-02 (B9)
shipped `core/admin/ui/shared/EditorRail.tsx` — `EditorRailGroup` (`:12`) and a
real-`<button>` `EditorRailItem` (`:23`, spreads `ButtonHTMLAttributes`, so
`disabled` is already supported for the Pages-empty / Posts-Categories
deferred-disabled cases) — already consumed by
`admin/ui/posts/editor/blocks/BlockInserter.tsx`. Do **NOT** re-declare a second
copy of those two primitives inside `EditorFrame.tsx` (that forks the identical
prototype port in `shared/` and the copies will drift). `EditorFrame.tsx`
contributes ONLY the frame wrapper (chrome bar + `w-60` left / dotted canvas /
`w-72` right three panes); the menu rail IMPORTS `EditorRailGroup`/`EditorRailItem`
from the existing `EditorRail.tsx`.

```tsx
// core/admin/ui/shared/EditorFrame.tsx
// Real admin port of the prototype EditorPreviewFrame *frame* only. The rail
// primitives are NOT re-declared here — they live in ./EditorRail (TASK-497-02 B9)
// and are re-exported at the bottom so the menu page imports them from one place.
// Same SHAPE as the prototype (chrome bar / w-60 left rail / bg-dotted canvas /
// w-72 right inspector), but the action slots are REAL (no "Preview only" pill).
export function EditorFrame({
  title, toolbar,            // chrome: title + count badge + host toolbar slot
  actions,                   // chrome-right: Undo/Redo OR real Save/Publish slot
  left, canvas, right,       // three panes
  className,
}: {
  title: ReactNode; toolbar?: ReactNode; actions?: ReactNode;
  left?: ReactNode; canvas: ReactNode; right?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("flex min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-card", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-2.5">
        <div className="flex items-center gap-2"><span className="text-sm font-medium">{title}</span>{toolbar}</div>
        <div className="flex items-center gap-1.5">{actions}</div>
      </div>
      <div className="flex min-h-0 flex-1">
        {left ? <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-3 lg:block">{left}</aside> : null}
        <div className="min-w-0 flex-1 overflow-y-auto bg-dotted p-6">{canvas}</div>
        {right ? <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-border bg-card p-4 xl:block">{right}</aside> : null}
      </div>
    </div>
  );
}
// EditorRailGroup / EditorRailItem: NOT re-declared — re-exported from the shipped
// shared primitive so the menu rail imports them from one place:
export { EditorRailGroup, EditorRailItem } from "./EditorRail";
```

Reuse the existing `bg-dotted` token and the shipped `EditorRail.tsx` rail
primitives (do not fork a second copy).

**Deferred-rail wiring (HARD CONSTRAINT — closes the div-branch drop).**
`EditorRailItem` renders a real `<button>` carrying `{...rest}` (so `disabled` and
`title` apply) **only when an `onClick` is set**; a handler-less item falls to the
presentational `<div>` branch (`EditorRail.tsx:61-66`) that DROPS `disabled` and
`title`. So a deferred Posts/Categories item rendered handler-less + `disabled` +
`title="Coming soon"` (§3 option a) would ship as a live-looking, un-dimmed,
un-tooltipped **dead row** — the exact "faking" failure §3 forbids. The Pages-empty
item is safe (it keeps its `onClick`, so `disabled` lands on the `<button>` branch),
but the Posts/Categories deferred items are handler-less, so this MUST be fixed in
the ONE shared `EditorRail.tsx`: route any `disabled` (or `title`-bearing) item to
the `<button>` branch (rendered `disabled` + `aria-disabled`, `title` honored) — keep
the `<div>` branch only for truly static decorative items — and add the disabled
styling (`disabled:pointer-events-none disabled:opacity-50`). EXTEND that one shared
file rather than forking a second rail; do NOT rely on passing `disabled` to a
handler-less `EditorRailItem` (it is silently dropped today). The frame is presentation-only
and is the foundation reused by TASK-499-03's Design tab chrome (same family as
`CanvasEditor`). The right inspector aside is `xl:block` (≥1280px,
prototype-faithful — `EditorPreviewFrame.tsx:73`); the menu page MUST align its
mobile-`Sheet` trigger to the SAME `xl` breakpoint (see §2's `isLargeScreen`
retune) so there is no 1024–1279 dead band where the inspector is unreachable.

### 2. Rewrite `MenuEditorPage.tsx` render onto `EditorFrame`

Keep the hook block (`:340-755`) state / effects / handler LOGIC intact. Replace
only the returned `SplitShell` JSX (`:757-1024`), PLUS exactly two surgical,
explicitly-authorized hook edits this contract requires: (a) the typed
`handleAddItem` dispatch (§3, replacing `:557-576`) and (b) the responsive
breakpoint retune below. No other hook line changes.

**Breakpoint retune (HARD CONSTRAINT — closes the lg–xl inspector dead band).**
The ported `EditorFrame` right inspector pane is `xl:block` (≥1280px, matching the
prototype `EditorPreviewFrame.tsx:73`), so below `xl` the inline inspector is
CSS-hidden and item settings (Label / URL / Visibility / Open-in-new-tab) must be
reached through the existing mobile `Sheet`. But that Sheet only auto-opens when
`!isLargeScreen`, and `isLargeScreen` is today `matchMedia("(min-width: 1024px)")`
(`:384`) — leaving a **1024–1279px dead band** where the inline pane is hidden AND
the Sheet never opens, so the inspector (the only place to edit Label/URL/
Visibility/openInNewTab) is unreachable on common laptop/tablet widths (jsdom
computes no layout, so menu UI tests would still pass and the regression would
ship silently). **Retune the `isLargeScreen` media query to
`(min-width: 1280px)`** so the Sheet trigger aligns with the `xl` inspector
breakpoint: `< xl` genuinely routes to the Sheet (the prototype's intent — left
rail `lg:block`, right inspector `xl:block`, the Sheet covers everything below xl)
and `≥ xl` uses the inline pane. This is the ONLY change to the `isLargeScreen`
effect; its six consumers (`:552,573,580,696,760,783` — Sheet auto-open on
select / add / validation-error + inline-vs-Sheet routing) are otherwise
untouched, and the matchMedia mock returns `matches:true` regardless of the query
string (`menu-editor-shell-wave.test.tsx:160-167`), so existing suites stay green.
Do **NOT** instead push the right inspector to `lg:block`: at the lg band the
admin sidebar (`w-64`, `md:flex` — `SidebarNav.tsx:243`) + left rail (`w-60`) +
right inspector (`w-72`) crush the `max-w-xl` canvas card to an unusable width, so
routing the inspector to the Sheet below xl is the lower-risk path.

**KEEP the admin chrome.** Admin sidebar + topbar + breadcrumbs are provided
per-page by `AdminShell` (today via `SplitShell`, which wraps `AdminShell` —
`SplitShell.tsx:1-33`); there is NO router-level shell. Because the inspector now
lives inside `EditorFrame` (not the `SplitShell` right `aside`), drop `SplitShell`
but **retain `AdminShell` as the OUTER wrapper** (`activeHref="/admin/menus"` +
the menu `breadcrumbs` + `topbarActions` = StatusBadge/Unsaved pill, exactly the
props passed to `SplitShell` today at `:757-774`). Do NOT return a bare `<div>` —
that would ship a chrome-less editor (no sidebar/topbar), and no menu test guards
the shell, so it would pass CI silently:

```tsx
return (
  <AdminShell
    activeHref="/admin/menus"
    breadcrumbs={["Content", "Menus", title]}
    topbarActions={/* StatusBadge + Unsaved pill — EXISTING, verbatim from :760-773 */}
  >
   <div className="flex h-full flex-col gap-6">
    {/* identity moves to PageHeader ABOVE the frame; DROP the "Theme location /
        Menu name" metadata Card (the prototype has no counterpart). */}
    <PageHeader
      title={title}
      breadcrumbs={["Content", "Menus", title]}
      actions={/* StatusBadge + Unsaved pill + Design button (navigate
                  `/menus/${id}/design`) + Discard + Save changes + Publish/
                  Move-to-Draft — the EXISTING handlers verbatim (:805-846). */}
    />
    {/* error / missing / remoteUpdatePending / loading banners — keep wiring, restyle only */}
    <EditorFrame
      title="Menu editor"
      toolbar={<Badge variant="outline">{`${rootCount} items`}</Badge>}
      left={<MenuAddItemsRail onAdd={handleAddItem} pageCount={pages.length} />}     // §3
      right={<MenuItemInspector ... />}                                              // §4 always-on
      canvas={
        <Card className="mx-auto max-w-xl p-4 shadow-card">
          <div className="mb-3 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
          {displayTree.length === 0
            ? <EmptyState .../>
            : <MenuTree items={displayTree} activeId={activeItemId}
                onSelect={handleSelectItem} onEdit={handleEditItem}
                onDelete={handleRequestDeleteItem} onMove={handleMove} />}
          {/* dashed "Add menu item" affordance — already ported at :971-978;
              keep data-menu-add-item="dashed" wired to handleAddItem("custom-link"). */}
        </Card>
      }
    />
    <MenuItemDeleteDialog .../>           {/* keep verbatim */}
    {/* mobile (< xl): the existing Sheet renders the SAME MenuItemInspector
        (re-point rightPanel :732-745 from MenuItemDrawer to MenuItemInspector),
        so openInNewTab/variant are editable across the whole < xl range and the
        inline vs Sheet inspector UIs are identical — see §4 MOBILE-SHEET */}
   </div>
  </AdminShell>
);
```

- Relocate **theme location** out of the dropped metadata Card into the
  inspector's empty-state ("Menu settings" — shown when `activeItemId === null`),
  keeping `menuLocation`/`setMenuLocation`, `describeMenuLocationState`
  (`:178-188`), and `buildMenuMetadataPatch` (`:663-675`) intact. Carry the WHOLE
  guidance block verbatim into the empty-state: the **"Theme location"** label
  (`:912`), the help paragraph **"Slot key used by the theme or Navigation widget,
  for example…"** (`:918`), AND the `describeMenuLocationState` output text (`:751`
  → "Assigned to the primary theme slot." / "Not assigned to a theme slot."), so the
  `MenuEditorPage renders editor-side location guidance` test
  (`menu-editor-shell-wave.test.tsx:175-199`, which asserts the label + the help
  paragraph at `:181` + the state text at `:182/:230`) stays green with ZERO
  assertion edits — do NOT drop the help paragraph when re-skinning.
- Compute `rootCount = items.filter(i => i.parentId === null).length` for the
  chrome count badge.

### 3. Typed "Add items" rail — mapped to the real model (no faking)

The item model is `pageId` XOR `href` (`menuService.ts:93-95`). Replace the
single untyped `handleAddItem` (`:557-576`) with a typed dispatch:

```tsx
type AddSource = "page" | "custom-link" | "button";   // phase-1 REAL sources
function handleAddItem(source: AddSource = pages.length ? "page" : "custom-link") {
  if (!menuId) return;                                  // PRESERVE the existing guard (:558) — no-op without a menu
  const base = { id: createTempId(), parentId: null,
    orderIndex: items.filter(i => i.parentId === null).length,
    settings: { visibility: "all" } as MenuItemSettings };
  const next: MenuItemRecord =
    source === "page"   ? { ...base, label: pages[0]?.title ?? "New page link", href: null, pageId: pages[0]?.id ?? "" }
  : source === "button" ? { ...base, label: "Button",      href: "",  pageId: null, settings: { ...base.settings, variant: "button" } /* REAL per-item variant — §5 */ }
  :                       { ...base, label: "Custom link",  href: "",  pageId: null };
  setItems(prev => [...prev, next]); setActiveItemId(next.id); setIsDirty(true);
  if (!isLargeScreen) setDetailsOpen(true);             // PRESERVE the mobile add→edit Sheet auto-open (:573-575) — honors §2's ':573 consumer untouched' claim
}
```

Both the `if (!menuId) return;` guard and the `if (!isLargeScreen) setDetailsOpen(true);`
auto-open are CARRIED VERBATIM from the current `handleAddItem` (`:557-576`): the
guard keeps the rail/dashed affordances inert when no menu is loaded, and the
auto-open is the `:573` Sheet consumer §2 lists among the six "otherwise untouched"
`isLargeScreen` consumers. Dropping the auto-open would regress the `< xl` add→edit
flow (after §2 retunes the inspector to the Sheet below 1280px) — the just-added
item, typically a `custom-link`/`button` with empty `href`, would be selected but
its editing surface would never open, so its Label/URL could not be set and it
would then fail `validateMenuItemsPayload` on Save.

Rail (`EditorRailGroup label="Add items"`): **Pages** (`FileText` → `handleAddItem("page")`),
**Custom link** (`LinkIcon` → `"custom-link"`), **Button** (`SquareMousePointer` → `"button"`).

**"Button" is REAL, not a relabelled custom link.** It must be model-distinguished
and front-rendered as a button — otherwise it would be faking (forbidden, same bar
as Posts/Categories). It is made real by a per-item `settings.variant: "button"`
field threaded EXACTLY like `openInNewTab` (§5): fail-soft, presentation-only, no new
endpoint. This is independent of PART 2's `cta-button` (a Design-document block, not
a menu item) — a "Button" item is a nav item that renders with button styling; both
can coexist. (If, on closure, the front button-style thread is descoped, then Button
must be shipped DISABLED with a "Coming soon" title exactly like Posts/Categories and
flagged in the closure — it must never ship as an undifferentiated custom link.)

**Posts / Categories — DO NOT FAKE.** Items carry no post/category FK (only
`pageId`/`href`). Ship them either (a) **deferred** (render the two rail items
`disabled` with a "Coming soon" title), or (b) **content-route-backed**: insert
`{href}` against an enumerable `site.contentRoutes` slug
(`publicSite.tsx:880-883`) behind a small picker. Land Pages + Custom link +
Button in this subtask; gate Posts/Categories behind the chosen path and flag it
explicitly in the closure. `Pages` rail item is `disabled` when `pages.length === 0`.

### 4. Always-on "Item settings" inspector

Replace the select-only `MenuItemDrawer` aside with an always-rendered inspector:

```tsx
function MenuItemInspector({ activeItem, onChange, menuSettingsSlot }) {
  if (!activeItem) return menuSettingsSlot;   // empty state = menu-level settings (name + theme location)
  return (
    <>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Item settings</span>
        {activeItem.linkType === "page" ? <Badge variant="soft">Page</Badge> : <Badge variant="soft">Link</Badge>}
      </div>
      {/* PRIMARY fields (prototype default): Label / Link (link-type-aware) /
          Open in new tab / Visibility */}
      <InspectorRow label="Label"><Input .../></InspectorRow>
      {/* LINK — SINGLE SOURCE OF TRUTH, link-type-aware (mirrors MenuItemForm's
          existing linkType conditional: EITHER the page picker OR the href input,
          never both). The item model is pageId XOR href (menuService.ts:93-95): a
          page item has href===null and derives its link from pageId. So:
          - url / custom-link / button items -> the editable mono href Input (the
            "URL" field);
          - page items -> the Page picker is the PRIMARY editable control, with the
            RESOLVED page path shown read-only/disabled beside it. NEVER an orphaned
            editable href for a page item (editing a bare href would silently convert
            it to a url item and corrupt the pageId link). */}
      {activeItem.linkType === "page" ? (
        <>
          <InspectorRow label="Page"><PagePicker value={pageId} onChange={setPageId} /></InspectorRow>
          <InspectorRow label="URL"><Input className="font-mono text-xs" value={resolvedPagePath} readOnly disabled /></InspectorRow>
        </>
      ) : (
        <InspectorRow label="URL"><Input className="font-mono text-xs" value={href} onChange={setHref} /></InspectorRow>
      )}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-border px-3 py-2.5">
        <div className="text-sm font-medium">Open in new tab</div>
        <Switch checked={openInNewTab} onCheckedChange={setOpenInNewTab} />   {/* §5 real field */}
      </div>
      <InspectorRow label="Visibility"><Select .../></InspectorRow>
      {/* ADVANCED (collapsible, default-closed): Link TYPE toggle (page<->url retype),
          Parent select, Display as (Link|Button — §5 variant), Badge label+tone,
          Description, Icon — the EXISTING MenuItemForm controls (+ the new variant
          segmented control), demoted so the default reads like the prototype. NOTE:
          the Page PICKER is NOT buried here — it is surfaced as the PRIMARY Link
          control when linkType==='page' (above); only the link-TYPE toggle stays in
          Advanced. */}
    </>
  );
}
```

**LINK SOURCE-OF-TRUTH (HARD CONSTRAINT — do not orphan/desync the page link).**
The primary "Link" control is link-type-aware, exactly mirroring the current
`MenuItemForm` `linkType`-conditional (which shows EITHER the page picker OR the
href input, never both). The prototype does not resolve this because its only
inspected mock item (`Products`/`/products`, `MenuEditorPreview.tsx:103-108`) is
url-typed; a literal unconditional "URL" `Input` promoted to primary would be
orphaned for page items (`href===null`, `MenuItemRow.tsx:205-207` resolves them to
the page title) and, if bound to `href`, would silently convert a page item to a
url item on edit. There is therefore exactly ONE editable link source per item:
`href` for url/custom-link/button, the Page picker for page items (the resolved path
is read-only). Do NOT render both an editable href AND a page picker for the same
item, and do NOT bury the page picker in Advanced for page items — it is the primary
link control.

Wire edits through the existing `handleSaveItem` (`:602-626`) shape so parent
reparent/reindex and `normalizeMenuItemSettings` are reused unchanged. Reuse
`MenuItemForm`'s `InspectorRow` + controls (`MenuItemForm.tsx:55-291`); restyle
into "primary vs Advanced" groups — do not delete the advanced fields, just
collapse them. Below `xl` (< 1280px) the inline inspector pane is CSS-hidden and
item settings render inside the existing `Sheet` (`:999-1010`) — this is
why §2 retunes `isLargeScreen` to `(min-width: 1280px)`, so the Sheet auto-opens
across the WHOLE `< xl` range (no 1024–1279 dead band).

**MOBILE-SHEET = SAME INSPECTOR (HARD CONSTRAINT — do not ship two divergent
inspector UIs; keeps `openInNewTab`/`variant` reachable < xl).** The Sheet must
render the SAME `MenuItemInspector` as the inline `≥ xl` pane — NOT the legacy
`MenuItemDrawer` → `MenuItemForm`. Today the Sheet renders `rightPanel`
(`:999-1010` → `rightPanel`, defined `:732-745` as `MenuItemDrawer`, which wraps
`MenuItemForm`), and per §5 the "Open in new tab" `Switch` (and the `variant`
"Display as" control) live in `MenuItemInspector`, NOT in `MenuItemForm`. If the
Sheet kept rendering `MenuItemDrawer`/`MenuItemForm`, then across the WHOLE
`< xl` range — the exact range the §2 breakpoint retune routes to the Sheet —
`openInNewTab`/`variant` would have NO editing UI at all, directly contradicting
§2's justification that the Sheet is "the only place to edit
Label/URL/Visibility/Open-in-new-tab" below xl, and shipping two divergent
inspectors (inline vs Sheet). Therefore re-point `rightPanel` at the new
`MenuItemInspector` (the same component + props the `right=` slot uses in §2), so
the Sheet and the inline pane render one identical inspector (Switch included)
everywhere below and at `xl`. `MenuItemDrawer` is either retired in favor of
`MenuItemInspector` inside the Sheet, or refactored to embed `MenuItemInspector`
as its body (its `onClose` Sheet-dismiss wiring may be preserved around the
inspector). This is a THIRD explicitly-authorized surgical edit to the render
block (alongside §2's `handleAddItem` dispatch and breakpoint retune): the
`rightPanel` definition (`:732-745`) is re-pointed from `MenuItemDrawer` to
`MenuItemInspector`; the hook LOGIC (`handleSaveItem`, `setDetailsOpen`,
`setActiveItemId`) is otherwise untouched.

### 5. `openInNewTab` + `variant` — make the prototype Switch AND the Button source real

Two additive, fail-soft `MenuItemSettings` fields, threaded identically:

```ts
// menuItemSettings.ts
export type MenuItemSettings = { visibility?; badge?; description?; icon?;
  openInNewTab?: boolean; variant?: "link" | "button" };   // "button" = §3 Button source
export type ResolvedMenuItemSettings = { ...; openInNewTab: boolean; variant: "link" | "button" };
// in normalizeMenuItemSettings (fail-soft, drop-unknown like the others):
if (source.openInNewTab === true) settings.openInNewTab = true;     // only persist when truthy
if (source.variant === "button") settings.variant = "button";      // only persist the non-default
// in resolveMenuItemSettings: openInNewTab: normalized.openInNewTab ?? false; variant: normalized.variant ?? "link"
// in hasMenuItemSettings / isResolvedMenuItemSettings: openInNewTab optional boolean; variant optional "link"|"button"
```

```ts
// navigationMenuMapping.ts
const menuSettingsToMeta = (value) => { const s = resolveMenuItemSettings(value);
  return { visibility: s.visibility, badge: s.badge, description: s.description, icon: s.icon,
           // CONDITIONAL — carry ONLY the non-default "button" into NavigationItemMeta,
           // OMIT the default "link" (mirrors the includeDefaultTarget `target` pattern at
           // navigationMenuMapping.ts:76). Every existing (link) item's `meta` byte-shape is
           // therefore UNCHANGED, so the exact `meta` toEqual locks in
           // tests/vitest/widgets/navigation.test.tsx:816-851 and
           // tests/vitest/ui/navigation-editor-wave.test.tsx:636-674 stay green with ZERO
           // assertion edits (current code emits no variant — navigationMenuMapping.ts:40-48).
           ...(s.variant === "button" ? { variant: "button" as const } : {}) }; };
// mapMenuNodesToNavigationItems — derive target from openInNewTab; KEEP the
// includeDefaultTarget contract for back-compat:
const settings = resolveMenuItemSettings(node.settings);
return { label: node.label, href: normalizeNavigationMenuHref(...),
  ...(settings.openInNewTab ? { target: "blank" as const }
      : options?.includeDefaultTarget ? { target: "self" as const } : {}),
  meta: menuSettingsToMeta(node.settings), children: ... };
```

- **`openInNewTab`:** the front already renders `target === "blank"` ⇒
  `target="_blank" rel="noopener noreferrer"` (`siteShell.tsx:99-100`) — no shell change.
- **`variant: "button"`:** extend `NavigationItemMeta` with `variant?: "link" | "button"`
  **in its sole definition, `core/widgets/core/navigation.tsx:46-54`** (NOT
  `siteShell.tsx`, which only imports `NavigationItem`), and have the front
  `SiteNavLink`/`SiteNavItem` (`siteShell.tsx:94-135`) render the button affordance when
  `meta.variant === "button"` (server-rendered, presentation-only). These are the only
  two touches the Button source needs (`normalizeNavigationItemMeta`/`navigationSchema`
  are NOT on the menu→`SiteHeaderNav` path, so they stay unchanged) — keeping it REAL
  end-to-end.
  **BYTE-IDENTITY GUARD (HARD):** the front nav styles via SEMANTIC classes whose CSS
  lives in `buildSiteShellCss` (the byte-identity-pinned sheet, e.g. `.site-nav-link`).
  Do NOT add a button rule to `buildSiteShellCss` — that would break
  `tests/unit/pages/siteShellCss.test.ts`. Apply the button styling via an INLINE
  `style` attribute (precedent: `siteNavExtrasStyle`, `siteShell.tsx:188`) OR a
  `data-site-nav-variant="button"` marker whose rule lives OUTSIDE the default sheet.
  Default (`variant` absent ⇒ `"link"`) emits NO extra style/marker ⇒ markup AND head
  CSS are byte-identical to today.

Thread BOTH fields through the inspector form value (`MenuItemForm.tsx:22-34`) + draft
mapping (`MenuItemDrawer.tsx:32-124`). The inspector surfaces `openInNewTab` (the Switch,
§4) and `variant` (a small "Display as: Link | Button" segmented control in the Advanced
group), so a Button item can be retyped to a plain link and back.

**SWITCH PLACEMENT (HARD CONSTRAINT — keeps `menu-item-form.test.tsx` green).** The
"Open in new tab" **`Switch`** is rendered by the NEW `MenuItemInspector` wrapper (§4
primary fields), **NOT** inside `MenuItemForm`. `MenuItemForm` gains ONLY the threaded
`openInNewTab`/`variant` VALUES on `MenuItemFormValue` (no `role="switch"` element) plus
the `variant` "Display as: Link | Button" SEGMENTED control (a segmented/radio group, not a
switch, and whose label is not "Open in new tab"). This is required because
`tests/vitest/ui/menu-item-form.test.tsx:97,121-124` (TASK-479-10-L02) asserts
`MenuItemForm` renders NO switch (`querySelector('[role="switch"]')` is `null`) and its
text does NOT contain "Open in new tab"; that suite is in the must-stay-green bucket, so the
Switch MUST live in the inspector wrapper, never in `MenuItemForm`. Because the
mobile `Sheet` is re-pointed to render the SAME `MenuItemInspector` (§4
MOBILE-SHEET), the Switch is reachable across BOTH the `≥ xl` inline pane AND the
`< xl` Sheet — putting it in the inspector wrapper (not `MenuItemForm`) satisfies
the `menu-item-form.test.tsx` "no switch" lock WITHOUT leaving `openInNewTab`
unreachable below 1280px.

### 6. Route-body schema — accept `openInNewTab` + `variant` on the EXISTING items PUT

The model thread above is INERT without this: `PUT /menus/:id/items` validates the
body with the STRICT `menuItemsSchema` (`menuRoutes.ts:178` → `replaceMenuItems`
`:180`), whose per-item `settings` object is `additionalProperties:false` and today
allows ONLY `visibility`/`badge`/`description`/`icon` (`menuSchemas.ts:47-68`). An item
carrying `settings.openInNewTab:true` or `settings.variant:"button"` is rejected at the
route boundary (4xx) BEFORE `replaceMenuItems`/`normalizeMenuItemSettings` run — so the
real Save (and the §"Testing" real-input smoke "toggle Open-in-new-tab, Save+Publish")
would fail even though the unit normalizer tests pass. Extend the EXISTING schema (no new
route), keeping `additionalProperties:false`:

```ts
// core/server/validation/menuSchemas.ts — menuItemsSchema items.items.properties.settings.properties:
//   ... existing visibility / badge / description / icon ...
   openInNewTab: { type: "boolean" },
   variant: { enum: ["link", "button"] },
//   (additionalProperties:false stays) — mirrors how visibility/badge were added in TASK-458.
```

The values are still re-validated server-side by `normalizeMenuItemSettings` (fail-soft,
drop-unknown); the schema only widens the accepted body so a real Save round-trips.

**Error handling:** unchanged — keep every Alert banner, the toast wiring, and
`isApiClientError` handling; the rail/inspector restyle adds no new error state.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- New `EditorFrame` render test: three panes + chrome slots render; rail items
  fire `onClick`; `disabled` items do not — INCLUDING a handler-less deferred item
  (no `onClick`, `disabled`, `title="Coming soon"`): assert it renders a real
  `disabled` control that is dimmed and surfaces the title (guards the
  `EditorRail.tsx` div-branch drop above), NOT a live-looking clickable div.
- `MenuEditorPage` restyle (`tests/vitest/ui/menu-editor.test.tsx`,
  `menu-editor-shell-wave.test.tsx`): typed rail dispatch inserts the correct
  link shape per source (`page` ⇒ `pageId`, `custom-link` ⇒ `href`, `button` ⇒
  `href` + `settings.variant:"button"`); always-on inspector edits
  Label/URL/Visibility/new-tab/variant; theme-location relocated to the empty
  state still saves. **Link source-of-truth (§4):** a `page` item shows the Page
  picker as the PRIMARY link control + a read-only resolved path (NOT an editable
  href), and retyping page↔url via the Advanced link-type toggle swaps the single
  editable control — assert a page item still round-trips as `pageId` (its `href`
  stays `null`, never corrupted to a url item by the inspector). **Mobile-Sheet =
  same inspector (§4 MOBILE-SHEET):** with a selected item and `detailsOpen`, the
  `Sheet` path renders the SAME `MenuItemInspector` — assert the Sheet body
  contains the "Open in new tab" `Switch` (`[role="switch"]` present, mirroring
  the inline `≥ xl` assertion) and the `variant` "Display as" control, so
  `openInNewTab`/`variant` are provably editable below `xl`; assert the Sheet no
  longer renders the legacy `MenuItemForm`-only drawer body. **Assert the admin chrome survives** the SplitShell→AdminShell
  swap: the rendered tree still has the sidebar/topbar (e.g. a sidebar nav
  landmark / `activeHref="/admin/menus"` marker), since no existing menu test
  guards the shell (`menu-editor-shell-wave.test.tsx` asserts only text).
- **`menu-editor-shell-wave.test.tsx` MUST be UPDATED, not deleted (lifecycle +
  payload coverage stays).** The typed-rail + dropped-metadata-Card rewrite breaks
  it in at least FOUR unflagged ways that must each be re-pointed (NOT dropped, and
  NOT papered over by re-introducing removed chrome): (1) the untyped "Add Item" header
  button is gone, so `clickButton(view.container, "Add Item")` (`:344,406`) must be
  re-pointed **specifically at the typed "Pages" rail item** — it inserts a VALID
  `pageId` item (`{label: pages[0].title ("Home"), pageId: "page-1", parentId: null}`,
  §3, since this test seeds `page-1`/title `"Home"` at `:312-322`) that passes
  `validateMenuItemsPayload` and round-trips. Do **NOT** re-point this
  lifecycle/operations-lock test at the dashed `data-menu-add-item="dashed"`
  affordance, nor at a bare Custom-link/Button rail item: the dashed affordance is
  wired to `handleAddItem("custom-link")` (§2/§3), which inserts `href:""` — an item
  with neither `href` nor `pageId` FAILS `validateMenuItemsPayload`
  (`MenuEditorPage.tsx:298-318`), and `persistMenuEditorState` runs that validation
  FIRST and returns early before any `updateMenu`/`replaceMenuItems` (`:692-702`),
  so `operations` would be `[]` and the `toEqual` lock below would break.
  (2) the typed "Pages" insert's default label is the page TITLE (`pages[0].title`,
  i.e. `"Home"` here), not `"New item"`, so the payload assertion (`:357-366`,
  formerly `label:"New item"` + `pageId:"page-1"`) must assert `label:"Home"` +
  `pageId:"page-1"` + `parentId:null`; (3) the dropped metadata Card removes
  `input[placeholder="Main Menu"]` (`:249,282,341,403`), so the name-input selector
  must be re-pointed (preserve `placeholder="Main Menu"` on the relocated name field
  as the selector hook, or document the new hook); (4) the restyle removes the
  **"Menu Structure" Card heading** (`<h3>Menu Structure</h3>`, source `:943`) but it
  is asserted at `:236` — UPDATE or DROP that assertion (the prototype three-pane
  canvas has no "Menu Structure" chrome); do **NOT** re-add the removed heading just
  to satisfy `:236`, which would re-pollute the faithful restyle; and (5) the
  empty-state copy **"No items yet. Add your first link."** (`:237`, source `:956`)
  must be **PRESERVED** verbatim on the restyled empty canvas — it is the
  `displayTree.length === 0` `EmptyState` in §2's `canvas` slot, so keep this string
  rather than inventing new empty-state copy. Separately (and NOT among the three
  publish-test re-points), the theme-location guidance — the **"Theme location"**
  label, the help paragraph **"Slot key used by the theme or Navigation widget"**
  (`:181`), and the `describeMenuLocationState` text (`:182/:230`) — relocates into
  the inspector empty-state and MUST be carried verbatim (§2) so the separate
  `MenuEditorPage renders editor-side location guidance` test (`:175-199`) stays
  green; dropping the help paragraph during the re-skin breaks that test silently.
  The rewritten tests MUST RETAIN
  the operations-ordering lock `operations` `toEqual ["metadata","items","status:published"]`
  (`:353`) **driven by the Pages trigger**, plus a CONCRETE `replaceMenuItems`
  payload assertion (page ⇒ `pageId`; and — in a SEPARATE assertion that FIRST sets
  a non-empty URL/variant in the inspector so the item passes `validateMenuItemsPayload`
  before Publish — custom-link ⇒ `href`, button ⇒ `href` + `settings.variant:"button"`)
  so the Save/Publish lifecycle + payload coverage is provably not weakened.
- **Row restyle (`menu-item-row.test.tsx` / `menu-tree.test.tsx`) — behavior stays
  green, pure-visual assertions UPDATED (row fidelity reconciliation):** the
  DnD/keyboard/nesting/a11y assertions (`data-menu-drag-handle` + `Drag`/`Move`/
  `Indent`/`Outdent` aria-labels, `data-menu-nested-indent`, drop-line labels +
  markers, `data-menu-row-active`) stay green with ZERO edits; the enumerated
  pure-VISUAL assertions ONLY — grip-box dims (`:61-64`), the letter-avatar, the
  text `Sub-item of Home` (`:68` / `menu-tree.test.tsx:124`) — are UPDATED to the
  compacted prototype row (bare `size-4` grip, no avatar, `CornerDownRight`+`pl-8`
  nesting, mono URL subline). Do NOT freeze the old row visuals.
- **Regression (must stay green, do not weaken):**
  `tests/vitest/ui/menu-tree.test.tsx` (DnD intents + keyboard move/indent/outdent —
  behavior assertions only; see the row-restyle bullet above for the pure-visual updates),
  `menu-editor-validation.test.ts`, `menu-editor-refresh-policy.test.tsx`,
  `menu-item-form.test.tsx`,
  `tests/unit/menus/menuService.test.ts`, and the `moveMenuItems`/
  `moveMenuItemToRoot` export tests.
- **Route-body schema (`tests/vitest/validation/menuSchemas.test.ts`):** the items
  PUT body now ACCEPTS `settings.openInNewTab:true` and `settings.variant:"button"`
  (and still rejects unknown `settings` keys — `additionalProperties:false`). Without
  this case the §6 schema gap goes unguarded.
- `openInNewTab` + `variant` round-trip (`tests/vitest/services/` + a mapping test):
  `normalizeMenuItemSettings` keep-when-true / keep-when-`"button"` /
  drop-when-malformed; `mapMenuNodesToNavigationItems` ⇒ `target:"blank"` and
  `meta.variant:"button"` for the button item, and **no `variant` key on the `meta`
  of a default (link) item** (the conditional omission, §5).
- **Impacted exact-`meta`-`toEqual` suites stay green with ZERO edits (the
  conditional omission, §5):** `tests/vitest/widgets/navigation.test.tsx:816-851` and
  `tests/vitest/ui/navigation-editor-wave.test.tsx:636-674` assert the mapped `meta`
  shape `{visibility,badge,description,icon}` with an EXACT `toEqual`; because
  `menuSettingsToMeta` omits the default `variant:"link"`, every existing (link) item's
  `meta` is byte-unchanged, so neither suite is edited (NOT a weakening — the default
  byte-shape is deliberately preserved). Naming them here removes any ambiguity vs the
  "zero assertion edits" rule.
- **`variant:"button"` front render — `tests/integration/runtime/site-shell-runtime.test.ts`:**
  add the button-class assertion HERE (not in prose) — a published menu item with
  `settings.variant:"button"` renders the `SiteNavItem` button affordance; a default
  (no-variant) item renders byte-identical link markup (this suite already guards the
  default `data-site-header`/`data-site-nav-*` markup, so it is the natural home).
- Real-input verification (playwright real mouse+keyboard): drag a row to nest,
  keyboard indent/outdent, edit URL in the always-on inspector, toggle "Open in
  new tab" — no synthetic-only passes.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + Statistics on status change (closing agent).
- Add a `_docs/_CHANGELOG/` entry linking **TASK-499** + **TASK-499-01**; note the
  Posts/Categories decision (deferred vs content-route-backed) AND the Button
  disposition (real per-item `variant:"button"` vs deferred-disabled) explicitly.
