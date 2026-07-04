# TASK-508: Menu Nesting Forms + Flyout Fix — Container Defaults & Centering, Perceptible Flyout Motion, Unified Directional Placement & Accordion Mode

# FileName: TASK-508_Menu_Nesting_Forms_And_Flyout_Fix.md

**Parent Task:** TASK-508 (board umbrella)
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-499 (menuDocumentV2 + Design tab + `menuDocumentCss.ts`), TASK-501 (per-device `responsive.{tablet,mobile}` records, `MenuResponsiveControlShell`, dual-selector doc-scoped emission), TASK-504 (`NavItemsProps.levelStyles` per-nesting-level styling, the exact 1/2 descendant depth selectors, per-device brand+level resolvers, `aria-current` current-page stamp), TASK-505 (sibling architecture family), TASK-506 (level-0 `navChrome` sub-record + its full parallel helper family, `resolveMenuControlDefault{value,sourceLabel}`, B1–B5 modern bundles incl. `flyoutAnimation` / `submenuPlacement` / `containerPaddingX/Y` / `minWidth`), TASK-507 (top-bar-scoped level-0 indicator + `ControlDefaultHint` `value===undefined ⇒ null` guard). Rides the existing validated `PATCH /menus/:id` write path.
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Overview

Three owner-reported gaps on the shipped Menu Design tab (owner-approved 2026-07-03),
all on the **same architecture family** as TASK-504/505/506/507: the menuDocumentV2
document contract + doc-scoped CSS via the ONE shared `buildMenuRuleSetsForDocument`
(so front `@media` + canvas flatten NEVER diverge) + `MenuDesignEditor` controls.
**Schema-first, reject-unknown, byte-identity (`buildSiteShellCss(null)` untouched;
no-override docs byte-identical), present-only emission, per-device Pages cascade
(tablet+mobile each inherit DESKTOP, never each other). NO `schemaVersion` bump, NO
route/RBAC/endpoint/migration.**

### REQ1 — Dropdown-container width/padding DEFAULTS + link CENTERING (confirmed fix)

**R1(a) — the misleading resolved-default hints.** The right-panel dropdown-container
controls (`minWidth`, `containerPaddingX`, `containerPaddingY`) surface WRONG/misleading
resolved-default hints. The base sheet ALWAYS paints `.site-nav-sublist{min-width:180px;
padding:6px}` (`siteShellCss.ts:151`), so the effective unset defaults are **180px / 6px**
— but the hint/thumb path reads `undefined`: `minWidth` falls through every branch of
`resolveNavKeyThemeDefault` (`menuDocumentV2.ts:2241-2277`) to the terminal
`{value:undefined, sourceLabel:"Not set"}` (`:2276`), and `containerPaddingX/Y` are listed
in `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS` (`:2205-2211`) → `{value:undefined,
sourceLabel:"Not applied"}` (`:2264`). Combined with the 507 `ControlDefaultHint`
`value===undefined ⇒ null` guard, the hint is HIDDEN and the slider thumb falls back to
`range.min` (80 / 0). **Fix:** surface the REAL effective base-sheet defaults via
`resolveMenuControlDefault` so the hint reads e.g. **"Default 180px"** / **"Default 6px"**,
never `0`/`undefined`.

