# TASK-502: Menu Design Fixes V2 — Brand Text, Tablet Cascade, Canvas WYSIWYG & Nested Submenus
# FileName: TASK-502_Menu_Design_Fixes_V2_Brand_Tablet_Canvas_Nesting.md

**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Site Front / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-499 (menuDocumentV2 + Design tab + `menuDocumentCss.ts`), TASK-501 (responsive records, `MenuResponsiveControlShell`, visibility plan), Pages canvas-token pattern (`PageEditor.tsx` `useCanvasSiteTokens` + `toPageCanvasColorCssVariableMap`), Pages tablet cascade (`pageResponsiveCss.ts`)
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

Seven owner-reported Menu Design bugs (2026-07-02), each confirmed by a
read-only live recon (session recon502; rootCause file:line evidence verified
against source 2026-07-02), plus two owner DECISIONS that un-defer 501
scoping choices. One-line root causes:

1. **Brand text wrong + uneditable** — the canvas brand block renders the
   MENU NAME (`MenuBlockPreview` brand case, `MenuDesignEditor.tsx:465-474`
   renders `menuName || "Brand"`) while the front renders the SITE NAME
   (`BrandRender`, `siteShell.tsx:324-355` renders `siteName`), and the schema
   has no text prop at all (`BRAND_PROP_KEYS = ["mode","href","image"]`,
   `menuDocumentV2.ts:346`, reject-unknown) — canvas ≠ front and neither is
   editable.
2. **OWNER DECISION — tablet cascade un-deferred.** 501 consciously shipped
   `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"]` (`menuDocumentV2.ts:113`);
   tablet edits silently write the base and the canvas maps tablet⇒desktop.
   Mirror Pages EXACTLY: desktop = base; tablet AND mobile each carry their own
   sparse record; BOTH inherit from DESKTOP (mobile does NOT inherit tablet —
   `pageResponsiveCss.ts:10-13` rationale).
3. **OWNER DECISION — device-scoped panel controls** (kills the 501
   dead-override residual): `mobileMode` ("Mobile menu",
   `MenuDesignEditor.tsx:~1121-1135`) and `dropdownDirection`
   (`:~1105-1120`) are both wrapped in `MenuResponsiveControlShell`, so Mobile
   edits store overrides — but `dropdownDirection` is desktop-branch-only and
   reads the BASE (`menuDocumentCss.ts:250-254`): a mobile override is DEAD
   data. A stored `mobileMode` mobile override, by contrast, IS consumed by
   the mobile branch today (`mobileModeRules(mobileResolved)`,
   `menuDocumentCss.ts:327`) — hence 502-01's hoist-then-prune read
   migration. These are device-DEFINING options, not overridable ones.
4. **Canvas site tokens missing** — swatches store `var(--color-*)` references
   (`pageEditorControlUiModel.ts:225-260`) that the menu canvas never defines:
   `MenuDocumentCanvas` (`MenuDesignEditor.tsx:509-559`) paints NO site token
   variables, so the admin theme leaks in (`--color-secondary` resolves to the
   admin beige `#f1efeb`; `--color-bg/-surface/-text` are UNDEFINED ⇒ invalid
   at computed-value time). The front is correct (`publicSite.tsx` emits
   `toCssVariables(tokens)` on `:root`). PageEditor already solved this
   (`useCanvasSiteTokens` `PageEditor.tsx:380` + inline
   `toPageCanvasColorCssVariableMap` `:752-757` + site-resolved palette).
5. **Divider useless in the bar** — the page divider leaf (`<hr>` with inline
   4-side `borderWidth`, `pageRendererV2.tsx:1845-1853`) collapses to a
   ~4×4px dot as a flex item of `.site-header-inner{display:flex}`; the
   doc-scoped sheet emits ZERO divider rules; the canvas preview is a literal
   "—" (`MenuDesignEditor.tsx:496-501`) and the inspector says "no editable
   options" (`:1235-1239`). Wanted: a vertical separator line.
6. **CTA Visible toggle dead on canvas + missing options** — the Desktop/Tablet
   toggle writes flat `block.visibility` (`MenuDesignEditor.tsx:969-975` via
   `setMenuBlockVisibleForDevice`), which the FRONT consumes (PageBlockFrame
   null + `shouldRenderMenuBlock`, `siteShell.tsx:283-286/:397`) but the
   CANVAS never does — `MenuDocumentCanvas` maps ALL blocks unconditionally
   (`:541-555`) and `collectMenuVisibilityPlan` skips flat-only blocks by
   design (`menuDocumentCss.ts:284-295`). Also the cta panel exposes only
   Label/Link/Variant while `size`/`target` are already validated
   (`pageDocumentV2.ts:605` `button: ["label","href","target","variant","size"]`).
7. **Nested submenus flattened** — the data pipeline is fully recursive
   (`treeBuilder.ts` unlimited depth, `navigationMenuMapping.ts` recurses),
   but RENDER flattens: `flattenNavigationDescendants` (`siteShell.tsx:97-107`)
   squashes every descendant into ONE dropdown level and `SiteNavItem:144/:156`
   prepends a DUPLICATE parent link; zero `.site-nav-sublist .site-nav-sublist`
   rules exist anywhere; the canvas `NavItemsPreview`
   (`MenuDesignEditor.tsx:408-449`) renders one child level and silently drops
   grandchildren.

**Cross-cutting (501 LOW residuals folded in):** the mobile canvas hides the
nav list under the default `mobileMode:"disclosure"` (closed disclosure ⇒
`display:none` in the preview too) — the canvas should preview the list;
changelog 1210 contains a "39/39" menus-routes count that is actually "11/11"
(doc correction at closure); the both-devices-invisible ghost state is covered
by bug 6's canvas gate.

### Non-goals

- **NO `menu-drawer` implementation** (unchanged 501 stance).
- **NO text formatting on brand** (typography can ride the block style channel
  later — named residual, not scope).
- **NO new endpoint / RBAC / migration** — see Security Contract.
- **NO hover/active emission-semantics change** — `linkHoverColor`/
  `linkActiveColor` stay state-only background pills
  (`menuDocumentCss.ts:225/:233`); bug 4's fix here is panel COPY only
  ("Hover background" style labels/help text).
