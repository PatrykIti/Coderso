# TASK-502-02: Menu CSS — Tablet Branch, Separators & Nested Sublists
# FileName: TASK-502-02-Menu-CSS-Tablet-Branch-Separators-And-Nested-Sublists.md

**Priority:** High
**Category:** Front Renderer / Site Shell / Content (Menus) / Responsive
**Estimated Effort:** Medium-Large
**Dependencies:** TASK-502-01 (`"tablet"` in `MENU_RESPONSIVE_BREAKPOINT_KEYS` + per-breakpoint `resolveMenuSectionAppearanceForDevice` / `resolveMenuBlockVisibleForDevice` / `hasMenuBlockVisibilityOverride`), TASK-501-02 (`MENU_RULE_GROUPS` delta machinery + visibility plan), TASK-499-04 (`menuDocumentCss.ts`)
**Status:** ⏳ To Do
**Parent Task:** TASK-502

---

## Overview

All CSS-emission work of TASK-502 lives here, in the ONE file this subtask
owns: `core/site/menuDocumentCss.ts`. Four deliverables:

1. **Tablet branch (parent item 2, CSS side)** — the front gains a BOUNDED
   tablet `@media` (`pageResponsiveMediaBounds.tablet`, 640–1023px —
   `pageResponsiveCss.ts:106-113`; bounded so tablet overrides never leak
   into mobile widths, Pages rationale `:10-13`) carrying per-GROUP tablet
   deltas vs base, and the canvas flatten STOPS mapping tablet ⇒ desktop
   (`buildMenuDocumentPreviewCss`, `menuDocumentCss.ts:411-415`): the tablet
   device gets a real device-forced branch (base + shared ≥640 rules + tablet
   deltas). Cascade is Pages-exact: tablet AND mobile each diff against the
   DESKTOP base — mobile deltas keep ignoring tablet.
2. **Per-device visibility, three-way (parent items 2+6, CSS side)** — the
   visibility plan (`collectMenuVisibilityPlan`, `:284-295`) resolves
   desktop/tablet/mobile and partitions hide rules into the correct front
   branch; the PREVIEW builder stops emitting hide rules entirely (the 502-04
   canvas ghost gate takes over visibility presentation on canvas).
3. **Divider as a vertical separator (parent item 5)** — per-divider-block
   CONTEXT rules, doc-scoped only, schema untouched: paint the leaf FRAME as
   a `thickness×1.5em` self-centered line and hide the inner `<hr>` (which
   today collapses to a ~4×4px dot as a flex item of
   `.site-header-inner{display:flex}` — `pageRendererV2.tsx:1845-1853` inline
   4-side `borderWidth`, zero divider rules in the doc sheet).
4. **Nested sublists (parent item 7, CSS side) + mobile canvas disclosure
   preview (501 LOW residual)** — hide-by-default + hover/focus-within open +
   `.site-nav-sublist .site-nav-sublist` fly-out rules for 502-03's recursive
   markup, emitted ONLY from the doc-scoped builder (today ZERO nested rules
   exist anywhere); mobile keeps all levels inline-indented via the base
   sheet's per-class `padding-left:16px` (`siteShellCss.ts:171`, cumulative
   per depth — verified). The mobile PREVIEW flatten additionally simulates
   an OPEN disclosure so the canvas previews the nav list under the default
   `mobileMode:"disclosure"` (today `mobileModeRules` `:262-273` emits
   `.site-nav-list{display:none}` into the canvas too and the canvas renders
   no `.site-nav-disclosure` element at all — `NavItemsPreview`,
   `MenuDesignEditor.tsx:408-449` — so the Mobile canvas shows a blank nav).

**Out of scope:** the model/helpers (502-01 — this subtask only CONSUMES the
generalized per-breakpoint resolvers), front markup (`siteShell.tsx` — 502-03
is its SOLE writer; this file defines the CSS↔markup contract 502-03 must
satisfy, see Coordination), all editor UI (502-04), tests-docs-closure sweep
and the ≥5-scenario smoke (502-05). **NO `core/site/siteShellCss.ts` change —
`buildSiteShellCss(null)` byte-identity is inviolable**
(`tests/unit/pages/siteShellCss.test.ts` changes by ZERO lines). **NO page
divider schema change** (`divider: ["tone","thickness"]`,
`pageDocumentV2.ts:626` untouched — the `orientation` prop is a named parent
residual, not scope). **NO hover/active emission-semantics change**
(`menuDocumentCss.ts:225/:233` keep emitting state `background:` pills).