**R1(b) — link ALIGNMENT (the owner's "auto padding to center the text in the
container").** Add a per-level link **alignment** control (`left|center|right`) that emits
`text-align` on the dropdown link. Because `.site-nav-link` is `display:block` and fills
the sublist's `min-width:180px` container (`siteShellCss.ts:144`), `text-align:center`
centers the label within the container — the mechanism the owner described. Present-only,
per-device, per level (dropdown levels 1/2 are the target use-case).

### REQ2 — Flyout animation ACTUALLY animates (confirmed BUG)

The 506 `flyoutAnimRule` (`menuDocumentCss.ts:641-667`) is **cosmetically inert** in the
owner's browser — "no visible difference for any menu position." Root cause: the reveal
layers an `opacity`(+`transform`) transition over a `display:none→grid` cascade swap
(`navNestingRules:1040-1042`) and tries to bridge the discrete `display` flip with
`transition-behavior:allow-discrete` + a `@starting-style` block. But **an element at
`display:none` renders no box, so opacity/transform cannot interpolate** — the
`allow-discrete`/`@starting-style` machinery is the ONLY bridge and it is (i) very new
(Chrome/Edge 116, Safari 17.4, Firefox 129 — silently dropped + snaps below those), and
(ii) mismatched: the `display` *value change* is a cross-rule cascade swap (rule 1040→1042),
not a `display` transition ON the element, so entry snaps and **close never animates at
all**. The 506 smoke only asserted the transition STRING was present, so this shipped inert.

**Fix:** REPLACE `flyoutAnimRule` with a ROBUST cross-browser reveal that ACTUALLY animates.
Keep the `display:none→grid` zero-JS hover/focus-within toggle for reachability, but drive
the visible motion with **visibility + opacity + transform**: at rest override the sublist
to `display:grid;visibility:hidden;opacity:0` (+`transform:translateY(-6px)` for slide),
open to `visibility:visible;opacity:1;transform:none`, with `transition:opacity Xms,transform
Xms,visibility 0s linear Xms` (the delayed `visibility` on close keeps the element visible
+ interactive through the fade/slide-out; `visibility 0s` no-delay on open makes it
interactive from frame 0). `visibility:hidden` = exact reachability parity with the old
`display:none` (non-focusable, non-clickable, a11y-hidden), preserving the zero-JS contract.
Drop `allow-discrete`/`@starting-style`/`display`-in-transition entirely. Present-only:
`flyoutAnimation` unset/`"none"` → early-return `[]` (`:642`) → the `display:none` path is
untouched → byte-identical.

### REQ3 — Nesting FORMS (owner chose BOTH)

**R3a — UNIFIED DIRECTIONAL PLACEMENT.** Today the submenu-direction model is split +
incomplete: level-1 first dropdown = `dropdownDirection` (`top|bottom` only, always
`left:0`); level-2+ nested = `submenuPlacement` (`right|bottom|left`, NO `up`) on the
anchored (0,5,0) `LEVEL_CONTAINER_SELECTORS[2]`. No single control makes "everything opens
down" trivial. **Add one clear submenu DIRECTION `right|down|up|left` that applies
CONSISTENTLY across ALL nested depths** (level 1 first-dropdown AND level 2/3+), so choosing
"down" everywhere yields ONE cohesive downward column. The recommended home is a
**nav-GLOBAL `submenuDirection` on `NavChromeStyle`** (governs every flyout depth), each
emitted rule resetting ALL FOUR offsets (top/bottom/left/right) to avoid double-anchor
stretch, KEEPING the anchored (0,5,0) level-2 specificity + the existing `dropdownDirection`
/ `submenuPlacement` axes working for byte-identity (unset ⇒ ZERO bytes ⇒ current split
behavior preserved).

**R3b — ACCORDION (inline) MODE.** A menu-level `submenuMode = flyout | accordion` on
`NavChromeStyle`. In ACCORDION mode sublists are NOT floating overlays: they render IN-FLOW
(`position:static`), indented, expanding in place and pushing siblings/content DOWN as ONE
cohesive solid block (menu 0 → down, 1 → 2 → down, all one column). Stays zero-JS reachable
(the existing `display:none→grid` hover/focus-within reveal is untouched) and does NOT break
the floating mode (flyout stays the default; accordion is opt-in). Pure doc-scoped CSS — NO
new markup/attribute hook. Present-only: a flyout-mode (default) doc emits ZERO accordion
bytes.

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** Verified against source:

- **Route (existing).** The document rides `PATCH /menus/:id` inside the existing
  `menuUpdateSchema` `document` envelope (service-side strict validation). No new endpoint,
  RBAC bucket, or method; `menus.settings` is already freeform jsonb — **NO migration**.
  **NO `menuDocumentV2` `schemaVersion` bump.**
- **Schema-first / reject-unknown.** Every new field's normalizer lives in
  `menuDocumentV2.ts`; unknown KEYS throw machine-readable `MenuDocumentError` with the
  offending `path`. Values are fail-soft (bad value OMITTED, matching the file's value
  policy) via the SAME validated enum/number normalizers as the base — raw stored input
  never reaches CSS.
- **Fail-closed read, non-destructive legacy.** The stored-read normalizer stays
  fail-closed; legacy documents WITHOUT the new fields parse byte-unchanged. Each new key
  added to a reject-unknown allowlist is a **fail-closed READ TRAP** — a forgotten key
  silently degrades EVERY stored doc carrying it to empty on read ⇒ each addition carries a
  round-trip persistence test (write→normalize→re-read equals input; stored-doc-with-key
  survives read).
- **Present-only emission.** A new field carries a resolution default only for the HINT
  (`NAV_CHROME_DEFAULTS`); it emits CSS bytes only when authored. `buildSiteShellCss(null)`
  byte-identical (`tests/unit/pages/siteShellCss.test.ts` ZERO edits; `siteShellCss.ts`
  untouched — only its `180`/`6` consts are MIRRORED into the model); no-override docs
  byte-identical (`tests/unit/site/menu-document-render.test.tsx`).
- **Front renders published-only** (unchanged); all new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet via the ONE shared
  `buildMenuRuleSetsForDocument` so front `@media` + canvas flatten NEVER diverge.

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with the
app's CSRF/session envelope; this task neither loosens nor adds an auth path.

---

## Sub-Tasks

| ID | Title | File | Status |
|----|-------|------|--------|
| TASK-508-01 | Menu Model — Align, Direction & Accordion | `TASK-508-01-Menu-Model-Align-Direction-Accordion.md` | ✅ Done |
| TASK-508-02 | Menu CSS — Flyout, Direction & Accordion | `TASK-508-02-Menu-CSS-Flyout-Direction-Accordion.md` | ✅ Done |
| TASK-508-03 | Front & Preview Parity | `TASK-508-03-Front-And-Preview-Parity.md` | ✅ Done |
| TASK-508-04 | Design Editor — Align, Direction & Accordion Controls | `TASK-508-04-Design-Editor-Align-Direction-Accordion-Controls.md` | ✅ Done |
| TASK-508-05 | Menu Nesting Forms — Tests, Docs & Closure | `TASK-508-05-Menu-Nesting-Forms-Tests-Docs-Closure.md` | ✅ Done |

### Land order & single-writer ownership (strictly sequential — each lands green before the next opens)

1. **508-01 (model keystone)** — **sole writer of `core/services/menus/menuDocumentV2.ts`**.
   Ships: `linkAlign` on `NavLevelStyle`; `submenuDirection` + `submenuMode` on
   `NavChromeStyle`; the base-sheet mirror consts (`MENU_SHELL_SUBLIST_MIN_WIDTH=180`,
   `MENU_SHELL_SUBLIST_PADDING=6`); the R1(a) `resolveNavKeyThemeDefault` fix (real
   `minWidth`/`containerPaddingX`/`containerPaddingY` defaults + remove the latter two from
   `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`); all allowlist / enum-partition /
   `NAV_CHROME_DEFAULTS` extensions. Nothing renders it yet.
2. **508-02 (CSS)** — **sole writer of `core/site/menuDocumentCss.ts`**. Consumes the new
   fields via the ONE shared `buildMenuRuleSetsForDocument`: R1(b) `linkAlign` emission
   (`levelLinkDecls`), the R2 robust `flyoutAnimRule` rewrite + `previewForceOpenLevel`
   `visibility:visible` update, R3a `submenuDirection` two-rule emitter, R3b accordion
   emitter, and the `NAV_LEVEL_STYLE_COMPARE_KEYS` `linkAlign` compare-key addition
   (`NAV_CHROME_COMPARE_KEYS` is UNCHANGED — `submenuDirection`/`submenuMode` are base-only,
   emitted from `baseNavChrome`, no tablet delta). `linkAlign` per-device delta + `linkOnly`
   mobile split respected; present-only zero-byte emission.
3. **508-03 (front & preview parity)** — **sole writer of `core/site/siteShell.tsx`**
   (expected ZERO changes). Asserts no new markup/class/aria is needed (the recursive
   `li.site-nav-item[data-site-nav-group] > (a.site-nav-link | span.site-nav-group-label) +
   ul.site-nav-sublist` structure already supports every new field), `buildSiteShellCss(null)`
   byte-identity, and no-override doc render byte-identity. If a hook is proven necessary
   during impl, it lands here.
4. **508-04 (editor)** — **sole writer of `core/admin/ui/menus/MenuDesignEditor.tsx`**.
   R1(b) `linkAlign` per-level `seg` control; R3a/R3b nav-global `submenuDirection` +
   `submenuMode` SegmentedControls in the level-0 nav-base panel; label maps. R1(a) needs NO
   editor edit (the model provider fix auto-fixes both hint + thumb). **R2 canvas force-open
   (§2b):** 508-04 also WIDENS `forceOpenLevel` @2639-2640 so a Level-0 nav-items selection
   previews depth-1 open (else the R3a/R3b direction/accordion/animation effects are invisible
   while the author operates those very level-0 controls) + rewrites the @2634-2637 comment; it
   consumes 508-02's `previewForceOpenLevel` `visibility:visible` emission unchanged (no CSS
   edit). The `tests/vitest/ui/menu-design-editor.test.tsx:1755-1784` editor-test resync is
   SPLIT by byte-introducer (all anchors below are lines in that TEST file, NOT
   `MenuDesignEditor.tsx` whose 1755-1784 is unrelated `setNavField`/`setNavBaseField`
   production code): **508-02** owns the L1/L2 `visibility:visible` fold-in @1768/@1777/@1780 —
   PLUS the depth-2 `toContain` @2196 in the SEPARATE "…styled sublist is revealed" test
   @2187-2201 (FOUR force-open `toContain`s total: @1768/@1777/@1780 + @2196); **508-04** owns
   the level-0 invert @1762 + the depth-2 re-string @1771-1773 — each `expect` pinned to
   exactly one subtask.
