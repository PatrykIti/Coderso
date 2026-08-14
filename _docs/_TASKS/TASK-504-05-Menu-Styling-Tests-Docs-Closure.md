# TASK-504-05: Menu Styling Tests, Docs & Closure

# FileName: TASK-504-05-Menu-Styling-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Testing / Documentation / Content (Menus) / Site Shell
**Estimated Effort:** Medium
**Dependencies:** TASK-504-01 (brand style + per-level model), TASK-504-02 (brand/level/cheap-win CSS emission), TASK-504-03 (front `aria-current` stamp), TASK-504-04 (device-forked brand & level editor controls)
**Status:** ✅ Done
**Completed:** 2026-07-03
**Parent Task:** TASK-504

---

## Overview

Closure of TASK-504: consolidate the full Vitest + Bun regression matrix for the
menu deep-styling program — brand block styling (`brand.props.style`),
per-nesting-level nav styling (`NavItemsProps.levelStyles` levels 0/1/2+),
author-controllable sublist chrome, the cheap wins (per-link padding/radius,
hover TEXT color, `aria-current` current-page), AND the per-device (tablet+mobile)
override channel — then VERIFY and consolidate the guard tests the siblings land
with their code (the **conscious fail-closed READ traps** for `"style"` and
`"levelStyles"`; the **byte-identity pins** for `buildSiteShellCss(null)` and
no-override menu docs), run all gates, do the mandated ≥5-scenario real-input
playwright smoke (canvas + `:3000` at 390px / 768px / 1280px, VISIBLE-effect
assertions), and close docs / changelog / board.

- **Goal:** every suite in §1 green together; legacy menu documents provably
  untouched; `buildSiteShellCss(null)` byte-identity changes by **ZERO lines**;
  no-override menu docs byte-identical on BOTH CSS builders; changelog **1213**
  (1212 was consumed by TASK-503 — re-verify "next free" at closing time);
  README board + Statistics closed.
- **Out of scope:** new production behavior. 504-01/02/03/04 ship their own unit
  coverage (incl. the guard tests named below) with their code; this subtask
  **touches no production source** — it ADDS the cross-cutting tests below
  (route persistence, render byte-identity, front+canvas parity, editor flow),
  VERIFIES the sibling-owned guard pins are present and green, verifies the whole
  matrix, and closes.

These 6 test files EXIST already (verified against source 2026-07-02) — this
subtask **extends** them, it does not create parallel suites:

- `tests/vitest/services/menu-document-v2.test.ts` — brand/level normalizers, round-trip read traps, per-device records
- `tests/vitest/services/normalize-menu-appearance.test.ts` — new clamp ranges / enum reuse + `linkHoverTextColor` token/nullable (`normalizeMenuAppearance.ts` has no defaults concept; per parent §4(a)/(b) the four cheap-win keys carry NO resolution default — they are NOT seeded into `MENU_APPEARANCE_DEFAULTS`, resolve to `undefined` when unauthored, and 504-02 emits them PRESENT-ONLY; the 'unauthored ⇒ zero bytes' assertion lives in `menu-document-css.test.ts`, 504-02-owned)
- `tests/vitest/ui/menu-design-editor.test.tsx` — brand controls, Level SegmentedControl, device-fork, force-open threading
- `tests/unit/site/menu-document-render.test.tsx` (Bun) — brand/level emission + byte-identity + front↔canvas parity + `aria-current`
- `tests/integration/routes/menus.test.ts` (Bun) — `PATCH /menus/:id` round-trip + reject-unknown 400 with `path`
- `tests/unit/pages/siteShellCss.test.ts` (Bun) — `buildSiteShellCss(null)` byte-identity pin (`:40-41`) — **UNTOUCHED, ZERO-line diff**