- **NO `core/site/siteShellCss.ts` byte drift** — `buildSiteShellCss(null)`
  byte-identity is inviolable (`tests/unit/pages/siteShellCss.test.ts`).
  Nested-sublist rules therefore come from the DOC-SCOPED builder. The LEGACY
  no-document header keeps `<details>` click-open — now applied RECURSIVELY
  per level (502-03 audit resolution, option (b): bug 7 lives on BOTH paths;
  the frozen base sheet has no hover rules and closed-`<details>` content
  cannot be CSS-revealed, so hover mode stays a menu-document-path feature);
  FLAT legacy menus render byte-identical markup (see the 502-03 render-path
  fork, resolved in the contract sketch).
- **NO gold-plating bug 5** — the recon's cheap extra layout options
  (divider `orientation` prop on the page leaf, spacer `flex:1` push mode,
  exposing the bar's hardcoded `gap:8px 24px` as a `blockGap` field,
  per-block margin/padding controls on the leaf `style` slot) are named
  RESIDUALS, not scope. Per-block spacing is already partially ridable via the
  existing `itemGap`/`paddingX`/`paddingY` appearance fields.

---

## Contract sketch (normative for the subtasks)

```ts
// core/services/menus/menuDocumentV2.ts — 502-01
// (1) Brand text — CONSCIOUS key-list extension (fail-closed read trap: this
// list gates BOTH write and stored read; a missed key degrades the WHOLE doc):
const BRAND_PROP_KEYS = ["mode", "href", "image", "text"] as const;   // :346
// BrandProps += text?: string  — normalizeBrandProps accepts string only,
// trims, caps at 120 chars (authoring-text cap), OMITS when empty (sparse).
// createDefaultMenuBlock("brand") and the legacy adapter stay textless
// (no text = inherit site name). Fallback CHAIN (front AND canvas):
//   brand.props.text (per-menu override) -> siteName (site.name setting) -> null.

// (2) Tablet breakpoint — Pages cascade (both inherit DESKTOP; mobile does
// NOT inherit tablet):
const MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet", "mobile"] as const; // :113
// MenuSectionResponsive += tablet?: { layout?; navProps? }  (same sparse shape)
// MenuBlockResponsive   += tablet?: { visibility?: { visible: boolean } }
// resolve/patch/clear helpers (:~890-975) generalize the "mobile" literal to
// MenuResponsiveBreakpoint: resolveMenuSectionAppearanceForDevice(section,
// "tablet") = base merged with ONLY the tablet record;
// patchMenuSectionForDevice(doc, id, "tablet", ...) writes responsive.tablet;
// desktop still writes base; clear + empty-record prune per breakpoint.
// resolveMenuBlockVisibleForDevice(block, "tablet") = tablet override ?? flat.
// setMenuBlockVisibleForDevice: desktop ⇒ flat (leaf only); tablet/mobile ⇒
// their own responsive record (all block types).
// hasMenuBlockVisibilityOverride (:928-929) GENERALIZES from mobile-only to
// ANY-breakpoint: true when responsive.tablet?.visibility OR
// responsive.mobile?.visibility is set. This helper gates
// collectMenuVisibilityPlan (menuDocumentCss.ts:287 skips non-override
// blocks) AND menuLeafToPageBlock's hand-off-to-CSS (siteShell.tsx:271-273)
// — without it, tablet-only visibility overrides would emit NO hide rules
// and get no anywhere-gate.

// (3) Device-defining nav props — mobileMode + dropdownDirection are NOT
// overridable:
const MENU_NAV_DEVICE_DEFINING_KEYS = ["mobileMode", "dropdownDirection"] as const;
// WRITE normalizer: responsive.*.navProps containing either key ⇒
// MenuDocumentError (reject-unknown-in-context, offending path).
// STORED-READ normalizer: a CONSCIOUS carve-out, NOT fail-closed (degrading
// the whole doc for a 501-era record would be data loss) — but the two keys
// are NOT symmetric and get SPLIT treatment:
//   - dropdownDirection: truly DEAD data (desktop-branch-only, reads the
//     BASE — menuDocumentCss.ts:250-254) ⇒ silently PRUNED, nothing else.
//   - mobileMode: NOT dead — the mobile branch reads the mobile-RESOLVED
//     appearance (`mobileModeRules(mobileResolved)`, menuDocumentCss.ts:327),
//     so a stored responsive.mobile.navProps.mobileMode override changes the
//     published mobile rendering TODAY (the 501 UI wrote exactly such
//     overrides when editing "Mobile menu" on the Mobile device —
//     MenuDesignEditor.tsx:~112). Prune-only would silently revert real docs
//     (e.g. inline back to disclosure). Instead: HOIST the override value
//     into the base appearance (behavior-preserving — mobileMode only ever
//     affects the mobile branch), THEN prune the record.
// The migrated doc round-trips clean, so the next autosave persists the
// hoisted+pruned form. Assert BOTH halves explicitly in tests, including:
// a 501-era doc with a mobile mobileMode override renders byte-identical
// mobile CSS before and after the stored-read migration.
```

