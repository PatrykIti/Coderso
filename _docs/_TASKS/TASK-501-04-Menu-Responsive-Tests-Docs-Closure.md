# TASK-501-04: Menu Responsive Tests, Docs, Closure
# FileName: TASK-501-04-Menu-Responsive-Tests-Docs-Closure.md

**Priority:** Medium
**Category:** Testing / Documentation / Content (Menus) / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-501-01 (responsive contract), TASK-501-02 (CSS emission), TASK-501-03 (device-forked editor)
**Status:** ✅ Done
**Completed:** 2026-07-02
**Parent Task:** TASK-501

---

## Overview

Closure of TASK-501: consolidate the full vitest + bun regression matrix for
per-device menu overrides / orientation / block visibility, VERIFY and
consolidate the guard tests the siblings land with their code (the **conscious
fail-closed blast-radius** assertion and the **legacy round-trip identity** —
owned by 501-01; the **no-override byte-identity** pins for both CSS builders
AND the **responsive-gated blocks render in the DOM** guard (leaf frames stay
mounted, CSS owns the gating — the `menuLeafToPageBlock` visibility handoff
against `PageBlockFrame`'s null-return on `visibility.visible:false`,
`pageRendererV2.tsx:1950`) — owned by 501-02), run all gates, do the real-input playwright smoke (canvas
+ `:3000` at a real mobile viewport), and close docs/changelog/board.

- **Goal:** every suite in §1 green together; legacy menu documents provably
  untouched; `buildSiteShellCss(null)` byte-identity changes by ZERO lines;
  changelog **1210** (1209 was consumed by the parallel TASK-500) + README board/Statistics closed.
- **Out of scope:** new behavior. 501-01/02/03 ship their own unit coverage
  (incl. the guard tests named above) with their code; this subtask ADDS the
  cross-cutting tests below (route persistence, editor flow, emission shape),
  VERIFIES the 501-01/02-owned guard pins are present and green,
  verifies the whole matrix, and closes. Tablet stays deferred (editor writes
  BASE on tablet — asserted here, not silently assumed).

All test files below EXIST already (verified) — this subtask **extends** them,
it does not create parallel suites:

- `tests/vitest/services/menu-document-v2.test.ts` (describes at :41/:103/:180/:193/:222/:265)
- `tests/vitest/services/normalize-menu-appearance.test.ts` (accepts :34 / clamps :84 / rejects :106 / sanitize :161)
- `tests/vitest/ui/menu-design-editor.test.tsx` (shared-shell suite, :403-579)
- `tests/unit/site/menu-document-render.test.tsx` (golden :61, menu-drawer pin :105, scoped CSS :121/:134)
- `tests/integration/routes/menus.test.ts` (:44 route wiring, :66 update-only design fields, :224-252 invalid-document → 400 `menu_document_invalid` ApiError precedent — the pattern §2.1's new invalid-responsive test copies)
- `tests/unit/pages/siteShellCss.test.ts` (byte-identity pin :40-41 — UNTOUCHED)

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/endpoint/RBAC/migration — the document rides the existing validated
`PATCH /menus/:id` write path.** Verified against source: `menuUpdateSchema`
(`core/server/validation/menuSchemas.ts:30`) already allows
`document: { type: ["object","null"] }` with service-side strict validation, so
the new `responsive` keys arrive inside the existing envelope — NO schema
change, NO new endpoint, NO RBAC rule; `menus.settings` is freeform jsonb — NO
migration. This subtask's job is to **prove** the invariants with tests:

- **Reject-unknown write:** unknown breakpoint/group/prop keys inside
  `responsive` throw `MenuDocumentError` with the offending `path` and the
  route 4xx's `menu_document_invalid` (schema-first: enums + `normalize*` live
  in `core/services/menus/menuDocumentV2.ts` / `normalizeMenuAppearance.ts`;
  override values reuse the SAME `fieldNormalizers` as the base — raw stored
  input never reaches CSS).
- **Fail-closed read, non-destructive legacy:**
  `normalizeStoredMenuDocumentV2ForRead` (`menuDocumentV2.ts:498-506`)
  delegates to the strict writer and degrades to EMPTY on any throw. Legacy
  docs WITHOUT `responsive` parse byte-unchanged; a doc WITH an unknown
  responsive key degrades the WHOLE document ⇒ default look. That whole-doc
  blast radius is the DESIGNED behavior and must be asserted consciously
  (§1.1), not discovered in production.
