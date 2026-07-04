# TASK-507 Menu Indicator Scope And Hint Alignment

# FileName: TASK-507_Menu_Indicator_Scope_And_Hint_Alignment.md

**Status:** ✅ Done
**Completed:** 2026-07-03
**Priority:** Medium
**Effort:** Small
**Parent Task:** (none — standalone board task)
**Follows:** TASK-506 (Menu Design Modern Styling) — resolves its 2 LOW post-audit residuals.

---

## Overview

TASK-506 shipped the menu modern-styling bundles (B1 separators, B2 `::before`
indicator + hover/lift/transition, B3 caret/flyout, B4 pill, B5 nested placement)
plus the F1 base-reset and F2 resolved-default hint. Its post-implementation
drift audit closed with **two LOW residuals** on already-shipped `feature/visual`
code. TASK-507 fixes both — surgically, no new fields, no schema/route change.

Both bugs live in the same architecture family already established by 506/504/501:

- **ONE shared builder.** All doc-scoped CSS flows through
  `buildMenuRuleSetsForDocument(doc)` (`menuDocumentCss.ts:1060`), consumed by
  BOTH `buildMenuDocumentCss` (front `@media`) and `buildMenuDocumentPreviewCss`
  (canvas device-forced/flattened). Front and canvas can NEVER diverge — fix the
  shared emitter once.
- **Present-only emission.** Every generator returns `null`/`[]` for an absent
  field, so an unauthored doc emits ZERO bytes.
- **Byte-identity invariants (inviolable).** `buildSiteShellCss(null)` stays
  untouched/byte-identical (`siteShellCss.test.ts`); a doc with NO overrides
  emits byte-identical output to before this task
  (`menu-document-render.test.tsx`).

> ⚠️ **Tooling trap:** `core/site/menuDocumentCss.ts` and
> `core/admin/ui/menus/MenuDesignEditor.tsx` read as **BINARY** to `rg` — an
> empty `rg` result is a FALSE NEGATIVE. Use `Read` + `grep -an`, NEVER trust an
> empty `rg`. All line anchors below were verified this way.

The two fixes are independent (different owner files) and can land in either
order. They are kept in **clearly-separated sections A and B**.

### Security note

UI/client-state + doc-scoped CSS; **no route/RBAC/migration.** FIX A only
re-scopes/normalizes CSS declarations emitted by the existing shared builder
(no new stored field, no new input surface — values are already
validated/clamped/enum-mapped by 506-01). FIX B only tightens a client-side
render guard in the Design editor (no persisted state, no payload change). No
`PATCH /menus/:id` envelope change, no `schemaVersion` bump, no auth/CSRF/
rate-limit surface touched.

---

## FIX A — B2 indicator cascade-leak + stale-transform (owns `core/site/menuDocumentCss.ts`)

### A.0 The bug (two coupled defects)

**Verified anchors:**

- `navChromeRules(chrome, orientation, options?)` — `menuDocumentCss.ts:949-969`.
  Line **955** builds `const linkSel = \`${menuDocScope} .site-nav-link\`;` and
  line **959** calls `indicatorAndHoverRules(linkSel, chrome)`.
- `${menuDocScope} .site-nav-link` is the **cascade ROOT** — it matches links at
  ALL depths (level 0 top bar, level 1 & 2 dropdowns) — as the module comment at
  `:486-492` and `:941-947` explicitly documents.
- `indicatorAndHoverRules(sel, s)` — `menuDocumentCss.ts:568-591`. Rest-block at
  `:576-578`, shown state at `:580-582`, hover-lift/underline extras at
  `:585-589`.

**Defect A1 — level-0 B2 chrome leaks onto every dropdown link.**
Because `navChromeRules` emits the level-0 indicator `::before` bar (and the
hover-lift/hover-underline extras) on the cascade-root `${menuDocScope}
.site-nav-link`, enabling `indicator`/`hoverLift`/`hoverUnderline` **only at
level 0** (via `navChrome`) also paints them on every level-1/2 dropdown link.
A deeper level's `indicator:"none"` cannot cancel it: `indicatorAndHoverRules`
early-returns (emits nothing) when `s.indicator == null || s.indicator ===
"none"` (`:570`), so the inherited level-0 bar stays.

**Defect A2 — stale `scaleX(0)` on a deeper non-grow indicator.**
The non-grow rest-block (`:578`) declares `opacity:0` but **NOT** `transform`;
the grow rest-block (`:577`) declares `transform:scaleX(0)` but **NOT**
`opacity`. Since `LEVEL_LINK_SELECTORS[1]` (`:495`) is descendant-anchored
(`… .site-nav-sublist .site-nav-link`) it ALSO matches level-2 links, so a
level-1 **grow** `::before{…transform:scaleX(0)…}` reaches a level-2 **non-grow**
`::before`, which resets only `opacity` on hover → the deeper bar stays
`scaleX(0)` → invisible. (Defect A1 is one instance of the same shape from
level 0; A2 remains even after A1 because level 1 → level 2 still overlaps.)