```ts
// core/site/menuDocumentCss.ts — 502-02
// (2) Tablet branch: buildMenuRuleSets adds tabletResolved next to
// mobileResolved; per-GROUP delta rules vs base (same total-emission-when-
// triggered contract as 501-02). FRONT: a NEW bounded tablet @media using
// pageResponsiveMediaBounds.tablet (min-width:640px and max-width:1023px —
// bounded so tablet overrides never leak into mobile widths, Pages
// rationale). CANVAS: buildMenuDocumentPreviewCss STOPS mapping
// tablet⇒desktop — the device-forced tablet branch = base + desktopShared
// (dropdownRule + navNestingRules) + tabletDelta, with NO visibility hide
// rules in ANY forced preview branch (dropdownRule reads the base and
// legitimately applies at >=640px; omitting it would drop the
// dropdown-direction rule from the forced-tablet canvas; hide rules stay
// FRONT-only — see the NORMATIVE canvas-visibility paragraph below).
// DISAMBIGUATION (so no branch definition reads as "includes hides"): the
// SHARED rule sets consumed by the FRONT @media wrappers DO carry the
// tablet-scoped (and other) hide rules; buildMenuDocumentPreviewCss STRIPS
// visibility hide rules from EVERY forced branch (desktop/tablet/mobile)
// before joining — a forced branch that shipped them would display:none the
// 502-04 ghost.
// Visibility plan (NORMATIVE media bounds — rule PRESENCE alone is not the
// contract): hide rules join the existing dual
// data-menu-block-id/data-block-id selector machinery (every comma-list
// member `${header}`-prefixed) and are placed per RESOLVED tri-device
// visibility:
//   hidden on desktop AND tablet ⇒ today's shared min-width:640 branch
//     (byte-stable for docs without tablet overrides — e.g.
//     show-only-on-mobile keeps its pre-502 emission);
//   hidden on desktop ONLY (tablet-visible override) ⇒ a min-width:1024
//     @media — keeping it in today's :352 min-width:640 wrap would leave the
//     block hidden at 640-1023px, breaking Acceptance 2/6;
//   hidden on tablet ONLY ⇒ the bounded tablet branch;
//   hidden on mobile ⇒ the mobile branch (unchanged).
// CANVAS visibility (NORMATIVE): buildMenuDocumentPreviewCss stops emitting
// the visibility hide rules into the forced branch ENTIRELY — hideRule
// (:306-309) targets [data-menu-block-id], which the editor stamps on
// SelectableBlock (MenuDesignEditor.tsx:278), so the canvas's own injected
// <style> would display:none the 502-04 ghost on its hidden device. Canvas
// visibility is owned SOLELY by the 502-04 ghost gate; FRONT
// buildMenuDocumentCss keeps emitting every hide rule unchanged.
// dropdownDirection stays desktop+tablet (sublists exist only >=640px), and
// dropdownRule already reads the base (menuDocumentCss.ts:320 — no change);
// mobileModeRules KEEPS reading the mobile-RESOLVED appearance
// (`mobileModeRules(mobileResolved)`, menuDocumentCss.ts:327) — after
// 502-01's hoist/prune no mobileMode override can exist in a normalized doc,
// so resolved == base and the hoist byte-identity test (builder(raw doc) vs
// builder(migrated doc)) passes with ZERO builder change. Existing pin that
// must keep passing UNCHANGED: tests/unit/site/menu-document-render.test.tsx
// :328-330 ("mobileMode override: mobile-resolved 'inline' emits the inline
// pair") feeds a raw responsive.mobile.navProps.mobileMode doc directly to
// the builder and asserts the resolved pair — do not weaken it.
//
// (5) Divider context rules — schema untouched; CONTEXT CSS only, emitted
// per-divider-block from the doc-scoped builder (mirror the
// collectMenuVisibilityPlan per-block pattern; tone/thickness are already
// validated enum/number, so prop-derived declarations are injection-safe):
//   `${scope} .site-header-inner [data-block-id="<id>"]{align-self:center;` +
//     `width:${thickness}px;height:1.5em;background:${toneColor}}`
//   `${scope} .site-header-inner [data-block-id="<id>"] hr{display:none}`
// (the inner <hr> carries INLINE borderColor/borderWidth that stylesheet
// declarations cannot beat — hide it and paint the FRAME as the line;
// `display` is not inline-styled, so no !important). The frame rule declares
// NO `display:` — 502-02 §4 cascade guard: the frame <div> is block-level by
// UA default, and this (0,3,0) selector would beat the (0,2,0) visibility
// hideRule in EVERY media branch, making a divider with a responsive
// visibility override permanently un-hideable on the front. Same
// rules in the canvas structural baseline path so canvas === front.
//
// (7) Nested sublists — DOC-SCOPED builder only (base sheet FORBIDDEN);
//   the ENTIRE nesting block is emitted ONLY inside the shared >=640 branch
//   (desktop AND tablet) — mobile (<640) never sees these rules:
//   hide-by-default + open-per-level:
//     `${scope} .site-nav-sublist{display:none}`
//     `${scope} .site-nav-item:hover>.site-nav-sublist,` +
//     `${scope} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`
//   level-1 keeps top:100%/bottom:100% (respecting dropdownDirection);
//   nested fly-out (direction-AWARE — matches 502-02 §5, golden-pinned in
//   502-05 §2.3):
//     `${scope} .site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}`
//     (`bottom:0;top:auto` when dropdownDirection === "top")
//     `${scope} .site-nav-sublist>li{position:relative}`
//   mobile branch: NO sublist hide and NO un-hide — the base sheet's
//   `.site-nav-sublist{display:grid}` (siteShellCss.ts:151) plus the
//   cumulative per-depth padding-left:16px class rule (siteShellCss.ts:171)
//   keep all levels inline-indented; the closed-disclosure gate
//   (`${scope} .site-nav-list{display:none}`, menuDocumentCss.ts:266)
//   unchanged — it hides the WHOLE list until the disclosure opens, so
//   sublists become visible exactly when the disclosure does.
//
// (cross-cutting) Canvas disclosure preview: in the PREVIEW builder ONLY
// (buildMenuDocumentPreviewCss mobile branch), do not emit the closed-
// disclosure `display:none` for `.site-nav-list` (or emit a canvas-only
// force-open rule) so the mobile canvas previews the nav list under the
// default mobileMode. FRONT emission unchanged.
```

