# TASK-502-04: Design Editor Canvas WYSIWYG & Device Controls
# FileName: TASK-502-04-Design-Editor-Canvas-WYSIWYG-And-Device-Controls.md

**Parent Task:** TASK-502
**Priority:** High
**Category:** Admin UI / Content (Menus) / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-502-01 (hard — generalized per-breakpoint helpers: `"tablet"` in `MENU_RESPONSIVE_BREAKPOINT_KEYS`, breakpoint-generic `resolveMenuBlockVisibleForDevice`/`setMenuBlockVisibleForDevice`/`patchMenuSectionForDevice`/`clearMenuSectionOverride`/`readMenuSectionOverrideValue`, `brand.props.text` in `BRAND_PROP_KEYS`), TASK-502-02 (`buildMenuDocumentPreviewCss` real tablet branch + divider context rules + nested-sublist rules — the canvas consumes its emission), TASK-502-03 (front markup this canvas must mirror: recursive `SiteNavItem`, `BrandRender` text chain)
**Status:** ⏳ To Do

---

## Overview

Editor-side delivery of parent bugs **3, 4, 6, 1 (editor half), 7b** and the
editor half of **2 (tablet forks)** — sole writer of
`core/admin/ui/menus/MenuDesignEditor.tsx` (plus the shared-hook extraction,
`tokenCss.ts` addition, and the behavior-identical `PageEditor.tsx` import
swap):

1. **Canvas site tokens (bug 4)** — the swatches store `var(--color-*)`
   references that the menu canvas never defines: `MenuDocumentCanvas`
   (`MenuDesignEditor.tsx:509-559`) injects only the doc CSS, so
   `--color-secondary` resolves to the ADMIN beige and
   `--color-bg/-surface/-text` are undefined (invalid at computed-value
   time). Port the PageEditor pattern: extract `useCanvasSiteTokens`
   (`PageEditor.tsx:380-413`) to a shared hook, add
   `toMenuCanvasColorCssVariableMap(tokens)` (ALL SEVEN `--color-*`), paint it
   inline on the canvas frame, and pass a site-resolved palette to every
   `ColorSwatchControl`. Emission semantics untouched; hover/active labels get
   the "state background" copy fix.
2. **Canvas visibility ghost (bug 6a)** — the Desktop "Visible" toggle writes
   flat `block.visibility` that the canvas never consumes (`:541-555` maps ALL
   blocks unconditionally). Gate every canvas block through
   `resolveMenuBlockVisibleForDevice(block, device)` and render hidden blocks
   as a dimmed selectable GHOST (opacity + "Hidden" badge) instead of
   skipping — covers flat hides, tablet/mobile overrides, and
   visible-on-neither.
3. **CTA options + real preview (bug 6b/6c)** — surface the already-validated
   `size` (`pageButtonSizes`, `pageDocumentV2.ts:149`) and `target`
   (`pageButtonTargets`, `:147`) leaf props in the cta panel
   (`:1190-1233` today has only Label/Link/Variant), and replace the bare-span
   cta preview (`:475-482`) plus the literal "—" divider preview (`:496-501`)
   with the REAL front leaf render (`PageBlockFrame` + `PageBlockContent`), so
   variant/size/divider rules have visible canvas effect. The fixed-24px
   spacer stub (`:502-503`) is deliberately KEPT: the real spacer leaf is
   `<div style={{height}}/>` (`pageRendererV2.tsx:1855`) — a 0-width flex
   item in `.site-header-inner` that 502-02 emits no rules for (spacer
   flex-push is a named residual), so a real render would collapse to an
   invisible, near-unclickable sliver on canvas.
4. **Brand text, editor half (bug 1)** — the canvas brand case renders
   `menuName || "Brand"` (`:465-474`) while the front renders the site name.
   Render the front's exact fallback chain (`props.text` → real `site.name` →
   placeholder) and add a text-mode-only "Brand text" Input writing the sparse
   `props.text` (502-01 schema).
5. **Recursive NavItemsPreview (bug 7b)** — `NavItemsPreview` (`:408-449`)
   renders exactly one child level and silently drops grandchildren; make it
   recursive with the SAME class names 502-03 emits on the front.
6. **Tablet device forks + device-scoped controls (owner decisions, bugs
   2/3)** — retire the `isMenuOverrideDevice = (device) => device === "mobile"`
   predicate (`:303`): tablet becomes a real override breakpoint (badges,
   Reset, forked writes), and the two device-DEFINING controls stop being
   overridable: "Mobile menu" (`mobileMode`, `:1121-1134`) renders ONLY on the
   Mobile device, "Dropdown direction" (`:1105-1120`) ONLY on Desktop/Tablet —
   both unwrapped from `MenuResponsiveControlShell` and writing the BASE
   regardless of device, so no dead override record is ever stored again.

**Out of scope here:** schema/normalizers (502-01), CSS emission (502-02),
front markup (502-03), tests-docs closure + the ≥5-scenario smoke (502-05),
brand text formatting (named residual), the menu drawer, hover/active
emission-semantics change (copy fix only).

---

## Current State (verified against source, 2026-07-02 — `MenuDesignEditor.tsx`/`PageEditor.tsx` are rg-binary; use `Read`/`grep -an`)