**Resolved audit question (parent Non-goals §nested):** nested-level styling
for DEFAULT (legacy, no-document) menus CANNOT come from this module — the
doc-scoped sheet only applies under `[data-site-menu-doc="true"]`, and the
base sheet is frozen. Resolution: the nesting rules below are written for the
menu-DOCUMENT header exclusively; the legacy header's nested behavior is
502-03's explicit deliverable (keep `<details>` per level there, or prove
base-sheet per-class inheritance). This subtask's guard: assert the string
`.site-nav-sublist .site-nav-sublist` is ABSENT from `buildSiteShellCss`
output and PRESENT in both doc-scoped builders.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — verified: this subtask touches ONLY CSS
emission from already-normalized documents; the `responsive.tablet` records it
consumes ride the existing validated `PATCH /menus/:id` envelope
(`menuUpdateSchema`, `core/server/validation/menuSchemas.ts` — `document:
{ type: ["object","null"] }` with service-side strict validation, unchanged;
502-01 owns the write/read normalizers).

- **Validated values only reach CSS:** base, tablet-resolved AND
  mobile-resolved appearances are re-sanitized through
  `sanitizeMenuAppearance` before rule building (existing pattern,
  `menuDocumentCss.ts:112-115`); enums map through lookup tables
  (`MENU_ALIGNMENT_CSS` `:71`, `MENU_SHADOW_CSS` `:78`). Divider declarations
  derive ONLY from the already-validated leaf props: `tone` is a closed enum
  mapped through a local lookup (values mirroring
  `pageDividerToneBorderColor`, `pageRendererV2.tsx:310-314`), `thickness` is
  re-clamped 1–16 (mirror of `readNumber(value, 1, 1, 16)`,
  `pageDocumentV2.ts:2637`) — raw stored input never reaches the stylesheet.
- **Block ids are CSS-escaped:** every id interpolated into an attribute
  selector (visibility hides AND the new divider rules) goes through
  `escapeAuthoringCssString` (existing import, `menuDocumentCss.ts:14`).
- **Scope containment:** every new rule stays inside the
  `[data-site-menu-doc="true"]` doc-scoped sheet; every comma-list member
  carries the scope prefix (501-02 rule, kept); the preview-only
  disclosure-open rule is emitted ONLY by `buildMenuDocumentPreviewCss`
  (admin canvas) — FRONT emission for the mobile branch is unchanged.
- **Byte-identity guards (named, with ONE conscious re-freeze):**
  `buildSiteShellCss(null)` — ZERO drift, inviolable. The doc-sheet golden
  pins (`tests/unit/site/menu-document-render.test.tsx:225+`) are re-frozen
  ONCE with an enumerated, reviewed delta — bugs 5/7 change emission for
  every doc-scoped header BY DESIGN (the fix is CSS). The absolute invariants
  the re-frozen pins must still prove: **no-override docs** gain ONLY the
  fixed nav-nesting block (+ the preview disclosure-open rule in the mobile
  flatten) — no tablet branch, no deltas, no hide rules, `MENU_RULE_GROUPS`
  base emission byte-identical; **mobile-only-override docs** gain ONLY the
  same fixed block — NO tablet branch is emitted for them (parent guard;
  guard scope = overrides that SURVIVE 502-01's read normalizer — a 501-era
  `mobileMode` mobile override is hoisted into the base upstream before the
  record is pruned, so `mobileModeRules` for such a doc emits the SAME value
  as pre-502: the 502-01 behavior-preserving migration, named in §2, not a
  guard breach); docs without dividers emit zero divider rules.

---

## Implementation Pseudocode

All edits in `core/site/menuDocumentCss.ts` (sole owner). Existing anchors
verified 2026-07-02: `mobileMaxWidth`/`desktopNavMinWidth` `:68-69`,
`collectMenuAppearanceForDevice` `:102-110`, `MENU_RULE_GROUPS` `:164-247`,
`dropdownRule` `:253-254`, `mobileModeRules` `:262-273`,
`collectMenuVisibilityPlan` `:284-295`, `hideRule` `:306-309`,
`buildMenuRuleSets` `:311-332`, `buildMenuDocumentCss` `:348-359`,
`buildCanvasStructuralBaseline` `:372-395`, `buildMenuDocumentPreviewCss`
`:411-415`.

### 1. Per-breakpoint appearance resolution (consumes 502-01)