```tsx
// core/site/siteShell.tsx — 502-03 (SOLE writer of this file)
// (7) DELETE flattenNavigationDescendants (:97-107) AND the
// parent-duplication `[item, ...dropdownItems]` line (:156) — bug 7 lives on
// BOTH paths (the recon reproduced the flatten on SiteHeaderNav itself);
// each interaction mode replaces them (502-03 work item 1).
// SiteNavItem becomes RECURSIVE in BOTH variants; menu-document variant:
//   item with visible children ⇒ <li class="site-nav-item"> [own link, or a
//   <span class="site-nav-link site-nav-group-label"> when href is "#" —
//   BOTH classes, so link color/typography/caret rules apply to labels] +
//   <ul class="site-nav-sublist">{children.map(child => <SiteNavItem .../>)}</ul>
// Both SiteHeaderNav (legacy) and NavItemsRender (menu-doc) share SiteNavItem
// — but they CANNOT share one markup shape. RENDER-PATH FORK (resolved here,
// normative): the 502-02 hover rules
// (`.site-nav-item:hover>.site-nav-sublist{display:grid}`) are DEAD against
// the current <details class="site-nav-group"><summary> structure twice over
// (siteShell.tsx:160-169): the sublist is not a direct child of
// .site-nav-item, and CSS display cannot reveal the content of a closed
// <details>. So SiteNavItem takes a variant prop:
//   - menu-document path (NavItemsRender): details-FREE recursive mode —
//     <li class="site-nav-item"> [own link / group label] +
//     <ul class="site-nav-sublist">{children}</ul> — the exact structure the
//     502-02 doc-scoped hover/focus-within/fly-out rules target (Acceptance 7
//     mandates hover-open).
//     Keyboard reachability (NORMATIVE): a "#" group parent renders as a
//     <span class="site-nav-link site-nav-group-label" tabIndex={0}> — spans
//     are not focusable by default and children inside display:none cannot
//     receive focus, so without tabIndex :focus-within could NEVER fire for
//     that subtree (keyboard-unreachable; the replaced <details>/<summary>
//     was keyboard-operable). TOUCH at >=640px (real tablets have no hover):
//     first-tap-opens semantics are NOT built here — a conscious,
//     owner-approved residual (named under Documentation Updates); keyboard
//     focus via the tabIndex group labels remains the non-pointer path.
// (cta/divider preview seam) menuLeafToPageBlock (:259) STAYS module-private
// — NO export, NO change here. 502-04's real-leaf cta/divider canvas preview
// uses its own blessed LOCAL replica (canvasMenuLeafToPageBlock) with
// visibility ALWAYS {visible:true}: a verbatim import would carry the
// :271-273 hand-off-to-CSS visibility skip into the canvas, fighting the
// 502-04 ghost gate (the SOLE canvas visibility owner). Replica-vs-original
// drift is pinned by the 502-04 vitest suite; 502-04 never touches this file.
//   - legacy no-document path (SiteHeaderNav): recursive
//     <details class="site-nav-group"><summary> click-open PER LEVEL —
//     502-03 audit resolution, option (b); no flatten, no
//     flattened-descendant duplication. The linked-parent reachability
//     convention survives in recursive form: a <summary> is not a link (the
//     siteShell.tsx:155 comment exists for exactly this), so a real-href
//     parent renders as the FIRST entry of its DIRECT sublist only — never
//     flattened descendants. Hover markup is IMPOSSIBLE on this path, two
//     reasons each sufficient: (a) the frozen base sheet has NO sublist
//     hide/hover rules (siteShellCss.ts:151 `display:grid` with no hide
//     rule) — de-detailing would leave sublists permanently expanded (base
//     sheet frozen, legacy has no doc-scoped sheet); (b) closed-<details>
//     content cannot be revealed by CSS, so hover-open <details> would need
//     JS. Nested depths style themselves via the base sheet's per-CLASS
//     rules (row position:relative :143; sublist grid/absolute/indent
//     :151/:157/:171) — nested dropdowns open below their row (reachable;
//     fly-out polish stays a doc-scoped-only feature). FLAT legacy menus
//     render byte-identical markup, keeping Acceptance 8 true.
// Legacy nested-depth audit (DELEGATED to 502-03, resolved THERE with
// base-sheet evidence — this sketch records the answer): the legacy variant
// renders recursive <details> per level styled per depth by the frozen base
// sheet's class rules — no base-sheet change needed; buildSiteShellCss
// output must not change by one byte; FLAT legacy menus' SSR markup is
// byte-identical to pre-502, while nested legacy trees change CONSCIOUSLY
// (that IS the bug-7 fix on the legacy path).
// (1) BrandRender text mode: `const text = block.props.text?.trim() || siteName;
// if (!text) return null;` — markup/classes unchanged.
// (6/2) shouldRenderMenuBlock (:283-286) does NOT stay as-is: once tablet is
// a real breakpoint it adds the tablet term — render when visible on desktop
// || tablet || mobile (today's desktop||mobile check would render-skip a
// flat-hidden + tablet-visible-override block, so it could never appear at
// 640-1023px, breaking Acceptance 2/6). menuLeafToPageBlock (:271-273) and
// the PageBlockFrame flat-skip pick the fix up automatically via 502-01's
// GENERALIZED hasMenuBlockVisibilityOverride (any-breakpoint) — no further
// change here beyond the tablet term.
```

```tsx
// core/admin/ui/menus/MenuDesignEditor.tsx (+ shared hook/tokenCss) — 502-04
// (4) Canvas site tokens: extract useCanvasSiteTokens (PageEditor.tsx:380-411)
// to core/admin/ui/shared/useCanvasSiteTokens.ts (PageEditor adopts the
// import); add toMenuCanvasColorCssVariableMap(tokens) in
// core/ui/theme/tokenCss.ts next to toPageCanvasColorCssVariableMap (:128) —
// the menu canvas needs ALL SEVEN --color-* (primary/secondary/accent/bg/
// surface/border/text). NORMATIVE approach (verified 2026-07-02): paint the
// seven-var map on the MenuDocumentCanvas frame ROOT (:509-559). It MUST be
// the root: the section Surface/Border swatch rules emit onto the scope
// root itself (`${menuDocScope}{background:${a.surfaceColor};border-bottom:
// ...${a.borderColor}}`, menuDocumentCss.ts:177-186, where menuDocScope
// (:127) IS the canvas root div carrying SITE_MENU_DOC_ATTRIBUTE), and CSS
// custom properties inherit DOWNWARD only — vars painted on per-block
// descendants can never feed a root-level rule, so a per-block wrapper
// leaves the section Background/Surface/Border tokens resolving against the
// admin theme (bug 4 persists for those swatches; Acceptance 4 fails).
// Prerequisite in the SAME subtask: re-point SelectableBlock's selection
// ring off --color-primary (`ring-primary`, MenuDesignEditor.tsx:286) onto
// an --admin-* variable, and AUDIT every other --color-* consumer inside
// the canvas subtree — tokenCss.ts:111-127 documents that re-emitting brand
// --color-* on a frame overrides such chrome. A per-block inner wrapper is
// NOT an acceptable fallback (it demonstrably cannot cover the section-level
// root rules). Build the palette once
// (getPageEditorColorPalette(siteTokens)) and pass palette={...} to EVERY
// ColorSwatchControl (surface/border :649/:661, link colors
// :1069/:1081/:1097) + MenuAppearancePanel.tsx (:124-148) if still mounted.
// Copy fix: hover/active controls labelled as state background ("Hover
// background (on hover)" or equivalent help text) — emission untouched.
// (1) Brand: canvas brand case renders block.props.text || siteName ||
// "Site name" (thread the REAL site.name into the editor payload — extend the
// design-route initial detail; if too invasive, at minimum drop menuName so
// the canvas matches the front's fallback chain); panel gains a text-mode-only
// Input "Brand text" (placeholder "Site name (default)") writing props.text
// via the flat patch() pattern; empty input DELETES the prop (sparse).
// (3) Device scoping: "Mobile menu" control rendered ONLY when
// device==="mobile"; "Dropdown direction" ONLY when device!=="mobile"; BOTH
// unwrapped from MenuResponsiveControlShell and writing the BASE
// (setNavField base path) regardless of device — no badges, no Reset, no
// dead override records, ever.
// (2) Tablet forks: the 501 device-fork writers key on the current device for
// BOTH tablet and mobile (patchMenuSectionForDevice / per-breakpoint
// visibility toggle); MenuResponsiveControlShell badges + Reset work per
// breakpoint; the canvas scope cue reads "Tablet (overrides)".
// (6) Canvas visibility gate: MenuDocumentCanvas computes
// visible = resolveMenuBlockVisibleForDevice(block, device) and renders
// hidden blocks as a dimmed selectable GHOST (opacity ~40% + a "Hidden"
// badge) instead of skipping — covers flat hides, tablet/mobile overrides,
// and visible-on-neither. The ghost stays VISIBLE on its hidden device
// because 502-02's buildMenuDocumentPreviewCss omits the per-branch
// visibility hide rules from the forced branch (they target the
// [data-menu-block-id] SelectableBlock stamp and would display:none the
// ghost) — this gate is the SOLE canvas visibility owner.
// collectMenuVisibilityPlan / FRONT emission NOT touched by this item.
// CTA panel += SegmentedControl "Size"
// (pageButtonSizes) + ToggleSwitch "Open in new tab" (target "blank"|"self")
// — both already validated by the page pipeline. CTA canvas preview renders
// the real leaf via the LOCAL canvasMenuLeafToPageBlock replica of
// siteShell's private mapping (visibility forced {visible:true} — the ghost
// gate owns canvas hiding) ⇒ PageBlockFrame/PageBlockContent — do NOT touch
// siteShell.tsx; replica drift pinned by this subtask's vitest suite — so
// variant/size have visible effect.
// (5) Divider canvas preview: replace the "—" span (:496-501) with the real
// leaf-frame structure carrying data-block-id so the 502-02 context rules
// apply identically on canvas; inspector stub (:1235-1239) notes the divider
// renders as a vertical separator (tone/thickness surfacing = residual).
// (7) NavItemsPreview (:408-449): recursive renderPreviewItem (link +
// children ⇒ nested <ul class="site-nav-sublist">), same class names; nested
// levels must be REACHABLE on canvas (hover CSS as on front, or a canvas-only
// static indented-tree scope) — grandchildren never silently dropped.
// Items editor: VERIFY (recon: no cap exists — MenuTree.tsx recurses, menuDnD
// child-intent unlimited) that indent depth is not artificially capped; no
// code change expected.
```

React-hooks rule (unchanged from 501): all device-forked writes happen in
event handlers; no setState-in-effect.

---

## Architecture (files to add / change)

```
EDIT core/services/menus/menuDocumentV2.ts          (502-01: brand.text, tablet breakpoint, device-defining carve-out)
EDIT core/site/menuDocumentCss.ts                   (502-02: tablet @media + canvas tablet branch, divider context rules, nested-sublist rules, canvas disclosure preview)
EDIT core/site/siteShell.tsx                        (502-03 SOLE WRITER: recursive SiteNavItem — hover mode for menu docs, recursive <details> legacy; flatten + parent-duplication DELETED; BrandRender text chain; menuLeafToPageBlock stays module-private)
EDIT core/admin/ui/menus/MenuDesignEditor.tsx       (502-04: site tokens, visibility ghost, brand text UI, cta size/target + real preview, device-scoped controls, tablet badges, recursive NavItemsPreview, divider preview)
ADD  core/admin/ui/shared/useCanvasSiteTokens.ts    (502-04: extracted from PageEditor.tsx:380-411)
EDIT core/ui/theme/tokenCss.ts                      (502-04: toMenuCanvasColorCssVariableMap)
EDIT core/admin/ui/pages/PageEditor.tsx             (502-04: adopt the shared hook import — behavior-identical)
EDIT core/admin/ui/menus/MenuAppearancePanel.tsx    (502-04: palette pass-through, IF still mounted — verify)
ADD  tests (502-05; see Testing Requirements)
(core/site/siteShellCss.ts: NO change — byte-identity guard;
 core/server/validation/menuSchemas.ts, menuService.ts: NO change — envelope
 already flows end-to-end; verify only)