- **Deterministic contracts:** sparse records, explicit clear + prune, NO
  auto-remove-on-equality (asserted). All new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet; the front renders
  published-only; `buildSiteShellCss(null)` is untouched.

---

## Implementation Pseudocode (test + closure matrix)

### 1. Vitest lane — Bun-free services/UI (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/services/menu-document-v2.test.ts` — new describes

(The write-strict / fail-closed / resolve-patch-clear / visibility matrices
below are OWNED by 501-01 and land with its code — restated here as the
verification checklist; this subtask only fills any gap found at closure.)

```ts
// Fixtures (module-scope helpers, reuse the suite's existing doc builders):
const legacyDoc = () => validMenuBarDoc();                       // NO responsive anywhere
const overriddenDoc = () => ({
  ...validMenuBarDoc(),
  sections: [{ ...section, responsive: { mobile: {
    layout: { paddingY: 4 }, navProps: { orientation: "vertical", itemGap: 8 },
  } }, blocks: [/* cta-button with responsive:{mobile:{visibility:{visible:false}}} */] }],
});

describe("menuDocumentV2 responsive write-strict", () => {
  test("rejects an unknown breakpoint key (tablet is DEFERRED — must throw today)", () => {
    // responsive: { tablet: {} } ⇒ MenuDocumentError, path ".sections[0].responsive.tablet"
    expect(() => normalizeMenuDocumentV2ForWrite(doc)).toThrow(MenuDocumentError);
    // and error.path names the offending key — machine-readable, assert it
  });
  test("rejects an unknown override group", () => {/* mobile: { extras: {} } ⇒ path ...responsive.mobile.extras */});
  test("rejects cross-subset props inside overrides (reuses normalizeAppearanceSubset :207-229)", () => {
    // mobile.layout.itemGap ⇒ throws (itemGap is NAV_ITEMS, not MENU_BAR_LAYOUT)
    // mobile.navProps.paddingX ⇒ throws (paddingX is layout)
  });
  test("override values ride the SAME field validators as the base", () => {
    // mobile.navProps.linkColor: "url(javascript:x)" ⇒ throws; itemGap: 999 ⇒ clamped to 64
  });
  test("block responsive accepts ONLY mobile.visibility.visible:boolean", () => {
    // visible: "yes" ⇒ throws; mobile.style ⇒ throws; works on menu-NATIVE blocks too (brand/nav-items)
  });
  test("empty records are pruned on write, never persisted", () => {
    // responsive: { mobile: {} } and responsive: {} ⇒ normalized section has NO `responsive` member
    expect("responsive" in normalized.sections[0]).toBe(false);
  });
});

describe("menuDocumentV2 responsive read fail-closed (CONSCIOUS blast radius)", () => {
  test("a legacy document WITHOUT responsive round-trips byte-unchanged", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(legacyDoc())).toEqual(legacyDoc()); // deep-equal, no injected keys
  });
  test("a document WITH responsive round-trips the sparse record verbatim", () => {
    expect(normalizeStoredMenuDocumentV2ForRead(overriddenDoc())).toEqual(overriddenDoc());
  });
  test("an unknown key INSIDE responsive degrades the WHOLE stored document to empty — designed blast radius", () => {
    // stored: overriddenDoc() with responsive.mobile.layout.bogus = 1
    const read = normalizeStoredMenuDocumentV2ForRead(stored);
    expect(read.sections).toEqual([]);            // NOT partially recovered — whole doc gone ⇒ legacy look
    // This is the fail-closed contract of :498-506; assert it so a future
    // "helpful" partial-recovery change is a conscious contract break.
  });
});

describe("menuDocumentV2 responsive resolve/patch/clear", () => {
  test("resolveMenuSectionAppearanceForDevice('mobile') merges base with the sparse override; base keys win only where un-overridden", () => {});
  test("resolve for 'desktop' AND 'tablet' ignore the mobile record entirely (mobile inherits desktop, not vice versa)", () => {});
  test("patchMenuSectionForDevice: desktop ⇒ base; tablet ⇒ base (deferred mapping); mobile ⇒ sparse responsive.mobile with ONLY the edited key", () => {});
  test("NO auto-remove-on-equality: setting a mobile override equal to the base value KEEPS the record", () => {});
  test("clearMenuSectionOverride deletes the leaf and prunes empty navProps/mobile/responsive parents", () => {
    // after clearing the last override: section has NO `responsive` member (mirrors pageDocumentV2 clearResponsiveOverride :3294-3327)
  });
  test("patch/clear are immutable — input doc object is not mutated", () => {});
});

describe("menuDocumentV2 responsive block visibility", () => {
  test("resolveMenuBlockVisibleForDevice matrix", () => {
    // no records            ⇒ desktop true,  mobile true
    // flat visible:false    ⇒ desktop false, mobile false            (legacy semantics untouched)
    // mobile override false ⇒ desktop true,  mobile false            (hide-on-mobile, any block type)
    // flat false + mobile true ⇒ desktop false, mobile true          (show-only-on-mobile, leaf)
  });
  test("setMenuBlockVisibleForDevice: mobile ⇒ responsive record (native AND leaf); desktop ⇒ flat visibility (LEAF only — native blocks have no flat visibility, desktop write is a no-op/guard)", () => {});
  test("clearMenuBlockVisibilityOverride removes the record and prunes empties", () => {});
});
```