```ts
// Widen the device parameter from "desktop" | "mobile" to the 502-01
// breakpoint union (desktop | tablet | mobile). No local logic change —
// resolveMenuSectionAppearanceForDevice (menuDocumentV2.ts:782, generalized
// by 502-01) merges base with ONLY the requested breakpoint's sparse record
// (tablet AND mobile each inherit DESKTOP; mobile ignores tablet).
const resolveMenuAppearanceForDevice = (doc, device: "desktop" | "tablet" | "mobile") => ({
  ...MENU_APPEARANCE_DEFAULTS,
  ...sanitizeMenuAppearance(collectMenuAppearanceForDevice(doc, device)),
});
// Invariant: for docs with no tablet record,
// resolveMenuAppearanceForDevice(doc,"tablet") === (doc,"desktop") field-for-
// field ⇒ the tablet delta is EMPTY ⇒ no tablet branch (byte guard).
```

### 2. Rule-group delta reuse (rename only)

`MenuRuleGroup.mobile` (`:160`) is already a device-agnostic TOTAL emission
function of a resolved appearance — rename the member to `delta` (call sites
`:325`) and reuse it verbatim for tablet: `tabletDelta = MENU_RULE_GROUPS
.filter(g => g.fields.some(f => tabletResolved[f] !== base[f]))
.map(g => g.delta(tabletResolved))`. Same total-emission-when-triggered
contract as 501-02 (a triggered group emits ALL its declarations with
explicit/neutral values, so clearing a tablet override reverts without
leakage). Emitted strings unchanged — zero byte impact from the rename.

