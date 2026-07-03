# TASK-508-05: Menu Nesting Forms — Tests, Docs & Closure

# FileName: TASK-508-05-Menu-Nesting-Forms-Tests-Docs-Closure.md

**Priority:** High
**Category:** Testing / Documentation / Content (Menus) / Navigation / Site Shell / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-508-01 (model — `linkAlign` on `NavLevelStyle`; `submenuDirection` + `submenuMode` on `NavChromeStyle`; the base-sheet mirror consts `MENU_SHELL_SUBLIST_MIN_WIDTH=180` / `MENU_SHELL_SUBLIST_PADDING=6`; the R1(a) `resolveNavKeyThemeDefault` fix + removal of `containerPaddingX/Y` from `MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS`; all allowlist / enum-partition / `NAV_CHROME_DEFAULTS` extensions), TASK-508-02 (CSS — R1(b) `linkAlign` emission + `NAV_LEVEL_STYLE_COMPARE_KEYS`; R2 robust `flyoutAnimRule` rewrite + `previewForceOpenLevel` `visibility:visible`; R3a `submenuDirection` two-rule emitter + R3b accordion emitter, both **base-only** reading `baseNavChrome` — `NAV_CHROME_COMPARE_KEYS` UNCHANGED, no tablet delta for these two keys), TASK-508-03 (front & preview parity — expected ZERO `siteShell.tsx` changes + byte-identity pins), TASK-508-04 (editor — R1(b) `linkAlign` per-level `seg`; R3a/R3b nav-global `submenuDirection` + `submenuMode` SegmentedControls in the level-0 nav-base panel; option-label maps). Rides the existing validated `PATCH /menus/:id` write path.
**Status:** ⏳ To Do
**Parent Task:** TASK-508

---

## Overview

Closure of TASK-508: consolidate the full Vitest + Bun regression matrix for the
menu **nesting forms + flyout fix** program — R1 (dropdown-container default hints
`180`/`6` + per-level link `linkAlign` centering), R2 (the confirmed FLYOUT-ANIMATION
bug: replace the cosmetically-inert `display`/`allow-discrete`/`@starting-style`
reveal with a robust `visibility`+`opacity`+`transform` reveal that ACTUALLY
animates), R3a (unified nav-global `submenuDirection` `right|down|up|left` across ALL
nested depths) and R3b (nav-global `submenuMode` `flyout|accordion` inline in-flow
block) — then VERIFY and consolidate the guard tests the siblings land with their
code (the **fail-closed READ traps** for EVERY new allowlist key; the **byte-identity
pins** for `buildSiteShellCss(null)`, no-override menu docs on BOTH CSS builders), run
all gates, do the mandated **≥5-scenario real-input playwright smoke** (canvas + `:3000`
at 390px / 768px / 1280px, VISIBLE-effect assertions incl. PERCEPTIBLE flyout motion +
the accordion cohesive block + direction up/down/left/right + centered text + correct
container default hints), and close docs / changelog / board.

- **Goal:** every suite in §1/§2 green together; legacy menu documents provably
  untouched; `buildSiteShellCss(null)` byte-identity changes by **ZERO lines**;
  no-override menu docs byte-identical on BOTH CSS builders (front `@media` + canvas
  flatten); the R2 rest/shown keyframe STATES asserted (not a bare transition string —
  the exact gap that let the 506 flyout ship inert); changelog **1217** (1216 is the
  last used number — re-verify "next free" at closing time); README board + Statistics
  closed.
- **Out of scope:** new production behavior. 508-01/02/03/04 ship their own unit
  coverage (incl. the guard tests named below) with their code; this subtask
  **touches no production source** — it ADDS/EXTENDS the cross-cutting tests below
  (per-key round-trip persistence, R1(a) provider table, CSS emission goldens, route
  persistence, render byte-identity, front↔canvas parity, editor flow), VERIFIES the
  sibling-owned guard pins are present and green, verifies the whole matrix, and
  closes.

These test files EXIST already (verified against source 2026-07-03) — this subtask
**extends** them, it does not create parallel suites:

- `tests/vitest/services/menu-document-v2.test.ts` — normalizers, round-trip READ
  traps, per-device records, R1(a) provider (`resolveNavKeyThemeDefault`)
- `tests/vitest/site/menu-document-css.test.ts` (Bun-free) — pure-fn CSS emission
  goldens for `linkAlign` / flyout reveal / direction / accordion
- `tests/vitest/ui/menu-design-editor.test.tsx` — R1(a) hint, R1(b) `linkAlign` seg,
  R3a/R3b nav-global controls, device-fork, force-open threading
- `tests/vitest/site/siteShell.test.tsx` (Bun-free) — front resolver unit (expected
  ZERO new assertions if 508-03 confirms no markup change)
- `tests/unit/site/menu-document-render.test.tsx` (Bun) — emission + byte-identity +
  front↔canvas parity
- `tests/integration/routes/menus.test.ts` (Bun) — `PATCH /menus/:id` round-trip +
  reject-unknown 400 with `path`
- `tests/unit/pages/siteShellCss.test.ts` (Bun) — `buildSiteShellCss(null)`
  byte-identity pin — **UNTOUCHED, ZERO-line diff**

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration** — the document rides the existing validated
`PATCH /menus/:id` write path. `menuUpdateSchema.document` already accepts the
`{ type: ["object","null"] }` envelope with service-side strict validation
(`core/server/validation/menuSchemas.ts`), so the new `NavLevelStyle.linkAlign` and
the `NavChromeStyle.submenuDirection`/`submenuMode` fields arrive inside the EXISTING
envelope — NO schema change, NO new endpoint, NO RBAC rule; `menus.settings` is
freeform jsonb — NO migration. **No `menuDocumentV2` `schemaVersion` bump.** This
subtask's job is to **prove** the invariants with tests:

- **Reject-unknown write:** every new key added to a reject-unknown allowlist
  (`linkAlign` → `NAV_LEVEL_STYLE_KEYS` `menuDocumentV2.ts:638-673`;
  `submenuDirection`/`submenuMode` → `NAV_CHROME_KEYS` `:923-941`) throws
  `MenuDocumentError` with the offending `path`, and the route 4xx's
  `menu_document_invalid`. Schema-first: enums live in
  `core/services/menus/menuDocumentV2.ts`; new fields reuse the SAME
  `normalizeEnumLocal` over their value partitions (`NAV_LINK_ALIGNS`,
  `SUBMENU_DIRECTIONS`, `SUBMENU_MODES`) — raw stored input never reaches CSS. VALUES
  are fail-soft (bad enum value OMITTED, matching the file's value policy), KEYS
  reject-throw. A key added to `*_KEYS` WITHOUT a matching value partition
  (`NAV_LEVEL_STYLE_ENUM_FIELDS` `:850-855` / `NAV_CHROME_ENUM_FIELDS` `:952-955`) is
  silently dropped (comment `:654-655`) — each key needs BOTH.
- **Fail-closed read, CONSCIOUS blast radius:** each new key is a DELIBERATE
  extension of the fail-closed read allowlist — a forgotten key silently degrades
  EVERY saved doc carrying it to empty on read (the whole-doc degrade of
  `normalizeStoredMenuDocumentV2ForRead`). Each addition is covered by a **per-key
  round-trip identity test** (§1.1) so the trap is asserted, not discovered in
  production. A doc WITH an unknown key inside a styled/chrome record degrades the
  WHOLE stored document ⇒ default look — assert that designed behavior consciously.
- **Present-only emission.** A new field carries a resolution default only for the
  HINT (`NAV_CHROME_DEFAULTS` `:731-741`); it emits CSS bytes only when authored.
  `buildSiteShellCss(null)` byte-identical (`tests/unit/pages/siteShellCss.test.ts`
  ZERO edits; `siteShellCss.ts` untouched — only its `180`/`6` consts are MIRRORED
  into the model, OUT of `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`); no-override
  docs byte-identical (`tests/unit/site/menu-document-render.test.tsx`). R1(a) changes
  ONLY the hint + slider-thumb fallback, NOT emission (`levelContainerDecls`
  `:732-751` is present-only gated on the STORED value).
- **Deterministic contracts.** Sparse records, explicit clear + prune, NO
  auto-remove-on-equality. ALL new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet via the ONE shared
  `buildMenuRuleSetsForDocument` (front `@media` + canvas flatten never diverge); the
  base sheet is OVERRIDDEN from the doc scope by later source order, never edited. R2
  keeps the zero-JS hover/focus-within open + reachability via `visibility:hidden`
  (exact reachability parity with `display:none`; non-focusable, non-clickable,
  a11y-hidden) — NOT `allow-discrete`/`@starting-style` (dropped). R3b accordion keeps
  the untouched `display:none→grid` reveal (`navNestingRules:1040/1042`).

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with
the app's CSRF/session envelope; this task neither loosens nor adds an auth path.

---

## Single-writer + land order (this subtask lands LAST)

Strictly sequential; each lands green before the next opens. Single-writer map (from
the parent board):

1. **508-01** — sole writer of `core/services/menus/menuDocumentV2.ts`.
2. **508-02** — sole writer of `core/site/menuDocumentCss.ts`.
3. **508-03** — sole writer of `core/site/siteShell.tsx` (expected ZERO changes).
4. **508-04** — sole writer of `core/admin/ui/menus/MenuDesignEditor.tsx`.
5. **508-05 (this)** — tests + `_docs` + `README` ONLY. Touches NO production source.
   508-05 opens only after 508-01..04 are green (its CSS goldens + editor-flow tests
   consume all four siblings' shipped surface, and its smoke exercises the running
   admin + front).

**This subtask owns `_docs` + `README` only.** No production file has two owners.

---

## Implementation Pseudocode (test + closure matrix)

> Test-file line anchors below are the sibling-owned describes this subtask VERIFIES
> + extends; exact line numbers drift as siblings land — locate by `describe` name,
> not the number. **The full field/enum/selector shapes are normative in the PARENT**
> (`TASK-508_…md` §508-01 / §508-02); restated only where the test asserts an exact
> string.

### 0. Field inventory under test (every new allowlist key needs a round-trip)

```
Per-level (NavLevelStyle, levels 1/2) — NAV_LEVEL_STYLE_KEYS + NAV_LEVEL_STYLE_COMPARE_KEYS:
  R1(b)  linkAlign(enum left|center|right)   → NAV_LINK_ALIGNS ; NAV_CHROME_DEFAULTS linkAlign:"left" (level-agnostic hint provider for levels 1/2: the ONLY value-returning branch for linkAlign is resolveNavKeyThemeDefault's NAV_CHROME_DEFAULTS hasOwnProperty case @2266-2267 ⇒ {value:"left","Default (Left)"}; without it linkAlign falls through to {value:undefined,"Not set"} @2277 and the hint is hidden — breaks tests 241/279 + smoke-4. Hint/thumb-only: NAV_CHROME_DEFAULTS is never read by resolveMenuNavChrome/emission, so byte-identity-safe.)
Level-0 nav-global (navChrome sub-record) — NAV_CHROME_KEYS + NAV_CHROME_DEFAULTS (BASE-ONLY: NOT in NAV_CHROME_COMPARE_KEYS):
  R3a    submenuDirection(enum right|down|up|left) → SUBMENU_DIRECTIONS ; NAV_CHROME_DEFAULTS submenuDirection:"down"
  R3b    submenuMode(enum flyout|accordion)        → SUBMENU_MODES      ; NAV_CHROME_DEFAULTS submenuMode:"flyout"
New enum option arrays (fresh `as const`, mirror SUBMENU_PLACEMENTS @707):
  NAV_LINK_ALIGNS=["left","center","right"]  SUBMENU_DIRECTIONS=["right","down","up","left"]  SUBMENU_MODES=["flyout","accordion"]
Base-sheet mirror consts (mirror siteShellCss.ts:151 — do NOT edit siteShellCss.ts):
  MENU_SHELL_SUBLIST_MIN_WIDTH=180   MENU_SHELL_SUBLIST_PADDING=6
R1(a) provider fix (resolveNavKeyThemeDefault @2241-2277):
  minWidth ⇒ {value:180,"Default 180px"}   containerPaddingX/Y ⇒ {value:6,"Default 6px"}
  + remove containerPaddingX/Y from MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS @2205-2211
  + KEEP navPillRadius/navPillPaddingX/navPillPaddingY gated (level-0 pill has no base-sheet default)
```

### 1. Vitest lane — Bun-free services/UI (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/services/menu-document-v2.test.ts` — new describes

(The write-strict / fail-closed / per-device / provider matrices below are OWNED by
508-01 and land with its code — restated here as the verification checklist; this
subtask fills any gap found at closure and adds the cross-cutting round-trip identity
pins.)

```ts
// Fixtures (module-scope helpers, reuse the suite's existing doc builders):
const legacyNavDoc = () => validMenuBarDoc();          // no navChrome, no linkAlign
const levelAlignDoc = () => withNavProps({
  levelStyles: { 1: { linkAlign: "center" }, 2: { linkAlign: "right" } },
});
const navChromeFormsDoc = () => withNavProps({          // nav-global R3a/R3b home
  navChrome: { submenuDirection: "down", submenuMode: "accordion" },
});
const perDeviceAlignDoc = () => ({                      // linkAlign override on tablet + mobile
  ...levelAlignDoc(),
  sections: [{ ...section,
    responsive: {
      mobile: { navProps: { levelStyles: { 1: { linkAlign: "left" } } } },   // LINK-partition ⇒ re-emits at mobile
      tablet: { navProps: { levelStyles: { 1: { linkAlign: "right" } } } },
    } }],
});

describe("normalizeNavLevelStyle — linkAlign accept / reject / sparse / prune", () => {
  test("accepts linkAlign on levels 1 and 2; sparse (present keys only)", () => {});
  test("linkAlign enum ∈ {left,center,right} — invalid value OMITTED (fail-soft), NOT thrown", () => {
    // { linkAlign: "middle" } ⇒ key omitted, doc still valid; only an unknown KEY throws.
  });
  test("reject-unknown per-level style key throws MenuDocumentError with path ...blocks[N].props.levelStyles.1.<key>", () => {
    // BASE levelStyles lives at blocks[N].props.levelStyles (nav-items block props) — NOT `.navProps.`;
    // the `.navProps.` prefix is correct ONLY for the per-device path
    // sections[N].responsive.{device}.navProps.levelStyles.
  });
  test("empty / all-invalid per-level record pruned to undefined; empty levelStyles ⇒ omit member (byte-identity for docs without linkAlign)", () => {});
});

describe("normalizeNavChrome — submenuDirection + submenuMode accept / reject / sparse / prune", () => {
  test("accepts submenuDirection ∈ {right,down,up,left} + submenuMode ∈ {flyout,accordion}; sparse", () => {});
  test("invalid enum value OMITTED fail-soft (submenuDirection:'sideways' / submenuMode:'drawer' dropped), doc still valid", () => {});
  test("reject-unknown NAV_CHROME_KEYS key throws with path ...blocks[N].props.navChrome.<key>", () => {});
  test("empty navChrome pruned ⇒ omit member; a doc WITHOUT navChrome returns the bare base (legacy byte-identity, no injected navChrome:{})", () => {});
});

describe("menuDocumentV2 fail-closed READ traps (CONSCIOUS blast radius — one per new key)", () => {
  test("legacy nav doc (no new fields) round-trips byte-unchanged — deep-equal, no injected keys", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(legacyNavDoc())).toEqual(legacyNavDoc());
  });
  test("linkAlign survives a normalize round-trip verbatim on levels 1 AND 2 — proves linkAlign ∈ NAV_LEVEL_STYLE_KEYS", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(levelAlignDoc())).toEqual(levelAlignDoc());
  });
  test("submenuDirection + submenuMode survive a normalize round-trip verbatim — proves each ∈ NAV_CHROME_KEYS", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(navChromeFormsDoc())).toEqual(navChromeFormsDoc());
    // Table-drive one case per key so a single forgotten allowlist entry fails a NAMED test.
  });
  test("an unknown key INSIDE a stored levelStyles record degrades the WHOLE stored document to empty — designed blast radius", () => {
    // stored: levelAlignDoc() with levelStyles.1.bogus = 1
    expect(normalizeStoredMenuDocumentV2ForRead(stored).sections).toEqual([]); // whole doc ⇒ legacy look
  });
  test("an unknown key INSIDE navChrome degrades the WHOLE stored document to empty", () => {});
});

describe("R1(a) resolveMenuControlDefault / resolveNavKeyThemeDefault — real container defaults", () => {
  test("minWidth (unset) ⇒ { value: 180, sourceLabel: 'Default 180px' } — was { undefined, 'Not set' }", () => {});
  test("containerPaddingX (unset) ⇒ { value: 6, sourceLabel: 'Default 6px' } — was { undefined, 'Not applied' }", () => {});
  test("containerPaddingY (unset) ⇒ { value: 6, sourceLabel: 'Default 6px' }", () => {});
  test("containerPaddingX / containerPaddingY are NO LONGER in MENU_GATED_PRESENT_ONLY_NOT_APPLIED_KEYS (never resolve to 'Not applied')", () => {});
  test("navPillRadius / navPillPaddingX / navPillPaddingY STAY gated → { undefined, 'Not applied' } (the level-0 pill genuinely has no base-sheet default)", () => {});
  test("the R1(a) provider change is HINT/THUMB-only — a doc with UNSET container fields still emits ZERO container bytes (levelContainerDecls reads the STORED value, present-only)", () => {});
});

describe("NAV_CHROME_DEFAULTS hint entries (R3a/R3b)", () => {
  test("submenuDirection unset ⇒ { value: 'down', sourceLabel: 'Default (Down)' } (hint only; unset still emits ZERO direction bytes)", () => {});
  test("submenuMode unset ⇒ { value: 'flyout', sourceLabel: 'Default (Flyout)' } (hint only; unset still emits ZERO accordion bytes)", () => {});
  test("linkAlign unset ⇒ resolves a { value:'left', sourceLabel:'Default (Left)' } (or the level-agnostic NAV_CHROME_DEFAULTS branch) so the seg hint renders", () => {});
});

describe("menuDocumentV2 per-device linkAlign overrides (sparse + prune)", () => {
  test("responsive.mobile / .tablet linkAlign records round-trip sparse verbatim", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(perDeviceAlignDoc())).toEqual(perDeviceAlignDoc());
  });
  test("reject-unknown inside a responsive level override throws with the responsive path", () => {});
  test("empty responsive records pruned on write, never persisted", () => {});
  test("resolve/patch/clear: mobile & tablet each inherit DESKTOP (Pages cascade); mobile does NOT inherit tablet; the responsive clear prunes the parent", () => {});
  test("NO auto-remove-on-equality: a mobile linkAlign override equal to the base KEEPS the record", () => {});
});
```

#### 1.2 `tests/vitest/services/normalize-menu-appearance.test.ts` — verify

```ts
// submenuDirection/submenuMode live on navChrome (NOT a MenuAppearance key) and
// linkAlign lives on NavLevelStyle ⇒ ASSERT the MenuAppearance surface is UNCHANGED
// (no new MENU_APPEARANCE_DEFAULTS / SHELL_APPEARANCE_DEFAULTS entry, no new isKnownField
// key). This keeps buildSiteShellCss(null) trivially byte-identical (the shell resolver
// never sees the new keys). 508 adds ZERO MenuAppearance churn.
```

#### 1.3 `tests/vitest/ui/menu-design-editor.test.tsx` — extend (R1 hint + R1(b) seg + R3 controls)

```ts
// Reuse the suite's mount + updateMenu-spy harness. All writes asserted via the
// PATCHed document, not internal state.

// R1(a) — corrected container default hints (NO editor edit; the 508-01 provider fix flows through):
test("R1(a): an UNSET minWidth slider shows <ControlDefaultHint data-menu-control-default> reading 'Default 180px' (the 507 value===undefined⇒null guard now passes) and the thumb sits at 180, NOT range.min (80)", () => {});
test("R1(a): UNSET containerPaddingX / containerPaddingY hints read 'Default 6px' and the thumbs sit at 6, NOT 0", () => {});
test("R1(a): the level-0 pill sliders (navPillRadius/PaddingX/PaddingY) still show NO hint (stay gated 'Not applied')", () => {});

// R1(b) — linkAlign per-level control:
test("R1(b): the linkAlign seg ('left'|'center'|'right') appears on Level 1 AND Level 2 (dropdown levels), near the Dropdown-container group, and writes props.levelStyles[N].linkAlign on Desktop", () => {});
test("R1(b): on Mobile the linkAlign seg writes a SPARSE responsive.mobile override (device-fork), NOT the base", () => {});
test("R1(b): the seg reads its default hint from resolveMenuControlDefault (Default (Left)) when unset; no hardcoded editor constant", () => {});

// R3a/R3b — nav-global controls in the LEVEL-0 nav-base panel:
test("R3a: the submenuDirection SegmentedControl ('right'|'down'|'up'|'left') appears ONLY in the Level-0 (nav-base) panel and writes navChrome.submenuDirection (base), NOT per level", () => {});
test("R3b: the submenuMode SegmentedControl ('flyout'|'accordion') appears in the Level-0 panel and writes navChrome.submenuMode (base)", () => {});
test("R3a/R3b hints resolve from NAV_CHROME_DEFAULTS ('Default (Down)' / 'Default (Flyout)') when unset via ControlDefaultHint level={0}", () => {});
test("no setState-in-effect: all R1(b)/R3a/R3b writes fire from event handlers (act() ⇒ no update warnings; console.error spy clean)", () => {});
```

#### 1.4 `tests/vitest/site/menu-document-css.test.ts` — VERIFY + extend (owned by 508-02)

Bun-free pure-function emission unit for `menuDocumentCss.ts` (the vitest-lane
companion to the Bun render/byte-identity suite in §2.2 — both green, different
layers). Selector anchors (verified fresh): `menuDocScope = [data-site-menu-doc="true"]`
`:163`; `LEVEL_LINK_SELECTORS` `:494-497`; `LEVEL_CONTAINER_SELECTORS[2]` (anchored
(0,5,0)) `:516`; the level-1 precise first-dropdown selector
`${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist` (0,4,0);
`flyoutAnimRule` (replaced) `:641-667`; `navNestingRules` `:1037-1052`
(`display:none` `:1040`, `:hover>…{display:grid}` `:1042`, hardcoded `left:100%`
`:1046`); `previewForceOpenLevel` `:1250-1267`; the orientation:vertical decls
`:245-246`; mobile indent `siteShellCss.ts:171`.

```ts
//  • PRESENT-ONLY: unauthored linkAlign / submenuDirection / submenuMode / flyoutAnimation
//      ⇒ null / ZERO strings for EVERY emitter. A flyout-mode (default) doc emits ZERO
//      accordion bytes; an unset-direction doc emits ZERO direction bytes; an unset
//      flyoutAnimation doc emits ZERO visibility bytes (early-return [] @642 preserved).
//
//  • R1(b) linkAlign — `text-align:${align}` folded into levelLinkDecls (@702-715), riding
//      LEVEL_LINK_SELECTORS[lvl]; assert center/right/left emit the exact decl; absent ⇒ null.
//      Requires "linkAlign" ∈ NAV_LEVEL_STYLE_COMPARE_KEYS (@840-874) or per-device deltas
//      never fire — assert a per-device linkAlign delta emits (cross-subtask guard test #4).
//
//  • R2 robust flyout reveal (the confirmed BUG fix) — assert the KEYFRAME STATES, not a bare
//      transition string (the exact gap that let the 506 flyout ship inert):
//      rest  ${sub}{display:grid;visibility:hidden;opacity:0; [slide:transform:translateY(-6px);]
//                   transition:opacity ${dur}ms[,transform ${dur}ms],visibility 0s linear ${dur}ms}
//      shown ${shownSel}{visibility:visible;opacity:1; [slide:transform:none;]
//                   transition:opacity ${dur}ms[,transform ${dur}ms],visibility 0s}
//      fade variant DROPS transform from both decls + the transition list.
//      ASSERT the sheet contains `visibility:hidden` + `opacity:0` (+`transform:translateY(-6px)`
//      for slide) at rest AND `visibility:visible` + `opacity:1` (+`transform:none` for slide) at
//      shown AND `visibility 0s linear` in the rest transition — and NO `@starting-style`,
//      NO `allow-discrete`, NO `display …ms` in ANY transition (those bytes are GONE).
//      navNestingRules (@1040/@1042) stays BYTE-IDENTICAL (its display:grid-on-hover now
//      redundant-but-harmless) — assert those two rule strings are unchanged.
//
//  • R2 previewForceOpenLevel (@1250-1267) — assert BOTH force-open rules now emit
//      `display:grid;visibility:visible;opacity:1;transform:none` (the added `visibility:visible`
//      clears the new rest state), on the (0,4,0) level-1 AND the anchored (0,5,0) level-2
//      selector; appended LAST (@1302) so it wins by source order.
//
//  • R3a submenuDirection — TWO rules, each resetting ALL FOUR offsets (mirror the
//      submenuPlacementRule discipline), emitted in desktopShared reading baseNavChrome:
//      rule A (level 1): `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist{…}` (0,4,0)
//      rule B (nested ≥2): the anchored (0,5,0) LEVEL_CONTAINER_SELECTORS[2] (@516)
//      map: down⇒left:0;top:100%;right:auto;bottom:auto  up⇒left:0;bottom:100%;top:auto;right:auto
//           right⇒left:100%;top:0;right:auto;bottom:auto  left⇒right:100%;top:0;left:auto;bottom:auto
//      Assert all four directions VERBATIM at BOTH depths with all-four-offset resets (no
//      double-anchor stretch: the used `left` is NOT still `100%` for `down`; the used
//      `bottom` is `auto`). Emitted BEFORE submenuPlacementRule so a granular level-2
//      submenuPlacement still WINS over the global (assert precedence + document it).
//      ≥640-only: NO direction rule in the mobile branch. submenuDirection is BASE-ONLY —
//      NOT in NAV_CHROME_COMPARE_KEYS, emitted only from baseNavChrome; tablet inherits via
//      the desktopShared flatten (no tablet-delta emitter exists, so a per-device override
//      would be dead data).
//
//  • R3a coexistence (keep 506/507 intact) — submenuDirection UNSET ⇒ dropdownRule
//      (@327-328, first-dropdown top|bottom) + navNestingRules hardcoded left:100% (@1046) +
//      submenuPlacementRule (@689-698) all emit EXACTLY as today (byte-identity).
//
//  • R3b accordion — gate baseNavChrome?.submenuMode==="accordion", emit in desktopShared
//      (present-only; flyout ⇒ ZERO of these bytes):
//      1. vertical stack   ${menuDocScope} .site-nav-list{flex-direction:column;align-items:stretch}
//                          (identical decls to the orientation:vertical branch @245-246)
//      2. in-flow sublists ${menuDocScope} .site-nav-sublist{position:static;box-shadow:none;border:0;min-width:0}
//                          (overrides the base sheet position:absolute @siteShellCss 157)
//      3. indent           ${menuDocScope} .site-nav-sublist{padding-left:16px}   (mirror mobile @171)
//      Assert all three VERBATIM; assert navNestingRules @1040/@1042 (the display toggle) is
//      NOT touched (zero-JS reachability intact). When submenuMode==="accordion", assert
//      flyoutAnimRule is GATED OFF (no visibility/opacity reveal over static content).
//
//  • MOBILE linkOnly split: linkAlign (link-level) re-emits at mobile via navLevelRules
//      ({linkOnly:true} @1138); the R2/R3a/R3b structural rules stay ≥640-only (desktopShared,
//      absent from the mobile branch).
//
//  • per-device collectLevelDeltaRules — a per-level linkAlign delta diffs vs DESKTOP; mobile != tablet
//      (REQUIRES linkAlign ∈ NAV_LEVEL_STYLE_COMPARE_KEYS @840-874, else the delta silently drops).
//  • base-only collectChromeDeltaRules — submenuDirection/submenuMode are NOT in
//      NAV_CHROME_COMPARE_KEYS: assert a tablet-authored submenuDirection/submenuMode produces
//      NO tablet delta bytes (base-only, no dead data), and assert the compare-key coverage
//      guard EXEMPTS these two structural keys (every OTHER NavChromeStyle field is present).
```

#### 1.5 `tests/vitest/site/siteShell.test.tsx` — VERIFY (owned by 508-03)

```ts
// 508 needs NO new front markup/class/aria — the recursive
// li.site-nav-item[data-site-nav-group] > (a.site-nav-link | span.site-nav-group-label[tabIndex=0])
// + nested ul.site-nav-sublist structure already supports linkAlign (text-align on the link),
// submenuDirection (position offsets), submenuMode (position:static + vertical stack), and the
// visibility-based flyout reveal. VERIFY the existing resolver describes stay green with ZERO
// edits; assert no new selector requires markup 508-03 didn't add.
```

### 2. Bun lane — route/runtime suites already covering menus

#### 2.1 `tests/integration/routes/menus.test.ts`

```ts
test("PATCH /menus/:id round-trips linkAlign + navChrome.submenuDirection + navChrome.submenuMode + responsive.{tablet,mobile} linkAlign deltas WITHOUT dropping appearance/extras (per-key merge)", () => {});
test("PATCH /menus/:id maps an invalid per-level key to a 400 menu_document_invalid ApiError with a path; store untouched", async () => {
  // Mirror the invalid-document precedent's try/catch shape at menus.test.ts:450:
  //   expect(apiError.code).toBe("menu_document_invalid");
  //   expect(apiError.status).toBe(400);                       // exactly 400, never 422
  //   expect(apiError.details).toEqual({ path: "document.sections[0].blocks[N].props.levelStyles.1.bogus" });
});
test("PATCH /menus/:id maps an invalid navChrome key (document...props.navChrome.bogus) to a 400 with the path; store untouched", () => {});
```

#### 2.2 `tests/unit/site/menu-document-render.test.tsx` (Bun)

```ts
// BYTE-IDENTITY PINS (OWNED by 508-02/03; this subtask VERIFIES + green):
test("no-override byte-identity: buildMenuDocumentCss(legacyDoc) === the pre-TASK-508 pinned sheet (absent linkAlign/direction/mode/animation ⇒ ZERO new bytes)", () => {});
test("buildMenuDocumentPreviewCss(legacyDoc, device) byte-identical to pre-TASK-508 for every device", () => {});

// EMISSION (folded into the shared builder, front @media + canvas parity):
test("R1(b) linkAlign emits text-align on the link (LEVEL_LINK_SELECTORS[lvl]) per level; absent ⇒ NO rule", () => {});
test("R2 flyout reveal emits rest visibility:hidden;opacity:0 (+translateY(-6px) for slide) AND shown visibility:visible;opacity:1;transform:none AND visibility 0s linear in the rest transition, with NO @starting-style / NO allow-discrete / NO `display …ms` byte; the display:none→grid toggle (@1040/@1042) is unchanged", () => {});
test("R3a submenuDirection emits TWO rules (level-1 precise (0,4,0) + anchored (0,5,0)) with all-four-offset resets per direction (down/up/right/left); unset ⇒ NO rule and dropdownDirection/submenuPlacement behave as pre-508", () => {});
test("R3b accordion emits flex-direction:column + position:static + padding-left:16px; a flyout-mode doc emits ZERO accordion bytes; the display toggle is untouched", () => {});

// PER-DEVICE + PARITY:
test("responsive.mobile linkAlign delta emits inside the mobile branch; responsive.tablet inside @media (min-width:640px) and (max-width:1023px); mobile does NOT inherit tablet", () => {});
test("R2/R3a/R3b structural rules are ≥640-only (desktopShared) — absent from the mobile branch; linkAlign (link-level) re-emits at mobile via linkOnly", () => {});
test("previewForceOpenLevel emits display:grid;visibility:visible;opacity:1;transform:none (the visibility:visible added for R2) on both the (0,4,0) and anchored (0,5,0) selectors", () => {});
test("every new rule appears in BOTH buildMenuDocumentCss and buildMenuDocumentPreviewCss (front @media + canvas flatten never diverge)", () => {});
test("all emitted new rules stay scoped under [data-site-menu-doc=\"true\"]; no UNSCOPED linkAlign/direction/accordion/reveal selector", () => {});
test("front markup UNCHANGED: no new class/aria on the rendered nav vs pre-TASK-508 (508-03)", () => {});
```

#### 2.3 `tests/unit/pages/siteShellCss.test.ts` (Bun)

```
NO edits. `git diff --stat` for this file must show ZERO lines; run it in the closure
checklist. `buildSiteShellCss(null)` byte-identity green — the base sheet stays
UNCHANGED; TASK-508 only OVERRIDES from the doc-scoped sheet by source order, and only
MIRRORS the 180/6 consts into the model.
```

### 3. Gates + real-input smoke

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit   # REPO ROOT — core lint:types does NOT typecheck tests/** (root tsconfig includes tests/**); this subtask's deliverable IS test code
bun run test:vitest                  # full vitest lane, log-clean (happy-dom)
bun run test:bun                     # REPO ROOT bun lane (DB gate — wizard-reset caveat). core has NO test:bun
bun run gates:coderso                # repo gate alias

# DEV-SERVER GOTCHA: Bun server code does NOT hot-reload — kill the stale `bun --eval`
# process and re-run coderso-dev-core-host BEFORE trusting admin-API responses; white
# admin page = server down. Verify the Soft-Violet admin theme is active
# (memory: local-cms-db-resettable). Full `bun test` resets the config wizard.
```

### 4. Closure

- **Changelog:** `_docs/_CHANGELOG/1217-2026-07-03-task-508-menu-nesting-forms-and-flyout-fix.md`
  (1216 is the last used number — RE-VERIFY "next free" at closing time; link TASK-508
  + all five subtasks). State explicitly: no new public endpoint, no RBAC change, no
  migration (`document` rides `PATCH /menus/:id`, `menuSchemas.ts` unchanged); no
  `menuDocumentV2` `schemaVersion` bump; the R1/R2/R3 decisions — **navChrome** home
  for `submenuDirection` + `submenuMode` (keeps `MenuAppearance` untouched ⇒
  `buildSiteShellCss(null)` trivially byte-identical); the **visibility+opacity+
  transform** flyout reveal replacing `allow-discrete`/`@starting-style`; the R1(a)
  hint-only fix (the `?? 0` padding completion left unchanged for byte discipline — OR,
  if 508-02 elected `?? 6`, record that choice + its golden); both byte-identity pins
  green + the per-key fail-closed READ-trap asserted for EVERY new allowlist key
  (whole-doc blast radius asserted). **Record deferred residuals honestly:** JS-driven
  flyout edge-collision / edge-flip; click-to-open (vs hover/focus-within); mega-menu
  multi-column; mobile-drawer styling (drawer not front-rendered yet); per-level (not
  nav-global) `submenuDirection`/`submenuMode`; level-0 top-bar link centering (not
  requested).
- **Permanent docs:**
  - `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 subsection: `NavLevelStyle.linkAlign`
    (enum, per-level, present-only, per-device); `NavChromeStyle.submenuDirection`
    (`right|down|up|left`, all depths, two-rule emitter on the (0,4,0) first-dropdown +
    anchored (0,5,0) nested, all-four-offset reset, coexistence precedence vs
    `dropdownDirection`/`submenuPlacement`) + `submenuMode` (`flyout|accordion`, inline
    in-flow `position:static` + vertical stack + indent) — BOTH **base-only** structural
    keys (like `dropdownDirection`: emitted from `baseNavChrome`, NOT in
    `NAV_CHROME_COMPARE_KEYS`, no per-device tablet delta); the base-sheet mirror consts +
    the R1(a) default-hint fix (`180`/`6`); the robust `flyoutAnimRule`
    (visibility/opacity/transform, `visibility 0s linear ${dur}ms` close delay,
    reachability parity) contract. Reiterate: all new CSS emits present-only from the
    doc-scoped sheet; base sheet untouched; ONE shared builder (front `@media` + canvas
    flatten never diverge).
  - `_docs/CONTENT_TYPES_SPEC.md` — the authoring surface: link alignment (per-device,
    per-level), unified submenu direction (all depths incl. `up`) and accordion inline
    mode (enums, present-only; both nav-global **base-only** — one switch drives every
    device ≥640, no per-device fork), and the corrected container default hints
    ("Default 180px" / "Default 6px").
- **Board:** flip TASK-508 + all five subtasks to ✅ Done in `_docs/_TASKS/README.md`
  board **+ Statistics** (closing agent only; single edit for board+stats). Do NOT edit
  the board in this authoring pass — closure only.

---

## Hard Invariants (each a named guard verified here)

1. **Fail-closed READ-trap round-trip per new key** — one NAMED round-trip test for
   EVERY new `NAV_LEVEL_STYLE_KEYS` (`linkAlign`) / `NAV_CHROME_KEYS`
   (`submenuDirection`, `submenuMode`) entry; each key present in BOTH its allowlist
   AND its value partition (`NAV_LEVEL_STYLE_ENUM_FIELDS` / `NAV_CHROME_ENUM_FIELDS`) —
   a key in `*_KEYS` without a partition is silently dropped. Plus the whole-doc-degrade
   assertion for a stored unknown-key doc.
2. **`buildSiteShellCss(null)` byte-identical** — `siteShellCss.test.ts` ZERO-line diff
   (verified via `git diff --stat`); `siteShellCss.ts` untouched (only its `180`/`6`
   consts MIRRORED into the model, OUT of `MenuAppearance`/`SHELL_APPEARANCE_DEFAULTS`).
3. **No-override docs byte-identical** on BOTH `buildMenuDocumentCss` and
   `buildMenuDocumentPreviewCss`; present-only zero-byte emission (flyout-mode doc =
   ZERO accordion/direction bytes; unset `flyoutAnimation` = ZERO visibility bytes).
   R1(a) changes only hint/thumb, NOT emission.
4. **R2 asserts the visibility/opacity keyframe STATES** (rest `visibility:hidden;
   opacity:0`, shown `visibility:visible;opacity:1`, `visibility 0s linear` on the rest
   transition) — NOT a bare transition string — AND that `@starting-style` /
   `allow-discrete` / `display …ms` are GONE; the `display:none→grid` toggle
   (`navNestingRules:1040/1042`) is byte-unchanged and zero-JS reachability preserved.
5. **R3a all-four-offset reset + the anchored (0,5,0) level-2 specificity preserved**;
   `submenuDirection` emitted BEFORE `submenuPlacementRule` so a granular level-2
   override still wins (precedence documented); unset ⇒ ZERO bytes ⇒ current split
   behavior (`dropdownDirection` + `submenuPlacement`) byte-identical.
6. **R3b `position:static` + vertical stack + indent + zero-JS reachability** (the
   `display:none→grid` reveal untouched); accordion + `flyoutAnimation` mutually
   exclusive in emission.
7. **ONE shared builder** — front `@media` + canvas flatten never diverge; R2/R3a/R3b
   structural rules ≥640-only (`desktopShared`), `linkAlign` all-width (`desktopShared`
   + mobile `linkOnly`).
8. **Per-device cascade (linkAlign) vs base-only (submenuDirection/submenuMode)** —
   `linkAlign` is per-device: tablet+mobile each diff vs DESKTOP, mobile NEVER inherits
   tablet, and `linkAlign` ∈ `NAV_LEVEL_STYLE_COMPARE_KEYS` (else its delta silently
   drops). `submenuDirection`/`submenuMode` are **base-only** structural keys: they are
   NOT in `NAV_CHROME_COMPARE_KEYS` and emit only from `baseNavChrome` (a tablet override
   would be dead data — no direction/accordion delta emitter exists); a named guard asserts
   a tablet-authored value produces NO delta bytes and that the compare-key coverage guard
   EXEMPTS these two keys.
9. **Canvas force-open reveals direction/accordion/animation while authoring** —
   `previewForceOpenLevel` updated for the new `visibility:hidden` rest state and does
   not fight accordion's `position:static`.
10. **Keep ALL 504/505/506/507 behavior intact** — 507's top-bar-scoped level-0
    indicator, the anchored (0,5,0) level-2 `submenuPlacement`, B1–B5,
    `dropdownDirection`.
11. **R1(a) hint/thumb 180/6** (never `range.min` 80/0) for the unset container
    controls; navPill* stay gated.
12. **NO `schemaVersion` bump; NO route/RBAC/endpoint/migration.**

**Deferred (state in changelog residuals):** JS-driven flyout edge-collision / edge-flip;
click-to-open; mega-menu multi-column; mobile-drawer styling; per-level (not nav-global)
`submenuDirection`/`submenuMode`; level-0 top-bar link centering.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):** §1.1–1.5 —
`tests/vitest/services/menu-document-v2.test.ts` (linkAlign/submenuDirection/submenuMode
normalizers + per-key round-trip READ traps + R1(a) provider table `{value:180,
"Default 180px"}` / `{value:6,"Default 6px"}` + `NAV_CHROME_DEFAULTS` hint entries +
per-device sparse/prune), `tests/vitest/services/normalize-menu-appearance.test.ts`
(assert NO new MenuAppearance surface), `tests/vitest/ui/menu-design-editor.test.tsx`
(R1(a) hint+thumb 180/6, R1(b) linkAlign seg per-level+per-device, R3a/R3b nav-global
controls in the level-0 panel, force-open threading, no setState-in-effect),
`tests/vitest/site/menu-document-css.test.ts` (508-02 pure-fn emission goldens:
linkAlign `text-align`; the R2 visibility/opacity keyframe states + NO
`@starting-style`/`allow-discrete`; R3a two rules with all-four-offset resets per
direction; R3b accordion static/vertical/indent; mobile `linkOnly` split; per-device
delta), `tests/vitest/site/siteShell.test.tsx` (front resolver unchanged). Full
`bun run test:vitest` green AND log-clean (console.error spy).