### A.1 Requirement 1 — scope level-0 B2 chrome to a TOP-BAR-ONLY selector

Introduce a top-bar-only link selector and route the level-0 indicator `::before`
bar AND the hover-lift/hover-underline extras through it, so level-0 `navChrome`
B2 chrome applies to **depth-0 links only** and never leaks to dropdown links.
Levels 1 & 2 keep emitting on their own `LEVEL_LINK_SELECTORS` (`:494-497`) —
**unchanged**.

> **Do NOT touch the intentional cascade.** `linkColor` / `fontSize` /
> hover-**background** (MENU_RULE_GROUPS 5/6/8 on the cascade-root
> `.site-nav-link`, and the `indicatorLinkDecls` `transition` at `:557-561`)
> stay cascade-root **by design** (the "inherits level N-1" pure-CSS cascade of
> TASK-504). ONLY the NEW B2 indicator `::before` bar + hover-lift/underline
> extras get scoped. The `position:relative` anchor from `indicatorLinkDecls`
> (`:562`) reaching all links is harmless (no visual effect alone) and the
> top-bar link still receives it, so the absolutely-positioned `::before`
> anchors correctly — leave `indicatorLinkDecls` on `linkSel`.

**Pseudocode (add a constant near `LEVEL_LINK_SELECTORS`, `menuDocumentCss.ts:494`):**

```ts
// Level-0 B2 chrome (indicator ::before bar + hover-lift/underline) must NOT ride
// the cascade-root `.site-nav-link` (which matches ALL depths) — anchor it to the
// TOP-BAR direct link only. linkColor/fontSize/hover-background/transition stay
// cascade-root by design (TASK-504 inheritance); only the NEW B2 chrome is scoped.
const TOP_BAR_LINK_SELECTOR =
  `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link` as const;
```

**In `navChromeRules` (`:949-969`) change the `indicatorAndHoverRules` call only:**

```ts
const navChromeRules = (chrome, orientation, options?) => {
  if (!chrome) return [];
  const linkSel = `${menuDocScope} .site-nav-link`;   // cascade-root — UNCHANGED
  const rules: string[] = [];
  const linkDecls = indicatorLinkDecls(chrome);       // transition + position:relative
  if (linkDecls.length) rules.push(`${linkSel}{${linkDecls.join(";")}}`); // stays cascade-root
  // WAS: rules.push(...indicatorAndHoverRules(linkSel, chrome));
  rules.push(...indicatorAndHoverRules(TOP_BAR_LINK_SELECTOR, chrome)); // B2 — top-bar ONLY
  if (options?.linkOnly) return rules;                // pill/divider/caret ≥640-only — UNCHANGED
  …
};
```

The `::before` selector inside `indicatorAndHoverRules` becomes
`${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link::before`,
which matches depth-0 links ONLY and never a `.site-nav-sublist` link.
`collectChromeDeltaRules` (`:974-983`) calls the SAME `navChromeRules`, so the
per-device (tablet/mobile) chrome delta inherits the fix for free — no separate
change.

### A.2 Requirement 2 — reset BOTH `transform` AND `opacity` in EVERY indicator rest-block

In `indicatorAndHoverRules` (`:576-578`), make each rest-block reset **both**
axes so a deeper non-grow override never inherits a stale `scaleX(0)` from a
shallower grow rule (levels 0/1/2 all use this one helper, so this covers every
level at once):

```ts
const rest =
  s.indicatorGrow === true
    ? `content:"";position:absolute;left:0;${edge};height:${th}px;width:100%;` +
      `background:${color};transform:scaleX(0);opacity:1;` +   // ADD opacity:1
      `transform-origin:left;transition:transform ${dur}ms`
    : `content:"";position:absolute;left:0;${edge};height:${th}px;width:100%;` +
      `background:${color};opacity:0;transform:none;` +         // ADD transform:none
      `transition:opacity ${dur}ms`;
```

The shown state (`:580-582`) is unchanged: grow sets `transform:scaleX(1)`
(opacity already 1 at rest), non-grow sets `opacity:1` (transform already `none`
at rest). Present-only holds — this block only emits when `s.indicator != null
&& s.indicator !== "none"`.

### A.3 Byte-identity check

- A doc with NO overrides: `chrome`/`levelStyles` are `undefined` ⇒
  `navChromeRules`/`navLevelRules` return `[]` ⇒ ZERO bytes. Unaffected.