These 2 files do NOT exist yet — they are **NEW files CREATED by their owning
siblings** (with that sibling's code, per §1.4/§1.5); this subtask does not
re-author them, it **VERIFIES** the described guard pins are present and green:

- `tests/vitest/site/menu-document-css.test.ts` (Bun-free, NEW — created by 504-02) — `collectMenuBrandRules` / `navLevelRules` / cheap-win + force-open pure-fn emission
- `tests/vitest/site/siteShell.test.tsx` (Bun-free, NEW — created by 504-03) — `normalizeNavPath` / `resolveMenuActiveHref` + `aria-current` stamp resolver

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — the document rides the existing validated
`PATCH /menus/:id` write path. `menuUpdateSchema.document` already accepts
`{ type: ["object","null"] }` with service-side strict validation
(`core/server/validation/menuSchemas.ts`), so the new `brand.props.style` and
`navProps.levelStyles` (base + `responsive.{tablet,mobile}` deltas) arrive inside
the EXISTING envelope — NO schema change, NO new endpoint, NO RBAC rule;
`menus.settings` is freeform jsonb — NO migration. No `menuDocumentV2`
`schemaVersion` bump. This subtask's job is to **prove** the invariants with tests:

- **Reject-unknown write:** unknown brand-style keys, unknown level keys (only
  `"1"`/`"2"`), unknown per-level style keys, and unknown per-device override keys
  inside `responsive` throw `MenuDocumentError` with the offending `path`, and the
  route 4xx's `menu_document_invalid`. Schema-first: enums + clamps + `normalize*`
  live in `core/services/menus/menuDocumentV2.ts` / `normalizeMenuAppearance.ts`;
  override values reuse the SAME `normalizeMenuColorValue` / clamp tables / enums as
  the base — raw stored input never reaches CSS.
- **Fail-closed read, CONSCIOUS blast radius:** `"style"` ∈ `BRAND_PROP_KEYS` and
  `"levelStyles"` ∈ the nav-native block key set are DELIBERATE extensions of the
  fail-closed read allowlist — a forgotten key would degrade EVERY saved doc
  carrying it to empty (the whole-doc degrade of `normalizeStoredMenuDocumentV2ForRead`).
  Each addition is covered by a **round-trip identity test** (§1.1) so the trap is
  asserted, not discovered in production. A doc WITH an unknown key INSIDE
  `brand.props.style` / `navProps.levelStyles` degrades the WHOLE stored document ⇒
  default look — assert that designed behavior consciously.
- **Deterministic contracts:** sparse records, explicit clear + prune, NO
  auto-remove-on-equality (asserted). ALL new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet via the ONE shared
  `buildMenuRuleSetsForDocument` (front `@media` + canvas flatten never diverge);
  the base sheet (`buildSiteShellCss(null)`) is untouched — the hardcoded sublist
  chrome / link padding is OVERRIDDEN from the doc scope by later source order, never
  edited in the base. The front `aria-current` stamp (504-03) is markup-only.

---

## Implementation Pseudocode (test + closure matrix)

> Test-file line anchors below are the sibling-owned describes this subtask
> VERIFIES + extends; exact line numbers drift as siblings land — locate by
> `describe` name, not the number.

### 1. Vitest lane — Bun-free services/UI (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/services/menu-document-v2.test.ts` — new describes

(The write-strict / fail-closed / per-device matrices below are OWNED by 504-01 and
land with its code — restated here as the verification checklist; this subtask fills
any gap found at closure and adds the cross-cutting round-trip identity pins.)

```ts
// Fixtures (module-scope helpers, reuse the suite's existing doc builders):
const legacyBrandDoc = () => validMenuBarDoc();                 // brand WITHOUT style
const styledBrandTextDoc = () => withBrand({
  mode: "text", text: "Acme",
  style: { fontSize: 28, fontWeight: 700, color: "var(--color-primary)",
           textTransform: "uppercase", letterSpacing: 2 },
});
const styledBrandImageDoc = () => withBrand({
  mode: "image", image: { src: "/logo.svg" }, style: { height: 48, maxWidth: 200 },
});
const leveledNavDoc = () => withNavProps({
  levelStyles: {
    1: { linkColor: "var(--color-fg)", fontSize: 15, paddingX: 12, paddingY: 8,
         background: "var(--color-bg)", borderColor: "var(--color-border)",
         borderWidth: 1, radius: 8, shadow: "md", minWidth: 220 },
    2: { linkColor: "var(--color-muted-fg)", fontSize: 14 },
  },
});
const perDeviceDoc = () => ({           // brand + level overrides on tablet + mobile
  ...leveledNavDoc(),
  sections: [{ ...section,
    responsive: {
      mobile: { navProps: { levelStyles: { 1: { linkColor: "var(--color-accent)" } } } },
      tablet: { navProps: { levelStyles: { 1: { fontSize: 16 } } } },
    },
    blocks: [/* brand block with responsive:{mobile:{style:{fontSize:22}}, tablet:{style:{fontSize:24}}} */] }],
});

describe("normalizeBrandStyle — accept / reject / sparse / prune", () => {
  test("accepts text-mode style and image-mode style; sparse (present keys only)", () => {});
  test("reject-unknown brand-style key throws MenuDocumentError with path ...blocks[N].props.style.<key>", () => {
    // { fontsize: 28 } (typo) ⇒ throws; assert error.path names the offending key.
    // Brand is an ARRAY block addressed by index with a literal `.props` field
    // (menuDocumentV2.ts:643 normalizeBrandProps(..., `${path}.props`)) — there is
    // NO `.brand` path segment; the full shape is
    // document.sections[0].blocks[N].props.style.<key> (precedent: menus.test.ts:450
    // asserts document.sections[0].blocks[0].props.text for a brand key).
  });
  test("NEW clamp ranges: fontSize clamps to [10,48]; letterSpacing allows NEGATIVE [-2,8]; height [16,120]; maxWidth [40,400]", () => {
    // letterSpacing:-2 accepted (proves the new negative-allowed range, NOT the nav 10..32);
    // fontSize:999 ⇒ 48; height:1 ⇒ 16; maxWidth:9999 ⇒ 400
  });
  test("non-string color ⇒ omitted (fail-soft, sparse), NOT thrown; unknown KEY ⇒ thrown", () => {});
  test("empty / all-invalid style pruned to undefined (byte-identity for legacy brand)", () => {});
});

describe("normalizeNavLevelStyles — accept / reject / sparse / prune", () => {
  test("accepts levels 1 and 2 with link + container fields; sparse per level", () => {});
  test("reject-unknown OUTER level key (only \"1\"/\"2\") throws with path ...blocks[N].props.levelStyles.<key>", () => {
    // { "0": {...} } ⇒ throws (level 0 = the existing base, NOT a levelStyles member);
    // { "3": {...} } ⇒ throws (deferred).
    // BASE levelStyles lives at blocks[N].props.levelStyles (nav-items block props) —
    // NOT `.navProps.`; the `.navProps.` prefix is correct ONLY for the per-device
    // path sections[N].responsive.{device}.navProps.levelStyles.
  });
  test("reject-unknown per-level style key throws with path ...blocks[N].props.levelStyles.1.<key>", () => {});
  test("NEW level clamp ranges: fontSize [10,32], gap [0,32], paddingX [0,40], paddingY [0,32], borderWidth [0,8], radius [0,32], minWidth [80,480]", () => {});
  test("enum reuse: fontWeight ∈ menuAppearanceFontWeights, shadow ∈ menuAppearanceShadows (invalid ⇒ throws or omit per base contract)", () => {});
  test("empty per-level pruned; empty levelStyles ⇒ undefined (byte-identity for docs without level styling)", () => {});
});

describe("menuDocumentV2 fail-closed READ traps (CONSCIOUS blast radius)", () => {
  test("legacy brand doc (no style) round-trips byte-unchanged — deep-equal, no injected keys", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(legacyBrandDoc())).toEqual(legacyBrandDoc());
  });
  test("brand.props.style survives a normalize round-trip verbatim — proves \"style\" ∈ BRAND_PROP_KEYS", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(styledBrandTextDoc())).toEqual(styledBrandTextDoc());
  });
  test("navProps.levelStyles survives a normalize round-trip verbatim — proves \"levelStyles\" ∈ the nav-native key set", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(leveledNavDoc())).toEqual(leveledNavDoc());
  });
  test("an unknown key INSIDE brand.props.style degrades the WHOLE stored document to empty — designed blast radius", () => {
    // stored: styledBrandTextDoc() with brand.props.style.bogus = 1
    expect(normalizeStoredMenuDocumentV2ForRead(stored).sections).toEqual([]); // NOT partial — whole doc ⇒ legacy look
  });
  test("an unknown key INSIDE navProps.levelStyles degrades the WHOLE stored document to empty", () => {});
});

describe("menuDocumentV2 per-device brand + level overrides (sparse + prune)", () => {
  test("responsive.mobile / .tablet brand style + level style records round-trip sparse verbatim", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(perDeviceDoc())).toEqual(perDeviceDoc());
  });
  test("reject-unknown inside a responsive brand/level override throws with the responsive path", () => {
    // responsive.mobile.style.bogus ⇒ path ...responsive.mobile.style.bogus;
    // responsive.mobile.navProps.levelStyles.3 ⇒ throws (only 1/2)
  });
  test("empty responsive brand/level records are pruned on write, never persisted", () => {});
  test("resolve/patch/clear: mobile & tablet each inherit DESKTOP (Pages cascade); mobile does NOT inherit tablet; clear prunes the responsive parent", () => {});
  test("NO auto-remove-on-equality: a mobile brand/level override equal to the base KEEPS the record", () => {});
  test("patch/clear are immutable — input doc object not mutated", () => {});
});
```

#### 1.2 `tests/vitest/services/normalize-menu-appearance.test.ts` — extend existing describes

```ts
// The brand/level normalizers live in menuDocumentV2.ts, but they REUSE the
// shared vocabulary here — assert the reuse points so a future range/enum edit
// can't silently widen the menu surface:
// in "clamps": brand fontSize uses BRAND_STYLE_NUMBER_RANGES (10..48), NOT the
//   nav-fontSize 10..32 — a value of 40 is VALID for brand, CLAMPED to 32 for nav.
// in "accepts": menuAppearanceFontWeights / menuAppearanceTextTransforms /
//   menuAppearanceShadows are the SAME enums the brand/level normalizers consume.
// in "rejects": normalizeMenuColorValue still gates every new color field
//   (linkHoverColor/linkActiveColor/brand color/container background/borderColor)
//   — "url(javascript:x)" ⇒ rejected/omitted per the base color contract.
```

#### 1.3 `tests/vitest/ui/menu-design-editor.test.tsx` — extend (brand + level + device-fork + force-open)

```ts
// Reuse the suite's mount + updateMenu-spy harness. All writes asserted via the
// PATCHed document, not internal state.
test("brand style controls are MODE-GATED: text mode shows fontSize/fontWeight/color/textTransform/letterSpacing; image mode shows height/maxWidth", () => {});
test("a brand text control writes into brand.props.style (merge via patchBlock), leaving mode/href/text intact", () => {});
test("Level SegmentedControl (0/1/2) at the top of the nav-items panel rebinds the SAME control set: Level 0 writes the nav base (props scalars, NO levelStyles); Level 1/2 write props.levelStyles[N]", () => {});
test("Base/Override/Inherited badge: Level 1 with no own linkColor reads 'Inherited (inherits level 0)'; after editing it reads 'Override'; Level 0 reads 'Base'", () => {});
test("device-forked writes for BOTH brand and levels: Mobile edit writes a SPARSE responsive.mobile override (brand style / navProps.levelStyles); Desktop/Tablet resolution per the Pages cascade", () => {});
test("Reset (data-menu-responsive-reset) prunes the stored responsive brand/level record verbatim; the control re-shows the resolved base; badge flips to Inherited", () => {});
test("selecting a level >=1 threads the selected level into MenuDocumentCanvas → buildMenuDocumentPreviewCss (force-open prop set — which opens the FULL ancestor chain up to that depth, so selecting Level 2 force-opens the Level-1 container too, otherwise the level-1 display:none hides level 2); selecting Level 0 clears it", () => {});
test("no setState-in-effect: all brand/level/device writes fire from event handlers (act() ⇒ no update warnings; console.error spy clean)", () => {});
// Folded-in defect regressions (504-04-owned; verified/aggregated here):
test("B1 canvas brand image: an image-mode brand with a configured logo renders a real <img> with a resolved (non-empty) src on the canvas (NOT the literal 'Logo' text); no-logo ⇒ text fallback", () => {});
test("B2 nav font-size slider: with fontSize UNSET the control displays the inherited value (16) as inherited/base, distinct from an explicit 15; untouched ⇒ no font-size written", () => {});
// (B3 badge test lives in the MenuEditorPage suite `tests/vitest/ui/menu-editor.test.tsx`, NOT this file:)
test("B3 MenuEditorPage items badge: a 4-item nested menu (1 root) renders '4 items' (TOTAL count, correct plural); a 1-item menu renders '1 item'", () => {});
```

#### 1.4 `tests/vitest/site/menu-document-css.test.ts` — VERIFY (owned by 504-02)

Bun-free pure-function emission unit for `menuDocumentCss.ts` (the vitest-lane companion to
the Bun render/byte-identity suite in §2.2 — both must be green, they cover different layers):

```ts
// VERIFY these 504-02-owned describes exist + are green (this subtask does not re-author them):
//  • collectMenuBrandRules — scoped text + img{} decls; absent style ⇒ ZERO strings; id escaped
//  • navLevelRules — EXACT 1/2 depth link + container selectors; level-2 descendant selector;
//    hover(background)+hover-text(color)+active state selectors; sparse present-only
//  • per-link box group (§3) — PRESENT-ONLY: unauthored (undefined, NO seed) ⇒ null (ZERO bytes); authored emits
//  • hover-text + currentPageRule (§4) — present-only
//  • per-device collectBrandDeltaRules / collectLevelDeltaRules — diff vs DESKTOP; mobile ≠ tablet
//  • buildMenuDocumentPreviewCss force-open (§6) — appends LAST; undefined ⇒ byte-identical; never in front
```

#### 1.5 `tests/vitest/site/siteShell.test.tsx` — VERIFY (owned by 504-03)

Bun-free resolver unit for the front `aria-current` stamp:

```ts
// VERIFY these 504-03-owned describes exist + are green:
//  • normalizeNavPath — trailing-slash / root / query+hash drop / external ⇒ null
//  • resolveMenuActiveHref — exact + longest-prefix wins; hidden/non-renderable never win
//  • the active .site-nav-link is stamped aria-current="page" (and only it); no activePath ⇒ none
```

### 2. Bun lane — route/runtime suites already covering menus

#### 2.1 `tests/integration/routes/menus.test.ts`

```ts
test("PATCH /menus/:id round-trips brand.props.style + navProps.levelStyles + responsive.{tablet,mobile} brand/level overrides WITHOUT dropping appearance/extras", () => {
  // PATCH { document: perDeviceDoc } on a menu that already has settings.appearance + extras;
  // GET back: brand.props.style + navProps.levelStyles + responsive records round-trip verbatim
  // AND settings.appearance/extras intact (per-key merge, menuService).
});
test("PATCH /menus/:id maps an invalid brand-style key to a 400 menu_document_invalid ApiError with a path", async () => {
  // Copy the existing invalid-document precedent's try/catch shape at menus.test.ts:450
  // (do NOT invent HTTP-body asserts): call the patch handler with
  // brand.props.style.bogus ⇒ handler THROWS:
  //   expect(error).toBeInstanceOf(ApiError);
  //   expect(apiError.code).toBe("menu_document_invalid");
  //   expect(apiError.status).toBe(400);                       // exactly 400, never 422
  //   expect(apiError.details).toEqual({ path: "document.sections[0].blocks[N].props.style.bogus" });
  // (blocks are an index-addressed ARRAY with a literal `.props` field — NO `.brand`
  //  segment; mirrors the precedent's document.sections[0].blocks[0].props.text.)
  // store untouched (GET returns the pre-PATCH document).
});
test("PATCH /menus/:id maps an invalid level key (navProps.levelStyles.3) to a 400 with the level path; store untouched", () => {});
```

#### 2.2 `tests/unit/site/menu-document-render.test.tsx` (Bun)

```ts
// BYTE-IDENTITY PINS (OWNED by 504-02/03, landed with their code — this subtask
// VERIFIES they exist and stay green; pin technique: fixture strings captured
// from pre-TASK-504 main, mirroring siteShellCss.test.ts:40):
test("no-override byte-identity: buildMenuDocumentCss(legacyDoc) === the pre-TASK-504 pinned sheet (absent brand style + absent levelStyles ⇒ ZERO new bytes)", () => {});
test("buildMenuDocumentPreviewCss(legacyDoc, device) byte-identical to pre-TASK-504 for every device (no force-open unless a level is selected)", () => {});

// BRAND EMISSION (collectMenuBrandRules, folded into base):
test("styled text brand emits a scoped [data-menu-block-id=\"<esc>\"] rule with font-size/font-weight/color/text-transform/letter-spacing; image brand emits ...[data-menu-block-id] img{height;max-width}; absent style ⇒ NO brand rule", () => {
  // assert the block id is escapeAuthoringCssString-interpolated; assert scope prefix present
});

// BRAND IMAGE RENDER REGRESSION (defect B1, 504-03 front markup):
test("B1: an image-mode brand with a configured logo renders a real <img> with a resolved (non-empty) src in MenuBrandRender — NOT the empty dashed placeholder — and does NOT balloon the header (the <img> is sized by BrandStyle.height/maxWidth, not the placeholder's ~217px); an image-mode brand with NO logo falls through to the text/site-name fallback (no placeholder); a text-mode brand is byte-identical to today", () => {});

// LEVEL EMISSION (navLevelRules, folded into desktopShared, >=640):
test("level 0 has NO depth selector — it IS the EXISTING flat `${scope} .site-nav-link` group-5 rule (menuDocumentCss.ts:230), byte-UNCHANGED and emitted EXACTLY ONCE; navLevelRules emits NOTHING for level 0 (NOT a `.site-nav-list > .site-nav-item > .site-nav-link` clone). Only levels 1 and 2 introduce NEW depth selectors", () => {
  // Level-0 values live in navProps (props scalars) and are ALREADY emitted by the
  // flat group-5 rule `${scope} .site-nav-link{color:...}` (menuDocumentCss.ts:230),
  // which fires for ALL depths — that flat base is exactly what makes "level 1
  // inherits level 0" work by cascade. Assert the group-5 `.site-nav-link` rule is
  // present ONCE and NOT re-emitted/duplicated as a level-0 depth selector.
  // 1: ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-link
  //    + container ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist, ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist
  // 2: ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist .site-nav-link
  //    + container ${scope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist
  // DESCENDANT COMBINATOR IS DELIBERATE — pin the descendant form VERBATIM (it matches
  // the recursive markup siteShell.tsx:182-231, the parent recon evidence table, AND 504-02's
  // navLevelRules emission — `menuDocumentCss.ts` — all three carry the SAME strings). The
  // level-1 link selector ENDS in a DESCENDANT step `.site-nav-sublist .site-nav-link` (and
  // the level-1 container in `.site-nav-sublist, .site-nav-sublist .site-nav-sublist`), NOT the
  // strict-child form `… > .site-nav-sublist > li > .site-nav-link`. This is load-bearing:
  // the descendant selector ALSO matches level-2/3 links (they are descendants of the top
  // `.site-nav-sublist`), so a level-2 link with only its own keys set INHERITS level 1 by pure
  // cascade — level-2's higher-specificity rule wins ONLY for the keys it re-declares. The
  // strict-child `> li > .site-nav-link` form is SUPERSEDED/REJECTED: it matches ONLY level-1
  // links, so level 2 would fall through to the flat group-5 base and inherit LEVEL 0, NOT
  // level 1 — silently breaking the stated "level 2 inherits level 1" cascade. Assert the
  // descendant form here; if 504-02 ever emits the child form, these pins MUST fail (this is
  // the cross-subtask agreement anchor — 504-02 emission and these 504-05 pins are identical).
});
test("inheritance is pure source order: the flat group-5 base rule (level 0) precedes the level-1 rule precedes the level-2 rule in the emitted sheet; each of levels 1/2 emits ONLY its own present overrides (no runtime merge, no re-emit of inherited values, NO level-0 depth clone)", () => {});
test("level >=1 CONTAINER chrome (background/border-color/border-width/border-radius/box-shadow/min-width) is emitted on the .site-nav-sublist selector and OVERRIDES the hardcoded base via later source order (base sheet string unchanged)", () => {});

// CHEAP WINS:
test("per-link paddingX/paddingY/radius emit on the .site-nav-link group (present-only; absent ⇒ NO bytes; base 8px 12px / radius 6px untouched)", () => {});
test("hover TEXT color emits on .site-nav-link:hover text `color` (distinct from the existing hover BACKGROUND rule)", () => {});
test("current-page rule emits on :where([aria-current=\"page\"]) scoped under menuDocScope; NO rule when linkActiveColor/current-page styling absent", () => {});

// PER-DEVICE DELTAS (collectDeltaRules extended for the levelStyles sub-record):
test("responsive.mobile levelStyles delta emits inside the mobile branch; responsive.tablet inside the bounded @media (min-width:640px) and (max-width:1023px); brand style delta likewise; mobile does NOT inherit tablet", () => {});

// FRONT ↔ CANVAS PARITY + FORCE-OPEN (the single canvas-only addition):
test("every brand/level/cheap-win rule appears in BOTH buildMenuDocumentCss and buildMenuDocumentPreviewCss (front @media + canvas flatten never diverge)", () => {});
test("canvas force-open opens the FULL ANCESTOR CHAIN up to the selected depth, appended LAST (wins navNestingRules' `display:none`, menuDocumentCss.ts:400): selectedLevel=1 ⇒ `.site-nav-list > .site-nav-item > .site-nav-sublist{display:grid}`; selectedLevel=2 ⇒ BOTH that level-1 container force-open AND the nested `.site-nav-sublist .site-nav-sublist{display:grid}` (the level-2 sublist is a DESCENDANT of the level-1 sublist, whose display:none would otherwise remove the whole subtree, hiding level 2 regardless of its own display); selectedLevel undefined/0 ⇒ NO force-open (mirrors previewMobileOpen)", () => {});

// SCOPE + aria-current MARKUP (504-03):
test("all emitted rules stay scoped under [data-site-menu-doc=\"true\"]; no UNSCOPED brand/level/current-page selector", () => {});
test("the rendered front nav stamps aria-current=\"page\" on the active .site-nav-link ONLY (siteShell); inactive links carry none. The canvas NavItemsPreview stamps NO aria-current (FRONT-only — no route/current-page concept; deferred with the active-item indicator)", () => {});
```

#### 2.3 `tests/unit/pages/siteShellCss.test.ts` (Bun)

```
NO edits. `git diff --stat` for this file must show ZERO lines; run it in the
closure checklist. `buildSiteShellCss(null)` byte-identity (:40-41) green — the
hardcoded sublist chrome + link padding + brand base rule stay in the base sheet
UNCHANGED; TASK-504 only OVERRIDES them from the doc-scoped sheet by source order.
```

### 3. Gates + real-input smoke

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit   # REPO ROOT — core lint:types does NOT typecheck tests/** (root tsconfig includes tests/**); this subtask's deliverable IS test code
bun run test:vitest                  # full vitest lane, log-clean (happy-dom)
bun run test:bun                     # REPO ROOT bun lane (DB gate — wizard-reset caveat). core has NO test:bun; do NOT substitute `bun --cwd core test` (no-op echo that passes green running zero tests)
bun run gates:coderso                # repo gate alias

# DEV-SERVER GOTCHA: Bun server code does NOT hot-reload — kill the stale
# `bun --eval` process (check its start date) and re-run coderso-dev-core-host
# BEFORE trusting admin-API responses; white admin page = server down. Verify the
# Soft-Violet admin theme is active (memory: local-cms-db-resettable).
```

### 4. Closure

- **Changelog:** `_docs/_CHANGELOG/1213-2026-07-03-task-504-menu-styling-depth-brand-and-per-level.md`
  (1212 is the last used number = TASK-503 — RE-VERIFY "next free" at closing time;
  link TASK-504 + all five subtasks). State explicitly: no new public endpoint, no
  RBAC change, no migration (`document` rides `PATCH /menus/:id`, `menuSchemas.ts`
  unchanged); no `menuDocumentV2` `schemaVersion` bump; both byte-identity pins green
  (`buildSiteShellCss(null)` ZERO-line diff + no-override menu docs); whole-doc
  fail-closed blast radius asserted for `"style"` AND `"levelStyles"`. **Record
  deferred residuals honestly:** levels 3+ independent styling (level-2 descendant
  selector covers them uniformly), custom font-family / line-height controls,
  active-item indicator pill / underline (beyond the `aria-current` color), and
  mobile-drawer styling (the `menu-drawer` section is not front-rendered yet —
  `siteShell.tsx` composes only `sections[0]`; requires shipping the drawer render
  path first).
- **Permanent docs:**
  - `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 subsection (added by TASK-501/502)
    with `BrandStyle`, `NavLevelStyle` / `levelStyles`, the level cap (0/1/2+) + the
    pure-CSS-cascade inheritance semantics, the exact depth selectors (levels 1/2 use
    DESCENDANT combinators — level-1 link `.site-nav-sublist .site-nav-link`, level-1 container
    `.site-nav-sublist, .site-nav-sublist .site-nav-sublist`, level-2 link the nested
    `.site-nav-sublist .site-nav-sublist .site-nav-link` — NOT the strict-child
    `… > .site-nav-sublist > li > .site-nav-link` form, precisely so "level 2 inherits level 1"
    holds by pure cascade; the child form would make level 2 inherit level 0 instead), the NEW clamp
    ranges (brand fontSize 10..48 / letterSpacing −2..8 / height 16..120 / maxWidth
    40..400; level fontSize 10..32 / gap 0..32 / paddingX 0..40 / paddingY 0..32 /
    borderWidth 0..8 / radius 0..32 / minWidth 80..480), the author-controllable
    sublist chrome (overrides hardcoded base from doc scope), the per-link
    padding/radius group, hover-text + `aria-current` current-page, and the per-device
    (tablet+mobile) brand/level override channel (Pages cascade).
  - `_docs/CONTENT_TYPES_SPEC.md` — the brand style + per-level styling AUTHORING
    surface: mode-gated brand controls, the Level SegmentedControl (0/1/2) with
    Base/Override/Inherited badges, device-forked writes + per-breakpoint Reset, and
    the canvas force-open preview of the selected level.
- **Board:** flip TASK-504 + all five subtasks to ✅ Done in `_docs/_TASKS/README.md`
  board **+ Statistics** (closing agent only; single edit for board+stats). Do NOT
  edit the board in this authoring subtask — closure only.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):** §1.1–1.5 —