5. **508-05 (closure)** — tests (Vitest + Bun), the **≥5-scenario SMOKE**, docs, changelog,
   board/Statistics.

Single-writer map (governs the PRODUCTION deliverables): **`menuDocumentV2.ts` = 508-01**,
**`menuDocumentCss.ts` = 508-02**, **`siteShell.tsx` = 508-03**, **`MenuDesignEditor.tsx` =
508-04**, **tests/docs/closure = 508-05**. Every production file has exactly one owner. The
sole exception is the TEST file `tests/vitest/ui/menu-design-editor.test.tsx`, whose
force-open region @1755-1784 (+ the @2187-2201 sibling test) is CO-OWNED at `expect`-
granularity by 508-02 (visibility fold-in), 508-04 (level-0 invert + depth-2 re-string, and
the new R1(b)/R3a/R3b force-open assertions) and 508-01 (the R1(a) hint-region assertions)
in strict land order — each individual `expect` is pinned to exactly one subtask and
sequential landing prevents collision. **508-05 does NOT author any `menu-design-editor.test.tsx`
assertion — it only VERIFIES the R1(a)/`linkAlign`/direction cases land green** (its §1.3 is a
verification checklist, restating sibling-owned tests, not a second author). 508-02/03/04 all depend on 508-01; 508-04 additionally
consumes 508-02's `buildMenuDocumentPreviewCss` emission for the in-canvas preview, so
508-02's builder API merges before 508-04's canvas work.

---

## Execution-ready contract (normative for the subtasks)

### 508-01 — Model shapes, allowlists, enum partitions, default-hint fix