```

**File ownership (single-writer):** `menuDocumentV2.ts` → 502-01;
`menuDocumentCss.ts` → 502-02; `siteShell.tsx` → 502-03;
`MenuDesignEditor.tsx` / `MenuAppearancePanel.tsx` / `tokenCss.ts` /
`PageEditor.tsx` / the shared hook → 502-04; test files + docs → the subtask
that lands them, closure sweep 502-05.

---

## Subtasks

| ID | Title | File | Status |
|---|---|---|---|
| TASK-502-01 | Menu Model — Brand Text & Tablet Breakpoint | TASK-502-01-Menu-Model-Brand-Text-And-Tablet-Breakpoint.md | ✅ Done |
| TASK-502-02 | Menu CSS — Tablet Branch, Separators & Nested Sublists | TASK-502-02-Menu-CSS-Tablet-Branch-Separators-And-Nested-Sublists.md | ✅ Done |
| TASK-502-03 | Front — Recursive Nav & Brand Render | TASK-502-03-Front-Recursive-Nav-And-Brand-Render.md | ✅ Done |
| TASK-502-04 | Design Editor — Canvas WYSIWYG & Device Controls | TASK-502-04-Design-Editor-Canvas-WYSIWYG-And-Device-Controls.md | ✅ Done |
| TASK-502-05 | Menu Fixes Tests, Docs, Closure | TASK-502-05-Menu-Fixes-Tests-Docs-Closure.md | ✅ Done |

- **502-01 (keystone)** — the model: `brand.props.text` (validated, trimmed,
  120-cap, sparse) + the CONSCIOUS `BRAND_PROP_KEYS` extension; `"tablet"` in
  `MENU_RESPONSIVE_BREAKPOINT_KEYS` with the Pages cascade (tablet AND mobile
  each inherit DESKTOP); resolve/patch/clear/prune helpers generalized per
  breakpoint, INCLUDING `hasMenuBlockVisibilityOverride` generalized to
  any-breakpoint (tablet OR mobile record — it gates the CSS visibility plan
  and the front hand-off-to-CSS); the device-defining carve-out (reject `mobileMode`/
  `dropdownDirection` in responsive navProps on WRITE; on STORED READ,
  HOIST a 501-era mobile `mobileMode` override into the base appearance then
  prune the record — behavior-preserving, because the mobile branch consumes
  that override today — and prune-only for the truly-dead
  `dropdownDirection`; non-destructive migration either way).
- **502-02** — CSS: the bounded tablet `@media`
  (`pageResponsiveMediaBounds.tablet`) on the front + the real device-forced
  tablet canvas branch (tablet⇒desktop mapping removed; branch = base +
  `desktopShared` (`dropdownRule` + nesting rules) + `tabletDelta`, NO
  visibility hide rules); FRONT visibility hide rules placed per
  RESOLVED tri-device visibility (desktop-only hides in a `min-width:1024`
  `@media`; desktop+tablet hides stay in the shared ≥640 branch byte-stable)
  and OMITTED entirely from the preview builder's forced branch (the 502-04
  ghost gate is the sole canvas visibility owner); per-divider-block
  context rules (frame-as-line, inner `<hr>` display:none); doc-scoped
  nested-sublist hide/hover/fly-out rules (≥640 branch ONLY — the mobile
  branch carries no hide and no un-hide, base-sheet inline indent applies);
  canvas-only disclosure preview un-hide. `buildSiteShellCss`
  byte-identity preserved; the divider/nested-sublist rules are
  UNCONDITIONAL doc-scoped additions (whole-output identity vs pre-502 does
  NOT hold), so the guarantee is: NO tablet branch for docs without tablet
  overrides (zero responsive-branch drift for no-override/mobile-only docs;
  mobile-only docs' mobile branch byte-identical) + re-baselined structural
  pins (see Security Contract).
- **502-03** — front markup: recursive `SiteNavItem` with the
  RENDER-PATH FORK: details-free recursive hover mode for menu-document
  `NavItemsRender` (targeted by the 502-02 hover rules; group-label spans
  keyboard-focusable via `tabIndex={0}`); legacy `SiteHeaderNav` gets
  recursive click-open `<details>` per level (502-03 audit resolution,
  option (b)) — `flattenNavigationDescendants` and the
  `[item, ...dropdownItems]` duplication are DELETED, linked parents staying
  reachable as the FIRST entry of their DIRECT sublist; FLAT legacy menus
  render byte-identical markup (with `buildSiteShellCss(null)` untouched
  either way);
  `shouldRenderMenuBlock`
  gains the tablet term; `BrandRender` text→siteName chain;
  `menuLeafToPageBlock` (`:259`) stays module-private — 502-04's real-leaf
  preview uses its blessed local `canvasMenuLeafToPageBlock` replica
  (visibility forced true; drift pinned by the 502-04 vitest suite) and never
  touches the file. Owns `siteShell.tsx` exclusively.
- **502-04** — editor: canvas site-token painting on the CANVAS FRAME ROOT
  (selection ring re-pointed to an `--admin-*` var first; per-block wrappers
  cannot feed the scope-root section rules) + site-resolved swatch
  palettes (shared `useCanvasSiteTokens` + `toMenuCanvasColorCssVariableMap`),
  visibility ghost gate via `resolveMenuBlockVisibleForDevice`, brand text
  input + real-site-name canvas chain, cta Size/target controls + real leaf
  preview, `mobileMode`/`dropdownDirection` device-scoped base-writing
  controls (shells removed), tablet override badges/Reset, recursive
  `NavItemsPreview`, divider preview parity, hover/active copy fix.
- **502-05** — closure: full vitest + bun matrices, the byte-identity /
  no-branch-drift guards (as scoped in the Security Contract), the
  ≥5-scenario real-flow smoke (below), docs + changelog (next free number
  AFTER 1210 — expected **1211**, verify at closure), the changelog-1210
  "39/39"→"11/11" menus-routes correction, README/board/Statistics.

**Sequencing / land order:** 502-01 (model keystone) → 502-02 (CSS) → 502-03
(front) → 502-04 (editor) → 502-05 (closure). 502-02/03/04 all depend on
502-01; 502-04 additionally consumes 502-02's preview emission (tablet branch,
divider/nested rules) and must match 502-03's front markup on canvas, so it
lands after both. **SAME-COMMIT pin (normative, mirrored in 502-02
Coordination + 502-03 work item 3):** 502-02's unconditional nested-sublist
hide rule would blank every published doc-header dropdown at ≥640px against
today's `<details>` markup, so 502-02's `navNestingRules` emission and
502-03's hover markup land in the SAME commit — implementation order stays
502-02 → 502-03, but neither ships alone; NO transitional rule is emitted and
502-03 gets NO `menuDocumentCss.ts` ownership exception (single-writer table
unchanged).

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — verified against source 2026-07-02:

- The document rides the existing validated `PATCH /menus/:id` write path:
  `menuUpdateSchema` (`core/server/validation/menuSchemas.ts`) already allows
  `document: { type: ["object","null"] }` with service-side strict validation;
  `menus.settings` is freeform jsonb. `brand.text` and `responsive.tablet`
  arrive inside that envelope — **NO schema/route/RBAC change, NO migration**.
- **Schema-first / reject-unknown:** every new key lives in the service-module
  normalizers (`menuDocumentV2.ts`); write violations throw machine-readable
  `MenuDocumentError` with the offending path; `brand.text` is trimmed +
  length-capped and rendered as React text (no dangerouslySetInnerHTML);
  divider context-rule declarations derive ONLY from already-validated
  enum/number props — raw stored input never reaches CSS.
- **Fail-closed read, non-destructive legacy:** the stored read stays
  fail-closed; the ONE conscious carve-out (tolerate-not-degrade for
  `mobileMode`/`dropdownDirection` inside responsive navProps) is SPLIT:
  `mobileMode` is HOISTED into the base appearance then pruned
  (behavior-preserving — the mobile branch reads that override today, so
  prune-only would silently change published mobile rendering);
  `dropdownDirection` (truly dead, base-read desktop-only) is prune-only.
  Both persist the migrated form on next write — no behavior change, no
  destructive rewrite — and both halves are asserted explicitly in tests
  (including byte-identical mobile CSS before/after the mobileMode hoist).
  Legacy docs without `responsive`/`text` parse byte-unchanged.
- **Byte-identity & no-branch-drift guards (named, precisely scoped):**
  (a) `buildSiteShellCss(null)` unchanged (ZERO-line test diff) — the only
  whole-output byte-identity claim in this task. (b) Whole-output
  `buildMenuDocumentCss` identity vs pre-502 is NOT claimable and must not be
  pinned: 502-02 items 5/7 add UNCONDITIONAL doc-scoped structural rules
  (nested-sublist hide/hover/fly-out for EVERY doc — all docs contain
  nav-items; per-divider context rules whenever a divider block exists),
  so every doc's output gains those lines by design. The real guarantee:
  NO tablet `@media`/branch is emitted for docs without tablet overrides —
  no-override and mobile-only docs gain ZERO responsive-branch drift, and a
  mobile-only doc's mobile branch stays byte-identical. (c) The
  no-override/mobile-only fixture pins are RE-BASELINED once to include the
  new structural divider/nested-sublist rules, then locked, with the pin
  scoped to "no responsive-branch drift" rather than whole-output identity.
  All new CSS stays inside the doc-scoped sheet; the canvas token painting is
  admin-client-only inline style.
- **Front renders published-only** (unchanged); the editor's site-name
  threading is read-only display data already visible to any admin.

---

## Acceptance Criteria (per bug, measured LIVE — canvas + `:3000`, not synthetic-only)

1. **Brand** — panel "Brand text" (text mode) sets the canvas AND published
   front brand to the typed text; clearing it makes BOTH show the site name;
   the canvas never shows the menu name again.
2. **Tablet cascade** — a tablet-only itemGap/color/visibility override
   renders in the canvas on Tablet ONLY and on the front ONLY within
   640–1023px (real viewport, e.g. 744px); 1280px shows base; 390px shows
   base-or-mobile-override (mobile does NOT inherit tablet — assert a
   tablet-only override leaves 390px untouched). Badges/Reset work on Tablet.
3. **Device-scoped controls** — "Mobile menu" appears only on the Mobile
   device, "Dropdown direction" only on Desktop/Tablet; both write the base
   (no override record in the stored document after editing on any device);
   a seeded 501-era dead `dropdownDirection` mobile override disappears from
   the stored doc after read + next save, with no other field changed; a
   seeded 501-era `mobileMode` mobile override is hoisted into the base
   (published mobile rendering UNCHANGED) and its record pruned.
4. **Canvas tokens** — picking the Secondary swatch turns the canvas nav link
   to the SITE secondary color: `getComputedStyle(.site-nav-link).color`
   inside the canvas equals the site token hex (e.g. `#0f766e`), not admin
   beige; Background/Surface/Text swatches resolve (no invalid-var
   fallthrough); swatch previews show site-resolved colors.
