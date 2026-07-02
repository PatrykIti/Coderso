# TASK-501-02: Menu CSS Responsive Emission
# FileName: TASK-501-02-Menu-CSS-Responsive-Emission.md

**Priority:** High
**Category:** Front Renderer / Site Shell / Content (Menus) / Responsive
**Estimated Effort:** Medium-Large
**Dependencies:** TASK-501-01 (`responsive` records + `resolveMenuSectionAppearanceForDevice` / `resolveMenuBlockVisibleForDevice` + `orientation` enum), TASK-499-04 (`menuDocumentCss.ts` + `SiteHeaderMenuDocumentRender`)
**Status:** ⏳ To Do
**Parent Task:** TASK-501

---

## Overview

Make the shared menu stylesheet builder (`core/site/menuDocumentCss.ts`)
per-device: today `collectMenuAppearance` (`:71-77`) reads ONE flat appearance
(`section.layout` + `nav-items` props) and `buildMenuRuleSets` (`:92-143`)
emits `{base, desktop, mobile}` where the mobile branch only handles
`mobileMode`. After TASK-501-01, a section may carry a SPARSE
`responsive.mobile` override record ({layout?, navProps?}) and any block may
carry `responsive.mobile.visibility`. This subtask emits all of that as CSS —
from the ONE `buildMenuRuleSets`, consumed by BOTH builders:

1. **Mobile-resolved delta** — the mobile branch appends, AFTER the existing
   `mobileMode` disclosure/inline rules (`:128-140`, source-order win), only
   the rule groups whose mobile-RESOLVED value differs from base.
2. **Orientation** — new appearance field (501-01): `"vertical"` emits
   `flex-direction:column;align-items:stretch` on `.site-nav-list`; the
   default `"horizontal"` emits NOTHING (zero byte-drift).
3. **Per-device block visibility** — hide-on-mobile ⇒ mobile-branch
   `display:none`; show-only-on-mobile ⇒ desktop-branch `display:none`;
   visible on NEITHER device ⇒ render-skipped (no CSS). The front renderer
   (`core/site/siteShell.tsx` `SiteHeaderMenuDocumentRender`, `:331-379`)
   stamps `data-menu-block-id` on menu-native block wrappers and keeps
   responsive-gated blocks in the DOM.
4. **Canvas parity** — `buildMenuDocumentPreviewCss(doc, device)` (`:209-213`)
   keeps its exact flatten shape (tablet ⇒ desktop branch, structural baseline
   `:174-197` prepended) but its mobile branch now carries the mobile-resolved
   delta + hide rules for free, because both builders share the new rule sets.

**Out of scope:** the schema/helpers (501-01 — this subtask only CONSUMES
`resolveMenuSectionAppearanceForDevice` / `resolveMenuBlockVisibleForDevice`),
the Design editor writers/badges (501-03), closure matrices (501-04). **NO
`core/site/siteShellCss.ts` change** — the byte-identity guard
`tests/unit/pages/siteShellCss.test.ts` (`buildSiteShellCss(null)`) must change
by ZERO lines. Tablet stays deferred (parent decision): the front keeps exactly
two media branches and the canvas keeps mapping tablet ⇒ desktop.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/endpoint/RBAC/migration — the document rides the existing validated
`PATCH /menus/:id` write path.** Verified: `menuUpdateSchema`
(`core/server/validation/menuSchemas.ts:12`) already allows
`document: { type: ["object","null"] }` (`:30`), so the `responsive` keys
arrive inside the existing envelope — this subtask touches ONLY CSS emission
and the front renderer, zero server surface.