```ts
// core/services/menus/menuDocumentV2.ts

// ---- R1(b): per-level link alignment on NavLevelStyle (@172-212) ----
type NavLevelStyle = {
  /* …existing fields… */
  linkAlign?: "left" | "center" | "right";   // text-align on the LINK (all levels)
};

// ---- R3a/R3b: nav-global direction + mode on NavChromeStyle (@222-242) ----
type NavChromeStyle = {
  /* …existing 506 fields… */
  submenuDirection?: "right" | "down" | "up" | "left";  // governs EVERY flyout depth
  submenuMode?: "flyout" | "accordion";                 // default flyout (present-only)
};

// New enum option arrays (fresh `as const`, mirror SUBMENU_PLACEMENTS @707):
const NAV_LINK_ALIGNS      = ["left", "center", "right"] as const;
const SUBMENU_DIRECTIONS   = ["right", "down", "up", "left"] as const;
const SUBMENU_MODES        = ["flyout", "accordion"] as const;

// EVERY new key MUST join its reject-unknown allowlist + exactly ONE value partition
// (fail-closed READ TRAP ⇒ round-trip test each):
//  linkAlign        → NAV_LEVEL_STYLE_KEYS (@638-673)
//                     + NAV_LEVEL_STYLE_ENUM_FIELDS (@850-855, ["linkAlign", NAV_LINK_ALIGNS])
//                     + NAV_LEVEL_STYLE_COMPARE_KEYS (menuDocumentCss.ts @840-874) [508-02]
//                     + NAV_CHROME_DEFAULTS (@731-741, linkAlign: "left") — the level-agnostic
//                       HINT provider (NAV_CHROME_DEFAULTS is not chrome-only): resolveNavKeyTheme
//                       Default's hasOwnProperty branch @2266 returns {value:"left","Default (Left)"}
//                       for levels 1/2. Without it linkAlign falls through to {undefined,"Not set"}
//                       @2277 and the seg hint HIDES — breaks 508-05 tests 241/279 + smoke-4.
//                       Hint/thumb-only: NAV_CHROME_DEFAULTS is never read by emission ⇒ byte-safe.
//  submenuDirection → NAV_CHROME_KEYS (@923-941)
//                     + NAV_CHROME_ENUM_FIELDS (@952-955, ["submenuDirection", SUBMENU_DIRECTIONS])
//                     + NAV_CHROME_DEFAULTS (@731-741, submenuDirection: "down")
//                     — BASE-ONLY structural key: NOT added to NAV_CHROME_COMPARE_KEYS (no
//                       tablet-delta emitter; a per-device override would be dead data)
//  submenuMode      → NAV_CHROME_KEYS + NAV_CHROME_ENUM_FIELDS (["submenuMode", SUBMENU_MODES])
//                     + NAV_CHROME_DEFAULTS (submenuMode: "flyout")
//                     — BASE-ONLY structural key: NOT added to NAV_CHROME_COMPARE_KEYS
// A key added to *_KEYS WITHOUT a value partition is silently dropped (comment @654-655).

// ---- R1(a): fix the misleading dropdown-container default hints ----
// Mirror the base sheet (siteShellCss.ts:151) — do NOT edit siteShellCss.ts:
const MENU_SHELL_SUBLIST_MIN_WIDTH = 180;   // .site-nav-sublist{min-width:180px}
const MENU_SHELL_SUBLIST_PADDING   = 6;     // .site-nav-sublist{padding:6px}

// In resolveNavKeyThemeDefault (@2241-2277) add explicit branches BEFORE the terminal:
//   minWidth          → { value: 180, sourceLabel: "Default 180px" }
//   containerPaddingX → { value: 6,   sourceLabel: "Default 6px" }
//   containerPaddingY → { value: 6,   sourceLabel: "Default 6px" }
// AND remove containerPaddingX/containerPaddingY from
//   MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS (@2205-2211) so they hit the new branches
//   instead of "Not applied". KEEP navPillRadius/navPillPaddingX/navPillPaddingY gated
//   (the level-0 pill genuinely has no base-sheet default).
// This changes ONLY the HINT + slider-thumb fallback (MenuDesignEditor @1517). It does
//   NOT change CSS emission — levelContainerDecls (@732-751) is present-only gated on
//   `s.minWidth != null` / `s.containerPaddingX != null`, reading the STORED value, so
//   no-override docs stay byte-identical.
//
// EMISSION-NUANCE FLAG (508-02 decides): levelContainerDecls (@747-749) completes an
//   UNAUTHORED padding axis to `0` (`?? 0`), NOT 6 — so once ONE axis is set, "Default 6px"
//   is honest only for the fully-unset state. RECOMMENDATION: keep the R1(a) fix HINT-ONLY
//   for byte discipline (the `?? 0` completion is unchanged); if 508-02 elects to switch the
//   fallback to `?? 6`, it is still no-override-byte-safe (rule only emits when X or Y is
//   set) but must be pinned in a golden test. Default: hint-only.
```

### 508-02 — CSS emission (all doc-scoped under `menuDocScope = [data-site-menu-doc="true"]` @163)

Reuse the existing anchored selector maps — do NOT invent new specificity:

```
LEVEL_LINK_SELECTORS      (menuDocumentCss.ts @494-497): level1/2 descendant-anchored link
LEVEL_CONTAINER_SELECTORS (@509-517): [2] = the anchored (0,5,0) form @516
  ".site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist"
first-dropdown (level 1) precise selector (0,4,0), beats dropdownRule's `.site-nav-sublist` (0,2,0):
  "${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist"
```

**R1(b) linkAlign (present-only, per-device, all-width):**
```
in levelLinkDecls (@702-715): s.linkAlign != null ? `text-align:${s.linkAlign}` : null
  → rides LEVEL_LINK_SELECTORS[lvl]; reaches mobile via the linkOnly path; per-device via
    collectLevelDeltaRules (@909). Add "linkAlign" to NAV_LEVEL_STYLE_COMPARE_KEYS
    (@840-874) or per-device deltas silently never emit (cross-subtask guard test #4).
```

**R2 robust flyout (REPLACE `flyoutAnimRule` @641-667; keep the `@642` early-return `[]`):**
```
Reuse the existing precise sub / openParent / shownSel selectors (@643-661). Replace the 3
returned rules (rest opacity/transform + shown + @starting-style) with the delayed-visibility
pattern (NO @starting-style, NO allow-discrete, NO `display` in the transition):

  rest  ${sub}{display:grid;visibility:hidden;opacity:0;
               [slide: transform:translateY(-6px);]
               transition:opacity ${dur}ms[,transform ${dur}ms],visibility 0s linear ${dur}ms}
  shown ${shownSel}{visibility:visible;opacity:1;[slide: transform:none;]
               transition:opacity ${dur}ms[,transform ${dur}ms],visibility 0s}
  (fade variant: drop `transform` from both decls and from the transition list)

Why correct + zero-JS-reachable:
  - `display:grid` in REST overrides navNestingRules' `.site-nav-sublist{display:none}` (@1040):
    rest spec 0,4,0 (L1)/0,5,0 (L2) beats 0,2,0 → box is always laid out (position:absolute
    @siteShellCss 157 ⇒ zero layout cost) ⇒ opacity/transform transitions actually run in
    EVERY engine.
  - `visibility:hidden` = reachability parity with display:none (non-focusable, non-clickable,
    a11y-hidden); :hover/:focus-within → visible → fully interactive. Keyboard path preserved
    (parent trigger focus fires :focus-within → sublist visible → its links focusable).
  - `visibility 0s linear ${dur}ms` on REST delays hide until after the fade/slide-out on
    close (the trick that makes CLOSE animate); `visibility 0s` on SHOWN = interactive frame 0.
  - navNestingRules (@1040/@1042) stays BYTE-IDENTICAL (its display:grid-on-hover is now
    redundant-but-harmless).

previewForceOpenLevel (@1250-1267) MUST also clear the new visibility:hidden — change both
force-open rules to `display:grid;visibility:visible;opacity:1;transform:none` (forceOpen is
appended LAST @1302 so it wins by source order). Without this the authoring canvas shows the
flyout hidden.

If submenuMode==="accordion": gate flyoutAnimRule OFF (skip it) — accordion is in-flow +
naturally visible; a fade/slide over static content is not requested.
```