Device-defining props stay base-read (parent item 3): `dropdownRule(base)`
(`:253-254`) keeps living in the shared ≥640 branch (sublists exist only
≥640px — desktop AND tablet); `mobileModeRules(mobileResolved)` (`:262-273`)
stays mobile-branch-only. **Reconciled with 502-01's carve-out** (write-reject
of BOTH `mobileMode` AND `dropdownDirection` in responsive navProps; on
stored read `dropdownDirection` is prune-only while a 501-era mobile
`mobileMode` override is **HOISTED into the base, THEN pruned** — 502-01 §3,
parent decision 3): every doc reaching this module is read-normalized, so
`mobileResolved.mobileMode === base.mobileMode` holds for this module's
INPUT. Name the consequence explicitly: unlike the genuinely dead
`dropdownDirection` mobile override, a 501-era `mobileMode` mobile override
was LIVE (override-wired control, `MenuDesignEditor.tsx:1123-1132`; emission
honored it via `mobileModeRules(mobileResolved)`) — which is exactly why
502-01 hoists it: for a doc carrying one, the hoisted base EQUALS the old
override value, so `mobileModeRules` emits **byte-identical mobile CSS
before and after the migration** (behavior-preserving; parent Acceptance 3,
asserted in 502-01's suite). Keep `mobileModeRules(mobileResolved)` exactly
as written — robust under either record shape.

### 3. Three-way visibility plan

```ts
type MenuVisibilityPlan = {
  hideShared: string[];      // hidden on desktop AND tablet  → front @media(min-width:640) — legacy position
  hideDesktopOnly: string[]; // hidden on desktop, visible on tablet → front @media(min-width:1024)
  hideTabletOnly: string[];  // visible on desktop, hidden on tablet → bounded tablet @media
  hideMobile: string[];      // hidden on mobile → front @media(max-width:639) — unchanged
};

const collectMenuVisibilityPlan = (doc: MenuDocumentV2): MenuVisibilityPlan => {
  const plan = { hideShared: [], hideDesktopOnly: [], hideTabletOnly: [], hideMobile: [] };
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (!hasMenuBlockVisibilityOverride(block)) continue; // 502-01: tablet OR mobile record; flat-only stays render-time
    const d = resolveMenuBlockVisibleForDevice(block, "desktop");
    const t = resolveMenuBlockVisibleForDevice(block, "tablet");  // 502-01: tablet override ?? flat
    const m = resolveMenuBlockVisibleForDevice(block, "mobile");
    if (!d && !t && !m) continue; // visible NOWHERE ⇒ render-skipped by 502-03's generalized shouldRenderMenuBlock ⇒ no CSS
    if (!d && !t) plan.hideShared.push(block.id);
    else if (!d) plan.hideDesktopOnly.push(block.id);
    else if (!t) plan.hideTabletOnly.push(block.id);
    if (!m) plan.hideMobile.push(block.id);
  }
  return plan;
};
// hideRule(id) (:306-309) unchanged: dual data-menu-block-id/data-block-id
// selector, id escaped, every comma member scope-prefixed.
// Byte guard: docs with only mobile visibility overrides resolve t === d
// (tablet inherits flat) ⇒ hideDesktopOnly/hideTabletOnly stay EMPTY and
// hideShared occupies the exact pre-502 hide position in the ≥640 branch.
```

### 4. Divider context rules (schema untouched — context CSS only)

```ts
// Values mirror pageDividerToneBorderColor (pageRendererV2.tsx:310-314) —
// pinned by a test; NOT imported (pageRendererV2 is a React renderer module,
// this module stays light/Bun-free).
const MENU_DIVIDER_TONE_CSS = {
  neutral: "#e2e8f0",
  muted: "#cbd5e1",
  accent: "var(--coderso-section-accent,#0d9488)",
} as const;

/** Per-divider-block rules, doc order (mirrors the visibility per-block pattern). */
const collectMenuDividerRules = (doc: MenuDocumentV2): string[] => {
  const rules: string[] = [];
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (block.type !== "divider") continue;
    const esc = escapeAuthoringCssString(block.id);
    const tone = MENU_DIVIDER_TONE_CSS[block.props.tone as keyof typeof MENU_DIVIDER_TONE_CSS] ?? MENU_DIVIDER_TONE_CSS.neutral;
    const t = block.props.thickness;
    const thickness = Math.min(16, Math.max(1, typeof t === "number" && Number.isFinite(t) ? t : 1)); // readNumber(…,1,1,16) parity
    // Paint the FRAME as the line: PageBlockFrame stamps data-block-id
    // (pageRendererV2.tsx:715-718); the inner <hr> carries INLINE
    // borderColor/borderWidth that a stylesheet cannot beat — but `display`
    // is NOT inline-styled, so a plain rule hides it (no !important).
    // The frame rule declares NO `display:` — the frame <div> is block-level
    // by UA default (PageBlockFrame renders a plain <div> with no inline
    // display, pageRendererV2.tsx:1949-1961), and this selector's (0,3,0)
    // specificity would beat the (0,2,0) visibility hideRule (:306-309) in
    // EVERY media branch (specificity beats source order), making a divider
    // with a responsive visibility override permanently un-hideable on the
    // front. Omitting `display:` lets the hide rule apply normally; the
    // inner <hr> is hidden anyway, so any class-set display mode is harmless.
    rules.push(
      `${menuDocScope} .site-header-inner [data-block-id="${esc}"]{align-self:center;width:${thickness}px;height:1.5em;background:${tone}}`,
      `${menuDocScope} .site-header-inner [data-block-id="${esc}"] hr{display:none}`
    );
  }
  return rules;
};
```

Emitted into the shared BASE rule list (device-independent), appended after
the `MENU_RULE_GROUPS` base rules — BOTH builders inherit them, so canvas ===
front once 502-04 replaces the canvas "—" span (`MenuDesignEditor.tsx:
496-501`) with the real leaf frame carrying `data-block-id` (until then the
rules are inert on canvas — acceptable, 502-02 lands first). The frame rule's
specificity is (0,3,0) — scope attribute + `.site-header-inner` +
`[data-block-id]` — comfortably beating the frame's utility classes
(`max-w-full` etc., 0,1,0); precisely BECAUSE it also exceeds `hideRule`'s
(0,2,0), it must carry no `display:` declaration (see the pseudocode comment)
or responsive visibility hides could never take a divider off the front (flat
hides are unaffected — `PageBlockFrame` returns `null`,
`pageRendererV2.tsx:1950`). Docs without dividers emit zero divider rules
(byte guard). The
parent's cheap extra layout options (divider `orientation` prop, spacer
`flex:1` push, `blockGap`, per-block margin/padding controls) are NAMED
RESIDUALS — do not implement.

### 5. Nested-sublist rules (doc-scoped ONLY; base sheet FORBIDDEN)