`tests/vitest/services/menu-document-v2.test.ts` (brand/level normalizers +
round-trip READ traps + per-device sparse/prune),
`tests/vitest/services/normalize-menu-appearance.test.ts` (new clamp ranges + enum
reuse + `linkHoverTextColor` token/nullable — the four cheap-win keys carry NO resolution
default, so the 'unauthored ⇒ zero-bytes' assertion lives in `menu-document-css.test.ts`,
not here), `tests/vitest/ui/menu-design-editor.test.tsx`
(mode-gated brand controls, Level SegmentedControl + Base/Override/Inherited badge,
device-fork, Reset, force-open threading, no setState-in-effect),
`tests/vitest/site/menu-document-css.test.ts` (504-02 pure-fn emission — brand/level/
cheap-win/force-open), `tests/vitest/site/siteShell.test.tsx` (504-03 `normalizeNavPath`/
`resolveMenuActiveHref` + `aria-current` stamp resolver). Full `bun run test:vitest` green
AND log-clean (console.error spy).

**Bun lane (route/runtime menu suites):** §2 —
`tests/integration/routes/menus.test.ts` (round-trip WITHOUT dropping
appearance/extras + reject-unknown 400 with `path`),
`tests/unit/site/menu-document-render.test.tsx` (brand/level/cheap-win emission,
exact depth selectors, source-order inheritance, per-device deltas, front↔canvas
parity, force-open, `aria-current` markup, byte-identity),
`tests/unit/pages/siteShellCss.test.ts` (ZERO-line diff). Full root
`bun run test:bun` green.