5. **Divider** — a divider block renders as a visible vertical line
   (~thickness×1.5em, self-centered) between bar items on canvas AND
   published front (computed size asserted, not presence).
6. **CTA visibility + options** — toggling Visible off on Desktop dims the
   canvas block to a selectable "Hidden" ghost immediately (and the front
   omits it); visible-on-neither ghosts on both devices; Size and
   Open-in-new-tab controls exist and visibly change the rendered canvas +
   front button (computed font-size/padding delta, `target="_blank"` attr).
7. **Nested submenus** — a 3+-level tree: front hover on level-1 opens its
   sublist, hover on level-2 opens a fly-out with the grandchild VISIBLE
   (bounding-box on-screen assertion) and the parent label appears exactly
   ONCE; a "#" group label is keyboard-focusable (`tabIndex={0}`) so focus
   opens its sublist; canvas shows the same recursive structure with
   grandchildren reachable; mobile renders all levels inline-indented.
8. **No regressions** — legacy no-document header: FLAT menus render MARKUP
   byte-identical; nested legacy trees render recursive click-open
   `<details>` with descendants reachable (the bug-7 fix on the legacy path —
   flatten + flattened-descendant duplication gone, linked parent as first
   entry of its DIRECT sublist); `buildSiteShellCss(null)`
   byte-identical; no-override and mobile-only docs emit NO tablet
   `@media`/branch (zero responsive-branch drift — their base output changes
   ONLY by the new structural divider/nested-sublist rules, re-baselined once;
   a mobile-only doc's mobile branch is byte-identical to pre-502);
   full gates green (`bun --cwd core lint`, `lint:types`, `test:bun`, full
   vitest, root `tsc -p tsconfig.json --noEmit`, repo gate alias).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):**