```ts
/**
 * Fixed nesting block for 502-03's recursive markup
 * (li.site-nav-item > own link/label + ul.site-nav-sublist per level; NO
 * <details> in the menu-document path). Emitted in the shared >=640 branch
 * — desktop AND tablet; mobile (<640) never sees these rules, so all levels
 * stay inline-visible there, indented by the base sheet's per-class
 * cumulative padding-left:16px (siteShellCss.ts:171).
 */
const navNestingRules = (a: ResolvedMenuAppearance): string[] => [
  // Hide-by-default: wins over the base sheet's .site-nav-sublist display:grid
  // (siteShellCss.ts:151) on equal specificity via later source order.
  `${menuDocScope} .site-nav-sublist{display:none}`,
  // Open per LEVEL on hover/keyboard focus (zero-JS): (0,3,0)+pseudo beats the hide.
  `${menuDocScope} .site-nav-item:hover>.site-nav-sublist,${menuDocScope} .site-nav-item:focus-within>.site-nav-sublist{display:grid}`,
  // NOTE: against TODAY'S shared SiteNavItem (siteShell.tsx:143-172) the
  // open rules above match NOTHING (the sublist nests inside
  // <details class="site-nav-group">, not as a direct li child) while the
  // hide-by-default still applies — which is exactly why this block and
  // 502-03's hover markup land in the SAME commit (see Coordination). No
  // transitional rule is emitted.
  // Nested absolutes anchor per row (belt-and-braces next to the base
  // sheet's .site-nav-item{position:relative}).
  `${menuDocScope} .site-nav-sublist>li{position:relative}`,
  // Fly-out: (0,3,0) beats the base sheet's level-1 absolute (0,2,0,
  // siteShellCss.ts:157) AND dropdownRule (0,2,0), direction-aware.
  `${menuDocScope} .site-nav-sublist .site-nav-sublist{left:100%;${
    a.dropdownDirection === "top" ? "bottom:0;top:auto" : "top:0;bottom:auto"
  }}`,
];
```

Level-1 keeps the base sheet's `position:absolute;left:0` + `dropdownRule`'s
`top:100%`/`bottom:100%` (dropdownDirection respected; base-read, item 3).
Grid cosmetics (gap/padding/min-width/background/border) keep coming from the
untouched base sheet per class at EVERY depth. Conscious tradeoffs to record
in the closure notes: hover/focus-within replaces `<details>` click-open in
the menu-doc path (front interaction change — acceptance mandates hover);
`MENU_RULE_GROUPS` group 8 and the structural-baseline `summary` rules become
dead selectors for doc headers (harmless, kept byte-stable); the caret
indicator on group parents IS IN SCOPE (502-03 §3 requires it), keyed on the
markup hook 502-03 actually ships — `data-site-nav-group="true"` on the
hover-mode parent `<li>` (NO `.site-nav-group` class exists there; that class
lives only on the legacy `<details>`): append
`${menuDocScope} li[data-site-nav-group="true"]>.site-nav-link::after{content:" \\25BE";font-size:.7em}`
to the nesting block. One selector covers linked AND linkless parents,
because 502-03's linkless group label carries BOTH
`site-nav-link site-nav-group-label` classes (Coordination contract below).

### 6. Rule-set composition + both builders