**R3a submenuDirection (new emitter in `desktopShared`, reading `baseNavChrome`; present-only):**
```
When baseNavChrome?.submenuDirection is set, emit TWO rules (map down→bottom, up→top), each
resetting ALL FOUR offsets (mirror submenuPlacementRule @688-696):
  down  → left:0;top:100%;right:auto;bottom:auto
  up    → left:0;bottom:100%;top:auto;right:auto
  right → left:100%;top:0;right:auto;bottom:auto
  left  → right:100%;top:0;left:auto;bottom:auto
  rule A (level 1): the precise first-dropdown selector (0,4,0) above — supersedes
    dropdownRule/navNestingRules first-dropdown position when present.
  rule B (nested ≥2): the anchored (0,5,0) LEVEL_CONTAINER_SELECTORS[2] @516 — same selector
    submenuPlacementRule uses, ties the 504 reach, wins by source order.
Coexistence (keep 506/507 intact): submenuDirection UNSET ⇒ emit nothing ⇒ dropdownDirection
  + per-level submenuPlacement behave EXACTLY as today (byte-identity). Emit submenuDirection
  BEFORE submenuPlacementRule in desktopShared so a granular level-2 submenuPlacement still
  WINS over the global (document this precedence). ≥640-only (dropdowns don't exist <640) —
  emit in desktopShared reading baseNavChrome, NOT the mobile branch (mirror dropdownRule's
  desktop-only nature @324-325). BASE-ONLY like dropdownDirection: do NOT add submenuDirection
  to NAV_CHROME_COMPARE_KEYS — collectChromeDeltaRules re-runs navChromeRules, which emits no
  direction bytes, so a tablet override would be DEAD DATA. Tablet inherits the base direction
  via the desktopShared flatten.
```

**R3b accordion (new emitter in `desktopShared`, gated `baseNavChrome?.submenuMode==="accordion"`; present-only):**
```
Emit (flyout ⇒ ZERO of these bytes):
  1. vertical top bar   ${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}
       (identical decls to the orientation:vertical branch @245-246 — the coherent choice: a
        horizontal bar can't cohesively push a static sublist down; a vertical stack makes the
        whole menu ONE downward column)
  2. in-flow sublists   ${menuDocScope} .site-nav-sublist{position:static;box-shadow:none;border:0;min-width:0}
       (override the base sheet's position:absolute @siteShellCss 157 so sublists expand in
        place + push siblings/content down; drop floating chrome ⇒ one solid block)
  3. indent             ${menuDocScope} .site-nav-sublist{padding-left:16px}   (mirror mobile @171)
Reachability: do NOT touch navNestingRules 1040/1042 — the display:none→grid hover/focus-within
  reveal still expands in-flow (zero-JS). Accordion rules are ≥640-relevant but harmless <640
  (mobile is already a column) ⇒ emit in desktopShared reading baseNavChrome; mobile already
  collapses. BASE-ONLY like submenuDirection: submenuMode is NOT added to NAV_CHROME_COMPARE_KEYS
  (no tablet-delta emitter — the accordion gate is recomputed from the base doc so the flyoutAnim
  mutual-exclusion still reaches the tablet level-delta seam). previewForceOpenLevel already opens
  the chain ⇒ authoring shows the expansion.
```

### 508-04 — Editor wiring (control + default-hint data flow)

- **R1(a):** NO editor edit — the 508-01 `resolveNavKeyThemeDefault` fix auto-fixes BOTH the
  `ControlDefaultHint` (now renders "Default 180px"/"Default 6px" since `value !== undefined`,
  507 guard) AND the slider-thumb fallback (`resolved ?? providerValue ?? range.min` @1517).
- **R1(b) linkAlign:** attach a `seg("linkAlign", "Link alignment", LINK_ALIGN_OPTIONS,
  linkAlignLabels)` in `NavLevelControls` (`@1430+`), slotted near `minWidth`/`containerPadding`
  (`@1610-1620`). Levels 1/2 (dropdowns) are the target; skip navChrome/level-0 top-bar (not
  requested). `setLevel`/`ControlDefaultHint`/reset all key off `keyof NavLevelStyle`
  generically — no new plumbing.
- **R3a/R3b (BASE-ONLY, device-DEFINING):** `submenuDirection` + `submenuMode` live on
  `NavChromeStyle` (navChrome-global) but are **structural ≥640 axes with NO tablet-delta
  emitter**, so add two **unwrapped** `SegmentedControl`s in the LEVEL-0 navChrome control
  region (a "Submenu" group) rendered **base-only** — the SAME shape as `dropdownDirection`
  @2344 (NO `chromeControl` shell, NO `ControlDefaultHint`, NO badge/Reset, NO device fork).
  They always write the BASE `navChrome` regardless of the active device, so "everything opens
  down" / "accordion" is ONE obvious menu-level switch, NOT buried per level. Wire via a NEW
  base-only writer `setChromeBaseField` / `chromeBaseSeg` (508-04 §2) that hardcodes
  `device:"desktop"` and routes through `patchMenuNavChromeForDevice(current, target.id,
  "desktop", {[key]:value})` — writing the BASE `NavChromeStyle` record (NOT the device-forked
  `setChromeField` @1845, whose tablet/mobile override the CSS never reads, and NOT the
  `setNavBaseField` family @1785 which is `keyof NavItemsProps` and cannot write
  `NavChromeStyle` keys). Do NOT add these two keys to `NAV_CHROME_COMPARE_KEYS` (a tablet
  override would be dead data). Gate them OUT on mobile (`device !== "mobile"`, like
  `dropdownDirection`). Add option-label maps beside `submenuPlacementLabels` (`@327`) and
  `flyoutAnimationLabels` (`@321`).