#### 1.2 `tests/vitest/services/normalize-menu-appearance.test.ts` — extend existing describes

```ts
// in "accepts" (:34): orientation "horizontal" and "vertical" round-trip unchanged
// in "rejects" (:106): orientation "diagonal" / 1 / "" ⇒ MenuAppearanceError (enum vocabulary)
// in "sanitize" (:161): invalid stored orientation is DROPPED fail-closed;
//   resolved default is "horizontal" (resolveMenuAppearance) — and the CSS
//   default-emits-nothing half lives in §2.2.
```

#### 1.3 `tests/vitest/ui/menu-design-editor.test.tsx` — extend (device-fork + affordances)

```ts
// Reuse the suite's mount + updateMenu-spy harness (:465 pattern). All writes
// are asserted via the PATCHed document, not internal state.
test("Desktop edit writes the BASE: paddingY slider ⇒ section.layout.paddingY, NO responsive member", () => {});
test("Mobile edit writes a SPARSE override: switch DeviceSwitcher to mobile, same slider ⇒ responsive.mobile.layout.paddingY ONLY; base untouched", () => {});
test("Tablet edit writes the BASE and the badge reads 'Base' (tablet deferred)", () => {});
test("panel shows RESOLVED values on mobile (override 4 displayed, not base 12); badge = Override; un-edited control badge = Inherited", () => {});
test("data-menu-responsive-reset clears the override: record pruned from the PATCHed doc, control re-shows the base value, badge flips to Inherited", () => {});
test("orientation SegmentedControl in the nav-items panel: horizontal|vertical; vertical on mobile writes responsive.mobile.navProps.orientation", () => {});
test("per-block visibility controls fork by device (501-03 §6): the MOBILE override toggle ('Visible on mobile', shell-wrapped) renders only when device=mobile — toggling CTA off writes blocks[i].responsive.mobile.visibility.visible:false (flat leaf visibility untouched); on Desktop/Tablet leaf blocks (cta-button/divider/spacer) show the flat 'Visible' toggle (writes flat visibility.visible) and native blocks show none", () => {});
test("no setState-in-effect: all device-forked writes fire from event handlers (act() produces no update-warnings; assert console.error spy clean)", () => {});
```

### 2. Bun lane — route/runtime suites already covering menus

#### 2.1 `tests/integration/routes/menus.test.ts`

```ts
test("PATCH /menus/:id document carrying responsive persists per-key without dropping appearance/extras", () => {
  // PATCH { document: overriddenDoc } on a menu that already has settings.appearance + extras;
  // GET back: document.sections[0].responsive round-trips verbatim AND settings.appearance/extras intact.
});
test("PATCH /menus/:id maps an invalid responsive key to a 400 menu_document_invalid ApiError with a path", async () => {
  // Fixture-only extension of the existing :224-252 precedent (same plumbing,
  // already proven — copy its try/catch shape, do NOT invent HTTP-body asserts):
  // call getPatchHandler() directly with document.sections[0].responsive.tablet
  // ⇒ the handler THROWS (no HTTP body at this layer):
  //   expect(error).toBeInstanceOf(ApiError);
  //   expect(apiError.code).toBe("menu_document_invalid");
  //   expect(apiError.status).toBe(400);            // exactly 400, never 422 (menuRoutes.ts:55-59)
  //   expect(apiError.details).toEqual({ path: "document.sections[0].responsive.tablet" });
  // (Serialized form is { error: { code, message, details: { path } } } —
  //  errorHandler.ts — there is no top-level body.error string or body.path.)
});
```

#### 2.2 `tests/unit/site/menu-document-render.test.tsx`