```ts
type MenuRuleSets = {
  base: string[];          // MENU_RULE_GROUPS base + divider context rules
  desktopShared: string[]; // dropdownRule(base) + navNestingRules(base)
  tabletDelta: string[];   // TOTAL group re-emissions, tabletResolved vs base
  mobile: string[];        // mobileModeRules(mobileResolved) + mobile deltas (vs base — mobile ignores tablet)
  previewMobileOpen: string[]; // canvas-only disclosure sim-open (empty when mobileMode "inline")
  hide: MenuVisibilityPlan;    // rule strings pre-mapped via hideRule, front-only
};

const buildMenuRuleSetsForDocument = (doc: MenuDocumentV2): MenuRuleSets => {
  const base = resolveMenuAppearanceForDevice(doc, "desktop");
  const tabletResolved = resolveMenuAppearanceForDevice(doc, "tablet");
  const mobileResolved = resolveMenuAppearanceForDevice(doc, "mobile");
  /* deltas per §2; visibility per §3 mapped through hideRule; divider per §4;
     previewMobileOpen = mobileResolved.mobileMode === "disclosure"
       ? [`${menuDocScope} .site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`]
       : []; // same declarations as the front's [open] rule (:267) — the
             // canvas previews the OPENED disclosure state; forced column
             // matches the front's higher-specificity open rule, so an
             // orientation delta loses here exactly like it does live. */
};

// FRONT — conditional branches keep legacy byte-shape (modulo the fixed nesting block):
export function buildMenuDocumentCss(doc: MenuDocumentV2): string {
  const s = buildMenuRuleSetsForDocument(doc);
  const desktopOnly = s.hide.hideDesktopOnly;
  const tabletBranch = [...s.tabletDelta, ...s.hide.hideTabletOnly];
  return [
    ...s.base,
    `@media (min-width: ${desktopNavMinWidth}px){`,             // 640 — unchanged wrapper
    ...s.desktopShared, ...s.hide.hideShared,                   // hides LAST (501 convention)
    `}`,
    ...(desktopOnly.length                                       // NEW, only when a tablet override diverges
      ? [`@media (min-width: ${pageResponsiveMediaBounds.tablet.maxWidth + 1}px){`, ...desktopOnly, `}`] // 1024
      : []),
    ...(tabletBranch.length                                      // NEW bounded tablet branch, only when non-empty
      ? [`@media (min-width: ${pageResponsiveMediaBounds.tablet.minWidth}px) and (max-width: ${pageResponsiveMediaBounds.tablet.maxWidth}px){`, ...tabletBranch, `}`]
      : []),
    `@media (max-width: ${mobileMaxWidth}px){`,                  // 639 — unchanged wrapper
    ...s.mobile, ...s.hide.hideMobile,
    `}`,
  ].join("\n");
}

// CANVAS — device-forced; tablet ⇒ desktop mapping REMOVED; NO hide rules
// (the 502-04 ghost gate owns canvas visibility presentation — a preview
// display:none would kill the dimmed selectable ghost):
export function buildMenuDocumentPreviewCss(doc: MenuDocumentV2, device: PageBreakpoint): string {
  const s = buildMenuRuleSetsForDocument(doc);
  const branch =
    device === "mobile"
      ? [...s.mobile, ...s.previewMobileOpen]                    // sim-open LAST — wins the closed display:none on specificity AND order
      : device === "tablet"
        ? [...s.desktopShared, ...s.tabletDelta]                 // REAL tablet branch (was: desktop)
        : s.desktopShared;
  return [...buildCanvasStructuralBaseline(device), ...s.base, ...branch].join("\n");
}
```

`buildCanvasStructuralBaseline` (`:372-395`) stays byte-unchanged (its
tablet call sites already pass the desktop variant; `device === "mobile"`
check untouched). **Error handling:** all new code is total — inputs are
fail-closed-read-normalized documents, re-sanitized appearances, clamped
numbers, escaped ids; missing `sections[0]` yields empty plans exactly like
today; no throw paths added. Deterministic: fixed group/block order, strict
`!==` on sanitized primitives, conditional branches keyed on array length.

---

## Coordination contract (reconcile pass MUST verify)

- **`siteShell.tsx` ownership PINNED to 502-03 (sole writer, parent
  ruling)** — this subtask edits ONLY `menuDocumentCss.ts` and instead
  NORMATIVELY defines the markup the nesting rules assume: recursive
  `li.site-nav-item` per level, each group parent rendering its own link (or
  a `span` carrying BOTH `site-nav-link site-nav-group-label` classes when
  `href === "#"`, so link color/typography rules apply without new appearance
  selectors), `ul.site-nav-sublist` as a DIRECT child of its `li`, NO
  `<details>` in the menu-document path, and `data-menu-block-id` stamping
  unchanged. If 502-03 deviates, THIS file's rules — not the base sheet —
  are where the fix lands.