- `tests/vitest/services/menu-document-v2.test.ts` — brand.text
  accept/trim/cap/sparse-omit + reject non-string; tablet record round-trips +
  reject-unknown; per-breakpoint resolve (tablet inherits DESKTOP, mobile
  ignores tablet), patch/clear/prune; the device-defining carve-out (write
  reject with path; stored read HOISTS a mobile `mobileMode` override into
  the base then prunes the record — assert a 501-era doc with such an
  override emits byte-identical mobile CSS before and after the migration —
  and prune-only DROPS a dead `dropdownDirection` override; neither degrades
  the doc); legacy docs without `responsive`/`text` unchanged.
- `tests/vitest/ui/menu-design-editor.test.tsx` — brand text input (text mode
  only, empty deletes prop), canvas brand fallback chain (no menuName);
  tablet-forked writes + badges + Reset; mobileMode hidden off-Mobile /
  dropdownDirection hidden on Mobile, both writing base; canvas ghost for
  flat-hidden + override-hidden + visible-on-neither blocks — including an
  override-hidden block on its HIDDEN device rendering a VISIBLE ghost
  (computed display !== "none", dimmed opacity, "Hidden" badge), proving the
  injected preview `<style>` no longer hides it; cta Size/target
  controls; palette prop passed to every ColorSwatchControl; recursive
  NavItemsPreview renders grandchildren; no setState-in-effect.