- A doc that authors an indicator: the rest-block gains ONE extra declaration and
  the level-0 selector narrows — both are EXPECTED golden diffs, asserted below;
  they do NOT touch `buildSiteShellCss(null)` (never imported for CSS here).

---

## FIX B — ControlDefaultHint contract alignment (owns `core/admin/ui/menus/MenuDesignEditor.tsx`)

### B.0 The bug

**Verified anchors:**

- `ControlDefaultHint({section, device, level, propKey, isSet})` —
  `MenuDesignEditor.tsx:578-603`.
- Guard at line **593**:
  `if (value === undefined && sourceLabel === "Not set") return null;`
- Source values from `resolveMenuControlDefault` (`menuDocumentV2.ts:2341`), via
  `resolveNavKeyThemeDefault` (`:2240-2277`): the gated present-only numerics
  return `{ value: undefined, sourceLabel: "Off" }` (`:2263`, keys
  `MENU_GATED_PRESENT_ONLY_OFF_KEYS` = `itemDividerWidth`, `indicatorThickness`,
  `transitionMs`, `hoverLift` — `:2199-2204`) or
  `{ value: undefined, sourceLabel: "Not applied" }` (`:2265`, keys
  `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS` = `containerPaddingX/Y`,
  `navPillRadius`, `navPillPaddingX/Y` — `:2205-2211`).

The 506 contract (TASK-506-01 Step 6 / TASK-506-04 F2.a) specifies the guard
`if (value === undefined) return null;` — i.e. **any** control whose resolved
default value is `undefined` shows NO hint. The gated present-only numerics
intentionally resolve to `value:undefined` with a `"Off"`/`"Not applied"` label
**precisely so the hint is HIDDEN**. The current stricter guard (also requiring
`sourceLabel === "Not set"`) instead RENDERS them, producing mixed messaging: the
range thumb sits at `range.min` while the hint text says "Off" — a value the
control is not actually applying.

### B.1 Requirement — hide the hint whenever the resolved default value is `undefined`

**Pseudocode (`MenuDesignEditor.tsx:593`):**

```ts
function ControlDefaultHint({ section, device, level, propKey, isSet }) {
  if (isSet || !section) return null;
  const { value, sourceLabel } = resolveMenuControlDefault(section, device, level, propKey);
  // WAS: if (value === undefined && sourceLabel === "Not set") return null;
  if (value === undefined) return null;   // gated-off numerics (Off / Not applied) → NO hint
  return (
    <span
      data-menu-control-default-hint={propKey}
      data-menu-control-default-source={sourceLabel}
      className="text-[10px] font-medium text-muted-foreground"
    >
      {sourceLabel}
    </span>
  );
}
```

**Do NOT regress the non-gated controls.** Controls with a real resolved default
still render their hint because they return a defined `value`:

- `fontSize` → `{ value: 16, sourceLabel: "Inherited from theme (16px)" }` (`:2242-2246`),
- `linkPaddingX/Y`, `linkRadius`, `paddingX/Y`, `radius` → `Default Npx` with a numeric `value` (`:2247-2261`),
- `itemGap`/`gap` → `Default 24px` (`:2270-2274`),
- enum/color `navChrome` defaults → `Default (…)` with a defined value (`:2266-2269`),
- cascade cases → `Inherited from desktop` / `Inherits level N (…)` (`:2354`, `:2380`, `:2389`) all carry a defined `value`.

`"(undefined)"` can never appear (already guaranteed — no `?? range.min`, and the
label never interpolates an undefined value for these keys).

### B.2 Downstream note (do NOT touch `menuDocumentV2.ts`)

After this change, `resolveNavKeyThemeDefault`'s `"Off"`/`"Not applied"` labels
become **cosmetically dead in the hint UI** (the hint is now hidden for those
keys). They stay HARMLESS — they still describe the resolver's semantic state and
are asserted by the model-provider unit tests. **Leave them in place.** Do NOT
edit `menuDocumentV2.ts` unless a TypeScript type/signature genuinely requires it
(it does not — this is a pure UI-guard change).

---

## Testing Requirements

Run the touched lanes together (per MEMORY typecheck gotcha, also run root
`tsc -p tsconfig.json --noEmit`, not only `bun --cwd core lint:types`):

### FIX A — golden / CSS emission lane (`tests/vitest/site/menu-document-css.test.ts`)

1. **No level-0 leak onto dropdown links.** For a doc whose `navChrome` sets
   `indicator` (and/or `hoverLift`/`hoverUnderline`) at level 0 ONLY, assert the
   emitted CSS does **NOT** contain a bare `${menuDocScope} .site-nav-link::before`
   rule and does **NOT** contain a `.site-nav-sublist .site-nav-link…` indicator
   rule sourced from `navChrome`. (i.e. no dropdown link receives the level-0 bar.)