- **502-03 SAME-COMMIT landing (NORMATIVE; reconcile pass MUST verify both
  files state it identically):** today's shared `SiteNavItem`
  (`siteShell.tsx:143-172`) still nests `ul.site-nav-sublist` inside
  `<details class="site-nav-group">` — not a direct child of
  `li.site-nav-item` — so the hover/focus-within open rules match nothing on
  today's front markup while the unconditional hide-by-default still
  applies: shipped alone, every doc-scoped front dropdown would be
  permanently unopenable at ≥640px, and no test would catch it (goldens are
  string pins; render tests don't hover). Mitigation: this subtask's
  `navNestingRules` emission and 502-03's hover markup land in the SAME
  commit (implementation proceeds in the parent's 502-02 → 502-03 order, but
  the tree only ships with both halves — parent Sequencing pins this). NO
  transitional rule is emitted, and 502-03 never touches
  `menuDocumentCss.ts` — the one-owner rule holds with no exception.
- **502-04 ghost handoff:** preview CSS carries no visibility hide rules from
  this subtask onward; between 502-02 and 502-04 landing, override-hidden
  blocks show un-dimmed on canvas (conscious interim, closed by the ghost
  gate). 502-04's divider/CTA previews must render the real leaf frame
  (`data-block-id`) for the divider context rules to bite on canvas; the
  Mobile canvas nav-list preview additionally needs `NavItemsPreview` to keep
  rendering `ul.site-nav-list` (it does — `MenuDesignEditor.tsx:415`).
  Cascade note for 502-04's ghost force-show: its `display:revert` rules must
  still out-cascade the divider context rules on canvas — the divider frame
  rule emits no `display:` declaration (§4), so a ghost rule of ≥(0,3,0)
  specificity (or any tie, since the preview `<style>` is emitted before
  502-04's rules in source order) wins cleanly; 502-04 must not rely on
  beating a divider `display:` that no longer exists.
- **502-01 inputs:** `resolveMenuSectionAppearanceForDevice(section,
  "tablet")`, `resolveMenuBlockVisibleForDevice(block, "tablet")`,
  `hasMenuBlockVisibilityOverride` covering tablet OR mobile records; the
  three-device render-anywhere gate (`shouldRenderMenuBlock`) generalization
  is 502-03's, matching §3's "visible nowhere ⇒ no CSS" assumption.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

CSS emission lives in the **bun lane**; no vitest files are owed by this
subtask (502-01 owns the schema vitest matrix, 502-04 the editor UI vitest).

**`tests/unit/site/menu-document-render.test.tsx` (extend + ONE conscious
golden re-freeze):**
- **Golden re-freeze (enumerated delta only):** re-freeze
  `GOLDEN_FRONT_CSS` / `GOLDEN_PREVIEW_*` (`:225-260`) such that the diff vs
  the 501 goldens is EXACTLY: the fixed `navNestingRules` block (§5,
  including the caret rule; NO transitional rule) after the dropdown rule (front
  ≥640 branch + preview desktop/tablet) and the disclosure sim-open rule
  appended to the mobile preview. Assert no-override
  docs emit NO tablet/1024 branch, NO delta, NO divider rule, and that every
  `MENU_RULE_GROUPS` base string is byte-identical to pre-502.
- **Mobile-only byte guard (parent-named):** a doc with ONLY
  `responsive.mobile` overrides emits byte-identical output to its pre-502
  emission modulo the same fixed nesting block — in particular ZERO
  `(min-width: 640px) and (max-width: 1023px)` / `(min-width: 1024px)`
  substrings. (Fixture uses overridable fields only — layout/appearance/
  visibility; a `mobileMode`/`dropdownDirection` record never reaches this
  module post-502-01 read migration — mobileMode hoisted into base,
  dropdownDirection pruned — see §2.)
- **Tablet delta:** `responsive.tablet.layout.paddingY` +
  `navProps.itemGap/linkColor` ⇒ TOTAL group deltas inside the bounded tablet
  `@media` only; base/desktop/mobile branches carry base values; a tablet
  override EQUAL to base emits nothing; tablet override does NOT appear in
  the mobile branch and vice versa (cascade independence — mobile diffs vs
  DESKTOP).
- **Canvas tablet branch:** `buildMenuDocumentPreviewCss(doc,"tablet")` for a
  tablet-overridden doc contains the delta;
  `buildMenuDocumentPreviewCss(doc,"desktop")` does NOT (mapping removed);
  for a no-tablet-record doc, tablet preview === desktop preview
  byte-identical.
- **Three-way visibility:** tablet-hidden-only block ⇒ hide rule ONLY in the
  bounded tablet branch; desktop-hidden-but-tablet-visible ⇒ ONLY in the
  1024 branch; hidden-on-both ⇒ legacy position in the ≥640 branch; mobile
  hides unchanged; escaped-id and every-comma-member-scoped assertions kept;
  **preview builders contain NO hide rule for any of these** (502-04 ghost
  handoff — flip of the 501 canvas-hide expectations, conscious).
- **Divider context rules:** a divider block (tone `accent`, thickness 2) ⇒
  both frame-as-line + `hr{display:none}` rules, doc-scoped, in front AND
  both preview devices; tone values pinned to the
  `pageDividerToneBorderColor` literals; thickness clamped (25 ⇒ 16, absent ⇒
  1); docs without dividers emit none; SSR: the front `<hr>` markup itself is
  unchanged (rules are context CSS only).
- **Divider × visibility override (cascade guard):** a divider block with
  `responsive.mobile.visibility.visible:false` ⇒ the mobile-branch hide rule
  wins — assert the frame-as-line rule contains NO `display:` declaration
  (regex the emitted divider rule) AND the `hideRule` string for that block
  id is present in the front mobile branch. Guards the (0,3,0)-vs-(0,2,0)
  conflict named in §4: a `display:` in the divider rule would silently
  defeat every responsive hide for dividers.
- **Nested sublists:** `.site-nav-sublist .site-nav-sublist{left:100%` rule
  present in the front ≥640 branch and preview desktop/tablet, ABSENT from
  preview mobile AND from `buildSiteShellCss(...)` output (the explicit
  base-sheet guard); `dropdownDirection:"top"` flips the nested rule to
  `bottom:0;top:auto`; hide-by-default + hover/focus-within open rules
  present ≥640 only; NO `.site-nav-group[open]` / `details[open]` rule
  anywhere in the output (no transitional rule — same-commit landing with
  502-03, see Coordination).
- **Disclosure preview:** mobile preview for default `mobileMode` contains
  the sim-open `.site-nav-list{display:flex;flex-direction:column…}` rule
  AFTER the closed `display:none`; `mobileMode:"inline"` emits no sim-open
  rule; **front** mobile branch contains NO sim-open rule (emission
  unchanged).

**`tests/unit/pages/siteShellCss.test.ts`:** changes by ZERO lines
(`buildSiteShellCss(null)` byte-identity — this subtask still only imports
the `SHELL_APPEARANCE_DEFAULTS` value table).

**Gates:** `bun --cwd core lint`, `bun --cwd core lint:types`, `bun test`
(menu suites incl. `tests/integration/routes/menus.test.ts`), full vitest,
AND root `tsc -p tsconfig.json --noEmit` (covers `tests/` — `lint:types`
alone does not).

**SMOKE (owner mandate — the ≥5-scenario real-input playwright suite is
OWNED BY 502-05; this subtask's emission must make these parent scenarios
pass, all asserting VISIBLE EFFECT, never control presence):** #2
override/reset across 1280/744/390px (tablet values computed at 744 ONLY;
390 shows mobile-not-tablet values; reset reverts computed styles); #3 deep
nesting — real hover chain opens the fly-out with the grandchild's bounding
box on-screen at ≥640px, all levels inline-indented at 390px; #1/#4 divider —
computed ~`thickness`×1.5em box visible between bar items on canvas AND
front; #5 publish→front parity per viewport (a tablet-hidden (override)
block stays PRESENT in the front DOM at every width — the anywhere-gate
renders it once, the bounded tablet `@media` CSS-hides it — with
`getComputedStyle(...).display === "none"` at 744px and visibly rendered at
1280px; DOM-ABSENCE assertions are reserved for flat-hidden-no-override
blocks, per parent scenario 5). Dev-server gotcha applies (kill the
stale `bun --eval`, re-run `coderso-dev-core-host`; white admin page =
server down).

---

## Acceptance Criteria

1. A tablet-only override renders on the front ONLY within 640–1023px and in
   the tablet canvas branch; 1280px shows base; 390px is UNTOUCHED by tablet
   overrides (mobile inherits desktop); docs without tablet records emit no
   new media branch (byte guard).
2. Tablet ⇒ desktop canvas mapping is gone; three-way visibility hides land
   in the correct front branch; preview builders emit no hide rules (ghost
   handoff).
3. A divider block paints as a doc-scoped vertical `thickness×1.5em`
   self-centered line with the inner `<hr>` hidden — schema and page-divider
   rendering byte-untouched.
4. Nested `.site-nav-sublist .site-nav-sublist` fly-out + hover/focus-within
   open rules exist in the doc-scoped builders only, direction-aware,
   ≥640px-only; mobile stays inline-indented; `buildSiteShellCss` output
   contains no nested rule and changes by zero bytes.
5. The Mobile canvas previews the nav list under default
   `mobileMode:"disclosure"` (sim-open rule, preview-only); front mobile
   emission unchanged.
6. Golden pins re-frozen ONCE within this subtask with the enumerated delta
   (no later deletion by any sibling — this commit also carries 502-03's
   hover markup, see Coordination); all gates green.

---

## Documentation Updates Required

None standalone — changelog (expected **1211**, verify at closure), PAGE_MODEL
/site-shell doc extensions (tablet cascade, nested-sublist render contract,
divider context rules), named residuals (divider `orientation`/spacer
push/`blockGap`/per-block spacing controls)
and README/board rows are owned by 502-05; this file's status flip only.