```ts
// BYTE-IDENTITY PINS (OWNED by 501-02, landed with its code — this subtask
// VERIFIES they exist and stay green; pin technique: fixture strings captured
// from pre-TASK-501 main, mirroring siteShellCss.test.ts:40):
test("no-override byte-identity: buildMenuDocumentCss(legacyDoc) === the pre-TASK-501 pinned sheet", () => {});
test("orientation default 'horizontal' emits NOTHING (sheet for doc-with-explicit-horizontal === sheet without)", () => {});

// EMISSION SHAPE (front @media, buildMenuDocumentCss :150-161):
test("mobile overrides emit per-GROUP delta rules (triggered group = TOTAL emission, 501-02 §2-3) inside @media (max-width: 639px), AFTER the mobileMode disclosure/inline rules (source-order win)", () => {
  // assert indexOf(disclosureRule) < indexOf(overrideRule) within the mobile branch
});
test("orientation vertical emits `.site-nav-list{flex-direction:column;align-items:stretch}` in the branch matching where it is set (base vs mobile)", () => {});
test("hide-on-mobile ⇒ mobile branch doc-scoped DUAL selector [data-menu-block-id=\"X\"],[data-block-id=\"X\"]{display:none}; show-only-on-mobile ⇒ desktop (min-width) branch same dual-selector display:none; NO un-hide rules", () => {});
test("nav-items block hidden on mobile WINS in BOTH mobileMode:'inline' and mobileMode:'disclosure' with the disclosure [open] — front @media AND canvas flatten (guards the <nav> ancestor-wrapper stamp against the higher-specificity .site-nav-list{display:flex} / disclosure-open rules; OWNED by 501-02, verified here)", () => {});
test("no UNSCOPED attribute selector anywhere in the emitted sheet: every comma-list member carries the `${header}` prefix (explicit assertion, beyond the [data-site-menu-doc] scoping check below)", () => {});
test("data-menu-block-id is stamped on menu-native wrappers only (nav <nav>, brand <a>, utility <span>) while leaf frames carry PageBlockFrame's data-block-id (extend the :61 golden); blocks invisible on BOTH devices stay render-SKIPPED (no DOM, no rule)", () => {});
test("DOM-presence guard for override-gated blocks (PageBlockFrame null-return trap): the rendered front HTML for overriddenDoc CONTAINS the hide-on-mobile block's wrapper AND the show-only-on-mobile leaf's data-block-id — present in the DOM, gated by CSS only; ONLY both-invisible blocks are absent (guards the 501-02-owned menuLeafToPageBlock visibility handoff — a regression to render-skipping flat-false leaves would silently break show-only-on-mobile while every CSS-sheet assertion above stays green)", () => {});

// CANVAS FLATTEN (buildMenuDocumentPreviewCss :209-213):
test("canvas device='mobile' flattens mobile-resolved rules (no @media); device='tablet' still maps to the DESKTOP branch", () => {});
test("all emitted rules stay scoped under [data-site-menu-doc=\"true\"] (extend :121)", () => {});
// The menu-drawer pin (:105) and the sections[0]-only render stay UNCHANGED.
```

#### 2.3 `tests/unit/pages/siteShellCss.test.ts`

```
NO edits. `git diff --stat` for this file must show ZERO lines; run it in the
closure checklist. `buildSiteShellCss(null)` byte-identity (:40-41) green.
```

### 3. Gates + real-input smoke

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit  # REPO ROOT — core lint:types does NOT typecheck tests/** (root tsconfig.json:22-23); this subtask's deliverable IS test code
bun run test:vitest                 # full vitest lane, log-clean (happy-dom)
bun run test:bun                    # REPO ROOT bun lane (package.json:26; DB gate — wizard reset caveat). core has NO test:bun script; do NOT substitute `bun --cwd core test` — it is a no-op `echo core test` that passes green while running zero tests
bun run gates:coderso               # repo gate alias (package.json:70)