---

## Hard Invariants (each a named guard in 508-05)

1. **Fail-closed READ-trap round-trips.** Every new key (`linkAlign`, `submenuDirection`,
   `submenuMode`) joins its reject-unknown allowlist (`NAV_LEVEL_STYLE_KEYS` /
   `NAV_CHROME_KEYS`) + exactly ONE value partition (enum) + a `NAV_CHROME_DEFAULTS` hint
   entry (`NAV_CHROME_DEFAULTS` is the level-agnostic hint provider, NOT a chrome-only structure
   — it supplies `submenuDirection`/`submenuMode` AND the level-1/2 `linkAlign` hint) + a per-key
   round-trip persistence test (write→normalize→re-read equals input; a stored-doc-carrying-the-key
   survives read). A forgotten key degrades EVERY stored doc carrying it to empty on read.
2. **`buildSiteShellCss(null)` byte-identical** — `tests/unit/pages/siteShellCss.test.ts` ZERO
   edits; `siteShellCss.ts` untouched (only its `180`/`6` consts are MIRRORED into the model,
   OUT of `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`). All new visuals emit only from the
   doc-scoped sheet.
3. **No-override docs byte-identical** — `tests/unit/site/menu-document-render.test.tsx`;
   present-only emission ⇒ zero new bytes when unauthored. R1(a) changes only hint/thumb, not
   emission. R2 keeps the `@642` early-return `[]` guard (the `display:none` path is untouched
   when `flyoutAnimation` is unset). R3a/R3b unset ⇒ ZERO direction/accordion bytes.
4. **ONE shared builder.** All new CSS via `buildMenuRuleSetsForDocument` (`@1079-1161`) so
   front `@media` (`buildMenuDocumentCss` @1176) + canvas flatten (`buildMenuDocumentPreviewCss`
   @1285) NEVER diverge. R2/R3a/R3b structural rules are ≥640-only → `desktopShared`; `linkAlign`
   is link-level all-width (`desktopShared` + mobile `linkOnly` @1138).
5. **Per-device cascade.** tablet+mobile each diff vs DESKTOP base; mobile NEVER inherits
   tablet. `linkAlign` is per-device and rides `collectLevelDeltaRules` (@909) — its
   `NAV_LEVEL_STYLE_COMPARE_KEYS` entry is mandatory. `submenuDirection`/`submenuMode` are
   **base-only** structural keys: they are NOT added to `NAV_CHROME_COMPARE_KEYS` and emit only
   from `baseNavChrome` in `desktopShared` (tablet inherits via the flatten); a per-device
   override would be dead data since `collectChromeDeltaRules` re-runs `navChromeRules`, which
   carries no direction/accordion bytes.
6. **Canvas force-open must reveal direction/accordion/animation while authoring** —
   `previewForceOpenLevel` (@1250) updated for the new `visibility:hidden` rest state (R2) and
   must not fight accordion's `position:static`.
7. **Keep ALL 504/505/506/507 behavior intact** — 507's top-bar-scoped level-0 indicator, the
   anchored (0,5,0) level-2 `submenuPlacement` specificity, B1–B5, `dropdownDirection`.
8. **NO `schemaVersion` bump; NO route/RBAC/endpoint/migration.**

**Deferred (state in changelog residuals):** JS-driven flyout edge-collision/flip;
click-to-open; mega-menu multi-column; mobile drawer.

---

## Acceptance Criteria (measured LIVE, not synthetic-only)

1. **Flyout PERCEPTIBLY animates.** With `flyoutAnimation:"fade"` (and `"slide"`), open a
   dropdown on the FRONT and canvas force-open and observe a REAL fade/slide reveal — sampling
   `getComputedStyle(sublist).opacity` mid-transition yields a FRACTIONAL value (not a snap),
   and the close animates too. Verified across menu positions (down/up/right/left).
2. **"Down everywhere" = one cohesive column.** Set `submenuDirection:"down"`; verify EVERY
   depth (level-1 first dropdown AND level-2/3+ nested) opens downward — a single cohesive
   downward column, not a right-flying stair. `up`/`right`/`left` likewise apply at all depths
   with exactly ONE anchored axis per rule (no double-anchor stretch).
3. **Accordion inline block.** Set `submenuMode:"accordion"`; verify the menu renders as ONE
   in-flow vertical stack (top bar becomes a column; sublists are `position:static`, indented,
   pushing siblings/content DOWN), stays keyboard-reachable (focus-within reveals in-flow), and
   a flyout-mode doc emits ZERO accordion bytes.
4. **Centered dropdown text.** Set `linkAlign:"center"` on a dropdown level; verify the link
   label is centered within the ≥180px container (`getComputedStyle(link).textAlign==="center"`),
   per-device and per-level, with no-override docs byte-identical.
5. **Correct container default hints.** With `minWidth`/`containerPaddingX`/`containerPaddingY`
   UNSET, the editor hint reads "Default 180px" / "Default 6px" (never `0`/`undefined`/hidden)
   and the slider thumb sits at 180 / 6.
6. **Byte-identity.** No-override menu CSS is byte-identical to pre-TASK-508;
   `buildSiteShellCss(null)` unchanged; front markup unchanged (no new class/aria).
7. Full gates green: `bun --cwd core lint`, `lint:types`, root `tsc -p tsconfig.json --noEmit`,
   `test:bun`, full vitest, `gates:coderso`.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure model/CSS/UI):**