**Bun lane (menu suites):**
- `tests/integration/routes/menus.test.ts` — PATCH carrying `brand.text` +
  `responsive.tablet` persists; invalid text/tablet payloads 4xx
  `menu_document_invalid` with path.
- `tests/unit/site/menu-document-render.test.tsx` — tablet `@media` bounds +
  delta emission; canvas tablet branch (tablet⇒desktop mapping GONE;
  dropdownRule + tablet deltas present; NO visibility hide rules in
  ANY forced preview branch — the 502-04 ghost gate owns canvas visibility);
  a flat-hidden + tablet-visible-override block RENDERS its DOM frame
  (generalized anywhere-gate + shouldRenderMenuBlock tablet term) with the
  desktop hide rule inside `min-width:1024` media BOUNDS (asserted to NOT
  apply at 640–1023px — bounds, not mere presence) plus the mobile-branch
  hide rule and NO tablet hide rule; a desktop+tablet-hidden
  (show-only-on-mobile) block keeps its hide rule in the shared ≥640 branch
  byte-unchanged;
  divider context rules (frame-as-line + hr display:none, doc-scoped);
  nested `.site-nav-sublist .site-nav-sublist` fly-out rule present in
  doc-scoped front + preview output and ABSENT from `buildSiteShellCss`;
  the nesting rules are emitted ONLY inside the ≥640 branch; the mobile
  branch contains NO sublist hide and NO un-hide — base-sheet display:grid +
  cumulative padding-left keep all levels inline-indented (sublists NOT
  display:none at mobile widths);
  SSR (menu-document path): grandchild inside a nested sublist, parent label
  exactly once, no flatten/duplication; SSR (legacy `SiteHeaderNav`):
  recursive `<details class="site-nav-group">` per level with the grandchild
  PRESENT and the linked parent as the FIRST entry of its DIRECT sublist; a
  FLAT legacy menu's markup byte-identical to
  pre-502; the "#" group-label span carries `tabIndex={0}`
  (keyboard-focusable, so :focus-within can open its sublist);
  BrandRender text chain; RE-BASELINED
  no-override/mobile-only pins scoped to "no responsive-branch drift" (NOT
  whole-output identity): no-override and mobile-only docs emit NO tablet
  branch; their base output equals the re-baselined fixture (pre-502 base +
  the new structural divider/nested-sublist rules only); a mobile-only doc's
  mobile branch is byte-identical to pre-502.
- `tests/unit/pages/siteShellCss.test.ts` — byte-identity guard changes by
  ZERO lines.
- Root `tsc -p tsconfig.json --noEmit` (covers tests/ — `lint:types` alone
  does not).

**SMOKE (owner mandate — implementation smoke, real-input playwright, ≥5
DISTINCT real-flow scenarios; every scenario asserts VISIBLE EFFECT —
computed style / geometry / DOM absence — never control presence):**

1. **Fresh-create end-to-end** — create a new menu, add items (including a
   3-level branch), open Design, set brand text, a link color, a divider, a
   CTA; publish; assert every choice VISIBLE on `:3000` at 1280px (brand text
   string, link computed color === picked site hex, divider ≥1×~24px box,
   CTA rendered).
2. **Override/reset cycle across desktop/tablet/mobile** — set base itemGap +
   link color; add tablet overrides; add different mobile overrides; assert
   canvas per device AND front computed styles at 1280/744/390px (tablet
   values at 744 only; 390 shows mobile values, NOT tablet); Reset each
   override → computed values revert to desktop base at the matching viewport
   and the stored document no longer contains the record.
3. **Deep nesting, canvas AND front hover** — 3+-level tree: canvas shows the
   recursive structure with the grandchild reachable; on the front, real
   mouse hover level-1 → sublist visible, hover level-2 → fly-out visible
   with the grandchild's bounding box on-screen; parent label counted exactly
   once in the header; at 390px all levels inline-indented.
4. **Every-panel-control-with-visible-effect** — iterate EVERY control in the
   section/nav-items/brand/cta/divider panels: change the value, assert the
   canvas computed style / DOM matches the picked value (swatch → computed
   color equals the site token hex; sliders → computed gap/padding px;
   segments → flex-direction/font-size/etc.; visibility toggle → ghost
   opacity + "Hidden" badge; brand text → rendered string). Any control
   without a measurable effect is a FAIL.
5. **Publish → front parity at real viewports** — after scenarios 1–4,
   publish and diff canvas-vs-front per device: key computed styles equal at
   1280/744/390px; a tablet-hidden (override) CTA ghosts on the Tablet canvas
   and stays PRESENT in the front DOM at every width (anywhere-gate renders
   it once; the bounded tablet `@media` CSS-hides it) with
   `getComputedStyle(...).display === "none"` at 744px and visibly rendered
   at 1280px — DOM-ABSENCE assertions are reserved for
   flat-hidden-no-override blocks (PageBlockFrame render-skip), as
   Acceptance 6 asserts; brand/divider/
   nested-hover parity re-checked on front.

Dev-server gotcha for the smoke: Bun server code does not hot-reload — kill
the stale `bun --eval` process and re-run `coderso-dev-core-host`; a white
admin page means the server is down. Full `bun test` resets the config wizard.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry on closure — next free number AFTER 1210
  (expected **1211** — VERIFY at closure time; parallel streams may consume
  it), linking TASK-502 + all five subtasks.
- Correct changelog 1210's menus-routes count ("39/39" → "11/11") in the same
  closure pass.
- Extend the menuDocumentV2 notes (PAGE_MODEL/site-shell docs) with
  `brand.text`, the tablet cascade, the device-defining carve-out, and the
  nested-sublist render contract.
- Named residuals (recorded, NOT scope): brand text formatting/typography;
  divider `orientation` prop + spacer flex-push + `blockGap` + per-block
  margin/padding controls; hover/active emission semantics (`color:` vs
  background pill); divider tone/thickness inspector controls; touch-open
  dropdowns at ≥640px on the details-free menu-doc path (owner-approved
  deferral — real tablets have no hover and no first-tap-opens affordance is
  built; keyboard focus via the `tabIndex={0}` group labels is the
  non-pointer path; the legacy `<details>` path keeps click/tap-open).
- `_docs/_TASKS/README.md` board + Statistics on status changes (closing
  agent only).