- `MenuDesignEditor.tsx` (1541 lines): `SelectableBlock` `:265-292` stamps
  `data-menu-block-id={id}` and paints the selected ring with **`ring-2
  ring-primary` (`:286`) — a Tailwind utility that resolves
  `var(--color-primary)`**, so painting the site brand vars on an ancestor
  WOULD recolor the selection chrome (the parent's audit question — RESOLVED:
  it does consume `--color-primary`; see §2 chrome fix).
  `isMenuOverrideDevice` `:303`; badge copy hardcodes "Mobile override …
  below 640px" `:307-312`; `MenuResponsiveControlShell` `:356-406`;
  `NavItemsPreview` `:408-449` (one child level, `child.children` never
  read); `MenuBlockPreview` `:451-507` (brand `menuName || "Brand"` `:471`;
  cta bare span `:475-482`; divider "—" `:496-501`; spacer 24px span
  `:502-503`); `MenuDocumentCanvas` `:509-559` (no token painting, no
  visibility gate, `<style>{buildMenuDocumentPreviewCss(doc, device)}</style>`
  `:526/:534`); `setLayoutField` `:574-584` / `setNavField` `:890-900`
  already pass `device` into `patchMenuSectionForDevice`; override detection
  hardcodes `"mobile"` (`:625-627` layout, `:871-873` nav,
  `block.responsive?.mobile` `:904`); Desktop/Tablet flat leaf toggle
  `:962-976`; nav panel shells `:980-1134`; brand panel `:1138-1188` (Mode +
  Link + image only); cta panel `:1190-1233`; divider/spacer "no editable
  options" stub `:1235-1239`; `deviceContext` label `:1458-1465`; swatch
  controls with NO palette prop at `:649` (surface), `:661` (border), `:1069`
  (link), `:1081` (hover), `:1097` (active); `menuName` state `:1271` seeded
  from `initial?.menu.name`.
- `PageEditor.tsx`: `readSiteDesignTokenOverrides` `:356-367` (module-private,
  fails closed to `null` via `assertTokenOverrides`), `useCanvasSiteTokens`
  `:380-413` (cached settings → background `getSettingsCached()` revalidate →
  `subscribeCacheEvents` on `cacheKeys.settingsRedacted`; returns
  `mergeTokens(DEFAULT_TOKENS, overrides)`), consumed at `:752` with
  `toPageCanvasColorCssVariableMap` `:753-756` and
  `getPageEditorColorPalette(siteTokens)` `:757`.
- `tokenCss.ts`: `toPageCanvasColorCssVariableMap` `:128-135` deliberately
  emits ONLY the three neutrals + typography (brand vars omitted because page
  chrome consumes them); `toCssVariableMap` `:137` names all seven
  `--color-*`. The menu canvas needs all seven (swatch values reference
  `var(--color-primary|secondary|accent|bg|surface|border|text)`,
  `pageEditorControlUiModel.ts:225-260`).
- `ColorSwatchControl.tsx:19-20/:72`: optional `palette?: readonly
  PageEditorColorSwatch[]`, defaulting to `getPageEditorColorPalette()`
  (DEFAULT_TOKENS previews) — threading a site palette is prop-only.
- **Site name source needs NO route change:** the redacted settings payload
  already carries `"site.name"` (`settingsClient.ts:51`,
  `settingsCache.ts:300` defaults "Coderso") — the SAME payload
  `useCanvasSiteTokens` subscribes to, so the brand chain reads it from the
  shared hook's settings state (read-only display data already visible to any
  admin).
- **`MenuAppearancePanel.tsx` is DEAD CODE** (verified: zero importers across
  `core/` and `tests/`) — no palette threading needed there; record as a
  502-05 doc residual, do NOT delete here.