- `tests/vitest/services/menu-document-v2.test.ts` — per-key round-trip persistence for
  `linkAlign` / `submenuDirection` / `submenuMode` (write→normalize→re-read; stored-doc-with-key
  survives read); reject-unknown KEY throws `MenuDocumentError`+path; fail-soft value OMIT on
  bad enum value; R1(a) `resolveMenuControlDefault` / `resolveNavKeyThemeDefault` returns
  `{value:180,"Default 180px"}` for `minWidth` and `{value:6,"Default 6px"}` for
  `containerPaddingX`/`containerPaddingY` (and that they are NO LONGER "Not applied"), while
  `navPillRadius`/`navPillPaddingX/Y` stay gated; `NAV_CHROME_DEFAULTS` hint entries for
  `submenuDirection`/`submenuMode`; prune-empty legacy byte-identity.
- `tests/vitest/site/menu-document-css.test.ts` — present-only ZERO-byte emission when unset;
  exact selector strings: `linkAlign` `text-align` on `LEVEL_LINK_SELECTORS[lvl]`; R2 rest rule
  carries `visibility:hidden;opacity:0` (+`transform:translateY(-6px)` for slide) AND shown
  carries `visibility:visible;opacity:1;transform:none` AND the transition lists
  `visibility 0s linear` — and NO `@starting-style`/`allow-discrete`/`display …ms` bytes; R3a
  `submenuDirection` two rules (level-1 precise selector + anchored (0,5,0)) with all-four-offset
  resets per direction; R3b accordion `flex-direction:column` + `position:static` + indent, and
  a flyout-mode doc emits ZERO accordion bytes; `previewForceOpenLevel` emits
  `visibility:visible`; mobile `linkOnly` split (linkAlign re-emits, structural rules ≥640-only);
  `linkAlign` per-device delta diff vs desktop; `submenuDirection`/`submenuMode` base-only (NOT
  in `NAV_CHROME_COMPARE_KEYS`, emit only from `baseNavChrome`, no tablet delta) + the compare-key
  coverage guard EXEMPTS these two structural keys.
- `tests/vitest/ui/menu-design-editor.test.tsx` — R1(a) hint renders "Default 180px"/"Default
  6px" under the unset container controls + thumb at 180/6; R1(b) `linkAlign` seg writes
  per-level + per-device (Desktop ⇒ base, Mobile ⇒ sparse override); R3a/R3b `submenuDirection`
  + `submenuMode` SegmentedControls in the level-0 panel write navChrome base; no
  setState-in-effect regressions.

**Bun lane (route/runtime menu suites):**
- `tests/integration/routes/menus.test.ts` — a `document` PATCH carrying the new fields persists
  per-key without dropping siblings; invalid payload 4xx's with `menu_document_invalid` + path.
- `tests/unit/site/menu-document-render.test.tsx` — front `@media` emission per field + canvas
  flatten parity; no-override byte-identity; front markup unchanged.
- `tests/unit/pages/siteShellCss.test.ts` — byte-identity guard changes by ZERO lines.

**SMOKE — owner mandate (authored in 508-05): ≥5 DISTINCT real-flow scenarios asserting VISIBLE
EFFECT (computed styles/geometry), not control presence.** Real-input playwright against the
running admin (`coderso-a.localhost:5173`) + front (`:3000`):

1. **PERCEPTIBLE flyout motion (the confirmed BUG fix).** Enable `flyoutAnimation:"fade"` then
   `"slide"` on a dropdown; hover to open and, mid-transition, sample
   `getComputedStyle(sublist).opacity` (or `.transform`) — assert a FRACTIONAL/intermediate
   value proving real interpolation (not a snap), and assert the CLOSE also animates (opacity
   ramps back down over `dur`ms via the delayed `visibility`). Assert the emitted rest rule
   carries `visibility:hidden;opacity:0` and shown carries `visibility:visible;opacity:1` — NOT
   merely that a transition string exists (the exact gap that let the 506 bug ship). Confirm
   keyboard focus-within still opens + the sublist is fully interactive.
2. **Unified direction — "everything opens DOWN" = one cohesive column.** Set
   `submenuDirection:"down"`; force-open levels 0/1/2 and assert on the FRONT + canvas that the
   level-1 first dropdown AND the level-2/3+ nested sublists ALL anchor downward
   (`top ≈ parent bottom`, `left ≈ parent left`), forming ONE cohesive vertical column with NO
   double-anchor stretch (the used `left` is NOT still `100%`, the used `bottom` is `auto`).
   Then flip to `up`, `right`, `left` and assert each direction applies at ALL depths with
   exactly one anchored axis per rule.
3. **Accordion cohesive block.** Set `submenuMode:"accordion"`; assert the top bar becomes a
   vertical column (`getComputedStyle(.site-nav-list).flexDirection==="column"`), sublists are
   `position:static` and indented, and expanding a group PUSHES the following siblings/content
   DOWN in flow (measure the sibling's `getBoundingClientRect().top` increases when the group is
   open) — one cohesive solid block (menu 0 → down, 1 → 2 → down). Confirm focus-within reveals
   in-flow (zero-JS) and that switching back to `flyout` restores overlays + emits ZERO
   accordion bytes.
4. **Centered dropdown text + correct container default hints.** Set `linkAlign:"center"` on a
   dropdown level and assert `getComputedStyle(link).textAlign==="center"` (label centered in the
   ≥180px container) on FRONT + canvas, per-device (mobile override diffs vs desktop). In the
   same pass, with the container controls UNSET assert the editor hint reads "Default 180px" /
   "Default 6px" and the thumbs sit at 180 / 6 (never `0`/`undefined`/hidden).
5. **Cross-device + publish→front parity.** Set direction/accordion/linkAlign on desktop,
   override `linkAlign` on mobile; at ≤639px the mobile override shows and the ≥640-only
   structural (direction/accordion) rules respect the split; ≥640px shows desktop; mobile never
   inherits tablet. Publish a fully-configured menu and assert the front render matches the
   canvas force-open at each depth (computed-style/geometry parity), and the unset container
   controls show the effective 180/6 default hints in the editor.