# Playwright smoke (Acceptance 1-3 of the parent; real mouse/keyboard, memory: local-cms-run-and-test):
#   DEV-SERVER GOTCHA: Bun server code does NOT hot-reload — kill the stale
#   `bun --eval` process (check its start date) and re-run coderso-dev-core-host
#   BEFORE trusting admin-API responses; white admin page = server down.
# 1. admin /admin/menus → Design tab: FIRST set mobileMode to "Inline" in the
#    nav-items panel (MenuDesignEditor mobileModeLabels: disclosure="Collapsed",
#    inline="Inline") — under the default "disclosure" the 390px nav is hidden
#    behind the toggle and the disclosure-open rule ALREADY forces
#    flex-direction:column (menuDocumentCss.ts:133), so a "vertical stacked nav"
#    check would pass with or without the feature. Then DeviceSwitcher→Mobile;
#    set itemGap override, orientation=vertical, hide the CTA. Canvas shows all
#    three; switch to Desktop ⇒ unchanged base look. Save + Publish.
# 2. front :3000 at viewport 390px: the INLINE nav is visible and stacked
#    vertically — assert computed flex-direction:column on .site-nav-list, where
#    the inline default would be row (a signal unique to the new orientation
#    override) — plus overridden gap, NO CTA.
#    At 1280px: untouched desktop look, CTA present.
# 3. back in admin on Mobile: Reset the itemGap override ⇒ badge Override→Inherited,
#    canvas re-inherits desktop live; Save; verify the stored document has the
#    record pruned (GET /menus/:id).
```

### 4. Closure

- Changelog: `_docs/_CHANGELOG/1210-2026-07-02-task-501-menu-per-device-overrides-orientation-and-block-visibility.md`
  (1208 is the last used number — re-verify "next free" at closing time; link
  TASK-501 + all four subtasks). State explicitly: no new public endpoint, no
  RBAC change, no migration (`document` rides `PATCH /menus/:id`,
  `menuSchemas.ts:30` unchanged); tablet DEFERRED (editor writes base);
  menu-drawer still unimplemented BY DESIGN (overrides+visibility replace it);
  both byte-identity pins green; whole-doc fail-closed blast radius asserted.
- Permanent docs: NO menuDocumentV2 notes exist yet — TASK-499 shipped
  (changelog 1208) WITHOUT adding them (verified: zero
  menuDocumentV2/buildMenuDocumentCss/MENU_SECTION_KEYS hits in non-task,
  non-changelog `_docs/*.md`), so there is nothing to "extend". ADD a
  menuDocumentV2 subsection to `_docs/PAGE_MODEL.md`'s menu design section
  (~:1045-1095) covering the document contract (TASK-499 doc-debt paid here)
  PLUS the new responsive contract (sparse `responsive.mobile`, resolve
  cascade mobile-inherits-desktop, explicit clear+prune, per-device block
  visibility). The surrounding text still describes the PRE-499 architecture
  (`MenuAppearancePanel.tsx`, `settings.menuAppearance`,
  `menuDesignDocument.ts` adapter) — stale-mark or update it in the SAME
  edit; do not bolt the responsive contract onto that stale section as-is.
- Flip TASK-501 + all subtasks to ✅ Done in `_docs/_TASKS/README.md` board
  **+ Statistics** (closing agent only; single edit for board+stats).
- Record residuals honestly (expected: tablet breakpoint = additive key-list
  extension later; menu-drawer removal decision deferred) as follow-ups, not
  silent gaps.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):** §1.1-1.3 —
`tests/vitest/services/menu-document-v2.test.ts`,
`tests/vitest/services/normalize-menu-appearance.test.ts`,
`tests/vitest/ui/menu-design-editor.test.tsx`. Full `bun run test:vitest`
green AND log-clean.

**Bun lane (route/runtime suites already covering menus):** §2 —
`tests/integration/routes/menus.test.ts`,
`tests/unit/site/menu-document-render.test.tsx`,
`tests/unit/pages/siteShellCss.test.ts` (zero-line diff). Full
root `bun run test:bun` (package.json:26) green.

**Must-not-weaken:** the existing write-strict/fail-closed/leaf-reuse describes
(menu-document-v2.test.ts :41-288), the menu-drawer front pin
(menu-document-render.test.tsx:105), the scoped-CSS assertions (:121/:134),
and the `buildSiteShellCss(null)` pin (siteShellCss.test.ts:40-41) stay green
without edits (except the additive `data-menu-block-id` golden extension).

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` must
pass — `bun --cwd core lint:types` (also what `gates:coderso` runs,
`scripts/coderso-release-gates.ts:45`) covers core/ only and EXCLUDES
`tests/**`, which root `tsconfig.json:22-23` includes (precedent:
TASK-496-03 closure gates).

Plus gates + real-input playwright smoke per §3 — measured live at a real
mobile viewport, not synthetic-only.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry **1210** (1209 was consumed by the parallel TASK-500; verified at closing time).
- `_docs/PAGE_MODEL.md`: NEW menuDocumentV2 subsection in the menu design
  section (document contract + responsive contract) — see §4. No TASK-499
  notes exist to extend (TASK-499 doc-debt); the surrounding pre-499 text
  (`MenuAppearancePanel`/`menuDesignDocument`) needs a stale-marker or
  update in the same edit.
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only).
