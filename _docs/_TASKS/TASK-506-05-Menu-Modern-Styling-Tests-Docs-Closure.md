# TASK-506-05: Menu Modern Styling — Tests, Docs & Closure

# FileName: TASK-506-05-Menu-Modern-Styling-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Testing / Documentation / Content (Menus) / Navigation / Site Shell / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-506-01 (model — F1 base-clear helpers, F2 resolved-default provider, the new `NavLevelStyle` fields + the level-0 `navChrome` sub-record + all allowlist / clamp-range / compare-key / normalizer-partition extensions), TASK-506-02 (CSS — B1 separators, B2 indicator/hover/lift/transition, B3 caret toggle/rotate + flyout animation, B4 pill + dropdown padding, B5 nested placement), TASK-506-03 (front & preview parity — expected ZERO `siteShell.tsx` changes + byte-identity pins), TASK-506-04 (editor — F1 reset-on-base, F2 default-hint, B1–B5 controls)
**Status:** ✅ Done
**Completed:** 2026-07-03 (changelog 1215)
**Parent Task:** TASK-506

---

## Overview

Closure of TASK-506: consolidate the full Vitest + Bun regression matrix for the
menu **modern styling** program — the two owner-reported UX foundations (F1
**base-record reset-to-default**, F2 **visible resolved-default / inherited-value
hint**) and the five owner-approved modern bundles (B1 item separators, B2 hover/
active underline indicator, B3 caret toggle + flyout animation, B4 pill nav +
dropdown padding, B5 nested submenu placement) — then VERIFY and consolidate the
guard tests the siblings land with their code (the **fail-closed READ traps** for
EVERY new allowlist key; the **byte-identity pins** for `buildSiteShellCss(null)`,
no-override menu docs, and the **F1 base-reset ⇒ never-had-it shape** round-trip),
run all gates, do the mandated **≥5-scenario real-input playwright smoke**
(canvas + `:3000` at 390px / 768px / 1280px, VISIBLE-effect assertions), and close
docs / changelog / board.

- **Goal:** every suite in §1/§2 green together; legacy menu documents provably
  untouched; `buildSiteShellCss(null)` byte-identity changes by **ZERO lines**;
  no-override menu docs byte-identical on BOTH CSS builders; **F1 base reset lands
  the doc byte-identical to a doc that never carried the value**; changelog
  **1215** (1214 is the last used number — re-verify "next free" at closing time);
  README board + Statistics closed.
- **Out of scope:** new production behavior. 506-01/02/03/04 ship their own unit
  coverage (incl. the guard tests named below) with their code; this subtask
  **touches no production source** — it ADDS/EXTENDS the cross-cutting tests below
  (per-key round-trip persistence, F1 base-reset byte-identity, F2 provider table,
  CSS emission goldens, route persistence, render byte-identity, front↔canvas
  parity, editor flow), VERIFIES the sibling-owned guard pins are present and
  green, verifies the whole matrix, and closes.

These 8 test files EXIST already (verified against source 2026-07-03) — this
subtask **extends** them, it does not create parallel suites:

- `tests/vitest/services/menu-document-v2.test.ts` — normalizers, round-trip read traps, per-device records, F1 base-clear, F2 provider
- `tests/vitest/services/normalize-menu-appearance.test.ts` — enum/clamp reuse assertions (only if Option A adds a MenuAppearance key; Option B ⇒ verify NO new MenuAppearance surface)
- `tests/vitest/ui/menu-design-editor.test.tsx` — F1 reset-on-base, F2 default-hint, B1–B5 controls, device-fork, force-open threading
- `tests/vitest/site/menu-document-css.test.ts` (Bun-free) — pure-fn CSS emission goldens for every bundle
- `tests/vitest/site/siteShell.test.tsx` (Bun-free) — front resolver unit (expected ZERO new assertions if 506-03 confirms no markup change)
- `tests/unit/site/menu-document-render.test.tsx` (Bun) — bundle emission + byte-identity + front↔canvas parity
- `tests/integration/routes/menus.test.ts` (Bun) — `PATCH /menus/:id` round-trip + reject-unknown 400 with `path`
- `tests/unit/pages/siteShellCss.test.ts` (Bun) — `buildSiteShellCss(null)` byte-identity pin — **UNTOUCHED, ZERO-line diff**

---

## Security Contract

**Scope: UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration** — the document rides the existing validated
`PATCH /menus/:id` write path. `menuUpdateSchema.document` already accepts the
`{ type: ["object","null"] }` envelope with service-side strict validation
(`core/server/validation/menuSchemas.ts`), so the new per-level `NavLevelStyle`
fields (B1/B2/B3/B4-container/B5), the level-0 `navChrome` sub-record (B1/B2/B3/B4
pill), and the F1/F2 model additions arrive inside the EXISTING envelope — NO
schema change, NO new endpoint, NO RBAC rule; `menus.settings` is freeform jsonb —
NO migration. **No `menuDocumentV2` `schemaVersion` bump.** This subtask's job is to
**prove** the invariants with tests:

- **Reject-unknown write:** every new key added to a reject-unknown allowlist
  (`NAV_LEVEL_STYLE_KEYS` `:565`; `NAV_CHROME_KEYS` under Option B, or
  `NAV_ITEMS_PROP_KEYS` `:121` + `MenuAppearance` under Option A) throws
  `MenuDocumentError` with the offending `path`, and the route 4xx's
  `menu_document_invalid`. Schema-first: enums + clamps + `normalize*` live in
  `core/services/menus/menuDocumentV2.ts`; new fields reuse the SAME
  `normalizeMenuColorValue` / `clampLocalNumber` over `NAV_LEVEL_NUMBER_RANGES`
  `:594` / `normalizeEnumLocal` / the NEW boolean partition — raw stored input
  never reaches CSS. VALUES are fail-soft (bad value/type OMITTED, matching the
  file's value policy `:625-631`), KEYS reject-throw.
- **Fail-closed read, CONSCIOUS blast radius:** each new key is a DELIBERATE
  extension of the fail-closed read allowlist — a forgotten key silently degrades
  EVERY saved doc carrying it to empty on read (the whole-doc degrade of
  `normalizeStoredMenuDocumentV2ForRead`). Each addition is covered by a
  **per-key round-trip identity test** (§1.1) so the trap is asserted, not
  discovered in production. A doc WITH an unknown key inside a styled record
  degrades the WHOLE stored document ⇒ default look — assert that designed
  behavior consciously.
- **Present-only emission:** a new field carries NO resolution default ⇒ emits
  nothing unless authored. `buildSiteShellCss(null)` byte-identical
  (`tests/unit/pages/siteShellCss.test.ts` ZERO edits, base sheet
  `siteShellCss.ts` untouched); no-override docs byte-identical
  (`tests/unit/site/menu-document-render.test.tsx`).
- **Deterministic contracts:** sparse records, explicit clear + prune, NO
  auto-remove-on-equality (asserted). ALL new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet via the ONE shared
  `buildMenuRuleSetsForDocument` (front `@media` + canvas flatten never diverge);
  the base sheet is OVERRIDDEN from the doc scope by later source order, never
  edited. B3 flyout animation keeps the zero-JS hover/focus-within open +
  reachability (`opacity`(+`transform`) reveal via `transition:…,display …ms
  allow-discrete` + `@starting-style`, layered over the `display:none→grid` toggle
  — allow-discrete makes the discrete flip participate; never a plain opacity
  transition that snaps on open; NO `visibility`).

No auth/nonce/HMAC/reCAPTCHA change: the write is already `content:write`-gated with
the app's CSRF/session envelope; this task neither loosens nor adds an auth path.

---

## Implementation Pseudocode (test + closure matrix)

> Test-file line anchors below are the sibling-owned describes this subtask
> VERIFIES + extends; exact line numbers drift as siblings land — locate by
> `describe` name, not the number. **The full field/clamp/selector shapes are
> normative in the PARENT** (`TASK-506_…md` §506-01 / §506-02); restated only
> where the test asserts an exact string.

### 0. Field inventory under test (every new allowlist key needs a round-trip)

```
Per-level (NavLevelStyle, levels 1/2) — NAV_LEVEL_STYLE_KEYS + NAV_LEVEL_STYLE_COMPARE_KEYS:
  B1  itemDividerShow(bool) itemDividerColor(color) itemDividerWidth(num 1..8) itemDividerStyle(enum solid|dashed|dotted)
  B2  indicator(enum none|underline|overline) indicatorColor(color) indicatorThickness(num 1..6) indicatorGrow(bool)
      hoverUnderline(bool) transitionMs(num 0..400) hoverLift(num 0..8)
  B3  showCaret(bool) caretRotateOnOpen(bool) flyoutAnimation(enum none|fade|slide)
  B4  containerPaddingX(num 0..40) containerPaddingY(num 0..32)
  B5  submenuPlacement(enum right|bottom|left)
Level-0 (navChrome sub-record, Option B recommended) — NAV_CHROME_KEYS:
  B4  navPillBackground(color) navPillRadius(num 0..40) navPillPaddingX(num 0..40) navPillPaddingY(num 0..32)
  level-0 variants of B1/B2/B3 (itemDivider*, indicator*, hoverUnderline, transitionMs, hoverLift, showCaret, caretRotateOnOpen)
  (NOTE: flyoutAnimation is levels-≥1 ONLY (NavLevelStyle 1/2) — NOT a NAV_CHROME_KEY; see 506-02 @425-440)
New NAV_LEVEL_NUMBER_RANGES entries: itemDividerWidth{1,8} indicatorThickness{1,6} transitionMs{0,400}
  hoverLift{0,8} containerPaddingX{0,40} containerPaddingY{0,32}
New NAV_CHROME_NUMBER_RANGES entries (SEPARATE exported table — level-0 pill bounds; 506-04 binds
  level-0 pill sliders from THIS table, NOT NAV_LEVEL_NUMBER_RANGES): navPillRadius{0,40} navPillPaddingX{0,40} navPillPaddingY{0,32}
New boolean partition (none exists today): itemDividerShow indicatorGrow hoverUnderline showCaret caretRotateOnOpen
New enum option arrays: solid|dashed|dotted, none|underline|overline, none|fade|slide, right|bottom|left
```

### 1. Vitest lane — Bun-free services/UI (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/services/menu-document-v2.test.ts` — new describes

(The write-strict / fail-closed / per-device / F1 / F2 matrices below are OWNED by
506-01 and land with its code — restated here as the verification checklist; this
subtask fills any gap found at closure and adds the cross-cutting round-trip
identity pins.)

```ts
// Fixtures (module-scope helpers, reuse the suite's existing doc builders):
const legacyNavDoc = () => validMenuBarDoc();          // no navChrome, no new level keys
const leveledModernDoc = () => withNavProps({
  levelStyles: {
    1: { itemDividerShow: true, itemDividerColor: "var(--color-border)", itemDividerWidth: 2,
         itemDividerStyle: "dashed", indicator: "underline", indicatorColor: "var(--color-accent)",
         indicatorThickness: 3, indicatorGrow: true, hoverUnderline: true, transitionMs: 180,
         hoverLift: 2, showCaret: false, caretRotateOnOpen: true, flyoutAnimation: "fade",
         containerPaddingX: 16, containerPaddingY: 12, submenuPlacement: "bottom" },
    2: { indicator: "overline", submenuPlacement: "left" },
  },
});
const navChromeDoc = () => withNavProps({                // Option B level-0 home
  navChrome: { navPillBackground: "var(--color-bg)", navPillRadius: 24, navPillPaddingX: 12,
               navPillPaddingY: 6, itemDividerShow: true, itemDividerWidth: 1,
               indicator: "underline", hoverLift: 3, showCaret: true },
               // NB: NO flyoutAnimation here — it is not a navChrome key; writing it would reject-unknown throw.
});
const perDeviceModernDoc = () => ({                      // level + LEVEL-0 chrome overrides on tablet + mobile
  ...leveledModernDoc(),
  sections: [{ ...section,
    responsive: {
      // navChrome deltas exercise the level-0 per-device path (responsive[bp].navProps.navChrome):
      //   mobile ⇒ a LINK-partition field (indicator, re-emits at mobile);
      //   tablet ⇒ a CONTAINER-partition field (navPillRadius, >=640-only).
      mobile: { navProps: { levelStyles: { 1: { indicatorColor: "var(--color-primary)" } },
                            navChrome: { indicator: "underline" } } },
      tablet: { navProps: { levelStyles: { 1: { transitionMs: 240 } },
                            navChrome: { navPillRadius: 32 } } },
    } }],
});

describe("normalizeNavLevelStyle — 506 modern fields accept / reject / sparse / prune", () => {
  test("accepts every new per-level field on levels 1 and 2; sparse (present keys only)", () => {});
  test("reject-unknown per-level style key throws MenuDocumentError with path ...blocks[N].props.levelStyles.1.<key>", () => {
    // typo `indicatorColour` ⇒ throws; assert error.path names the offending key.
    // BASE levelStyles lives at blocks[N].props.levelStyles (nav-items block props) — NOT `.navProps.`;
    // the `.navProps.` prefix is correct ONLY for the per-device path
    // sections[N].responsive.{device}.navProps.levelStyles.
  });
  test("NEW clamp ranges: itemDividerWidth [1,8], indicatorThickness [1,6], transitionMs [0,400], hoverLift [0,8], containerPaddingX [0,40], containerPaddingY [0,32]", () => {
    // width:99 ⇒ 8; width:0 ⇒ 1; indicatorThickness:0 ⇒ 1; transitionMs:9999 ⇒ 400; hoverLift:-5 ⇒ 0
  });
  test("NEW enum partitions: itemDividerStyle ∈ {solid,dashed,dotted}; indicator ∈ {none,underline,overline}; flyoutAnimation ∈ {none,fade,slide}; submenuPlacement ∈ {right,bottom,left} — invalid value OMITTED (fail-soft), NOT thrown", () => {
    // { indicator: "wiggle" } ⇒ key omitted, doc still valid; only an unknown KEY throws.
  });
  test("NEW boolean partition (none existed pre-506): itemDividerShow / indicatorGrow / hoverUnderline / showCaret / caretRotateOnOpen accept only typeof==='boolean'; a non-boolean (1, \"true\") is OMITTED fail-soft, not coerced", () => {});
  test("non-string color ⇒ omitted (fail-soft) for itemDividerColor/indicatorColor; url(javascript:x) rejected per normalizeMenuColorValue", () => {});
  test("empty / all-invalid per-level record pruned to undefined; empty levelStyles ⇒ omit member (byte-identity for docs without modern styling)", () => {});
});

describe("normalizeNavItemsProps navChrome sub-record (Option B level-0 home)", () => {
  test("navChrome split off before the flat scalar subset (mirrors levelStyles @385-389); accepts navPill* + level-0 B1/B2/B3 variants; sparse", () => {});
  test("reject-unknown NAV_CHROME_KEYS key throws with path ...blocks[N].props.navChrome.<key>", () => {});
  test("navPillRadius [0,40], navPillPaddingX [0,40], navPillPaddingY [0,32] clamp; enum/bool/color partitions match the per-level policy", () => {});
  test("empty navChrome pruned ⇒ omit member; a doc WITHOUT navChrome returns the bare base (legacy byte-identity, no injected navChrome:{} )", () => {});
  // If 506-01 instead picked Option A (level-0 via a NAV_LEVEL_STYLE_LEVELS "0" key or a
  // MenuAppearance key), REPLACE this describe with the Option-A round-trip + assert the
  // widened NavLevelStyleLevel/NAV_LEVEL_KEYS + the level-0 selector `.site-nav-link` — the
  // guard obligation (one round-trip per new allowlist key) is identical either way.
});

describe("menuDocumentV2 fail-closed READ traps (CONSCIOUS blast radius — one per new key)", () => {
  test("legacy nav doc (no modern fields) round-trips byte-unchanged — deep-equal, no injected keys", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(legacyNavDoc())).toEqual(legacyNavDoc());
  });
  test("every new NavLevelStyle key survives a normalize round-trip verbatim — proves each ∈ NAV_LEVEL_STYLE_KEYS", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(leveledModernDoc())).toEqual(leveledModernDoc());
    // Table-drive one case per key so a single forgotten allowlist entry fails a NAMED test,
    // not a blob deep-equal (a missing key would degrade the WHOLE doc — see below).
  });
  test("navChrome survives a normalize round-trip verbatim — proves each ∈ NAV_CHROME_KEYS", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(navChromeDoc())).toEqual(navChromeDoc());
  });
  test("an unknown key INSIDE a stored levelStyles record degrades the WHOLE stored document to empty — designed blast radius", () => {
    // stored: leveledModernDoc() with levelStyles.1.bogus = 1
    expect(normalizeStoredMenuDocumentV2ForRead(stored).sections).toEqual([]); // NOT partial — whole doc ⇒ legacy look
  });
  test("an unknown key INSIDE navChrome degrades the WHOLE stored document to empty", () => {});
});

describe("F1 base-clear helpers — reset to the exact no-override shape", () => {
  test("clearMenuNavLevelStyleBase(doc, id, 1, 'paddingX') removes the field, prunes empty level ⇒ levelStyles ⇒ navProps, and yields a doc byte-identical (toEqual) to one that NEVER had paddingX", () => {
    // = patchMenuNavLevelStyleForDevice(doc, id, "desktop", 1, { paddingX: undefined }) under the hood.
    const before = withNavProps({ levelStyles: { 1: { paddingX: 20 } } });
    const cleared = clearMenuNavLevelStyleBase(before, id, 1, "paddingX");
    expect(cleared).toEqual(validMenuBarDoc());  // never-had-it byte-identical shape
  });
  test("clearMenuNavLevelStyleBase clears a NEW 506 field (e.g. itemDividerWidth, submenuPlacement) back to never-had-it shape", () => {});
  test("clearMenuSectionBase(doc, id, 'navProps', 'linkPaddingX') deletes the level-0 scalar from the FIRST nav-items block props, leaving other props intact; empty props ⇒ legacy shape", () => {});
  test("clearMenuNavChromeBase(doc, id, 'navPillRadius') (or the generic base-prune over navChrome) removes the field + prunes empty navChrome ⇒ never-had-it shape", () => {});
  test("clearMenuBrandStyleBase(doc, id, 'fontSize') deletes the key from block.props.style, prunes empty style off props ⇒ byte-identical to a brand without style", () => {});
  test("base-clear is a NO-OP (returns an equal doc) when the field was never set — never throws, never injects an empty record", () => {});
  test("base-clear helpers are immutable — the input doc object is not mutated", () => {});
  test("MENU_NAV_DEVICE_DEFINING_KEYS (mobileMode/dropdownDirection) are EXCLUDED from base-reset — they carry resolution defaults and are not resettable-to-nothing", () => {});
});

describe("F2 resolveMenuControlDefault — { value, sourceLabel } table", () => {
  // Single model source of truth; editor never hardcodes defaults.
  test("level 1 unset numeric ⇒ { value: <resolved level-0/theme>, sourceLabel: 'Inherits level 0 (14px)' }", () => {});
  test("level 2 unset WITH level 1 SET ⇒ { value: <resolved level 1>, sourceLabel: 'Inherits level 1 (...)' } — FULL cascade walk surfaces level 1's resolved value (descendant-anchored cascade), NOT a jump to level 0", () => {});
  test("COMPOUND fall-through: level 2 unset WHILE level 1 is ALSO unset ⇒ walks PAST the undefined level 1 to { value: <resolved level-0/theme>, sourceLabel: 'Inherits level 0 (…)' } (or the theme/base default if level 0 is unset too) — NEVER 'Inherits level 1 (undefined)'; assert value equals the resolved level-0/theme number, not undefined", () => {});
  test("level 0 unset fontSize ⇒ { value: NAV_FONT_SIZE_INHERITED (16), sourceLabel: 'Inherited from theme (16px)' }", () => {});
  test("level 0 unset paddingX/paddingY ⇒ SHELL_DEFAULT_LINK_PX (12) / _PY (8), sourceLabel 'Default 12px' / 'Default 8px' — pulled from constants, NOT hardcoded", () => {});
  test("tablet/mobile unset ⇒ { value: <resolved desktop>, sourceLabel: 'Inherited from desktop' }", () => {});
  test("a SET field returns its own explicit value with an own-value source (no inherited label) — the hint only shows when the own record is unset", () => {});
  test("enum/color controls resolve a { value, sourceLabel } too (not just numeric) so every control can render the hint", () => {});
  test("UNSET NEW modern enum/bool fields resolve to their PRE-506 present-only CSS fallback — NOT 'none/off' — so the provider (never the editor) owns the default and the hint matches today's markup: submenuPlacement ⇒ { value: 'right', sourceLabel: 'Default (Right)' } (mirrors navNestingRules @707 always emitting left:100% when absent), showCaret ⇒ { value: true, sourceLabel: 'Default (On)' } (caret ::after @712 always emitted today), indicator ⇒ { value: 'none', sourceLabel: 'Default (None)' }, itemDividerShow ⇒ { value: false, sourceLabel: 'Default (Off)' } — pins the editor away from hardcoding 'Right (current)'/'On' and away from a misleading 'unset' hint that hides the Right default", () => {});
});

describe("menuDocumentV2 per-device modern overrides (sparse + prune)", () => {
  test("responsive.mobile / .tablet levelStyles modern-field records round-trip sparse verbatim", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(perDeviceModernDoc())).toEqual(perDeviceModernDoc());
  });
  test("responsive.{mobile,tablet} navChrome modern-field records round-trip sparse verbatim (level-0 per-device chrome persists) — proves responsive[bp].navProps.navChrome (506-01 patchMenuNavChromeForDevice / readMenuNavChromeOverrideValue) survives the read allowlist; a stored responsive navChrome record is not silently dropped", () => {
    // perDeviceModernDoc() carries navChrome on BOTH partitions (mobile.indicator link + tablet.navPillRadius container).
    expect(normalizeStoredMenuDocumentV2ForRead(perDeviceModernDoc()).sections[0].responsive)
      .toEqual(perDeviceModernDoc().sections[0].responsive);
  });
  test("reject-unknown inside a responsive level override (levelStyles OR navChrome) throws with the responsive path", () => {});
  test("empty responsive records pruned on write, never persisted", () => {});
  test("resolve/patch/clear: mobile & tablet each inherit DESKTOP (Pages cascade); mobile does NOT inherit tablet; the responsive clear prunes the parent", () => {});
  test("NO auto-remove-on-equality: a mobile modern-field override equal to the base KEEPS the record", () => {});
});
```

#### 1.2 `tests/vitest/services/normalize-menu-appearance.test.ts` — extend / verify

```ts
// Option B (recommended): navChrome is NOT a MenuAppearance key ⇒ ASSERT the
// MenuAppearance surface is UNCHANGED (no new MENU_APPEARANCE_DEFAULTS entry, no new
// isKnownField key) — 506 adds zero MenuAppearance churn.
// Option A only: assert the added MenuAppearance key's clamp/enum reuse here + its
// PRESENT-ONLY default (NOT seeded into MENU_APPEARANCE_DEFAULTS ⇒ resolves undefined ⇒
// zero bytes; the 'unauthored ⇒ zero bytes' assertion lives in menu-document-css.test.ts).
```

#### 1.3 `tests/vitest/ui/menu-design-editor.test.tsx` — extend (F1 reset + F2 hint + B1–B5 controls)

```ts
// Reuse the suite's mount + updateMenu-spy harness. All writes asserted via the
// PATCHed document, not internal state.

// F1 — base reset affordance:
test("F1: on DESKTOP with an explicit base value (e.g. level-1 paddingX), MenuResponsiveControlShell renders the Reset button (data-menu-responsive-reset) — the pre-506 build showed it ONLY for tablet/mobile overrides", () => {});
test("F1: clicking Reset on a desktop base control calls the base-clear (clearMenu*Base) and the PATCHed doc is byte-identical to the never-had-it shape; the control re-shows the resolved default; badge flips to Base-default", () => {});
test("F1: tablet/mobile Reset still prunes the responsive record (existing behavior unbroken); tooltip copy differs per branch ('Reset to default' on base vs 'Remove the {device} override…' on device)", () => {});
test("F1: hasBaseValue predicate is derived from the RAW own record (navBaseValue / levelBaseValue via readMenuNavLevelStyleBaseValue / brandBaseValue / layoutBaseValue), NOT the resolved value — an inherited-but-unset control shows NO Reset", () => {});

// F2 — default hint under every control:
test("F2: an UNSET numeric slider shows <ControlDefaultHint data-menu-control-default> with the resolved value+source (e.g. 'Inherited from theme (16px)', 'Inherits level 0 (14px)', 'Default 8px'), NOT the misleading range.min (0/80)", () => {});
test("F2: enum + color controls also render the hint when unset (generalized from the single pre-506 fontSize span :1644-1651)", () => {});
test("F2: the hint reads from resolveMenuControlDefault (model), never a hardcoded editor constant — a change to SHELL_DEFAULT_LINK_* flows through", () => {});

// B1–B5 controls:
test("B1 separator controls (show toggle / color swatch / width slider / style segmented) write props.levelStyles[N].itemDivider* on Desktop and a SPARSE responsive override on Mobile", () => {});
test("B2 indicator controls (indicator segmented / color / thickness slider / grow toggle / hoverUnderline toggle / transitionMs slider / hoverLift slider) write per-level + per-device", () => {});
test("B3 caret controls (showCaret toggle / caretRotateOnOpen toggle / flyoutAnimation segmented) write per-level parents", () => {});
test("B4 pill controls (navPillBackground/Radius/PaddingX/PaddingY) appear ONLY on the Level-0 (nav-base) panel and write navChrome; container padding (containerPaddingX/Y) appears on Level 1/2", () => {});
test("B5 submenuPlacement segmented (right|bottom|left) appears ONLY on Level 2 (never Level 1) and writes levelStyles[2].submenuPlacement — matching 02 reading baseLevelStyles?.[2] and emitting on LEVEL_CONTAINER_SELECTORS[2]", () => {});
test("selecting a level >=1 threads the selected level into MenuDocumentCanvas force-open (opens the FULL ancestor chain), so the author SEES the modern styling at depth; Level 0 clears it", () => {});
test("no setState-in-effect: all F1/F2/B1–B5 writes fire from event handlers (act() ⇒ no update warnings; console.error spy clean)", () => {});
```

#### 1.4 `tests/vitest/site/menu-document-css.test.ts` — VERIFY + extend (owned by 506-02)

Bun-free pure-function emission unit for `menuDocumentCss.ts` (the vitest-lane
companion to the Bun render/byte-identity suite in §2.2 — both green, different
layers). VERIFY these 506-02-owned describes exist + are green; this subtask
fills gaps, it does not re-author:

```ts
//  • PRESENT-ONLY: unauthored modern field ⇒ null / ZERO strings for EVERY bundle.
//  • B1 separators — ORIENTATION-AWARE exact strings:
//      level0 horizontal bar ⇒ `${scope} .site-nav-list > .site-nav-item:not(:last-child){border-inline-end:<w>px <style> <color>}`
//      level0 orientation:vertical ⇒ border-block-end instead (respects group-4 orientation)
//      dropdown level>=1 ⇒ `${scope} <LEVEL_DROPDOWN_ITEM_SELECTORS[lvl]>{border-block-end:<w>px <style> <color>}`
//        (level1 ⇒ `.site-nav-list > .site-nav-item > .site-nav-sublist > li:not(:last-child)` — the dedicated single-member map, NOT LEVEL_CONTAINER_SELECTORS[1] `> li`)
//      NOT collectMenuDividerRules (that is the standalone divider BLOCK) — a distinct emitter.
//  • B2 indicator — `<linkSel>::before{content:"";position:absolute;<bottom:0|top:0>;left:0;height:<t>px;width:100%;background:<c>;...}`
//      shown on `<linkSel>:hover::before` + `<linkSel>:where([aria-current="page"])::before{<grow?transform:scaleX(1):opacity:1>}`;
//      indicatorGrow ⇒ transform:scaleX(0)→scaleX(1) transition (non-grow ⇒ opacity:0→1); hoverUnderline ⇒ :hover{text-decoration:underline};
//      hoverLift ⇒ :hover{transform:translateY(-<lift>px)}; transitionMs ⇒ transition on color/background/transform.
//  • B3 caret — showCaret:false SUPPRESSES the `li[data-site-nav-group="true"]>.site-nav-link::after{content:" \25BE"}` rule
//      for that level (not add-from-scratch); caretRotateOnOpen ⇒ :hover/:focus-within ::after{transform:rotate(180deg)};
//      flyoutAnimation ⇒ rest `opacity:0`(+`transform:translateY(-6px)` for slide) + a shown `opacity:1`(+`transform:translateY(0)`)
//      revealed via `transition:opacity …ms(,transform …ms),display …ms allow-discrete` + a matching `@starting-style` block,
//      layered OVER the display:none→grid toggle @703 — the display toggle is NEVER replaced, and allow-discrete makes the discrete
//      flip participate so the OPEN reveal interpolates instead of snapping (reachability pin); NO `visibility`.
//  • B4 pill on `.site-nav-list` (base group/collector) + container padding on LEVEL_CONTAINER_SELECTORS[lvl] (>=640 channel).
//  • B5 nested placement — emitted on the ANCHORED (0,5,0) selector
//      `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`
//      right⇒left:100%;top:0  bottom⇒left:0;top:100%  left⇒right:100%;top:0 — assert the anchored form VERBATIM
//      (the short `.site-nav-sublist .site-nav-sublist` is REJECTED — it would lose the 504 specificity tie/win);
//      the base first-dropdown dropdownDirection(top|bottom) rule @325 stays present + working.
//  • MOBILE linkOnly split: B2 (link-level) re-emits at mobile; B1-dropdown-divider / B4 container padding / B4 pill
//      (container-level) stay >=640-only (navLevelRules({linkOnly:true}) @578/@682/@786).
//  • per-device collectLevelDeltaRules — per-LEVEL (1/2) modern-field delta diffs vs DESKTOP; mobile != tablet
//      (REQUIRES every new key ∈ NAV_LEVEL_STYLE_COMPARE_KEYS @620 — assert a per-device delta emits for a
//       representative field of each partition, else a forgotten compare key silently drops the delta).
//      EXCLUDE submenuPlacement from this collectLevelDeltaRules "representative field" test: it IS in
//      NAV_LEVEL_STYLE_COMPARE_KEYS @620 but is NOT emitted by collectLevelDeltaRules (its base rule is the
//      STANDALONE submenuPlacementRule appended to desktopShared @396, OUTSIDE navLevelRules — 506-02 @444-538),
//      so picking it as the enum/container representative here FALSE-FAILS (deltaLevelStyles flips true yet
//      navLevelRules re-emits no placement) — cover B5's tablet path via its dedicated delta test below instead.
//  • B5 submenuPlacement per-device (STANDALONE — NOT via collectLevelDeltaRules; the carve-out 506-02 flags as
//      its highest per-device fail risk @444-538/@677-713): a tablet-ONLY level-2 submenuPlacement override
//      (base level-2 placement different or unset) emits an actual placement REWRITE via submenuPlacementDeltaRule
//      INSIDE the @media(min-width:640) tablet block, on the anchored (0,5,0) selector
//      `${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` (== LEVEL_CONTAINER_SELECTORS[2]),
//      reflecting the tablet value (right⇒left:100%;top:0 …). Diff-gated: a tablet override IDENTICAL to base emits
//      ZERO placement bytes. >=640-ONLY: NO submenuPlacement rule appears in the mobile branch (never mobile).
//  • per-device collectChromeDeltaRules (NEW in 506-02, mirrors collectLevelDeltaRules) — LEVEL-0 navChrome
//      modern-field delta diffs vs DESKTOP off responsive[bp].navProps.navChrome; assert a per-device delta
//      emits for a representative level-0 field of EACH partition (e.g. tablet navPillRadius on the >=640
//      container channel, mobile indicator on the link channel) — REQUIRES every navChrome key ∈ the SEPARATE
//      506-02 navChrome compare list (NOT NAV_LEVEL_STYLE_COMPARE_KEYS); a forgotten navChrome compare key
//      SILENTLY DROPS every level-0 modern per-device delta (the exact fail-closed trap this closure asserts).
//  • buildMenuDocumentPreviewCss force-open (previewForceOpenLevel @894) additionally neutralizes B3 rest
//      state via `display:grid;opacity:1;transform:none` (NO `visibility`) so the animated flyout is VISIBLE on canvas; appended LAST.
```

#### 1.5 `tests/vitest/site/siteShell.test.tsx` — VERIFY (owned by 506-03)

```ts
// 506 needs NO new front markup/class/aria (every hook exists: li.site-nav-item,
// li[data-site-nav-group], a.site-nav-link, span.site-nav-group-label, nested
// ul.site-nav-sublist, [aria-current="page"], .site-nav-list, [data-menu-block-id]).
// VERIFY the existing normalizeNavPath / resolveMenuActiveHref / aria-current describes
// stay green with ZERO edits; assert no new selector requires markup 506-03 didn't add.
```

### 2. Bun lane — route/runtime suites already covering menus

#### 2.1 `tests/integration/routes/menus.test.ts`

```ts
test("PATCH /menus/:id round-trips the modern per-level fields + navChrome + responsive.{tablet,mobile} deltas WITHOUT dropping appearance/extras (per-key merge)", () => {});
test("PATCH /menus/:id maps an invalid per-level modern key to a 400 menu_document_invalid ApiError with a path; store untouched", async () => {
  // Mirror the invalid-document precedent's try/catch shape at menus.test.ts:450:
  //   expect(error).toBeInstanceOf(ApiError);
  //   expect(apiError.code).toBe("menu_document_invalid");
  //   expect(apiError.status).toBe(400);                       // exactly 400, never 422
  //   expect(apiError.details).toEqual({ path: "document.sections[0].blocks[N].props.levelStyles.1.bogus" });
  // (blocks are an index-addressed ARRAY with a literal `.props` field — no `.navProps` on the base path.)
});
test("PATCH /menus/:id maps an invalid navChrome key (document...props.navChrome.bogus) to a 400 with the path; store untouched", () => {});
```

#### 2.2 `tests/unit/site/menu-document-render.test.tsx` (Bun)

```ts
// BYTE-IDENTITY PINS (OWNED by 506-02/03; this subtask VERIFIES + green):
test("no-override byte-identity: buildMenuDocumentCss(legacyDoc) === the pre-TASK-506 pinned sheet (absent modern fields ⇒ ZERO new bytes)", () => {});
test("buildMenuDocumentPreviewCss(legacyDoc, device) byte-identical to pre-TASK-506 for every device", () => {});
// F1 BASE-RESET byte-identity (the #1 owner gap, asserted at the render layer too):
test("a doc with a base link paddingX, after clearMenu*Base, produces a CSS sheet byte-identical to the never-had-it sheet (base reset ⇒ default look restored)", () => {});

// BUNDLE EMISSION (folded into the shared builder, front @media + canvas parity):
test("B1 separators emit orientation-aware borders (vertical border-inline-end on the top bar, horizontal border-block-end in dropdowns) on li:not(:last-child); absent ⇒ NO rule", () => {});
test("B2 indicator emits a scoped ::before bar on the link + :hover + :where([aria-current=\"page\"]); indicatorGrow transform:scaleX(0)→scaleX(1) transition (non-grow ⇒ opacity:0→1); hoverLift/transition present-only", () => {});
test("B3 showCaret:false suppresses the caret ::after for that level; caretRotateOnOpen adds the 180deg rotate on :hover/:focus-within; flyoutAnimation emits all THREE parts — rest `opacity:0`(+`transform:translateY(-6px)` for slide), shown `opacity:1`, and a matching `@starting-style` block — with `transition:…,display …ms allow-discrete` and NO `visibility`, layered over (never removing) the display:none→grid open (reachability)", () => {});
test("B4 pill emits on .site-nav-list; dropdown container padding on the container selector (>=640-only, absent from mobile linkOnly branch)", () => {});
test("B5 nested placement emits on the anchored (0,5,0) selector, right|bottom|left mapping; the base dropdownDirection(top|bottom) rule is unchanged and still present", () => {});

// PER-DEVICE + PARITY:
test("responsive.mobile modern delta emits inside the mobile branch; responsive.tablet inside @media (min-width:640px) and (max-width:1023px); mobile does NOT inherit tablet", () => {});
test("B5 submenuPlacement per-device (STANDALONE, NOT collectLevelDeltaRules): a tablet-only level-2 submenuPlacement override (base level-2 placement different/unset) emits a placement REWRITE via submenuPlacementDeltaRule inside the @media(min-width:640) tablet block on the anchored (0,5,0) selector (.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist == LEVEL_CONTAINER_SELECTORS[2]) matching the tablet value; a tablet override IDENTICAL to base emits ZERO placement bytes (diff-gated); NO submenuPlacement rule appears in the mobile branch (>=640-only, never mobile). submenuPlacement is EXCLUDED as the collectLevelDeltaRules representative-field case to avoid the false-fail (it is in NAV_LEVEL_STYLE_COMPARE_KEYS @620 but navLevelRules never emits it — 506-02 @444-538/@677-713)", () => {});
test("responsive.{mobile,tablet} LEVEL-0 navChrome modern delta emits via collectChromeDeltaRules — a representative level-0 field per partition (tablet navPillRadius on the >=640 container channel, mobile indicator on the link channel) produces a per-device delta; a navChrome key MISSING from the 506-02 navChrome compare list silently drops it (mirrors the NAV_LEVEL_STYLE_COMPARE_KEYS silent-drop assertion, for the level-0 chrome path)", () => {});
test("every modern rule appears in BOTH buildMenuDocumentCss and buildMenuDocumentPreviewCss (front @media + canvas flatten never diverge)", () => {});
test("all emitted modern rules stay scoped under [data-site-menu-doc=\"true\"]; no UNSCOPED separator/indicator/caret/pill/placement selector", () => {});
test("front markup UNCHANGED: no new class/aria on the rendered nav vs pre-TASK-506 (506-03)", () => {});
```

#### 2.3 `tests/unit/pages/siteShellCss.test.ts` (Bun)

```
NO edits. `git diff --stat` for this file must show ZERO lines; run it in the
closure checklist. `buildSiteShellCss(null)` byte-identity green — the base sheet
stays UNCHANGED; TASK-506 only OVERRIDES from the doc-scoped sheet by source order.
```

### 3. Gates + real-input smoke

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit   # REPO ROOT — core lint:types does NOT typecheck tests/** (root tsconfig includes tests/**); this subtask's deliverable IS test code
bun run test:vitest                  # full vitest lane, log-clean (happy-dom)
bun run test:bun                     # REPO ROOT bun lane (DB gate — wizard-reset caveat). core has NO test:bun; do NOT substitute `bun --cwd core test`
bun run gates:coderso                # repo gate alias

# DEV-SERVER GOTCHA: Bun server code does NOT hot-reload — kill the stale
# `bun --eval` process and re-run coderso-dev-core-host BEFORE trusting admin-API
# responses; white admin page = server down. Verify the Soft-Violet admin theme is
# active (memory: local-cms-db-resettable). Full `bun test` resets the config wizard.
```

### 4. Closure

- **Changelog:** `_docs/_CHANGELOG/1215-2026-07-03-task-506-menu-modern-styling-reset-defaults-and-bundles.md`
  (1214 is the last used number — RE-VERIFY "next free" at closing time; link
  TASK-506 + all five subtasks). State explicitly: no new public endpoint, no RBAC
  change, no migration (`document` rides `PATCH /menus/:id`, `menuSchemas.ts`
  unchanged); no `menuDocumentV2` `schemaVersion` bump; the level-0 home choice
  (Option B `navChrome` — or Option A if 506-01 chose it); both byte-identity pins
  green (`buildSiteShellCss(null)` ZERO-line diff + no-override menu docs) PLUS the
  F1 base-reset ⇒ never-had-it byte-identity; per-key fail-closed READ-trap
  round-trip asserted for EVERY new allowlist key (whole-doc blast radius asserted).
  **Record deferred residuals honestly:** levels 3+ independent styling; custom
  font-family / line-height; icon/badge per item; mobile-drawer styling (drawer not
  front-rendered yet); JS-driven flyout collision / edge-flip; per-item (not
  per-level) separator/indicator overrides.
- **Permanent docs:**
  - `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 subsection: the new
    `NavLevelStyle` modern fields (B1–B5 per-level) with clamp ranges + enum vocab,
    the level-0 `navChrome` sub-record (Option B) or the `levelStyles` "0" extension
    (Option A), the F1 base-clear helpers (`clearMenu*Base`) + the "base reset ⇒
    byte-identical no-override shape" contract, the F2 `resolveMenuControlDefault`
    `{ value, sourceLabel }` provider + source rules, and the per-bundle CSS contract
    (orientation-aware separators; indicator `::before` on `:hover`/`[aria-current]`;
    caret toggle/rotate; flyout `opacity`(+`transform`) reveal via `display …ms allow-discrete` + `@starting-style` reachability; pill +
    dropdown padding; nested placement on the anchored (0,5,0) selector). Reiterate:
    all modern CSS emits present-only from the doc-scoped sheet; base sheet untouched.
  - `_docs/CONTENT_TYPES_SPEC.md` — the 5 modern bundles authoring surface (fields,
    clamp ranges, enums, orientation-aware separators, nested placement) + the F1
    base-reset ("Reset to default" on every control with an explicit own value) and
    F2 visible-default UX (resolved value + source under every unset control).
- **Board:** flip TASK-506 + all five subtasks to ✅ Done in `_docs/_TASKS/README.md`
  board **+ Statistics** (closing agent only; single edit for board+stats). Do NOT
  edit the board in this authoring pass — closure only.

---

## Hard Invariants (each a named guard verified here)

1. **Fail-closed READ-trap round-trip per new key** — one NAMED round-trip test for
   EVERY new `NAV_LEVEL_STYLE_KEYS` / `NAV_CHROME_KEYS` (or `NAV_ITEMS_PROP_KEYS` +
   `MenuAppearance` under Option A) entry; plus the whole-doc-degrade assertion for a
   stored unknown-key doc.
2. **`buildSiteShellCss(null)` byte-identical** — `siteShellCss.test.ts` ZERO-line
   diff (verified via `git diff --stat`); base sheet untouched.
3. **No-override docs byte-identical** on BOTH `buildMenuDocumentCss` and
   `buildMenuDocumentPreviewCss`; present-only zero-byte emission.
4. **F1 base reset ⇒ never-had-it byte-identity** — model round-trip + render-layer
   sheet equality per surface (level-0 scalar, per-level, navChrome, brand).
5. **ONE shared builder** — front `@media` + canvas flatten never diverge.
6. **Per-device cascade** — tablet+mobile diff vs DESKTOP; mobile NEVER inherits
   tablet; LINK-level fields re-emit at mobile, CONTAINER-level fields stay ≥640-only
   (`linkOnly`); every new per-level key ∈ `NAV_LEVEL_STYLE_COMPARE_KEYS`
   (`collectLevelDeltaRules`) AND every new level-0 key ∈ the SEPARATE 506-02
   `navChrome` compare list (`collectChromeDeltaRules`, over
   `responsive[bp].navProps.navChrome`) — else the per-device delta silently drops.
   **B5 `submenuPlacement` carve-out:** it is in `NAV_LEVEL_STYLE_COMPARE_KEYS` but is
   NOT emitted by `collectLevelDeltaRules` (its base rule is the standalone
   `submenuPlacementRule` outside `navLevelRules`), so its tablet delta rides the
   dedicated `submenuPlacementDeltaRule` (≥640-only, never mobile) — verified by its own
   named test (§1.4/§2.2), and EXCLUDED from the `collectLevelDeltaRules`
   representative-field test to avoid a false-fail.
7. **B5 preserves the anchored (0,5,0) level-2 container specificity + keeps
   `dropdownDirection` working.**
8. **B3 flyoutAnimation keeps the zero-JS hover/focus-within open + keyboard
   reachability** (an `opacity`(+`transform`) reveal via `transition:…,display …ms
   allow-discrete` + a matching `@starting-style` block, layered over the
   `display:none→grid` toggle so the discrete flip participates — never a plain
   opacity transition that snaps on open, and NO `visibility`) and
   does not fight canvas force-open.
9. **NO `schemaVersion` bump; NO route/RBAC/endpoint/migration.**

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):** §1.1–1.5 —
`tests/vitest/services/menu-document-v2.test.ts` (modern-field normalizers +
per-key round-trip READ traps + F1 base-clear byte-identity + F2 provider table +
per-device sparse/prune), `tests/vitest/services/normalize-menu-appearance.test.ts`
(assert NO new MenuAppearance surface under Option B; clamp/enum reuse under Option
A only), `tests/vitest/ui/menu-design-editor.test.tsx` (F1 reset-on-base, F2
default-hint under every control, B1–B5 controls, device-fork, force-open threading,
no setState-in-effect), `tests/vitest/site/menu-document-css.test.ts` (506-02 pure-fn
emission goldens per bundle, orientation-aware separators, caret suppress/rotate,
flyout reachability, B5 anchored selector, mobile linkOnly split, per-device delta),
`tests/vitest/site/siteShell.test.tsx` (front resolver unchanged). Full
`bun run test:vitest` green AND log-clean (console.error spy).

**Bun lane (route/runtime menu suites):** §2 —
`tests/integration/routes/menus.test.ts` (round-trip WITHOUT dropping
appearance/extras + reject-unknown 400 with `path` for a per-level key AND a
navChrome key), `tests/unit/site/menu-document-render.test.tsx` (per-bundle emission,
orientation-aware separators, indicator `::before`, caret toggle/rotate, flyout
reachability, pill+padding, B5 placement, per-device deltas, front↔canvas parity,
F1 base-reset sheet byte-identity, byte-identity pins, front markup unchanged),
`tests/unit/pages/siteShellCss.test.ts` (ZERO-line diff). Full root
`bun run test:bun` green.

**Byte-identity / reject-unknown / fail-closed guards named explicitly:**
- `buildSiteShellCss(null)` byte-identical — `siteShellCss.test.ts`, **ZERO edits,
  ZERO-line diff** (verified via `git diff --stat`).
- No-override menu docs byte-identical on BOTH CSS builders.
- **Per-key fail-closed READ-trap round-trip is MANDATORY** for every new allowlist
  key — a forgotten key silently degrades every saved doc carrying it. Whole-doc
  blast radius asserted consciously.
- **F1 base-reset byte-identity** — base reset lands the exact no-override shape
  (model + render layer).
- Present-only zero-byte emission; all new CSS routed through the ONE
  `buildMenuRuleSetsForDocument`; B5 (0,5,0) specificity + `dropdownDirection`
  intact; B3 reachability (no pure-display transition); per-device
  mobile-never-inherits-tablet + `linkOnly` split; no `schemaVersion` bump.

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` must pass —
`bun --cwd core lint:types` (also what `gates:coderso` runs) covers core/ only and
EXCLUDES `tests/**`, which the root tsconfig includes (precedent: TASK-504-05 /
501-04 closure gates).

Plus gates + the real-input playwright smoke below — measured LIVE at real
viewports, not synthetic-only.

---

## SMOKE — ≥5 DISTINCT real-flow scenarios (owner mandate)

Run in the live admin canvas AND on the front (`:3000`) with `playwright-cli`
(memory: local-cms-run-and-test). Start `coderso-dev-core-host` if the admin page is
white/down; verify the Soft-Violet theme is active. Every assertion measures a
**VISIBLE EFFECT via computed styles / geometry** (`getComputedStyle`, bounding
boxes), **NOT control presence**. Author once, Save + Publish, then re-open the front.

1. **Separators on level 0 + level 1 — orientation-aware, at the right depth.**
   Enable `itemDivider` (color + width + style) on level 0 AND level 1. On the FRONT:
   assert the top-bar `.site-nav-list > .site-nav-item:not(:last-child)` shows a
   VERTICAL divider (computed `border-inline-end-width` == authored px, matching
   `border-*-style`/`color`); HOVER to open the first dropdown and assert the dropdown
   `li:not(:last-child)` shows a HORIZONTAL divider (computed `border-block-end-width`).
   Confirm the two are on different axes (top bar vertical, dropdown horizontal).

2. **Underline indicator + hover-lift + transition — measured on hover and current-page.**
   Set `indicator:"underline"` + `indicatorColor` + `indicatorThickness` + `indicatorGrow`
   + `hoverLift` + `transitionMs` on level 0. On the front: measure the link `::before`
   bar geometry (height == thickness; positioned at the bottom); HOVER and assert the
   indicator width GROWS (bounding-box width increases) and the link `transform`
   translateY lifts, with a non-zero `transition-duration`. Navigate to the active page
   and assert the `aria-current="page"` link shows the indicator at full width while
   siblings do not.

3. **F1 base RESET restores the default + F2 default hint shows the effective number.**
   Author a DESKTOP-BASE link `paddingX` (level 0); assert the link computed `padding`
   changed from the base 12px. Read the F2 hint BEFORE editing (must read
   "Default 12px"). Click "Reset to default"; assert the computed padding RETURNS to
   the theme default AND GET `/menus/:id` returns a document byte-identical to the
   never-had-it shape (the field is gone, not zeroed). Confirm the F2 hint re-appears
   with the effective inherited number after reset.

4. **Submenu placement flip right→bottom→left — nested sublist geometry.**
   Style level 2 with `submenuPlacement`. On the front, open to level 2 via the real
   hover chain and measure the nested `.site-nav-sublist .site-nav-sublist` bounding
   box relative to its parent `li`: `right` ⇒ left edge ≈ parent right edge & top ≈
   parent top; `bottom` ⇒ top ≈ parent bottom edge & left ≈ parent left; `left` ⇒
   right edge ≈ parent left edge. Assert all three flips produce distinct measured
   positions, and the first-dropdown `dropdownDirection` (top|bottom) still works.
   **B5 per-device (the standalone submenuPlacementDeltaRule path — >=640-only):** add a
   TABLET-only level-2 `submenuPlacement` override that differs from the desktop base.
   At 768px measure the nested `.site-nav-sublist .site-nav-sublist` geometry and assert
   it reflects the TABLET value (distinct from the desktop-base position); at 390px assert
   the tablet flip is ABSENT — the mobile nested sublist keeps the desktop-base placement
   (submenuPlacement is never emitted in the mobile branch). Confirms the standalone
   tablet emitter fires where collectLevelDeltaRules would not.

5. **Caret toggle off + flyout animation + pill nav — measured.**
   Set `showCaret:false` (assert the group-parent link `::after` caret content is
   gone / zero width), `caretRotateOnOpen:true` (assert the caret `transform` rotates
   180° on hover where a caret exists), `flyoutAnimation:"fade"` (assert the opening
   sublist has a non-`none` computed `transition` on `opacity`(+`display` with
   `allow-discrete`) plus a matching `@starting-style` rule in the sheet — NO
   `visibility` — while remaining keyboard-reachable via `:focus-within`; the reveal is
   layered over the `display:none→grid` toggle, not a plain opacity transition that
   snaps on open), and a
   B4 pill (`navPillBackground` + `navPillRadius` + padding on `.site-nav-list`): assert
   the nav-list computed `background-color` / `border-radius` / `padding` match the
   authored values.

6. **Per-device override + reset of a NEW field across desktop/tablet/mobile.**
   Set a base indicator on desktop; override `indicatorColor` on Mobile (390px) and a
   different `transitionMs` on Tablet (768px). Assert at 390px the mobile indicator
   color DIFFERS from desktop; at 768px the tablet transition differs; at 1280px both
   match the desktop base (mobile/tablet each inherit DESKTOP). Assert Mobile (390px)
   does NOT inherit the Tablet value (Pages cascade: mobile ≠ tablet), and container-
   level modern fields (dropdown padding / pill) respect the ≥640-only split (absent at
   390px). Reset each device override; assert the stored `responsive.{device}` record is
   pruned VERBATIM (GET) and computed values revert to the desktop base.

Smoke passes only when every scenario's computed-style / geometry assertion holds at
390px + 768px + 1280px on BOTH the admin canvas force-open and the published front.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry **1215** (1214 = last used; re-verify "next free" at
  closing time) — TASK-506 + all five subtask IDs; F1/F2 decisions; the level-0 home
  choice; both byte-identity pins + F1 base-reset byte-identity; per-key fail-closed
  READ-trap; deferred residuals recorded.
- `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 subsection: new `NavLevelStyle`
  modern fields + clamp ranges + enums, the level-0 `navChrome` (or `levelStyles` "0")
  home, F1 base-clear helpers + base-reset byte-identity contract, F2
  `resolveMenuControlDefault` provider + source rules, per-bundle CSS contract
  (orientation-aware separators, indicator `::before`, caret toggle/rotate, flyout
  reachability, pill + dropdown padding, nested placement on the anchored (0,5,0)
  selector), present-only emission + doc-scope invariant.
- `_docs/CONTENT_TYPES_SPEC.md` — the 5 modern bundles authoring surface + the F1
  base-reset and F2 visible-default UX.
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only; NOT in
  this authoring pass).

---

## Acceptance Criteria (measured LIVE)

- Full Vitest (menu-document-v2 + normalize-menu-appearance + menu-design-editor +
  menu-document-css + siteShell) + Bun (menus routes + menu-document-render +
  siteShellCss) matrices green TOGETHER.
- Per-key fail-closed READ-trap round-trip green for EVERY new allowlist key (whole-doc
  blast radius asserted); F1 base-reset ⇒ never-had-it byte-identity green (model +
  render); F2 provider `{ value, sourceLabel }` table green.
- Reject-unknown proven at the model (path-tagged `MenuDocumentError`) and the route
  (400 `menu_document_invalid` with `path`, store untouched) for per-level modern keys
  and navChrome keys.
- CSS: exact per-bundle selectors present-only + doc-scoped on BOTH builders
  (front↔canvas parity); B1 orientation-aware; B2 `::before` on `:hover`/
  `[aria-current]`; B3 caret suppress/rotate + flyout `opacity`(+`transform`) reveal via
  `display …ms allow-discrete` + `@starting-style` (NO `visibility`)
  reachability; B4 pill + container padding; B5 anchored (0,5,0) placement with
  `dropdownDirection` intact; mobile `linkOnly` split; per-device delta vs desktop.
- Byte-identity: `buildSiteShellCss(null)` ZERO-line diff; no-override menu docs
  byte-identical on both CSS builders; front markup unchanged (no new class/aria).
- Gates: `lint`, `lint:types`, root `tsc`, `test:vitest`, `test:bun`, `gates:coderso`
  green together; ≥5-scenario real-viewport playwright smoke green at 390px + 768px +
  1280px (VISIBLE-effect assertions) on canvas AND front.
- No new route/RBAC/endpoint/migration; no `schemaVersion` bump; PAGE_MODEL.md +
  CONTENT_TYPES_SPEC.md + changelog 1215 + board/Statistics updated; deferred residuals
  recorded honestly.
</content>
</invoke>