**Named guards:** fail-closed READ-trap round-trip per new key (`linkAlign`,
`submenuDirection`, `submenuMode`); `buildSiteShellCss(null)` ZERO-line diff; no-override
byte-identity; present-only ZERO-byte emission (flyout-mode doc = ZERO accordion/direction
bytes; unset `flyoutAnimation` = ZERO visibility bytes); R2 asserts the visibility/opacity
keyframe STATES (not a bare transition string) + NO `@starting-style`/`allow-discrete`; R3a
all-four-offset reset + the anchored (0,5,0) level-2 specificity preserved; R3b `position:static`
+ vertical stack + zero-JS reachability; ONE-shared-builder front/canvas parity;
`previewForceOpenLevel` `visibility:visible`; per-device mobile-never-inherits-tablet +
`linkOnly` split; R1(a) hint/thumb 180/6 (never `range.min`); 504/505/506/507 behavior intact;
NO `schemaVersion` bump.

---

## Documentation Updates Required

- `_docs/PAGE_MODEL.md` (menuDocumentV2 section) — the new `NavLevelStyle.linkAlign` +
  `NavChromeStyle.submenuDirection`/`submenuMode`, the base-sheet mirror consts + R1(a)
  default-hint fix, the robust `flyoutAnimRule` (visibility/opacity/transform) contract, and
  the R3a direction / R3b accordion CSS contract.
- `_docs/CONTENT_TYPES_SPEC.md` — link alignment, unified submenu direction (all depths incl.
  `up`), accordion inline mode (enums, present-only, per-device), and the corrected container
  default hints.
- `_docs/_CHANGELOG/` — a new entry (**next free number = 1217**; verify fresh at closure)
  listing TASK-508 + every closed leaf (508-01..05), the R1/R2/R3 decisions (navChrome home for
  direction+mode; visibility-based flyout; hint-only R1(a) vs `?? 6` completion choice), and the
  deferred residuals.
- `_docs/_TASKS/README.md` — parent + 5 child rows added to **To Do**; **Statistics** To Do +6;
  move to **Done** at closure.

---

## Deferred (state in changelog residuals)

JS-driven flyout edge-collision / edge-flip; click-to-open (vs hover/focus-within);
mega-menu multi-column layout; mobile drawer styling (drawer not rendered yet); per-level
(not nav-global) `submenuDirection` / `submenuMode`; level-0 top-bar link centering (not
requested).

---

## Affected Files (grounded)

- `core/services/menus/menuDocumentV2.ts` — `linkAlign` on `NavLevelStyle`;
  `submenuDirection` + `submenuMode` on `NavChromeStyle`; `NAV_LINK_ALIGNS` /
  `SUBMENU_DIRECTIONS` / `SUBMENU_MODES` enum arrays + allowlist (`NAV_LEVEL_STYLE_KEYS` /
  `NAV_CHROME_KEYS`) + enum-partition (`NAV_LEVEL_STYLE_ENUM_FIELDS` / `NAV_CHROME_ENUM_FIELDS`)
  + `NAV_CHROME_DEFAULTS` entries; the base-sheet mirror consts (`MENU_SHELL_SUBLIST_MIN_WIDTH`,
  `MENU_SHELL_SUBLIST_PADDING`); R1(a) `resolveNavKeyThemeDefault` branches for
  `minWidth`/`containerPaddingX`/`containerPaddingY` + removal of the latter two from
  `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`. (508-01)
- `core/site/menuDocumentCss.ts` — R1(b) `linkAlign` in `levelLinkDecls` +
  `NAV_LEVEL_STYLE_COMPARE_KEYS`; R2 robust `flyoutAnimRule` rewrite (visibility/opacity/transform,
  drop `@starting-style`/`allow-discrete`) + `previewForceOpenLevel` `visibility:visible`; R3a
  `submenuDirection` two-rule emitter (level-1 precise + anchored (0,5,0), all-four-offset
  resets) in `desktopShared`; R3b accordion emitter (vertical stack + `position:static` +
  indent) in `desktopShared`; `submenuDirection`/`submenuMode` are **base-only** (read from
  `baseNavChrome`, NOT added to `NAV_CHROME_COMPARE_KEYS`, no tablet delta); `linkAlign`
  per-device delta + `linkOnly` split; present-only zero-byte emission. (508-02)
- `core/site/siteShell.tsx` — expected ZERO changes; 508-03 asserts no new markup/class/aria +
  `buildSiteShellCss(null)` + no-override byte-identity (the recursive nav structure already
  supports every new field). (508-03)
- `core/admin/ui/menus/MenuDesignEditor.tsx` — R1(b) `linkAlign` per-level `seg`; R3a/R3b
  nav-global `submenuDirection` + `submenuMode` SegmentedControls in the level-0 nav-base panel;
  option-label maps; **R2 §2b — widen `forceOpenLevel` @2639-2640 so a Level-0 nav selection
  previews depth-1 (+ rewrite the @2634-2637 comment)**, and the
  `tests/vitest/ui/menu-design-editor.test.tsx:1755-1784` editor-test resync is split by
  byte-introducer (all anchors are lines in that TEST file, NOT this production file, whose
  1755-1784 is unrelated `setNavField` code; 508-04 owns the level-0 invert @1762 + depth-2
  re-string @1771-1773; **508-02** owns the L1/L2 `visibility:visible` fold-in
  @1768/@1777/@1780 — plus the depth-2 `toContain` @2196 in the SEPARATE "…styled sublist is
  revealed" test @2187-2201, i.e. FOUR force-open `toContain`s @1768/@1777/@1780 + @2196).
  R1(a)
  needs no editor edit (model fix auto-fixes hint + thumb). (508-04)
- tests + docs + changelog + board/Statistics. (508-05)
</content>
</invoke>