2. **Top-bar-only selector emitted.** Assert the level-0 indicator `::before`
   rule is emitted on
   `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-link::before`,
   and the hover-lift/underline extras on the matching top-bar `:hover` selector.
3. **Rest-block resets both axes.** Assert a **non-grow** indicator rest-block
   contains `transform:none` (alongside `opacity:0`), and a **grow** rest-block
   contains `opacity:1` (alongside `transform:scaleX(0)`), at level 0 AND at
   level 1/2 (via `LEVEL_LINK_SELECTORS`).
4. **Present-only / byte-identity pins retained.** A no-override doc stays
   byte-identical (existing `menu-document-render.test.tsx` pin) and
   `buildSiteShellCss(null)` stays ZERO-line diff (existing `siteShellCss.test.ts`).
5. **Per-device parity.** Assert `collectChromeDeltaRules(doc, "tablet")` also
   emits the indicator bar on the top-bar-only selector (front↔canvas via the
   ONE shared builder — no divergence).

### FIX B — UI lane (`tests/vitest/ui/menu-design-editor.test.tsx`)

6. **Gated-off numeric hides its hint.** For each gated key
   (`indicatorThickness`, `itemDividerWidth`, `transitionMs`, `hoverLift`,
   `containerPaddingX/Y`, `navPillRadius`, `navPillPaddingX/Y`) with an unset own
   record, assert `ControlDefaultHint` renders **nothing** (no
   `[data-menu-control-default-hint]` node) — **UPDATE** any prior assertion that
   expected an `"Off"`/`"Not applied"` hint to RENDER → now assert it is HIDDEN.
7. **Real resolved default still shows.** Assert an unset non-gated control still
   renders its hint with the exact source label, e.g. `fontSize` →
   `"Inherited from theme (16px)"`, a padding key → `"Default 12px"`, and a
   cascade case → `"Inherited from desktop"` / `"Inherits level N (…)"`.
8. **No `(undefined)` ever.** Assert no rendered hint text contains
   `"undefined"`.

---

## SMOKE (focused, ≥3 real-flow scenarios — run on `feature/visual` front + canvas)

Per the owner smoke mandate, exercise real flows end-to-end (publish → front
parity + canvas), not just the acceptance checklist.

1. **Indicator no-leak on dropdown when only level 0 is set.** In the Design
   editor, at **level 0** enable an underline/overline indicator (and hover-lift).
   Publish. On the FRONT, hover a **top-bar** item → the level-0 bar appears;
   open a **dropdown** and hover a **level-1/2** link → **NO** indicator bar or
   lift appears on dropdown links. Confirm the same in the admin **canvas**
   (force-open) — front↔canvas identical.
2. **Deeper non-grow indicator visible after a level-0 grow.** Set level-0 (or
   level-1) indicator to **grow** (`indicatorGrow:true`), and a **deeper** level
   (level-2) indicator to a **non-grow** style. Publish. On the FRONT, hover the
   deep link → its bar **fades in and is visible** (not stuck at `scaleX(0)`).
   Toggle the deeper level back to grow and confirm it still animates. Verify in
   canvas too.
3. **Gated-off numeric shows NO hint while a real default still shows.** In the
   Design editor with the relevant own record cleared: a gated numeric
   (e.g. `indicatorThickness` / `navPillRadius` / `hoverLift`) shows the control
   at `range.min` with **NO** "Off"/"Not applied" hint beneath it; simultaneously
   a non-gated control (e.g. base `fontSize`) still shows its
   "Inherited from theme (16px)" hint, and a padding control still shows
   "Default 12px". Switch device to an override breakpoint and confirm an unset
   field still surfaces "Inherited from desktop" (real default) while the gated
   numerics stay hint-less.

---

## Definition of Done

- FIX A: level-0 B2 indicator/hover-lift/underline scoped to the top-bar-only
  selector; every indicator rest-block resets BOTH `transform` and `opacity`;
  goldens (1–5) green; no-override byte-identity + `buildSiteShellCss(null)`
  ZERO-line diff intact.
- FIX B: guard is `if (value === undefined) return null;`; gated-off numerics
  hide their hint; real resolved defaults still render; UI tests (6–8) green;
  `menuDocumentV2.ts` untouched.
- All lanes green together: `core` vitest (site + ui menu suites), root
  `tsc -p tsconfig.json --noEmit`, lint/types, `test:bun` menu suites,
  `gates:coderso`. SMOKE 1–3 pass on front + canvas.
- Changelog entry + README/board/Statistics closure.
