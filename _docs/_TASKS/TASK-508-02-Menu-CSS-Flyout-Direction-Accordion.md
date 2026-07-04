# TASK-508-02: Menu CSS — Flyout Animation, Unified Direction & Accordion Emission

# FileName: TASK-508-02-Menu-CSS-Flyout-Direction-Accordion.md

**Parent Task:** TASK-508
**Priority:** High
**Category:** Site Front / Content (Menus) / Navigation / Responsive / CSS Emission
**Estimated Effort:** Large
**Dependencies:** TASK-508-01 (model keystone — `linkAlign` on `NavLevelStyle`; `submenuDirection` + `submenuMode` on `NavChromeStyle`; the `NAV_LINK_ALIGNS` / `SUBMENU_DIRECTIONS` / `SUBMENU_MODES` enum partitions; `NAV_CHROME_DEFAULTS` entries; the `MENU_SHELL_SUBLIST_MIN_WIDTH=180` / `MENU_SHELL_SUBLIST_PADDING=6` mirror consts + the R1(a) `resolveNavKeyThemeDefault` hint fix — MUST land green first). Rides the existing validated document contract; no route change.
**Status:** ✅ Done
**Completed:** 2026-07-03

**Single-writer:** this subtask is the **SOLE writer of `core/site/menuDocumentCss.ts`**. It does NOT touch `menuDocumentV2.ts` (508-01), `siteShell.tsx` (508-03), the `MenuDesignEditor.tsx` editor SOURCE (508-04), or any NEW/broader test/doc file (508-05) — **with ONE narrow, explicit exception:** the R2 rewrite + the `previewForceOpenLevel` `visibility:visible` fold structurally change bytes that existing golden assertions pin verbatim across THREE test files, so those anchors MUST be mechanically re-synced in the SAME atomic unit as this file's change (they land RED otherwise — see "Paired golden-test resync (MANDATORY)" below): the THREE `menuDocumentCss`/render goldens (`menu-document-css.test.ts:585-600`, `:381-397`; `menu-document-render.test.tsx:1239`/`:1248`) PLUS the FOUR force-open `toContain`s in `tests/vitest/ui/menu-design-editor.test.tsx` — @1768 L1 depth-1, @1777 L2 depth-1, @1780 L2 depth-2 (all three in the `@1755-1784` cumulative-force-open test) AND @2196 L2 depth-2 (the SEPARATE `@2187-2201` "styled sublist is revealed" test) — that 508-02's `previewForceOpenLevel` change turns RED and that MUST be green before 508-03 gates between 508-02 and 508-04 (see 508-04 §2b — 508-04 owns the SEPARATE @1762 level-0 invert + @1771-1773 depth-2 re-string in the `@1755-1784` test ONLY, but NOT any of these four force-open positives). This carve-out is limited to exactly those anchors; all other new/expanded test authoring stays with 508-05. (`MenuDesignEditor.tsx` itself remains 508-04's sole-writer file — this carve-out touches only the named test assertions, never the editor source.) **Land order:** after 508-01 is green; this subtask's `menuDocumentCss.ts` change + the golden resync (three `menuDocumentCss`/render goldens + the four `menu-design-editor.test.tsx` force-open `toContain`s) land as ONE atomic commit/PR (never a RED intermediate); before 508-04 (which consumes this file's `buildMenuDocumentPreviewCss` force-open emission for the canvas) and before 508-05 (the ≥5-scenario smoke + all OTHER tests/docs/closure).

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new route/RBAC/endpoint/migration.** This subtask emits doc-scoped CSS ONLY — it reads already-normalized, enum-validated fields off the `MenuDocumentV2` produced by 508-01's normalizers (raw stored input never reaches this file). No new endpoint, RBAC bucket, HTTP method, or migration; `menus.settings` stays freeform jsonb. NO `menuDocumentV2` `schemaVersion` bump. All new CSS is scoped under `menuDocScope = [data-site-menu-doc="true"]` (`menuDocumentCss.ts:163`, specificity 0,1,0) via the ONE shared `buildMenuRuleSetsForDocument` (`:1079`) so the front `@media` variant (`buildMenuDocumentCss` `:1176`) and the canvas flatten (`buildMenuDocumentPreviewCss` `:1285`) NEVER diverge. **Present-only:** every new emitter returns `null`/`[]` when its field is unset, so `buildSiteShellCss(null)` and no-override docs stay byte-identical. `siteShellCss.ts` is NOT edited (only its `180`/`6` consts are mirrored in the model by 508-01).

---

## Scope (this subtask)

Consume the 508-01 model fields and emit their doc-scoped CSS through `buildMenuRuleSetsForDocument`:

- **R1(b)** — emit `linkAlign` as `text-align` on the dropdown link (`levelLinkDecls`) + add `linkAlign` to `NAV_LEVEL_STYLE_COMPARE_KEYS` (per-device delta channel).
- **R2** — **REWRITE `flyoutAnimRule`** (`:641-667`) to the robust `visibility+opacity+transform` delayed-visibility reveal (perceptible fade/slide; keep the `display:none→grid` toggle for reachability; DROP `@starting-style`/`allow-discrete`/`display`-in-transition) + update `previewForceOpenLevel` (`:1250-1267`) to clear the new `visibility:hidden` rest state.
- **R3a** — new `submenuDirectionRules` emitter in `desktopShared` (level-1 precise selector + anchored (0,5,0) level-2), each rule resetting ALL FOUR offsets; `right|down|up|left`; present-only; **base-only** — reads `baseNavChrome` in `desktopShared`, NOT added to `NAV_CHROME_COMPARE_KEYS`, NO tablet-delta carve-out (structural ≥640 axis like `dropdownDirection`; a tablet override would be dead data since `navChromeRules` emits no direction bytes — see 508-04 §2).
- **R3b** — new `accordionRules` emitter in `desktopShared`, gated `baseNavChrome?.submenuMode === "accordion"`: vertical stack + `position:static` in-flow sublists + indent; gate `flyoutAnimRule` OFF in accordion mode; **base-only** — reads `baseNavChrome`, NOT added to `NAV_CHROME_COMPARE_KEYS`, NO tablet-delta carve-out.

**Out of scope (other subtasks):** model/type/normalizer/allowlist/enum-partition/`NAV_CHROME_DEFAULTS`/`resolveNavKeyThemeDefault` (508-01); markup (508-03, expected ZERO); editor controls + label maps (508-04); NEW tests + the ≥5-scenario SMOKE + docs + changelog (508-05). **In scope by carve-out:** the mechanical re-sync of the existing goldens the R2 rewrite + the `previewForceOpenLevel` change necessarily break across THREE test files — the three `menuDocumentCss`/render goldens (`menu-document-css.test.ts:585-600`, `:381-397`; `menu-document-render.test.tsx:1239`/`:1248`) PLUS the four force-open `toContain`s in `tests/vitest/ui/menu-design-editor.test.tsx` (@1768 L1 depth-1, @1777 L2 depth-1, @1780 L2 depth-2 in the `@1755-1784` test, AND @2196 L2 depth-2 in the SEPARATE `@2187-2201` test) — these ride WITH this file's change, atomically (see the paired-resync block under Testing Requirements). No test file or assertion OUTSIDE those three goldens + four editor `toContain`s is touched here.

---

## Verified source anchors (Read + `grep -an`, `feature/visual`, this run)

All in `core/site/menuDocumentCss.ts` (1305 lines) unless noted. **Seed corrections confirmed:** `navNestingRules` is at **1037-1052** (NOT ~698); the hardcoded always-RIGHT nested rule is **1046-1048**; `display:none` @1040, `:hover/:focus-within>…{display:grid}` @1042.

| Anchor | Line(s) | Fact |
|---|---|---|
| `menuDocScope` | 163 | `[data-site-menu-doc="true"]`, attribute selector (0,1,0) |
| `dropdownRule` | 327-328 | level-1 first dropdown vertical axis only: `.site-nav-sublist{top:100%;bottom:auto}` (or `bottom:100%;top:auto` when `dropdownDirection==="top"`); horizontal `left:0` is baked into the base sheet |
| orientation vertical decls | 245-246 | `${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}` (REUSE verbatim for accordion) |
| `LEVEL_LINK_SELECTORS` | 494-497 | `[1]` = `…> .site-nav-sublist .site-nav-link`; `[2]` = `…> .site-nav-sublist .site-nav-sublist .site-nav-link` |
| `LEVEL_CONTAINER_SELECTORS` | 509-517 | `[1]` = two-member group (512); `[2]` = anchored (0,5,0) `…> .site-nav-sublist .site-nav-sublist` (516) |
| `flyoutAnimRule` | 641-667 | current inert impl (`opacity`/`transform` + `display …ms allow-discrete` + `@starting-style`); `sub`/`openParent` @643-653; `dur` @654; `shownSel` @661; early-return `[]` @642 |
| `submenuPlacementRule` | 689-698 | level-2 R/B/L on `LEVEL_CONTAINER_SELECTORS[2]`, resets all four offsets (693-696) |
| `levelLinkDecls` | 702-715 | link `{}` decls, rides `LEVEL_LINK_SELECTORS[lvl]`, all-width (mobile via `linkOnly`) — R1(b) `text-align` seam |
| `levelContainerDecls` | 732-751 | `min-width` @742; container `padding:${Y??0}px ${X??0}px` @747-749 |
| `NAV_LEVEL_STYLE_COMPARE_KEYS` | 840-877 | per-level per-device delta compare list (add `linkAlign`) |
| `NAV_CHROME_COMPARE_KEYS` | 927-945 | per-chrome per-device delta compare list (UNCHANGED — `submenuDirection`/`submenuMode` are base-only, NOT added) |
| `navNestingRules` | 1037-1052 | `display:none` @1040; open `display:grid` @1042; `>li{position:relative}` @1044; nested always-RIGHT `left:100%;…` @1046-1048; caret @1051 |
| `buildMenuRuleSetsForDocument` | 1079-1161 | ONE shared builder; `baseNavChrome` @1089-1090; `baseLevelStyles` @1086-1087; `basePlacement` @1106; `desktopShared` @1107-1115; `tabletDelta` @1117-1125; `mobileRules` @1126-1144 (`linkOnly` re-emit @1138) |
| `previewForceOpenLevel` | 1250-1267 | level-1 rule @1256 (`display:grid;opacity:1;transform:none`); level-2 anchored (0,5,0) @1263 — BOTH need `visibility:visible` added |
| `buildMenuDocumentPreviewCss` | 1285-1305 | canvas flatten; `forceOpen` appended LAST @1301-1302 |
| base sheet `.site-nav-sublist` | `siteShellCss.ts:151` | `padding:6px;display:grid;gap:2px;min-width:180px` (NOT edited here) |
| base sheet desktop absolute | `siteShellCss.ts:157` | `position:absolute;left:0;top:100%…` (accordion overrides via doc scope) |
| base sheet mobile indent | `siteShellCss.ts:171` | `padding-left:16px` (accordion indent mirrors this) |

---

## Execution-ready pseudocode

### R1(b) — `linkAlign` → `text-align` on the link (present-only, per-device, all-width)

In `levelLinkDecls` (`:702-715`), add ONE present-only decl to the link `{}` block, alongside the existing `color`/`font-size`/`padding` decls (BEFORE the `...indicatorLinkDecls(s)` spread so it stays in the base link block):

```ts
const levelLinkDecls = (s: NavLevelStyle): string[] => {
  const decls = [
    s.linkColor != null ? `color:${s.linkColor}` : null,
    s.fontSize != null ? `font-size:${s.fontSize}px` : null,
    s.fontWeight != null ? `font-weight:${s.fontWeight}` : null,
    s.paddingX != null || s.paddingY != null
      ? `padding:${s.paddingY ?? SHELL_DEFAULT_LINK_PY}px ${s.paddingX ?? SHELL_DEFAULT_LINK_PX}px`
      : null,
    s.radius != null ? `border-radius:${s.radius}px` : null,
    s.linkAlign != null ? `text-align:${s.linkAlign}` : null,   // R1(b) — NEW, present-only
  ].filter((d): d is string => d !== null);
  return [...decls, ...indicatorLinkDecls(s)];
};
```

- Rides `LEVEL_LINK_SELECTORS[lvl]` (`:494-497`) — the same descendant-anchored link selector the other link decls use. `.site-nav-link` is `display:block` filling the ≥180px container ⇒ `text-align:center` centers the label (the owner's "auto padding to center the text").
- **All-width:** `levelLinkDecls` is emitted in BOTH `desktopShared` (via `navLevelRules(baseLevelStyles)`) AND the mobile `linkOnly` re-emit (`:1138`), so `linkAlign` reaches <640 automatically. NO structural gating.
- **Per-device delta channel (MANDATORY — else deltas silently never emit):** add `"linkAlign"` to `NAV_LEVEL_STYLE_COMPARE_KEYS` (`:840-877`):
  ```ts
  const NAV_LEVEL_STYLE_COMPARE_KEYS: readonly (keyof NavLevelStyle)[] = [
    /* …existing keys… */
    "linkAlign",   // NEW — or collectLevelDeltaRules never fires a per-device linkAlign delta
  ];
  ```
  (Cross-subtask guard: 508-05's compare-key coverage test asserts every enum/scalar `NavLevelStyle` field is present here.)

### R2 — robust `flyoutAnimRule` rewrite (perceptible fade/slide; zero-JS reachable)

**REPLACE the body of `flyoutAnimRule` (`:641-667`)** — keep the signature, the `@642` early-return `[]` guard, and the exact `sub`/`openParent`/`shownSel`/`dur` computation (`:643-661`) unchanged. Only the 3 returned rules change. Drop `@starting-style`, `allow-discrete`, and `display` from the transition entirely:

```ts
const flyoutAnimRule = (lvl: NavLevelStyleLevel, s: NavLevelStyle): string[] => {
  if (s.flyoutAnimation == null || s.flyoutAnimation === "none") return []; // byte-identity guard (unchanged)
  const target = lvl === 1
    ? { sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist`,
        openParent: `${menuDocScope} .site-nav-list > .site-nav-item` }
    : { sub: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`,
        openParent: `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist > .site-nav-item` };
  const { sub, openParent } = target;
  const dur = s.transitionMs ?? 150;
  const slide = s.flyoutAnimation === "slide";

  // REST: force display:grid (overrides navNestingRules @1040 .site-nav-sublist{display:none};
  //   rest spec 0,4,0 (L1)/0,5,0 (L2) beats 0,2,0 — box is ALWAYS laid out ⇒ opacity/transform
  //   interpolate in EVERY engine). Hide via visibility (reachability parity w/ display:none).
  //   `visibility 0s linear ${dur}ms` DELAYS the hide until after the fade/slide-out on CLOSE.
  const restDecls = slide
    ? `display:grid;visibility:hidden;opacity:0;transform:translateY(-6px);transition:opacity ${dur}ms,transform ${dur}ms,visibility 0s linear ${dur}ms`
    : `display:grid;visibility:hidden;opacity:0;transition:opacity ${dur}ms,visibility 0s linear ${dur}ms`;
  // SHOWN: visibility 0s (no delay) ⇒ interactive from frame 0 on OPEN.
  const shownDecls = slide
    ? `visibility:visible;opacity:1;transform:none;transition:opacity ${dur}ms,transform ${dur}ms,visibility 0s`
    : `visibility:visible;opacity:1;transition:opacity ${dur}ms,visibility 0s`;

  const shownSel = `${openParent}:hover > .site-nav-sublist,${openParent}:focus-within > .site-nav-sublist`;
  return [
    `${sub}{${restDecls}}`,
    `${shownSel}{${shownDecls}}`,
  ]; // NO @starting-style, NO allow-discrete, NO display in transition
};
```

- **Zero-JS reachability preserved:** `visibility:hidden` on an absolute box (`siteShellCss.ts:157`) is non-focusable, non-clickable, a11y-hidden — exact parity with `display:none`. `:hover`/`:focus-within` flips it `visible` + fully interactive. Keyboard path: focusing the parent trigger fires `:focus-within` → sublist visible → its links become focusable (same mechanism the old rule relied on).
- **`navNestingRules` (`:1040`/`:1042`) stays BYTE-IDENTICAL** — its `display:grid`-on-hover is now redundant-but-harmless; do NOT edit it.
- **Comment block (`:635-640`) MUST be rewritten** to describe the visibility mechanism (the old text references `allow-discrete`/`@starting-style`, now removed) — the "NEVER the two-member `LEVEL_CONTAINER_SELECTORS[1]`" caution stays (still true; the level-2 `sub` is the (0,5,0) anchored form).
- **Present-only / byte-identity:** unset/`"none"` ⇒ `[]` ⇒ the `display:none` path is untouched ⇒ no-override docs byte-identical.
- **⚠ These goldens FAIL BY DESIGN — do NOT revert the R2 change to make them pass:** this rewrite is the perceptible-motion bug fix, so it deliberately changes the exact strings two existing goldens pin. `menu-document-css.test.ts:585-600` ("B3 flyoutAnimation:slide…") asserts the OLD `opacity:0;transform:translateY(-6px);…display 150ms allow-discrete` rest, the OLD shown, the `@starting-style{…}` block, AND `expect(css).not.toContain("visibility")` (@595) — all three now differ and the output DOES emit `visibility`. `menu-document-render.test.tsx:1239` pins the same OLD flyout rest string and `:1248` asserts `expect(front).not.toContain("visibility")` on an authored-flyout doc. Re-sync both (new rest/shown strings, drop the `@starting-style` assert, and either delete the two `not.toContain("visibility")` asserts or narrow them to the no-flyout doc) as the MANDATORY paired change that lands atomically with this file — NEVER by weakening the CSS back to the inert impl.

**`previewForceOpenLevel` (`:1250-1267`) — add `visibility:visible` to BOTH rules** (else the animated flyout previews open-but-invisible on the authoring canvas):

```ts
const rules = [
  `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`, // @1256 — +visibility:visible
];
if (level >= 2) {
  rules.push(
    `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}` // @1263 anchored (0,5,0) — +visibility:visible
  );
}
```

`forceOpen` is appended LAST (`:1301-1302`), so it ties the new rest selectors (0,4,0 L1 / 0,5,0 L2) and wins by source order — no specificity bump needed. Update the `:1251-1254` comment to name `visibility:hidden` alongside `opacity:0`.

- **⚠ Third golden FAILS BY DESIGN — `menu-document-css.test.ts:381-397` (canvas force-open):** `L1_OPEN`/`L2_OPEN` are pinned as `display:grid;opacity:1;transform:none` with NO `visibility:visible`, and — critically — on a doc that has NO `flyoutAnimation` (@375-376), so this `previewForceOpenLevel` change (which unconditionally adds `visibility:visible`) breaks it regardless of animation state. Re-sync the `L1_OPEN`/`L2_OPEN` constants (@381-382) to include `;visibility:visible` in the SAME atomic unit as this file's change. This is the third named anchor in the mandatory paired resync; it is NOT deferred to 508-05.

### R3a — unified `submenuDirection` (right|down|up|left) across ALL depths

New emitter reading `baseNavChrome` (desktop base), producing TWO rules that each reset ALL FOUR offsets (mirroring `submenuPlacementRule`'s discipline `:688-696`). Place the helper near `submenuPlacementRule` (`:689-698`):

```ts
// R3a — nav-GLOBAL submenu direction. Present-only: unset ⇒ [] ⇒ dropdownDirection +
// per-level submenuPlacement behave EXACTLY as today (byte-identity). When set it
// supersedes the first-dropdown axis (rule A, 0,4,0 beats dropdownRule's 0,2,0) and the
// nested axis (rule B on the anchored (0,5,0) LEVEL_CONTAINER_SELECTORS[2], ties + wins by
// order). Reset ALL FOUR offsets per rule (else an undeclared offset inherits @1046's
// left:100% ⇒ double-anchor stretch). down→bottom, up→top.
const FIRST_DROPDOWN_SELECTOR =
  `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist` as const; // (0,4,0)

const directionOffsets = (dir: SubmenuDirection): string =>
  dir === "down"  ? "left:0;top:100%;right:auto;bottom:auto"
: dir === "up"    ? "left:0;bottom:100%;top:auto;right:auto"
: dir === "right" ? "left:100%;top:0;right:auto;bottom:auto"
:                   "right:100%;top:0;left:auto;bottom:auto"; // "left"

const submenuDirectionRules = (chrome: NavChromeStyle | undefined): string[] => {
  if (!chrome || chrome.submenuDirection == null) return [];
  const pos = directionOffsets(chrome.submenuDirection);
  return [
    `${FIRST_DROPDOWN_SELECTOR}{${pos}}`,          // rule A — level-1 first dropdown
    `${LEVEL_CONTAINER_SELECTORS[2]}{${pos}}`,     // rule B — nested ≥2 (anchored 0,5,0)
  ];
};
```

Wire into `desktopShared` (`:1107-1115`). **Ordering (precedence — document in a comment):** emit `submenuDirectionRules` AFTER `dropdownRule`/`navNestingRules`/`navLevelRules` but BEFORE `basePlacement`, so the global direction supersedes the split legacy axes, yet a granular per-level-2 `submenuPlacement` still WINS at level 2 (it ties selector spec and is emitted last):

```ts
const accordion = baseNavChrome?.submenuMode === "accordion"; // R3b flyout gate (used in BOTH paths)
const desktopShared = [
  dropdownRule(base),
  ...navNestingRules(base),
  ...navLevelRules(baseLevelStyles, { skipFlyoutAnim: accordion }), // R3b — gate flyoutAnimRule off here…
  ...navChromeRules(baseNavChrome, base.orientation),
  ...submenuDirectionRules(baseNavChrome),                     // R3a — after legacy axes, before B5
  ...accordionRules(baseNavChrome),                            // R3b — see below
  ...(basePlacement ? [basePlacement] : []),                  // B5 level-2 fine override wins (last)
];
// …AND thread the SAME gate into the tablet level-delta path (see R3b mutual-exclusion below):
// collectLevelDeltaRules(doc,"tablet") re-emits navLevelRules(...,{linkOnly:false}) @920, which ALSO
// fires flyoutAnimRule — gating only the desktopShared call above leaves a tablet-delta gap.
```

- **≥640-only** (dropdowns don't exist <640; mobile is inline) — mirror `dropdownRule`'s desktop-branch-only nature (`:324-325`). Emit in `desktopShared` (rides tablet via the shared branch). Do NOT emit in `mobileRules`.
- **Base-only (RESOLVED — NOT per-device):** `submenuDirection` is emitted ONLY in `desktopShared` reading `baseNavChrome`, exactly like `dropdownDirection`. It is **NOT** added to `NAV_CHROME_COMPARE_KEYS` and gets **NO** tablet-delta carve-out. Rationale: `collectChromeDeltaRules(doc,"tablet")` re-runs `navChromeRules` (@966+), which emits ONLY link/pill/divider/indicator/caret CSS — it carries NO direction bytes — so a tablet override would be DEAD DATA behind a misleading badge/Reset (the exact B5 gap that forced the standalone `submenuPlacementDeltaRule` carve-out). Tablet inherits the base direction via the flatten (`buildMenuDocumentPreviewCss` tablet branch `:1295` = `desktopShared + tabletDelta`). 508-04 renders the control base-only to match, and the coverage guard EXEMPTS these two structural base-only keys (see `NAV_CHROME_COMPARE_KEYS` section below).

### R3b — `submenuMode = accordion` (in-flow block)

New emitter, gated present-only; flyout (default) ⇒ ZERO bytes. Pure doc-scoped CSS — no markup hook. Place near `submenuDirectionRules`:

```ts
// R3b — accordion (inline) mode. Present-only: submenuMode !== "accordion" ⇒ [] ⇒ byte-identical.
// Renders the whole menu as ONE downward in-flow column: vertical top bar + static sublists that
// push siblings/content DOWN. Reachability unchanged (navNestingRules' display:none→grid hover/
// focus-within toggle still reveals in-flow — do NOT touch @1040/@1042).
const accordionRules = (chrome: NavChromeStyle | undefined): string[] => {
  if (chrome?.submenuMode !== "accordion") return [];
  return [
    // 1. Vertical top bar — REUSE the orientation:vertical decls (@245-246) verbatim; a
    //    horizontal bar can't cohesively push a static sublist down.
    `${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}`,
    // 2. In-flow sublists — override the base sheet's position:absolute (siteShellCss.ts:157) so
    //    sublists expand in place + push siblings down; drop floating chrome ⇒ one solid block.
    `${menuDocScope} .site-nav-sublist{position:static;box-shadow:none;border:0;min-width:0}`,
    // 3. Indent per depth (mirror mobile inline indent siteShellCss.ts:171).
    `${menuDocScope} .site-nav-sublist{padding-left:16px}`,
  ];
};
```

- Wire into `desktopShared` (see the block above) — emitted AFTER `navNestingRules`/`navLevelRules`/`submenuDirectionRules` so `position:static` wins and neutralizes the flyout/direction offsets (an absolute offset on a static box is inert; acceptable). ≥640-only (mobile is already a column via the base sheet — emitting there would be a harmless no-op but keep it out to avoid double-emit). **Base-only** — read from `baseNavChrome` in `desktopShared`; `submenuMode` is NOT added to `NAV_CHROME_COMPARE_KEYS` and gets no tablet delta (same dead-data rationale as `submenuDirection`).
- **`flyoutAnimRule` mutual-exclusion (BOTH the desktopShared AND tablet-delta emit paths — do NOT gate only the desktopShared call):** when `submenuMode === "accordion"`, GATE `flyoutAnimRule` OFF (accordion is in-flow + naturally visible; a fade/slide over static content is not requested and would fight `position:static`). `flyoutAnimRule` is called inside `navLevelRules` at `:794`, and `navLevelRules` is invoked in FOUR places — but `flyoutAnimRule` only fires in the two NON-`linkOnly` ones: **(a) `desktopShared` `navLevelRules(baseLevelStyles)` @1110** (the one the wire-in block above addresses) AND **(b) `collectLevelDeltaRules(doc,"tablet")` @920, which calls `navLevelRules(resolved,{linkOnly:false})`**. The two mobile paths are already safe (`linkOnly:true` short-circuits BEFORE `flyoutAnimRule` @784 — the mobile `navLevelRules(baseLevelStyles,{linkOnly:true})` @1138 and `collectLevelDeltaRules(doc,"mobile")` @920). **Why (b) matters:** `flyoutAnimation` IS a per-device-forkable level field (it is in `NAV_LEVEL_STYLE_COMPARE_KEYS` @870), so an author who sets base-navChrome `submenuMode:"accordion"` AND a per-device **tablet** `flyoutAnimation` on a level would — if only (a) is gated — still get the tablet delta emit `flyoutAnimRule`'s R2 rest rule `display:grid;visibility:hidden`, which OVERRIDES `navNestingRules`' `display:none` (@1040) to `display:grid`+`visibility:hidden`: the accordion sublist reserves in-flow space but is invisible at rest on tablet — a real visual-gap bug, exactly the state accordion gating exists to prevent.
  - **Implement — reach BOTH seams (pick ONE, apply to both paths):**
    1. **(preferred) Thread the accordion flag through `navLevelRules`** via a `{ skipFlyoutAnim?: boolean }` option that guards the `rules.push(...flyoutAnimRule(lvl, s))` at `:794`, and pass `skipFlyoutAnim: accordion` at BOTH call sites — the `desktopShared` @1110 call (shown above) AND, since `collectLevelDeltaRules` @909 has no chrome in scope, either add an `accordion` param to `collectLevelDeltaRules(doc, device, accordion)` and forward it, or have it recompute `baseNavChrome?.submenuMode === "accordion"` from `doc` itself.
    2. **(alt) Post-filter `tabletDelta`** — drop any emitted flyout rule containing `visibility:hidden` from the tablet delta array when `accordion` (and likewise never emit it in `desktopShared`).
  - Keep `linkAlign`/container/link decls emitting normally in accordion mode. **Present-only invariant holds:** a flyout-mode doc (no accordion) emits ZERO accordion bytes AND its `flyoutAnimRule` is unaffected on every device.
- **Compare-key:** `submenuMode` is base-only — do NOT add it to `NAV_CHROME_COMPARE_KEYS`. The accordion gate is recomputed from the base doc (`baseNavChrome?.submenuMode === "accordion"`), so the flyout mutual-exclusion above still reaches the tablet-delta seam without a `submenuMode` delta of its own (the per-device concern there is `flyoutAnimation`, which IS forkable, not `submenuMode`).
- **Canvas:** `previewForceOpenLevel` already sets `display:grid` (works in accordion); with the R2 `visibility:visible` addition the accordion previews correctly open + in-flow. No accordion-specific preview change needed.

### `NAV_CHROME_COMPARE_KEYS` — UNCHANGED (both R3a + R3b are base-only)

`submenuDirection` and `submenuMode` are **structural, base-only** keys (like `dropdownDirection`):
they are read from `baseNavChrome` in `desktopShared` and have NO tablet-delta emitter, so adding
them to `NAV_CHROME_COMPARE_KEYS` would only fabricate DEAD tablet-override data behind a
misleading badge/Reset. They are therefore **NOT** added — `NAV_CHROME_COMPARE_KEYS` is left
exactly as 506/507 shipped it:

```ts
const NAV_CHROME_COMPARE_KEYS: readonly (keyof NavChromeStyle)[] = [
  /* …existing 506/507 keys — UNCHANGED; submenuDirection/submenuMode intentionally EXCLUDED… */
];
// STRUCTURAL_BASE_ONLY_CHROME_KEYS — exempted from the compare-key coverage guard below.
const STRUCTURAL_BASE_ONLY_CHROME_KEYS = ["submenuDirection", "submenuMode"] as const;
```

### Error handling / defensive posture

- No new `try/catch` — this file consumes already-normalized, enum-validated fields (508-01 rejects unknown keys + omits bad enum values BEFORE CSS). Emitters treat `undefined` as "absent" (present-only) and NEVER emit a partial/`NaN` rule.
- `directionOffsets` is exhaustive over the 4-member `SubmenuDirection` union (the final branch = `"left"`); a value outside the union is impossible post-normalize, but the `else` deterministically maps to `left` (no throw, no undefined interpolation).
- Accordion + direction coexistence: `position:static` (accordion) is emitted after direction offsets and wins ⇒ direction rules become inert overlays, not conflicts. Documented.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

> This subtask AUTHORS the CSS; the NEW tests + the ≥5-scenario SMOKE are OWNED by **508-05**. This section pins the exact assertions 508-05 must add for the `menuDocumentCss.ts` surface so the contract is unambiguous. **508-02 does NOT land green under the existing goldens unchanged** — the R2 rewrite + the `previewForceOpenLevel` change are a perceptible-motion BUG FIX that deliberately changes bytes existing goldens pin verbatim across THREE test files (the three `menuDocumentCss`/render goldens PLUS the four `menu-design-editor.test.tsx` force-open `toContain`s @1768/@1777/@1780 + @2196), so a mechanical resync of exactly those anchors is a MANDATORY paired change (see below). With that paired resync applied, the atomic unit lands green under the full existing suite + `bun --cwd core lint`, `lint:types`, root `tsc -p tsconfig.json --noEmit`.

### Paired golden-test resync (MANDATORY — lands atomically WITH `menuDocumentCss.ts`)

The single-writer "no test files" boundary has ONE narrow exception (declared under **Single-writer** above): the R2 flyout rewrite + the `previewForceOpenLevel` `visibility:visible` addition structurally alter output that existing goldens assert exactly ACROSS THREE test files, so following land-order literally (this file first, tests later in 508-05) would land the wave RED — violating the gates-green mandate. Re-sync EXACTLY these anchors (the three `menuDocumentCss`/render goldens in items 1–3 PLUS the four `menu-design-editor.test.tsx` force-open `toContain`s in item 4 — no others) in the SAME commit/PR as this file's change; the implementer MUST NOT weaken the R2 CSS back to the inert `@starting-style` impl to keep them green:

1. **`tests/vitest/site/menu-document-css.test.ts:585-600`** ("B3 flyoutAnimation:slide…") — replace `rest`/`shown` with the new `display:grid;visibility:hidden;opacity:0;transform:translateY(-6px);transition:opacity …ms,transform …ms,visibility 0s linear …ms` / `visibility:visible;opacity:1;transform:none;transition:opacity …ms,transform …ms,visibility 0s` strings; DELETE the `@starting-style` golden (@591-594) and the `expect(css).not.toContain("visibility")` assert (@595, now inverted — the fix EMITS `visibility`); keep the `display:none→grid` reachability assert (@597-599, still true). Retitle the test (drop "allow-discrete / NO visibility").
2. **`tests/vitest/site/menu-document-css.test.ts:381-397`** (canvas force-open) — the `L1_OPEN`/`L2_OPEN` constants (@381-382) must gain `;visibility:visible` (→ `display:grid;visibility:visible;opacity:1;transform:none`). NOTE this doc has NO `flyoutAnimation` (@375-376), so the change is required even though no animation is authored — the force-open addition is unconditional.
3. **`tests/unit/site/menu-document-render.test.tsx:1239`/`:1248`** — replace the `:1239` golden with the new R2 rest string; either DELETE the `:1248` `expect(front).not.toContain("visibility")` or narrow it to a no-flyout doc (the authored-flyout doc now legitimately contains `visibility`).
4. **`tests/vitest/ui/menu-design-editor.test.tsx` @1768 / @1777 / @1780 (test `@1755-1784`) + @2196 (SEPARATE test `@2187-2201`)** — FOUR positive `toContain`s pin the pre-Req2 force-open bytes `…{display:grid;opacity:1;transform:none}` verbatim. In the "canvas force-open threads the selected level (cumulative)" test (`@1755-1784`): @1768 (depth-1 at level 1) and @1777 (depth-1 at level 2) both assert the first-dropdown rule, and @1780 (depth-2 at level 2) the anchored (0,5,0) nested rule (short substring form `.site-nav-sublist .site-nav-sublist{…}`). In the DISTINCT "canvas force-open threads the selected level so the styled sublist is revealed" test (`@2187-2201`): @2196 asserts the SAME depth-2 short-form nested rule after selecting level 2. This subtask's `previewForceOpenLevel` change (`menuDocumentCss.ts` @1256/@1263) folds in `visibility:visible`, turning all FOUR RED. Re-string them to the visibility-inclusive form 508-02 emits — **@1768 + @1777** → `.site-nav-list > .site-nav-item > .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}`; **@1780 + @2196** → the nested `.site-nav-sublist .site-nav-sublist{display:grid;visibility:visible;opacity:1;transform:none}` — in the SAME atomic unit, because **508-03 gates BETWEEN 508-02 and 508-04** and these must be green then (violating each-subtask-green otherwise, the same reason R1(a)'s @2069-2078 amendment is 508-01-owned). The two `not.toContain`s in the `@1755-1784` test are the **@1762** level-0 first-dropdown-absent guard and the **@1771-1773** depth-2-absent-at-level-1 guard — 508-02 touches NEITHER here (only its three force-open `toContain`s @1768/@1777/@1780 above). Note the @1771-1773 depth-2 guard does NOT stay valid post-fold: 508-02's `visibility:visible` fold means its SHORT pre-Req2 substring can never be emitted by any level, so it silently degrades to a tautology. **508-04 §2b owns the SEPARATE, non-overlapping edits to BOTH of these in the `@1755-1784` test ONLY** — it INVERTS the @1762 level-0 `not.toContain`→`toContain` (its `forceOpenLevel` change now emits the depth-1 open rule at level 0) and RE-STRINGS the @1771-1773 depth-2 `not.toContain` to the visibility-inclusive anchored form so it stays a meaningful guard rather than the tautology 508-02's fold leaves behind — so no assertion is double-written (508-04 does NOT touch the `@2187-2201` test). This is the fourth carve-out file; NO other assertion in it is touched here. (If 508-02's exact declaration order is not locked at land, assert selector-presence + a separate `visibility:visible` presence check instead of the fixed substring. Board may instead land 508-02+508-04 atomically; either way these four `toContain`s are pinned to EXACTLY 508-02.)

All OTHER new/expanded assertions in this section remain 508-05's to author.


**Vitest lane (Bun-free — `tests/vitest/site/menu-document-css.test.ts`):**
- **Present-only ZERO-byte emission:** a doc with no `flyoutAnimation`/`submenuDirection`/`submenuMode`/`linkAlign` produces CSS BYTE-IDENTICAL to pre-508 — assert none of `visibility:`, `text-align:`, the direction offset strings, `position:static`, or `flex-direction:column` (beyond the pre-existing orientation/mobile emissions) appear.
- **R1(b) linkAlign:** `linkAlign:"center"` on a level emits `text-align:center` on `LEVEL_LINK_SELECTORS[lvl]`; per-device delta fires (mobile override diffs vs desktop) — proving `linkAlign` is in `NAV_LEVEL_STYLE_COMPARE_KEYS`.
- **R2 keyframe STATES (not a bare transition string — the exact gap that shipped the 506 bug):** with `flyoutAnimation:"slide"` the REST rule contains `visibility:hidden` AND `opacity:0` AND `transform:translateY(-6px)` AND `display:grid` AND `transition:opacity …ms,transform …ms,visibility 0s linear …ms`; the SHOWN rule contains `visibility:visible;opacity:1;transform:none`. With `"fade"` the same minus `transform`. Assert the output contains **NO** `@starting-style`, **NO** `allow-discrete`, **NO** `display ` inside any `transition:`. `"none"`/unset ⇒ `flyoutAnimRule` returns `[]` (zero visibility bytes).
- **R2 preview:** `previewForceOpenLevel(1)` and `(2)` both emit `visibility:visible` on their respective (0,4,0)/(0,5,0) selectors.
- **R3a submenuDirection:** for each of `down|up|right|left` assert BOTH rules emit — the level-1 precise selector (`FIRST_DROPDOWN_SELECTOR`) AND the anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]` — each with all FOUR offsets present and the mapped anchor (e.g. `down` ⇒ `top:100%` + `bottom:auto` + `left:0` + `right:auto`; `up` ⇒ `bottom:100%`+`top:auto`; the used `left` for down/up is `0` and NOT `100%` — no double-anchor stretch). Assert unset ⇒ ZERO bytes and `dropdownDirection`/`submenuPlacement` behavior byte-identical. Assert ordering: a doc with BOTH `submenuDirection:"down"` AND level-2 `submenuPlacement:"right"` emits `submenuPlacementRule` AFTER `submenuDirectionRules` (level-2 fine override wins).
- **R3b accordion:** `submenuMode:"accordion"` emits `flex-direction:column;align-items:stretch` on `.site-nav-list` + `position:static` (and `box-shadow:none;border:0;min-width:0`) + `padding-left:16px` on `.site-nav-sublist`; `flyoutAnimRule` is SKIPPED (no `visibility:hidden` bytes even if `flyoutAnimation` is also set). **Assert the skip on BOTH emit paths:** a doc with base `submenuMode:"accordion"` AND a per-device **tablet** `flyoutAnimation` on a level emits ZERO `visibility:hidden` bytes in the `tabletDelta` output too (guards the `collectLevelDeltaRules(doc,"tablet")` @920 seam, not just `desktopShared`). A flyout-mode doc emits ZERO of these accordion bytes.
- **ONE-shared-builder parity:** for each new field, `buildMenuDocumentCss` (front `@media`) and `buildMenuDocumentPreviewCss` (canvas flatten) emit the SAME rule strings (structural rules ≥640-only in both; `linkAlign` all-width in both incl. the mobile `linkOnly` split @1138).
- **Per-device:** tablet/mobile each diff vs DESKTOP base; mobile NEVER inherits tablet; structural direction/accordion rules do NOT leak into the mobile branch.
- **Compare-key coverage guard (cross-subtask test #4):** every enum/scalar `NavLevelStyle` field is in `NAV_LEVEL_STYLE_COMPARE_KEYS` (catches a missing `linkAlign`); every `NavChromeStyle` field is in `NAV_CHROME_COMPARE_KEYS` **EXCEPT the structural base-only keys `submenuDirection`/`submenuMode`** (which are intentionally excluded because they have no tablet-delta emitter — the guard asserts `NavChromeStyle` fields minus `STRUCTURAL_BASE_ONLY_CHROME_KEYS` are all present, AND separately asserts those two base-only keys are ABSENT from `NAV_CHROME_COMPARE_KEYS` so a later accidental addition of dead-data delta is caught).

**Bun lane (`tests/unit/site/menu-document-render.test.tsx`, `tests/unit/pages/siteShellCss.test.ts` — 508-05):**
- No-override doc render byte-identity; `buildSiteShellCss(null)` byte-identical (`siteShellCss.test.ts` ZERO-line diff — this subtask does NOT edit `siteShellCss.ts`).
- Front `@media` emission per field + canvas flatten parity; front markup unchanged.

**SMOKE:** authored in **508-05** (owner mandate: ≥5 DISTINCT real-flow scenarios asserting VISIBLE EFFECT — perceptible flyout motion via mid-transition `getComputedStyle(sublist).opacity` fractional sample; the accordion cohesive block via sibling `getBoundingClientRect().top` push-down; direction up/down/left/right at all depths; centered dropdown text via `getComputedStyle(link).textAlign==="center"`; correct container default hints; cross-device + publish→front parity). This subtask's contribution is asserted there against the running admin/front.

**Named byte-identity + reject-unknown guards (this file's obligations, verified by 508-05):**
1. `buildSiteShellCss(null)` ZERO-line diff (no `siteShellCss.ts` edit).
2. No-override menu docs byte-identical (present-only emitters return `null`/`[]`).
3. Unset `flyoutAnimation` ⇒ ZERO `visibility` bytes (`@642` early-return preserved).
4. Flyout-mode doc ⇒ ZERO accordion + direction bytes.
5. Reject-unknown is enforced UPSTREAM in 508-01 (this file never sees raw input); the compare-key coverage guard here is the fail-closed trip-wire that a new key was fully wired.

---

## Hard Invariants (this subtask)

1. **ONE shared builder** — all new CSS via `buildMenuRuleSetsForDocument` (`:1079`); front `@media` + canvas flatten never diverge.
2. **Present-only** — every new emitter returns `null`/`[]` when its field is unset ⇒ no-override + `buildSiteShellCss(null)` byte-identical.
3. **`siteShellCss.ts` untouched** — only mirror its `180`/`6` (done in 508-01); no edit here.
4. **R2 keeps the `@642` early-return `[]`** — the `display:none` path is byte-identical when `flyoutAnimation` unset; `navNestingRules` @1040/@1042 untouched.
5. **R3a resets ALL FOUR offsets** per rule + keeps the anchored (0,5,0) level-2 specificity + the level-1 precise (0,4,0) selector; `submenuPlacement` fine override still wins (emitted last).
6. **R3b** stays zero-JS reachable (do NOT touch the `display:none→grid` toggle); flyout stays default; accordion opt-in; `flyoutAnimRule` gated off in accordion.
7. **Per-device vs base-only** — `linkAlign` is per-device (in `NAV_LEVEL_STYLE_COMPARE_KEYS`; tablet+mobile inherit DESKTOP, mobile never inherits tablet). `submenuDirection`+`submenuMode` are **base-only structural** keys: NOT in `NAV_CHROME_COMPARE_KEYS`, emitted only from `baseNavChrome` in `desktopShared`, NO tablet-delta (a per-device override would be dead data — no direction/accordion delta emitter exists).
8. **Canvas force-open** reveals direction/accordion/animation while authoring (`previewForceOpenLevel` + `visibility:visible`).
9. **Keep ALL 504/505/506/507 behavior intact** — dropdownRule, submenuPlacement (0,5,0), B1–B5, 507 top-bar indicator scope.
10. **NO `schemaVersion` bump; NO route/RBAC/endpoint/migration.**

---

## Documentation Updates Required

None authored by this subtask (508-05 owns `_docs/PAGE_MODEL.md`, `_docs/CONTENT_TYPES_SPEC.md`, the changelog **next free number = 1217** (verified fresh this run against `_docs/_CHANGELOG/README.md`), and `_docs/_TASKS/README.md`/Statistics). This subtask leaves inline code comments at each new emitter (visibility mechanism, direction precedence, accordion gating) for the doc author.