- **Validated values only reach CSS:** both the base AND the mobile-resolved
  appearance are re-sanitized through `sanitizeMenuAppearance` before rule
  building (today's pattern, `menuDocumentCss.ts:79-82`) — colors are
  regex-validated shapes, numbers clamped, enums mapped through lookup tables
  (`MENU_ALIGNMENT_CSS` `:53`, `MENU_SHADOW_CSS` `:60`). The 501-01 override
  normalizers reuse the same `fieldNormalizers`
  (`normalizeMenuAppearance.ts:176-194`), so no raw stored input can reach the
  stylesheet through the responsive path either.
- **Block ids are CSS-escaped:** `readMenuBlockId`
  (`menuDocumentV2.ts:195-198`) accepts any non-empty stored string, so every
  id interpolated into an attribute selector goes through
  `escapeAuthoringCssString`
  (`core/services/pages/pageAuthoringSanitizers.ts:204` — the same helper
  `pageResponsiveCss.ts:147` uses); the emitted sheet can never contain a
  selector-breaking quote/backslash.
- **Scope containment:** every new rule stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet
  (`SITE_MENU_DOC_ATTRIBUTE`, `menuDocumentCss.ts:48`); the front render stays
  published-only server-side zero-JS (`resolvePublishedMenuDocument` reads the
  `published` snapshot, `menuDocumentV2.ts:662-669`), and fail-closed reads are
  untouched — a doc with unknown responsive keys never reaches this builder
  (it degrades to `null` ⇒ legacy `SiteHeaderNav`).

---

## Implementation Pseudocode

### 1. `core/site/menuDocumentCss.ts` — per-device resolution

Replace the single-appearance collect (`:71-82`) with a device-aware resolve
built on the 501-01 helper. `device` here is the CASCADE device: `"desktop"`
= base, `"mobile"` = base merged with `responsive.mobile` (mobile inherits
desktop, Pages cascade — `pageResponsiveCss.ts:11-13`).

```ts
import { resolveMenuSectionAppearanceForDevice } from "../services/menus/menuDocumentV2"; // 501-01
import { escapeAuthoringCssString } from "../services/pages/pageAuthoringSanitizers";

/** Replaces collectMenuAppearance: same {...layout, ...navProps} merge, per device. */
const collectMenuAppearanceForDevice = (
  doc: MenuDocumentV2,
  device: "desktop" | "mobile"
): MenuAppearance => {
  const section = doc.sections[0];
  if (!section) return {};
  // 501-01 helper: finds the nav-items block, merges section.responsive?.mobile?.layout /
  // ...?.navProps over the flat base when device === "mobile"; returns base as-is for "desktop".
  const { layout, navProps } = resolveMenuSectionAppearanceForDevice(section, device);
  return { ...layout, ...navProps };
};

const resolveMenuAppearanceForDevice = (doc: MenuDocumentV2, device: "desktop" | "mobile") => ({
  ...SHELL_APPEARANCE_DEFAULTS,
  ...sanitizeMenuAppearance(collectMenuAppearanceForDevice(doc, device)),
});
// resolveMenuAppearanceForDevice(doc, "desktop") === today's resolveMenuAppearance(doc)
// for every legacy doc (no responsive record) — this IS the byte-identity invariant.
```

### 2. Rule builders — factor into per-group builders (base branch byte-identical)

Restructure `buildMenuRuleSets` so each appearance-driven rule comes from a
named group builder taking a `ResolvedMenuAppearance`. The BASE branch calls
them exactly as today — **the emitted base/desktop strings for a no-override
doc must not change by one byte** (guarded by the existing assertions in
`tests/unit/site/menu-document-render.test.tsx:122/:135`).

```ts
type MenuRuleGroup = {
  /** Field keys this group depends on (delta detection). */
  fields: readonly (keyof ResolvedMenuAppearance)[];
  /** Base-branch rule: today's sparse emission (may return null = no rule). */
  base: (a: ResolvedMenuAppearance) => string | null;
  /** Mobile-delta rule: TOTAL emission — every field gets an explicit
   *  declaration (neutral value instead of omission) so a mobile override
   *  can REVERT a base-emitted declaration without leakage. */
  mobile: (a: ResolvedMenuAppearance) => string;
};
```

Groups (in this fixed order — deterministic output):

| # | Group | fields | base decls (today, unchanged) | mobile TOTAL decls (neutral values) |
|---|---|---|---|---|
| 1 | headerFrame | surfaceColor, borderColor, borderWidth, shadow, sticky | `:95-102` sparse | `background:${surfaceColor}` (literal `transparent` allowed); `border-bottom:${w}px solid ${c}`; `box-shadow:${none ? "none" : MENU_SHADOW_CSS[shadow]}`; sticky ? `position:sticky;top:0;z-index:50` : `position:static` |
| 2 | inner | alignment, paddingX, paddingY | `:114` (full inner rule stays base-only ONCE) | `${header} .site-header-inner{justify-content:${MENU_ALIGNMENT_CSS[alignment]};padding:${paddingY}px ${paddingX}px}` (delta re-emits ONLY these decls, not the structural flex/max-width part) |
| 3 | navGap | itemGap | `:115` | `${header} .site-nav-list{gap:${itemGap}px}` |
| 4 | orientation | orientation (NEW, 501-01) | vertical ? `${header} .site-nav-list{flex-direction:column;align-items:stretch}` : null | vertical ? same : `${header} .site-nav-list{flex-direction:row;align-items:center}` (explicit revert — base may be vertical) |
| 5 | link | linkColor, fontSize, fontWeight, textTransform | `:104-116` sparse typography | `${header} .site-nav-link{color:${linkColor};font-size:${fontSize ?? "inherit"}px-or-inherit;font-weight:${fontWeight ?? "inherit"};text-transform:${textTransform}}` (`none`/`inherit` literals as neutrals; `linkColor` default is already the literal `"inherit"`) |
| 6 | hover | linkHoverColor | `:117` | same selector, `background:${linkHoverColor}` |
| 7 | active | linkActiveColor | `:118-120` sparse | non-null ? `background:${linkActiveColor}` : `background:${a.linkHoverColor}` (null-revert = match hover, visually identical to base's no-rule behavior) |
| 8 | summary | linkColor, fontSize, fontWeight, textTransform | `:121` | total variant of `:121` with the same neutrals as group 5 |

- `dropdownDirection` (`:124-126`) stays **desktop-branch-only** and reads the
  BASE appearance — sublists render inline on mobile, so a mobile
  `dropdownDirection` delta is meaningless and MUST NOT be emitted.
- `mobileMode` (`:128-140`) stays where it is but reads the
  **mobile-RESOLVED** appearance (it only ever affects the mobile branch, so
  the override is complete there; no-override docs resolve to the same value
  ⇒ byte-identical).

### 3. `buildMenuRuleSets` — signature + delta computation

```ts
const buildMenuRuleSets = (
  base: ResolvedMenuAppearance,
  mobileResolved: ResolvedMenuAppearance,
  visibility: MenuVisibilityPlan
): MenuRuleSets => {
  const baseRules   = MENU_RULE_GROUPS.map((g) => g.base(base)).filter(nonNull);   // byte-identical to today
  const desktopRules = [dropdownRule(base), ...visibility.hideOnDesktop.map(hideRule)];
  const mobileDelta = MENU_RULE_GROUPS
    .filter((g) => g.fields.some((f) => mobileResolved[f] !== base[f]))            // RESOLVED-value diff
    .map((g) => g.mobile(mobileResolved));
  const mobileRules = [
    ...mobileModeRules(mobileResolved),          // existing :128-140, FIRST
    ...mobileDelta,                              // AFTER — source order wins
    ...visibility.hideOnMobile.map(hideRule),    // LAST
  ];
  return { base: baseRules, desktop: desktopRules, mobile: mobileRules };
};
```

- **Diff on RESOLVED values, not on override presence**: an override that
  equals the base (legal — NO auto-remove-on-equality, parent contract) emits
  nothing. Deterministic: fixed group order, strict `!==` on sanitized
  primitives.
- **Orientation × mobileMode interplay (verified):** the disclosure-open rule
  (`:133`) forces `flex-direction:column` when open with higher specificity
  (`.site-nav-disclosure[open]~.site-nav-list` beats `.site-nav-list`), so a
  mobile `row` revert can never break the open disclosure stack; a vertical
  delta after the inline-mode `display:flex` rule (`:138`) touches a different
  property — no conflict.

### 4. Visibility plan + hide-rule emission

```ts
type MenuVisibilityPlan = { hideOnDesktop: string[]; hideOnMobile: string[] }; // block ids, doc order

const collectMenuVisibilityPlan = (doc: MenuDocumentV2): MenuVisibilityPlan => {
  const plan = { hideOnDesktop: [], hideOnMobile: [] };
  for (const block of doc.sections[0]?.blocks ?? []) {
    if (!block.responsive?.mobile?.visibility) continue;        // flat leaf semantics untouched
    const onDesktop = resolveMenuBlockVisibleForDevice(block, "desktop"); // 501-01
    const onMobile  = resolveMenuBlockVisibleForDevice(block, "mobile");
    if (!onDesktop && !onMobile) continue;                      // render-skipped ⇒ no CSS
    if (!onDesktop) plan.hideOnDesktop.push(block.id);
    if (!onMobile)  plan.hideOnMobile.push(block.id);
  }
  return plan;
};

const hideRule = (id: string): string => {
  const esc = escapeAuthoringCssString(id);
  const header = `[${SITE_MENU_DOC_ATTRIBUTE}="true"]`;
  // Dual attribute selector — see "Gating choice" below.
  return `${header} [data-menu-block-id="${esc}"],${header} [data-block-id="${esc}"]{display:none}`;
};
```

**Gating choice: CSS `display:none`, not render-time gating — justified.** The
front is server-rendered zero-JS (`siteShell.tsx:240-242`): ONE HTML payload
serves every viewport, so viewport-dependent visibility CANNOT be render-time
on the front — a `@media`-wrapped `display:none` is the only zero-JS
mechanism, and it lands in the SAME shared rule sets the device-forced canvas
flattens (one emission path, guaranteed canvas/front parity). Render-time
gating remains ONLY for blocks visible on NEITHER device (no markup, no CSS)
and for the untouched flat leaf `visibility` (no responsive record ⇒
`PageBlockFrame` skip, `pageRendererV2.tsx:1950` — byte-unchanged).

**Dual selector rationale (implements the parent's stamping requirement
without DOM-shape drift):** the canvas already stamps `data-menu-block-id` on
every `SelectableBlock` wrapper (`MenuDesignEditor.tsx:244`); on the front,
menu-native blocks get the attribute stamped on their EXISTING outermost
element (attribute-only, no new node — §5), while reused leaf blocks already
render a per-id wrapper: `PageBlockFrame` spreads
`[PAGE_BLOCK_ID_ATTRIBUTE]: block.id` ⇒ `data-block-id="<id>"`
(`pageRendererV2.tsx:715-718` + `pageResponsiveCss.ts:67`), and
`menuLeafToPageBlock` preserves `block.id` (`siteShell.tsx:254-261`).
`PageBlockFrame` is page-module-owned (fixed `{block, children}` signature,
`:1949`) — wrapping it in a stamped `<div>` would change the flex-item
structure of EVERY leaf block (visual drift for no-override docs), and an
inline `display:contents` wrapper would beat the sheet's `display:none`. Both
attributes carry the same unique id and the rule is doc-scoped, so the union
selector is exact.

### 5. `core/site/siteShell.tsx` — stamping + responsive-gated rendering

`SiteHeaderMenuDocumentRender` (`:331-379`):

```tsx
// (a) render gate — replaces the bare blocks.map for gated blocks:
const hasResponsiveVisibility = (block: MenuBlockV2): boolean =>
  Boolean(block.responsive?.mobile?.visibility);                 // 501-01 field
const shouldRenderMenuBlock = (block: MenuBlockV2): boolean =>
  !hasResponsiveVisibility(block) ||                             // legacy path: unchanged
  resolveMenuBlockVisibleForDevice(block, "desktop") ||
  resolveMenuBlockVisibleForDevice(block, "mobile");             // render-if-visible-anywhere
{blocks.filter(shouldRenderMenuBlock).map((block) => { ...existing switch... })}

// (b) menu-native stamping — attribute-only on the EXISTING outermost element:
//   NavItemsRender (:269-283): new prop blockId → <nav ... data-menu-block-id={blockId}>
//   BrandRender    (:285-316): data-menu-block-id={block.id} on BOTH <a className="site-header-brand"> branches
//   MenuUtilityRender (:318-329): data-menu-block-id={block.id} on the <span className="site-nav-utility">
//   Leaf blocks: NO wrapper change — PageBlockFrame's data-block-id is the hook (see §4).

// (c) leaf CSS-gating handoff — in menuLeafToPageBlock (:254-261):
visibility: hasResponsiveVisibility(block)
  ? { visible: true }                                            // CSS owns gating; frame must not skip
  : (("visibility" in block && block.visibility) || { visible: true }),
// A leaf with flat visible:false AND a mobile visible:true override (show-only-on-mobile)
// thus renders its frame; the DESKTOP branch hide rule keeps it invisible ≥640px.
```

Import `resolveMenuBlockVisibleForDevice` from `menuDocumentV2` (extend the
existing type-only import at `:1` accordingly — the value import must stay
Bun-free, which `menuDocumentV2.ts` already is, header `:48`).

### 6. Builder entry points (both from the ONE rule-set function)

```ts
// FRONT (:150-161) — same two media wrappers, NO new branch (tablet deferred):
export function buildMenuDocumentCss(doc: MenuDocumentV2): string {
  const sets = buildMenuRuleSets(
    resolveMenuAppearanceForDevice(doc, "desktop"),
    resolveMenuAppearanceForDevice(doc, "mobile"),
    collectMenuVisibilityPlan(doc)
  );
  return [...sets.base,
    `@media (min-width: ${desktopNavMinWidth}px){`, ...sets.desktop, `}`,   // show-only-on-mobile hides live here
    `@media (max-width: ${mobileMaxWidth}px){`, ...sets.mobile, `}`,        // delta + hide-on-mobile live here
  ].join("\n");
}

// CANVAS (:209-213) — identical shape; tablet still maps to the desktop branch;
// structural baseline (:174-197) untouched and still prepended:
export function buildMenuDocumentPreviewCss(doc: MenuDocumentV2, device: PageBreakpoint): string {
  const sets = /* same buildMenuRuleSets call as above */;
  const branch = device === "mobile" ? sets.mobile : sets.desktop;
  return [...buildCanvasStructuralBaseline(device), ...sets.base, ...branch].join("\n");
}
// Mobile flatten correctness: base rules (desktop-resolved) + mobile delta emitted after
// ⇒ net mobile-resolved look, exactly like the front cascade. The canvas hide rules make
// Acceptance 1 ("hidden CTA in the canvas") work with zero editor logic (501-03 adds the
// editing affordance on top).
```

**Error handling:** none of the new code throws — inputs are already
normalized (`MenuDocumentV2` from the fail-closed read) and re-sanitized;
`escapeAuthoringCssString` is total; blocks without `sections[0]` yield empty
plans/appearance exactly like today.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

CSS emission + front render live in the **bun lane** (the runtime suite
already covering menus renders JSX through the site shell); no new vitest
files are owed by this subtask (501-01 owns the schema vitest matrix, 501-03
the editor UI vitest).

**`tests/unit/site/menu-document-render.test.tsx` (extend):**
- **No-override byte-identity (the guard):** `buildMenuDocumentCss(doc)` for a
  doc WITHOUT any `responsive` record / `orientation` prop is byte-identical
  to the pre-TASK-501 output (freeze the current string for `buildDoc()` and
  assert equality; the existing assertions at `:122`/`:135` must pass
  unchanged). Same for `buildMenuDocumentPreviewCss(doc, "desktop"|"mobile")`.
- **Mobile delta:** a section with `responsive.mobile.layout.paddingY` +
  `navProps.itemGap` + `navProps.linkColor` overrides ⇒ the mobile `@media`
  block contains the group-2/3/5 delta rules with mobile values, emitted AFTER
  the mobileMode rules; the base/desktop branches carry only base values;
  an override EQUAL to the base emits no delta rule.
- **Revert semantics:** base `orientation:"vertical"` + mobile override
  `"horizontal"` ⇒ mobile branch contains
  `flex-direction:row;align-items:center`; base `sticky:true` + mobile
  `sticky:false` ⇒ `position:static` in the mobile branch.
- **Orientation:** base `"vertical"` ⇒
  `.site-nav-list{flex-direction:column;align-items:stretch}` in the base
  rules (front AND canvas, both devices); default/absent ⇒ the string
  `flex-direction:column` absent from the whole sheet.
- **mobileMode override:** `responsive.mobile.navProps.mobileMode:"inline"`
  over base `"disclosure"` ⇒ the mobile branch emits the inline pair
  (`:135-139` shapes), not the disclosure triple.
- **Visibility:** hide-on-mobile CTA ⇒ dual-selector `display:none` rule
  inside the mobile `@media` (front) and inside
  `buildMenuDocumentPreviewCss(doc,"mobile")` but NOT `"desktop"`;
  show-only-on-mobile (flat `visible:false` + mobile `visible:true` leaf) ⇒
  hide rule in the DESKTOP branch AND the block's frame IS in the rendered
  HTML (`data-block-id` present); visible-on-neither ⇒ no markup, no hide
  rule; block id needing escaping (e.g. `blk"x`) ⇒ escaped selector; assert
  no unscoped attribute selector in the emitted sheet (every comma-list
  member `${header}`-prefixed).
- **nav-items hidden wins under disclosure `[open]` (parent-mandated
  guard):** a nav-items block hidden on mobile actually wins in BOTH
  `mobileMode:"inline"` and `mobileMode:"disclosure"` with the disclosure
  `[open]` — assert in the front mobile `@media` branch AND the canvas
  flatten (`buildMenuDocumentPreviewCss(doc,"mobile")`); guards the `<nav>`
  ancestor-wrapper `data-menu-block-id` stamp against the higher-specificity
  `.site-nav-list{display:flex}` / disclosure-open rules (hiding the
  ancestor sidesteps specificity — see §4 stamping rationale).
- **Stamping:** rendered document header carries `data-menu-block-id` on the
  nav-items `<nav>`, brand `<a>`, utility `<span>`; leaf frame carries
  `data-block-id`; the existing single-`data-site-nav` assertion (`:118`)
  stays green.

**`tests/unit/pages/siteShellCss.test.ts`:** changes by ZERO lines
(`buildSiteShellCss(null)` byte-identity — this subtask does not import or
touch `siteShellCss.ts` beyond the existing `SHELL_APPEARANCE_DEFAULTS` value
import, `menuDocumentCss.ts:14`).

**Gates:** `bun --cwd core lint`, `bun --cwd core lint:types`, bun + vitest
suites green. Real-viewport playwright smoke (canvas + `:3000` at ≤639px /
≥640px) is owned by 501-04; dev-server gotcha applies there (kill the stale
`bun --eval` process, re-run `coderso-dev-core-host`).

---

## Acceptance Criteria

1. One `buildMenuRuleSets` feeds both builders: front mobile `@media` and
   canvas mobile flatten show the mobile-resolved appearance (delta after
   mobileMode rules); desktop/tablet unchanged base.
2. `orientation:"vertical"` stacks the nav list (front + canvas, per-device
   settable via the section override); default `"horizontal"` emits zero new
   CSS.
3. Per-device visibility: hide-on-mobile and show-only-on-mobile blocks gate
   via doc-scoped, id-escaped `display:none` rules in the correct branch;
   visible-on-neither blocks render no markup; flat leaf visibility behavior
   byte-unchanged.
4. No-override documents: `buildMenuDocumentCss` /
   `buildMenuDocumentPreviewCss` output byte-identical to pre-TASK-501;
   `siteShellCss.test.ts` untouched.

---

## Documentation Updates Required

None standalone — the changelog entry, menuDocumentV2 doc cross-links and
README/board rows are owned by TASK-501-04 (closure); this file's status flip
only.