**Byte-identity / reject-unknown / fail-closed guards named explicitly:**
- `buildSiteShellCss(null)` byte-identical — `siteShellCss.test.ts:40-41`, **ZERO
  edits, ZERO-line diff** (verified in the closure checklist via `git diff --stat`).
- No-override menu docs byte-identical on BOTH `buildMenuDocumentCss` and
  `buildMenuDocumentPreviewCss` (`menu-document-render.test.tsx`).
- **Fail-closed READ-trap round-trip tests are MANDATORY** for `"style"` (brand)
  and `"levelStyles"` (nav) — a forgotten key silently degrades every saved doc
  carrying it. Whole-doc blast radius asserted consciously (§1.1).
- All new CSS routed through the ONE `buildMenuRuleSetsForDocument` (front `@media`
  + canvas flatten never diverge); the canvas force-open is the single canvas-only
  addition (precedent: `previewMobileOpen`).

**Must-not-weaken:** the existing menu write-strict/fail-closed/per-device describes
in `menu-document-v2.test.ts`, the menu-drawer front pin + scoped-CSS assertions in
`menu-document-render.test.tsx`, the responsive-delta emission pins from TASK-501/502,
and the `buildSiteShellCss(null)` pin stay green without edits (except the additive
brand/level golden-string extensions).

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` must pass —
`bun --cwd core lint:types` (also what `gates:coderso` runs) covers core/ only and
EXCLUDES `tests/**`, which the root tsconfig includes (precedent: TASK-496-03 / 501-04
closure gates).

Plus gates + the real-input playwright smoke below — measured LIVE at real
viewports, not synthetic-only.

---

## SMOKE — ≥5 DISTINCT real-flow scenarios (owner mandate)

Run in the live admin canvas AND on the front (`:3000`) with `playwright-cli`
(memory: local-cms-run-and-test). Start `coderso-dev-core-host` if the admin page is
white/down; verify the Soft-Violet theme is active. Every assertion measures a
**VISIBLE EFFECT via computed styles / geometry** (`getComputedStyle`, bounding
boxes), **NOT control presence**. Author once, Save + Publish, then re-open the front.

1. **Brand style — text + image visible effect.**
   Text-mode brand: set fontSize + fontWeight + color + textTransform (+ letterSpacing).
   Assert the brand `<a>`'s computed `font-size` / `font-weight` / `color` /
   `text-transform` / `letter-spacing` CHANGED from the pre-edit values on canvas AND
   on the front. Switch the brand to image mode; set height + maxWidth; assert the
   brand `img`'s computed `height` and `max-width` (geometry / bounding box) match the
   authored values on both surfaces.

2. **Per-level styling 0/1/2 independently — each verified at the RIGHT depth.**
   Style level 0 (top-bar link color + fontSize), level 1 (first-dropdown link color/size
   + CONTAINER background/border/radius/shadow/min-width), level 2 (nested-dropdown link
   color). On the FRONT: HOVER to open level 1, then hover deeper to open level 2, and
   assert the computed style applies at that depth ONLY — the top-bar `.site-nav-link`
   color ≠ the level-1 link color ≠ the level-2 link color (three distinct computed
   values), proving the exact depth selectors and pure-CSS-cascade inheritance. On the
   CANVAS: select each level in the panel and assert the FORCE-OPEN rule reveals that
   depth (the sublist's computed `display` != `none`) and the styled link/container shows
   the authored computed values (so the author SEES what they style).

3. **Per-device brand + level override + reset across desktop / tablet / mobile.**
   On Mobile (390px), override brand fontSize and level-1 link color. Assert at 390px the
   computed brand `font-size` and level-1 link `color` DIFFER from Desktop, and at 1280px
   they match the Desktop base (mobile inherits desktop, override applies only ≤639px).
   Reset the mobile overrides; assert the stored `responsive.mobile` record is pruned
   VERBATIM (GET `/menus/:id`) and the computed values revert to the Desktop base. Repeat
   ONE field on Tablet (768px) and assert it applies in the bounded ≥640/<1024 branch AND
   that Mobile (390px) does NOT inherit the Tablet value (Pages cascade: mobile ≠ tablet).

4. **Sublist chrome (level ≥1 container) OVERRIDES the hardcoded base.**
   Author level-1 container background + borderColor + borderWidth + box-shadow + radius +
   minWidth. On the front, HOVER to open the first dropdown and assert the
   `.site-nav-sublist` computed `background-color` / `border-*` / `box-shadow` /
   `border-radius` / `min-width` MATCH the authored values (not the hardcoded base chrome)
   — proving the base sheet is overridden purely from the `[data-site-menu-doc]`-scoped
   sheet by source order, with `buildSiteShellCss(null)` untouched.

5. **Hover-text + current-page + link padding.**
   Set a hover TEXT color and a per-link paddingX/paddingY (+ radius). Hover a top-bar
   link and assert its computed text `color` changes (NOT just `background-color`) and its
   computed `padding` matches the authored values (geometry, distinct from the base
   8px 12px). Navigate to the currently active page and assert the nav link carrying
   `aria-current="page"` (stamped by the front, 504-03) shows the current-page computed
   styling (`linkActiveColor`), while sibling links do not.

Smoke passes only when every scenario's computed-style / geometry assertion holds at
390px + 768px + 1280px on BOTH the admin canvas and the published front.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry **1213** (1212 = TASK-503; re-verify "next free" at
  closing time) — TASK-504 + all five subtask IDs; deferred residuals recorded.
- `_docs/PAGE_MODEL.md` — extend the menuDocumentV2 subsection: `BrandStyle`,
  `NavLevelStyle`/`levelStyles`, level cap 0/1/2+ + cascade inheritance + exact depth
  selectors, the new clamp ranges, sublist chrome override, per-link padding/radius,
  hover-text + `aria-current`, per-device (tablet+mobile) channel.
- `_docs/CONTENT_TYPES_SPEC.md` — brand style + per-level styling authoring surface
  (mode-gated brand controls, Level SegmentedControl + Base/Override/Inherited badges,
  device-forked writes + per-breakpoint Reset, canvas force-open preview).
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only; NOT in
  this authoring pass).

---

## Acceptance Criteria (measured LIVE)

- Full Vitest (menu-document-v2 + normalize-menu-appearance + menu-design-editor) +
  Bun (menus routes + menu-document-render + siteShellCss) matrices green TOGETHER.
- Brand + level + per-device round-trip identity tests green (fail-closed READ traps
  for `"style"` and `"levelStyles"` asserted, whole-doc blast radius asserted).
- Reject-unknown proven at the model (path-tagged `MenuDocumentError`) and the route
  (400 `menu_document_invalid` with `path`, store untouched) for brand-style keys,
  level keys (only 1/2), per-level style keys, and per-device override keys.
- CSS: exact 0/1/2 depth selectors + level≥1 container chrome + per-link padding/radius
  + hover-text + `:where([aria-current="page"])` emitted present-only, doc-scoped, on
  BOTH builders (front↔canvas parity); canvas force-open for the selected level only.
- Byte-identity: `buildSiteShellCss(null)` ZERO-line diff; no-override menu docs
  byte-identical on both CSS builders.
- `aria-current="page"` stamped on the active front nav link (FRONT-only; the canvas preview stamps none — no route concept, deferred).
- Gates: `lint`, `lint:types`, root `tsc`, `test:vitest`, `test:bun`, `gates:coderso`
  green together; ≥5-scenario real-viewport playwright smoke green at 390px + 768px +
  1280px (VISIBLE-effect assertions) on canvas AND front.
- No new route/RBAC/endpoint/migration; no `schemaVersion` bump; PAGE_MODEL.md +
  CONTENT_TYPES_SPEC.md + changelog 1213 + board/Statistics updated; deferred residuals
  recorded honestly.