- `siteShell.tsx`: `menuLeafToPageBlock` `:259-274` is module-private (and
  `siteShell.tsx` is 502-03's exclusive file) — the canvas replicates the tiny
  mapping locally instead of importing it. `PageBlockFrame`/`PageBlockContent`
  are exported from `core/services/pages/pageRendererV2.tsx` (`:1945`).
- `menuDocumentCss.ts`: `buildMenuDocumentPreviewCss` `:411-415` currently
  appends the shared branch rules INCLUDING the dual-selector visibility hide
  rules (`hideRule` `:306-309`,
  `[data-menu-block-id="X"],[data-block-id="X"]{display:none}`) — these would
  `display:none` the new ghost; see the §3 interface note.
- `menuDocumentV2.ts` (pre-502-01 baseline the helpers generalize from):
  `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"]` `:113`;
  `resolveMenuBlockVisibleForDevice` `:914-921` (tablet ⇒ desktop value
  today); `setMenuBlockVisibleForDevice` `:937-960` (desktop/tablet ⇒ flat
  leaf-only; mobile ⇒ override); `clearMenuBlockVisibilityOverride`
  `:967-...`; `hasMenuBlockVisibilityOverride` `:928` (mobile-only today).
- `pageDocumentV2.ts`: `pageButtonTargets = ["self","blank"]` `:147`,
  `pageButtonSizes = ["sm","md","lg"]` `:149`; button prop allow-list
  `["label","href","target","variant","size"]` `:605` — size/target are
  already validated end-to-end via `normalizeThroughPageLeaf`; **no schema
  change in this subtask.**

---

## Implementation contract (execution-ready)

### §1 Shared hook extraction — `core/admin/ui/shared/useCanvasSiteTokens.ts` (NEW)

Move, verbatim in behavior, from `PageEditor.tsx:350-413`:

```ts
// core/admin/ui/shared/useCanvasSiteTokens.ts
import { cacheKeys } from "@/services/cachePolicy";
import { getCachedSettings, getSettingsCached } from "@/services/settingsClient";
import { subscribeCacheEvents } from "@/utils/cacheBus";
import { DEFAULT_TOKENS, type DesignTokenOverrides, type DesignTokens }
  from "../../../services/theme/tokenTypes";
import { mergeTokens } from "../../../services/theme/tokenUtils";
import { assertTokenOverrides } from "../../../services/theme/tokenValidation";

// moved: PageEditor.tsx:356-367 (unchanged fail-closed semantics)
const readSiteDesignTokenOverrides = (settings) => { /* verbatim */ };

/** Settings state shared by tokens + the menu brand chain: cached-first,
 *  one background revalidate, cache-bus subscription. Extracted so the menu
 *  editor can read `site.name` from the SAME payload without a second
 *  fetch path. */
export const useCanvasSiteSettings = (): Record<string, unknown> | null => {
  // verbatim PageEditor.tsx:381-407 (useState(getCachedSettings) +
  // getSettingsCached().then guarded-set + subscribeCacheEvents on
  // cacheKeys.settingsRedacted). Errors swallowed (offline/unauthorized ⇒
  // DEFAULT_TOKENS anchor), exactly as today.
};

export const useCanvasSiteTokens = (): DesignTokens => {
  const settings = useCanvasSiteSettings();
  return useMemo(
    () => mergeTokens(DEFAULT_TOKENS, readSiteDesignTokenOverrides(settings)),
    [settings]
  );
};

/** `site.name` from the same payload; trimmed, `null` when unset/non-string. */
export const useCanvasSiteName = (): string | null => {
  const settings = useCanvasSiteSettings();
  return useMemo(() => {
    const raw = settings?.["site.name"];
    const text = typeof raw === "string" ? raw.trim() : "";
    return text.length > 0 ? text : null;
  }, [settings]);
};
```

`PageEditor.tsx` change is IMPORT-ONLY: delete its private
`readSiteDesignTokenOverrides` + `useCanvasSiteTokens`, import
`useCanvasSiteTokens` from `../shared/useCanvasSiteTokens`, drop the now-unused
imports (`assertTokenOverrides`, `mergeTokens`, `DEFAULT_TOKENS`,
`DesignTokenOverrides`, `getCachedSettings`/`getSettingsCached`,
`subscribeCacheEvents`, `cacheKeys` — ONLY where no other PageEditor code uses
them; verify each with `grep -an` before removing). Zero behavior change —
guarded by the existing PageEditor vitest suites staying green untouched.

### §2 `toMenuCanvasColorCssVariableMap` — `core/ui/theme/tokenCss.ts` + chrome fix

```ts
// core/ui/theme/tokenCss.ts — next to toPageCanvasColorCssVariableMap (:128)
/** Menu canvas frame map: site typography vars + ALL SEVEN --color-* — the
 *  menu doc CSS references the brand vars too (swatches store
 *  var(--color-primary|secondary|accent|border), which the admin @theme maps
 *  to ADMIN colors). Page canvas keeps the 3-neutral map (page chrome
 *  consumes --color-primary); the menu canvas instead pins its own chrome
 *  (see SelectableBlock ring fix) and repaints everything. */
export function toMenuCanvasColorCssVariableMap(tokens: DesignTokens): Record<string, string> {
  return {
    ...toPageTypographyCssVariableMap(tokens),
    "--color-primary": tokens.colors.primary,
    "--color-secondary": tokens.colors.secondary,
    "--color-accent": tokens.colors.accent,
    "--color-bg": tokens.neutrals.bg,
    "--color-surface": tokens.neutrals.surface,
    "--color-text": tokens.neutrals.text,
    "--color-border": tokens.neutrals.border,
  };
}
```

**Chrome-safety (RESOLVED audit question):** `SelectableBlock`'s selected ring
is `ring-2 ring-primary` (`:286`) ⇒ consumes `var(--color-primary)` ⇒ would
recolor to the SITE primary once the frame repaints it. Fix inside
`SelectableBlock`: replace `ring-primary` with the admin-pinned
`ring-[color:var(--admin-input-ring,#7c3aed)]` so selection chrome stays
admin-themed and immune to canvas token painting. Then AUDIT the rest of the
canvas subtree (everything rendered inside the `data-menu-document-canvas`
div) for Tailwind utilities resolving `--color-(primary|secondary|accent|bg|
surface|border|text)`: today that is only `ring-primary` (fixed above) — the
empty-state `text-muted-foreground` (`:537`) resolves
`--color-muted-foreground`, which is NOT in the repainted map (safe). The
`--text-*`/`--font-*` repaint intentionally applies site typography inside the
canvas, same accepted behavior as the page canvas.

### §3 Canvas token painting + palette threading + visibility ghost (`MenuDesignEditor.tsx`)

```tsx
// MenuDesignEditor host (:1252+)
const siteTokens = useCanvasSiteTokens();
const siteName = useCanvasSiteName();
const canvasSiteTokenVariables = useMemo(
  () => toMenuCanvasColorCssVariableMap(siteTokens) as CSSProperties, [siteTokens]);
const sitePalette = useMemo(() => getPageEditorColorPalette(siteTokens), [siteTokens]);
// Thread canvasSiteTokenVariables + siteName into <MenuDocumentCanvas/>;
// thread sitePalette into MenuBarPanel + MenuBlockPanel.

// MenuDocumentCanvas (:509-559)
function MenuDocumentCanvas({ doc, device, items, navLabel, siteName,
  tokenVariables, selectedId, onSelect }) {
  const css = useMemo(() => buildMenuDocumentPreviewCss(doc, device), [doc, device]);
  const blocks = doc.sections[0]?.blocks ?? [];
  return (
    <div className="site-header" data-menu-document-canvas="true"
         {...{ [SITE_MENU_DOC_ATTRIBUTE]: "true" }}
         style={tokenVariables}>            {/* §2 map, inline on the frame:
           surface/border doc rules target this very element, and inline
           custom properties participate in its own rule resolution */}
      <style>{css + "\n" + MENU_CANVAS_GHOST_CSS}</style>
      <div className="site-header-inner">
        {blocks.map((block) => {
          const visible = resolveMenuBlockVisibleForDevice(block, device); // 502-01: real tablet
          return (
            <SelectableBlock key={block.id} id={block.id} ghost={!visible}
                             selected={block.id === selectedId} onSelect={onSelect}>
              <MenuBlockPreview block={block} items={items}
                                navLabel={navLabel} siteName={siteName} />
            </SelectableBlock>
          );
        })}
      </div>
    </div>
  );
}
```

**Ghost contract** (`SelectableBlock` gains `ghost?: boolean`):

```tsx
<div data-menu-block-id={id}
     data-menu-block-ghost={ghost ? "true" : undefined}
     data-menu-block-selected={...} onClick={...}
     className={cn("relative cursor-pointer rounded-lg outline-none transition-shadow",
       selected && "ring-2 ring-[color:var(--admin-input-ring,#7c3aed)]")}>
  {children}
  {ghost ? (
    <span aria-hidden="true" data-menu-block-hidden-badge="true"
          className="pointer-events-none absolute -top-2 right-1 z-10 rounded-full
                     bg-muted px-1.5 text-[9px] font-semibold uppercase
                     text-muted-foreground shadow-sm">
      Hidden
    </span>
  ) : null}
</div>
```

```ts
// module const, appended AFTER the builder CSS (source order ⇒ wins ties):
const MENU_CANVAS_GHOST_CSS = [
  // dim + FORCE-SHOW the ghost: the shared branch rules may carry
  // `[data-menu-block-id="X"]{display:none}` hide rules — the ghost must
  // beat them (equal (0,2,0) specificity, later source order) so a hidden
  // block stays selectable:
  `[data-menu-document-canvas="true"] [data-menu-block-ghost="true"]{display:block;opacity:.4}`,
  // leaf frames inside a ghost carry data-block-id (PageBlockFrame, §5) and
  // are matched by the same dual hide rule — revert them to UA display:
  `[data-menu-document-canvas="true"] [data-menu-block-ghost="true"] [data-block-id]{display:revert}`,
].join("\n");
```

**Interface note (502-02, normative preference):** the CLEAN division is for
`buildMenuDocumentPreviewCss` to stop emitting the visibility hide rules
(canvas visibility presentation is owned by this ghost; the front builder keeps
them). The ghost CSS above is deliberately self-sufficient EITHER WAY (it
force-shows only `data-menu-block-ghost` subtrees), so landing order does not
matter — but the implementing agents must reconcile: if 502-02 drops the
preview hide rules, keep the force-show rules anyway (defense in depth) and
assert in the vitest suite that a hidden block's ghost has non-`none` computed
display on canvas.

**Palette threading:** add `palette={sitePalette}` to ALL FIVE
`ColorSwatchControl`s — surface `:649`, border `:661`, link `:1069`, hover
`:1081`, active `:1097` (prop drilled through `MenuBarPanel`/`MenuBlockPanel`
props; no context needed at this scale). **Copy fix (bug 4 secondary):**
relabel `Link hover color` → `Hover background` and `Link active color` →
`Active background` (the emission is a state-only background pill —
`menuDocumentCss.ts:225/:233`; labels flow into the shell `label`, reset
aria-label, and `data-menu-responsive-reset` hooks — update the vitest
selectors accordingly). Emission semantics untouched.

### §4 Tablet device forks + generalized badges (`MenuDesignEditor.tsx`, on 502-01 helpers)

```ts
// :303 — REPLACE the mobile-only predicate:
const isMenuOverrideDevice = (device: PageBreakpoint): device is MenuResponsiveBreakpoint =>
  device !== "desktop";               // 502-01: MenuResponsiveBreakpoint = "tablet" | "mobile"

// :307-312 — per-breakpoint badge copy (bounded tablet window per
// pageResponsiveMediaBounds.tablet):
const menuResponsiveBadgeDescription = (state, device) =>
  state === "base" ? "Editing the base value (applies to every device)."
  : state === "override"
    ? device === "tablet"
      ? "Tablet override — this value replaces the desktop value between 640px and 1023px."
      : "Mobile override — this value replaces the desktop value below 640px."
    : `Inherited from desktop. Edit to create a ${device} override.`;
// MenuResponsiveStateBadge + MenuResponsiveControlShell take `device` through
// to the copy + the reset tooltip ("Remove the ${device} override…").
```

- **Writers need NO change**: `setLayoutField`/`setNavField` already pass
  `device` into `patchMenuSectionForDevice` — 502-01 makes the tablet path
  write `responsive.tablet`. Desktop still writes base.
- **Override detection/reset generalize the `"mobile"` literals** to the
  current device (only meaningful when `isMenuOverrideDevice(device)`;
  compute `override={isMenuOverrideDevice(device) &&
  readMenuSectionOverrideValue(section, device, group, key) !== undefined}`):
  `:625-627`, `:629-634` (`clearMenuSectionOverride(current, id, device,
  "layout", key)`), `:871-879`, and block visibility `:904`
  (`block.responsive?.[device]?.visibility !== undefined`) / `:948-949`
  (`clearMenuBlockVisibilityOverride(current, block.id, device)`).
- **Visibility toggle branches** (`:941-976`): override devices
  (tablet AND mobile) get the shell-wrapped `ToggleSwitch` labelled
  `Visible on ${DEVICE_LABELS[device].toLowerCase()}` writing
  `setMenuBlockVisibleForDevice(current, block.id, device, next)`; the flat
  leaf-only toggle becomes **Desktop-only** (502-01 narrows the flat path to
  `device === "desktop"`).
- **Scope cue** (`:1458-1465`): existing `isMenuOverrideDevice` ternary now
  yields "Tablet (overrides)" / "Mobile (overrides)" / "Desktop (base)" with
  zero extra code.
- All writes stay event-handler dispatches into the `historyReducer` atom —
  **no setState-in-effect** (the shared settings hook's `setSettings` is the
  pre-existing PageEditor pattern, unchanged).

### §5 Device-defining controls become device-scoped base writers (`MenuDesignEditor.tsx:1105-1134`)

```tsx
// In MenuBlockPanel (nav-items branch) — a base-writing sibling of setNavField
// (device literal "desktop" ⇒ patchMenuSectionForDevice's BASE path):
const setNavBaseField = <K extends keyof NavItemsProps>(field: K, value: NavItemsProps[K]) =>
  updateDoc((current) => {
    const target = current.sections[0];
    if (!target) return current;
    return patchMenuSectionForDevice(current, target.id, "desktop", "navProps",
      { [field]: value } as NavItemsProps);
  });

{device !== "mobile" ? (
  // Dropdowns exist only >=640px (sublists collapse inline on mobile) — a
  // mobile override would be dead data (the 501 residual this kills). NOT
  // wrapped in MenuResponsiveControlShell: no badge, no Reset, base write.
  <SegmentedControl label="Dropdown direction"
    value={navProps.dropdownDirection ?? SHELL_APPEARANCE_DEFAULTS.dropdownDirection}
    options={menuAppearanceDropdownDirections} optionLabels={dropdownDirectionLabels}
    onChange={(next) => setNavBaseField("dropdownDirection", next as ...)} />
) : null}
{device === "mobile" ? (
  // Device-DEFINING: mobileMode chooses how the mobile viewport behaves —
  // it IS the mobile design, not an override of a desktop value.
  <SegmentedControl label="Mobile menu"
    value={navProps.mobileMode ?? SHELL_APPEARANCE_DEFAULTS.mobileMode}
    options={menuAppearanceMobileModes} optionLabels={mobileModeLabels}
    onChange={(next) => setNavBaseField("mobileMode", next as ...)} />
) : null}
```

Display values keep reading the resolved record (`navProps` from
`resolveMenuSectionAppearanceForDevice`) — after 502-01's write-reject +
stored-read-migration carve-out no override for these keys can exist, so
resolved ≡ base.
Migration of already-stored 501-era overrides is 502-01's stored-read
(mobileMode hoist-then-prune, dropdownDirection prune-only — NOT
this file). Add a short comment pointing at the 502-01
`MENU_NAV_DEVICE_DEFINING_KEYS` contract so the lists cannot drift silently.

### §6 Brand text — panel Input + canvas chain (`MenuDesignEditor.tsx:465-474/:1138-1188`)

```tsx
// MenuBlockPreview brand case — mirror the 502-03 front chain EXACTLY
// (props.text → siteName → placeholder; menuName is GONE from previews):
case "brand": {
  const href = block.props.href || "/";
  const text = (typeof block.props.text === "string" ? block.props.text.trim() : "")
    || siteName || "Site name";      // placeholder shows where the front renders null
  return (
    <a className="site-header-brand" href={href} onClick={(e) => e.preventDefault()}>
      {block.props.mode === "image" && block.props.image
        ? String(block.props.image.alt ?? "") || "Logo"
        : text}
    </a>
  );
}

// Brand panel, text mode only (inside the :1138 branch, after Mode).
// import { MENU_BRAND_TEXT_MAX_LENGTH } from menuDocumentV2 — 502-01 exports
// this cap (120) specifically for this Input; do NOT inline the literal:
{block.props.mode === "text" ? (
  <label className="grid gap-1">
    <span className="text-xs font-medium text-muted-foreground">Brand text</span>
    <Input aria-label="Brand text" maxLength={MENU_BRAND_TEXT_MAX_LENGTH}
      placeholder={siteName ?? "Site name (default)"}
      value={typeof block.props.text === "string" ? block.props.text : ""}
      onChange={(event) =>
        patch(block.id, (current) => {
          if (current.type !== "brand") return current;
          const value = event.target.value;
          if (value.length === 0) {
            // sparse contract: empty DELETES the prop (canvas + front fall
            // back to the site name; the stored doc round-trips textless)
            const { text: _removed, ...rest } = current.props;
            return { ...current, props: rest };
          }
          return { ...current, props: { ...current.props, text: value } };
        })
      } />
  </label>
) : null}
```

Raw keystrokes are written as-is (no per-keystroke trim — it would eat
mid-word spaces); the 502-01 normalizer trims + caps at
`MENU_BRAND_TEXT_MAX_LENGTH` (120) on save, and `maxLength` — set from the
same imported constant, never a magic literal — keeps the input honest
client-side. `patch` stays FLAT and
device-invariant (content contract). `menuName` remains ONLY for
breadcrumbs/header/`navLabel` — remove the `menuName` prop from
`MenuBlockPreview`/`MenuDocumentCanvas` signatures (replaced by `siteName`).

### §7 CTA size/target controls + real leaf previews (`MenuDesignEditor.tsx:475-503/:1190-1239`)

```tsx
// Local canvas replica of siteShell's private menuLeafToPageBlock (:259-274),
// with visibility ALWAYS true — the §3 ghost owns canvas hiding:
const CANVAS_LEAF_TO_PAGE_TYPE = { "cta-button": "button", divider: "divider" } as const;
const canvasMenuLeafToPageBlock = (block: MenuBlockV2): PageBlockV2 => ({
  id: block.id,
  type: CANVAS_LEAF_TO_PAGE_TYPE[block.type as keyof typeof CANVAS_LEAF_TO_PAGE_TYPE],
  props: block.props,
  style: "style" in block ? block.style : undefined,
  visibility: { visible: true },
}) as PageBlockV2;

// MenuBlockPreview: cta-button / divider collapse into ONE case that
// renders the REAL front structure (PageBlockFrame stamps data-block-id, so
// 502-02's divider context rules — frame-as-line + inner hr hidden — apply
// identically on canvas; variant/size/target render through the page renderer).
// SPACER IS DELIBERATELY EXCLUDED: its real leaf is a 0-width
// `<div style={{height}}/>` flex item (pageRendererV2.tsx:1855) with zero
// 502-02 rules (flex-push = named residual) — real-rendered it would be an
// invisible sliver that canvas-click selection cannot hit:
case "cta-button": case "divider": {
  const leaf = canvasMenuLeafToPageBlock(block);
  return (<PageBlockFrame block={leaf}><PageBlockContent block={leaf} /></PageBlockFrame>);
}
case "spacer": // UNCHANGED stub (:502-503) — a visible, selectable 24px
  // target until the spacer flex-push residual lands a real axis-aware render:
  return <span aria-hidden="true" style={{ display: "inline-block", width: 24 }} />;
// imports: PageBlockFrame, PageBlockContent from
// "../../../services/pages/pageRendererV2"; pageButtonSizes/pageButtonTargets
// join the existing pageButtonVariants import (:72). Links rendered by
// PageBlockContent inside the canvas must not navigate — keep the canvas
// click interception on SelectableBlock (stopPropagation + select) and add a
// preventDefault on the SelectableBlock onClick chain if the leaf anchor
// bubbles a navigation (verify in the vitest suite: clicking the cta preview
// selects, does not navigate).

// CTA panel additions (:1190-1233), after Variant:
<SegmentedControl label="Size"
  value={typeof block.props.size === "string" ? block.props.size : "md"}
  options={pageButtonSizes} optionLabels={{ sm: "Small", md: "Medium", lg: "Large" }}
  onChange={(next) => patch(block.id, (c) =>
    c.type === "cta-button" ? { ...c, props: { ...c.props, size: next } } : c)} />
<ToggleSwitch label="Open in new tab"
  value={block.props.target === "blank"}
  onChange={(next) => patch(block.id, (c) =>
    c.type === "cta-button" ? { ...c, props: { ...c.props, target: next ? "blank" : "self" } } : c)} />

// Inspector stub (:1235-1239) — divider gets accurate copy; spacer keeps the stub:
{block.type === "divider" ? (
  <p className="text-xs text-muted-foreground">
    Renders as a vertical separator line in the menu bar. Use reorder/remove
    above. {/* tone/thickness controls = named residual (parent non-goal) */}
  </p>
) : null}
```

Both props are already validated/persisted by the page pipeline
(`pageDocumentV2.ts:605/:147/:149` via `normalizeThroughPageLeaf`) — zero
schema/backend work.

### §8 Recursive `NavItemsPreview` (`MenuDesignEditor.tsx:408-449`)

```tsx
// Same class/attribute shape 502-03 emits on the front (hover mode);
// grandchildren NEVER dropped. Group parents: data-site-nav-group="true" on
// the <li>; a linkless parent renders a span carrying BOTH
// `site-nav-link site-nav-group-label` classes (502-02 Coordination
// contract — link color/typography + caret rules apply on canvas too).
const renderPreviewItem = (item: NavigationItem, key: string) => {
  const children = item.children ?? [];
  return (
    <li className="site-nav-item"
        data-site-nav-group={children.length > 0 ? "true" : undefined} key={key}>
      {hasRealHref(item.href) ? ( // same predicate as siteShell (href !== "#")
        <a className="site-nav-link" href={item.href}
           onClick={(event) => event.preventDefault()}>{item.label}</a>
      ) : (
        <span className="site-nav-link site-nav-group-label">{item.label}</span>
      )}
      {children.length > 0 ? (
        <ul className="site-nav-sublist">
          {children.map((child, i) => renderPreviewItem(child, `${key}-${child.label}-${i}`))}
        </ul>
      ) : null}
    </li>
  );
};
// NavItemsPreview body: items.map((item, i) => renderPreviewItem(item, `${item.label}-${i}`))
// (empty-state <li> unchanged).
```

Reachability on canvas is CSS, owned by 502-02's preview emission
(hover/focus-within open + nested fly-out in the structural baseline/doc
rules); this file only guarantees the recursive MARKUP exists. The vitest
suite asserts the grandchild `<a>` is IN the canvas DOM inside
`.site-nav-sublist .site-nav-sublist` — presence, not hover geometry (hover
geometry is the 502-05 smoke's job). Items-editor depth cap: VERIFIED none
exists (`MenuTree.tsx` recurses with `depth+1`, `menuDnD` child-intent is
unbounded, `MenuItemRow` uses depth only for indent) — no code change; note
in the closure docs.

### Error handling

- Settings fetch failure inside the shared hook: swallowed (existing
  PageEditor semantics) — canvas anchors on `DEFAULT_TOKENS`, brand chain
  falls to the "Site name" placeholder; no new error surface.
- `resolveMenuBlockVisibleForDevice`/patch helpers are pure — invalid states
  are unrepresentable post-502-01; the editor never catches/re-throws around
  them. Save/publish keep the existing `resolveErrorMessage` path
  (`:1246-1250`) untouched — a 4xx `menu_document_invalid` from a bad
  `brand.text`/tablet record surfaces in the existing error strip.

---

## Interfaces with sibling subtasks (single-writer boundaries)

| Needs | From | Contract consumed here |
|---|---|---|
| `MenuResponsiveBreakpoint = "tablet"\|"mobile"`, breakpoint-generic resolve/patch/clear/read helpers, `brand.props.text`, device-defining write-reject + stored-read migration (mobileMode hoist-then-prune, dropdownDirection prune-only) | 502-01 | §4/§5/§6 call signatures above |
| Real tablet preview branch in `buildMenuDocumentPreviewCss(doc, "tablet")`; divider context rules keyed on `data-block-id`; nested-sublist + canvas hover rules; disclosure preview un-hide; (preferred) preview branch WITHOUT visibility hide rules | 502-02 | §3 ghost CSS is self-sufficient either way; §7 divider preview relies on the `data-block-id` context rules; §8 relies on the nested rules for reachability |
| Front brand chain (`props.text` → `siteName` → null) and recursive `SiteNavItem` markup/classes | 502-03 | §6 canvas chain and §8 class names mirror it — canvas ≡ front |

This file (and `MenuAppearancePanel.tsx`, `tokenCss.ts`, `PageEditor.tsx`, the
new shared hook) is owned by 502-04 exclusively; do not touch
`menuDocumentV2.ts` / `menuDocumentCss.ts` / `siteShell.tsx` /
`siteShellCss.ts` here.

---

## Security Contract

**UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — verified for this subtask's surface:

- Every write in this file goes through the EXISTING validated
  `PATCH /menus/:id` envelope (`updateMenu(menuId, { document })`,
  `:1316-1341`); the new panel values (`brand.text`, cta `size`/`target`,
  tablet records) are normalized server-side by 502-01/the page pipeline —
  reject-unknown, machine-readable `MenuDocumentError`. No new client
  endpoint, no fetch surface change (the settings payload is the existing
  redacted admin settings read).
- `brand.text` renders as React text on canvas (no
  `dangerouslySetInnerHTML`); the canvas token painting is admin-client-only
  inline style derived from validated `DesignTokens` (fail-closed
  `assertTokenOverrides`); `MENU_CANVAS_GHOST_CSS` is a static module
  constant — no stored input ever reaches that CSS string.
- Non-destructive legacy: the editor never prunes/migrates stored docs itself
  (502-01's stored-read owns the carve-out migration — mobileMode
  hoist-then-prune, dropdownDirection prune-only); byte-identity of
  `buildSiteShellCss(null)` and no-override doc CSS is untouched by this file
  (it writes no CSS builders).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md` — Vitest lane, Bun-free; the bun menu suites + smoke live in 502-05)

Extend `tests/vitest/ui/menu-design-editor.test.tsx` (jsdom, real
`render`/`fireEvent` — the suite exists):

1. **Tokens/palette:** the canvas frame's inline style carries all seven
   `--color-*` from a mocked settings payload with token overrides (assert
   `style.getPropertyValue("--color-secondary")` equals the override hex, not
   the DEFAULT_TOKENS value); every `ColorSwatchControl` receives the
   site palette (assert a swatch preview color equals the overridden site
   hex); `SelectableBlock`'s selected class contains the admin-pinned ring
   (NOT `ring-primary` — regression pin for the chrome fix).
2. **Ghost:** flat `visible:false` cta on Desktop renders with
   `data-menu-block-ghost="true"` + the Hidden badge and STAYS selectable
   (click selects); a mobile-only override-hidden block ghosts on Mobile; a
   visible-on-neither block ghosts on BOTH devices; ghost computed/inline
   display is not `none` even when the injected preview CSS contains a hide
   rule for its id (inject a doc that produces one).
3. **Brand:** text-mode panel shows the "Brand text" Input (image mode does
   not) with `maxLength` === `MENU_BRAND_TEXT_MAX_LENGTH` (assert against
   the imported constant, not a literal 120); typing writes `props.text`;
   clearing to empty DELETES the key
   (assert the doc object has no `text` own-key); canvas renders
   `props.text` when set, else the mocked `site.name`, else "Site name" —
   and NEVER the menu name (regression pin: seed menu name "Recon502 Menu",
   assert absent from the canvas brand anchor).
4. **Tablet forks:** editing itemGap on Tablet writes
   `responsive.tablet.navProps.itemGap` (base untouched); badge reads
   Override on Tablet and Base on Desktop; tablet Reset calls through to a
   doc with no `responsive.tablet` member; Mobile behavior byte-unchanged
   (existing 501 assertions stay green); tablet visibility toggle writes
   `responsive.tablet.visibility` for a native block too.
5. **Device-scoped controls:** "Mobile menu" absent on Desktop AND Tablet,
   present on Mobile; "Dropdown direction" absent on Mobile, present on
   Desktop/Tablet; editing either ON ANY DEVICE leaves
   `doc.sections[0].responsive` free of `mobileMode`/`dropdownDirection`
   keys (base write asserted structurally); neither control renders a
   responsive badge or Reset hook.
6. **CTA:** Size segmented + "Open in new tab" toggle write `props.size` /
   `props.target` ("blank"/"self"); the canvas cta preview renders through
   the page renderer (assert variant/size-bearing markup changes when the
   props change — visible effect, not control presence); clicking the cta
   preview selects without navigation.
7. **Leaf previews:** divider preview renders a `PageBlockFrame` stamping
   `data-block-id` (the 502-02 context-rule hook) and the "—" literal is
   gone; divider inspector copy mentions the vertical separator; the spacer
   preview KEEPS the fixed-24px stub — assert it stays a non-zero-width
   selectable target on canvas (the `width: 24` inline style / no
   `PageBlockFrame`, and clicking it selects the block).
8. **Recursive preview:** a 3-level `NavigationItem` tree renders the
   grandchild anchor inside `.site-nav-sublist .site-nav-sublist`; parent
   label appears exactly once in the preview.
9. **Hygiene:** no setState-in-effect introduced (existing lint/pattern
   guard); undo/redo round-trips a tablet-forked edit and a brand-text edit.

PageEditor guard: the existing `tests/vitest/ui/page-editor*` suites run
UNCHANGED after the hook extraction (behavior-identical import swap — any
diff there is a defect). Gates for this subtask: `bun --cwd core lint`,
`bun --cwd core lint:types`, the touched vitest files, AND root
`tsc -p tsconfig.json --noEmit` (covers `tests/` — `lint:types` alone does
not).

---

## Acceptance Criteria

1. Picking the Secondary swatch turns the canvas nav link to the SITE
   secondary hex (computed style inside the canvas), not admin beige;
   Background/Surface/Text swatches resolve; swatch previews show
   site-resolved colors; the selection ring stays admin-colored.
2. Toggling Visible off on Desktop immediately dims the block to a selectable
   "Hidden"-badged ghost; override-hidden and visible-on-neither states ghost
   on the matching devices.
3. Brand text typed in the panel renders on canvas; cleared ⇒ the real site
   name; the menu name never appears in the canvas brand again.
4. Tablet edits create `responsive.tablet` records with Override badges +
   working Reset; Desktop stays base; Mobile behavior unchanged.
5. "Mobile menu" is Mobile-only, "Dropdown direction" Desktop/Tablet-only;
   neither can ever store an override record.
6. CTA Size and Open-in-new-tab exist and visibly change the canvas preview;
   divider renders its real frame (context rules apply once 502-02 lands);
   the spacer stays a visible, click-selectable 24px stub on canvas.
7. A 3+-level tree shows its grandchild markup in the canvas preview.
8. PageEditor is behavior-identical; all listed gates green.

---

## Residuals (named, NOT scope)

Brand text formatting/typography; divider tone/thickness inspector controls
(+ orientation prop, spacer flex-push, `blockGap` — parent bug-5 residuals);
`MenuAppearancePanel.tsx` dead-code removal (record in 502-05 docs);
hover/active emission semantics (`color:` vs background pill — copy fix only
here).

## Files

```
EDIT core/admin/ui/menus/MenuDesignEditor.tsx        (§3-§8)
ADD  core/admin/ui/shared/useCanvasSiteTokens.ts     (§1)
EDIT core/ui/theme/tokenCss.ts                       (§2)
EDIT core/admin/ui/pages/PageEditor.tsx              (§1 import swap only)
EDIT tests/vitest/ui/menu-design-editor.test.tsx     (Testing Requirements)
(NO change: MenuAppearancePanel.tsx — dead code; menuDocumentV2.ts /
 menuDocumentCss.ts / siteShell.tsx / siteShellCss.ts — sibling-owned)
```