**Bun lane (route/runtime menu suites):** §2 —
`tests/integration/routes/menus.test.ts` (round-trip WITHOUT dropping appearance/extras
+ reject-unknown 400 with `path` for a per-level key AND a navChrome key),
`tests/unit/site/menu-document-render.test.tsx` (linkAlign/flyout-reveal/direction/
accordion emission, per-device deltas, front↔canvas parity, byte-identity pins,
`previewForceOpenLevel` `visibility:visible`, front markup unchanged),
`tests/unit/pages/siteShellCss.test.ts` (ZERO-line diff). Full root
`bun run test:bun` green.

**Byte-identity / reject-unknown / fail-closed guards named explicitly:**
- `buildSiteShellCss(null)` byte-identical — `siteShellCss.test.ts`, **ZERO edits,
  ZERO-line diff** (verified via `git diff --stat`).
- No-override menu docs byte-identical on BOTH CSS builders.
- **Per-key fail-closed READ-trap round-trip is MANDATORY** for every new allowlist key
  (`linkAlign`, `submenuDirection`, `submenuMode`) — a forgotten key silently degrades
  every saved doc carrying it. Whole-doc blast radius asserted consciously.
- Present-only zero-byte emission; all new CSS routed through the ONE
  `buildMenuRuleSetsForDocument`; R2 asserts the visibility/opacity keyframe STATES
  (not a bare transition string) + NO `@starting-style`/`allow-discrete`; R3a
  all-four-offset reset + anchored (0,5,0) level-2 specificity intact; R3b
  `position:static` + vertical stack + zero-JS reachability; per-device
  mobile-never-inherits-tablet + `linkOnly` split; R1(a) hint/thumb 180/6 (never
  `range.min`); 504/505/506/507 behavior intact; no `schemaVersion` bump.

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` must pass —
`bun --cwd core lint:types` (also what `gates:coderso` runs) covers core/ only and
EXCLUDES `tests/**`, which the root tsconfig includes (precedent: TASK-504-05 /
506-05 closure gates).

Plus gates + the real-input playwright smoke below — measured LIVE at real viewports,
not synthetic-only.

---

## SMOKE — ≥5 DISTINCT real-flow scenarios (owner mandate)

Run in the live admin canvas AND on the front (`:3000`) with `playwright-cli`
(memory: local-cms-run-and-test). Start `coderso-dev-core-host` if the admin page is
white/down; verify the Soft-Violet theme is active. Every assertion measures a
**VISIBLE EFFECT via computed styles / geometry** (`getComputedStyle`, bounding
boxes), **NOT control presence**. Author once, Save + Publish, then re-open the front.

1. **PERCEPTIBLE flyout motion (the confirmed BUG fix — fade AND slide).**
   Enable `flyoutAnimation:"fade"` on a dropdown; hover to open and, MID-TRANSITION,
   sample `getComputedStyle(sublist).opacity` — assert a FRACTIONAL/intermediate value
   (e.g. `0 < opacity < 1`) proving REAL interpolation (not a snap). Switch to
   `"slide"` and sample `.transform` mid-open — assert a non-`none`, non-final
   `translateY` between `-6px` and `0`. Assert the CLOSE also animates (opacity ramps
   back down over `dur`ms via the delayed `visibility`). Confirm keyboard
   `:focus-within` still OPENS the sublist and its links are fully interactive
   (tab into them). Assert the emitted sheet carries rest `visibility:hidden;opacity:0`
   and shown `visibility:visible;opacity:1` — NOT merely that a transition string exists
   (the exact gap that let the 506 bug ship). This scenario is the primary
   owner-reported bug; it must pass on the owner's real browser engine.

2. **Unified direction — "everything opens DOWN" = one cohesive column; then up/left/right.**
   Set `submenuDirection:"down"`; force-open levels 0/1/2 on the FRONT + canvas and
   assert the level-1 first dropdown AND the level-2/3+ nested sublists ALL anchor
   downward (each nested box `getBoundingClientRect().top ≈ parent bottom`,
   `left ≈ parent left`), forming ONE cohesive vertical column with NO double-anchor
   stretch (the used `left` is NOT still `100%`, the used `bottom` is `auto`). Then flip
   to `up` (nested boxes stack ABOVE parents, `bottom ≈ parent top`), `left`
   (right edge ≈ parent left) and `right` (left edge ≈ parent right) and assert each
   direction applies at ALL depths with exactly ONE anchored axis per rule. Confirm the
   granular level-2 `submenuPlacement` still WINS over the global (precedence).

3. **Accordion cohesive block — inline in-flow, pushes content DOWN.**
   Set `submenuMode:"accordion"`; assert the top bar becomes a vertical column
   (`getComputedStyle(.site-nav-list).flexDirection==="column"`), the sublists are
   `getComputedStyle(sublist).position==="static"` and indented, and expanding a group
   PUSHES the following sibling/content DOWN in flow (measure the sibling's
   `getBoundingClientRect().top` INCREASES when the group is open — a real in-flow
   occupancy, no absolute overlay) — one cohesive solid block (menu 0 → down, 1 → 2 →
   down). Confirm `:focus-within` reveals in-flow (zero-JS) and that switching back to
   `flyout` restores overlays (`position:absolute`) + the sheet emits ZERO accordion
   bytes.

4. **Centered dropdown text + correct container default hints.**
   Set `linkAlign:"center"` on a dropdown level and assert
   `getComputedStyle(link).textAlign==="center"` (label centered within the ≥180px
   container) on FRONT + canvas, per-device (a mobile override differs from desktop).
   In the SAME pass, with the container controls (`minWidth`/`containerPaddingX`/
   `containerPaddingY`) UNSET, assert the editor hint reads "Default 180px" /
   "Default 6px" (never `0`/`undefined`/hidden) and the slider thumbs sit at 180 / 6.

5. **Cross-device override + reset of a NEW field + publish→front parity.**
   Set `submenuDirection`/`submenuMode`/`linkAlign` on desktop; override `linkAlign` on
   Mobile (390px). Assert at 390px the mobile `linkAlign` shows and the ≥640-only
   structural (direction/accordion) rules respect the split (absent at 390px); at
   768px/1280px show desktop; Mobile does NOT inherit the Tablet value (Pages cascade:
   mobile ≠ tablet). RESET the mobile `linkAlign` override; assert the stored
   `responsive.mobile` record is pruned VERBATIM (GET `/menus/:id`) and the computed
   value reverts to the desktop base. Publish a fully-configured menu and assert the
   FRONT render matches the canvas force-open at each depth
   (computed-style/geometry parity).

Smoke passes only when every scenario's computed-style / geometry assertion holds at
390px + 768px + 1280px on BOTH the admin canvas force-open and the published front.
The R2 fractional-opacity/transform sample (scenario 1) is the mandated PERCEPTIBLE-
motion proof; the scenario-3 sibling `top` increase is the mandated accordion in-flow
proof — neither may be replaced by a bare CSS-string assertion.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry **1217** (1216 = last used; re-verify "next free" at closing
  time) — TASK-508 + all five subtask IDs; the navChrome home for direction+mode; the
  visibility-based flyout reveal; the R1(a) hint-only vs `?? 6` completion choice; both
  byte-identity pins + the per-key fail-closed READ-trap; deferred residuals recorded.
- `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 subsection: `NavLevelStyle.linkAlign`
  + `NavChromeStyle.submenuDirection`/`submenuMode`, the base-sheet mirror consts +
  R1(a) default-hint fix, the robust `flyoutAnimRule` (visibility/opacity/transform)
  contract, the R3a direction / R3b accordion CSS contract, present-only emission +
  doc-scope invariant.
- `_docs/CONTENT_TYPES_SPEC.md` — link alignment (per-device, per-level), unified submenu
  direction (all depths incl. `up`) + accordion inline mode (enums, present-only; both
  nav-global **base-only**, no per-device fork), and the corrected container default hints.
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only; NOT in
  this authoring pass).

---

## Acceptance Criteria (measured LIVE)

- Full Vitest (menu-document-v2 + normalize-menu-appearance + menu-design-editor +
  menu-document-css + siteShell) + Bun (menus routes + menu-document-render +
  siteShellCss) matrices green TOGETHER.
- Per-key fail-closed READ-trap round-trip green for EVERY new allowlist key
  (`linkAlign`, `submenuDirection`, `submenuMode`; whole-doc blast radius asserted);
  R1(a) provider table green (`{180,"Default 180px"}` / `{6,"Default 6px"}`;
  navPill* stay gated).
- Reject-unknown proven at the model (path-tagged `MenuDocumentError`) and the route
  (400 `menu_document_invalid` with `path`, store untouched) for a per-level key AND a
  navChrome key.
- CSS: exact selectors present-only + doc-scoped on BOTH builders (front↔canvas
  parity); linkAlign `text-align` on the link; R2 visibility/opacity keyframe states +
  NO `@starting-style`/`allow-discrete`; R3a two rules + all-four-offset resets +
  anchored (0,5,0) intact + `dropdownDirection`/`submenuPlacement` coexistence; R3b
  vertical stack + `position:static` + indent + zero-JS reachability; mobile `linkOnly`
  split; per-device delta vs desktop; `previewForceOpenLevel` `visibility:visible`.
- Byte-identity: `buildSiteShellCss(null)` ZERO-line diff; no-override menu docs
  byte-identical on both CSS builders; front markup unchanged (no new class/aria).
- Gates: `lint`, `lint:types`, root `tsc`, `test:vitest`, `test:bun`, `gates:coderso`
  green together; ≥5-scenario real-viewport playwright smoke green at 390px + 768px +
  1280px (VISIBLE-effect assertions incl. PERCEPTIBLE flyout motion + accordion in-flow
  push-down + direction up/down/left/right + centered text + correct 180/6 hints) on
  canvas AND front.
- No new route/RBAC/endpoint/migration; no `schemaVersion` bump; PAGE_MODEL.md +
  CONTENT_TYPES_SPEC.md + changelog 1217 + board/Statistics updated; deferred residuals
  recorded honestly.
</content>
</invoke>
