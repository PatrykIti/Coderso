# TASK-502-05: Menu Fixes Tests, Docs, Closure
# FileName: TASK-502-05-Menu-Fixes-Tests-Docs-Closure.md

**Priority:** High
**Category:** Testing / Documentation / Content (Menus) / Site Front / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-502-01 (model: brand.text + tablet + carve-out), TASK-502-02 (CSS: tablet branch, separators, nested sublists), TASK-502-03 (front: recursive nav + brand chain), TASK-502-04 (editor: tokens, ghost, device controls)
**Status:** ⏳ To Do
**Parent Task:** TASK-502

---

## Overview

Closure of TASK-502: consolidate the full vitest + bun regression matrix for
the seven menu-design fixes (brand text chain, tablet cascade, device-defining
controls, canvas site tokens, divider separators, visibility ghost + cta
options, recursive nested submenus), execute the **golden re-freeze protocol**
(§2.3) and verify the byte-identity guards, run all gates, run the
owner-mandated **≥5-scenario real-flow smoke** (§3.2 — VISIBLE EFFECT
assertions, never control presence), and close docs/changelog/board.

- **Goal:** every suite in §1–2 green together; `buildSiteShellCss(null)`
  changes by ZERO lines; no-override/mobile-only byte guards resolved per
  §2.3's explicit protocol; changelog **next free AFTER 1210 — expected 1211,
  VERIFY at closure** (parallel streams consume numbers; 1209/1210 were both
  taken by parallel tasks) + the changelog-1210 "39/39"→"11/11" menus-routes
  correction + README board/Statistics.
- **Out of scope:** new behavior. 502-01/02/03/04 ship their own unit coverage
  with their code (501 convention); this subtask ADDS the cross-cutting tests
  below (route persistence, editor flow, emission shape, SSR recursion),
  VERIFIES the sibling-owned pins and the **stale-501-pin flips** (§0), and
  closes.

All test files below EXIST (anchors verified against source 2026-07-02) —
this subtask **extends** them, it does not create parallel suites:

- `tests/vitest/services/menu-document-v2.test.ts` (describes :53/:115/:192/:205/:234/:277 + the 501 responsive suites :309-:786)
- `tests/vitest/ui/menu-design-editor.test.tsx` (1151 lines; `switchDevice` harness :679; **rg-binary — use `grep -an` or Read**)
- `tests/unit/site/menu-document-render.test.tsx` (golden :64, drawer pin :108, GOLDEN rule arrays :161-201, byte-identity pin :225, equal-override pin :272)
- `tests/integration/routes/menus.test.ts` (responsive persistence :260, invalid-responsive 400 precedent :296-333)
- `tests/unit/pages/siteShellCss.test.ts` (byte-identity pin :40-41 — UNTOUCHED, zero-line diff)
- `tests/integration/runtime/site-shell-runtime.test.ts` (menu-doc header `<summary>` pin :536-537 — consciously rewritten by 502-03; legacy-path pins :310-311 unchanged)
- `tests/vitest/site/page-runtime-shell-branch.test.tsx` (default-`SiteHeaderNav` pin :72 — flat fixture unchanged; a nested fixture consciously updated by 502-03)

---

## 0. Stale-501-pin inventory (FLIPPED by siblings, VERIFIED here)

TASK-501 consciously pinned "tablet deferred" AND canvas-hide parity (the
preview flatten carrying hide rules); 502-01/02/04 un-defer/flip them.
502-03's markup changes (hover-mode doc header, recursive-`<details>`
legacy) consciously break two further pinned suites. Each
flip is owned by the sibling that changes the behavior and lands WITH its
code; 502-05's job is to verify every one was flipped consciously (not
deleted, not left red) and that the unknown-key coverage did not silently
disappear:

| Pin (file:line, pre-502) | Old assertion | Required flip | Owner |
|---|---|---|---|
| `menu-document-v2.test.ts:310` | breakpoint vocabulary mobile-only | vocabulary is `["tablet","mobile"]` | 502-01 |
| `menu-document-v2.test.ts:390-391` | rejects `desktop`/`tablet`/`wide` | rejects `desktop`/`wide`/junk — **tablet removed from the reject list, `wide` keeps the reject-unknown coverage alive** | 502-01 |
| `menu-document-v2.test.ts:531-535` | fail-closed read fixture uses `responsive.tablet` as the unknown key | swap the fixture's unknown key to `wide` (tablet is now VALID); the whole-doc blast-radius assertion itself is unchanged | 502-01 |
| `menu-document-v2.test.ts:557-561` | resolve: tablet === desktop | tablet = base merged with ONLY `responsive.tablet`; mobile ignores tablet (Pages cascade) | 502-01 |
| `menu-document-v2.test.ts:599-600` | patch: tablet writes the base | tablet writes sparse `responsive.tablet` | 502-01 |
| `menu-document-v2.test.ts:806` | block visibility: tablet === desktop | `resolveMenuBlockVisibleForDevice(block,"tablet")` = tablet override ?? flat | 502-01 |
| `menus.test.ts:296-333` | `responsive.tablet` ⇒ 400 `menu_document_invalid` path `document.sections[0].responsive.tablet` | swap the invalid fixture to `responsive.wide` (same ApiError shape, path `...responsive.wide`) — lands WITH 502-01's code (the flip cannot wait: once tablet is valid on write the old fixture goes red); the tablet-persists happy-path test is ADDED here by 502-05 (§2.1) | 502-01 (route test fixture flip); 502-05 (§2.1 persists test) |
| `menu-design-editor.test.tsx:787` | tablet edit writes BASE, badge "base" | TWO-STAGE (per 502-01 §5): 502-01 rewrites the DOCUMENT assertions with the model flip (tablet edit writes sparse `responsive.tablet`, base untouched) while KEEPING the badge pins at "base" as the truthful interim UI pin; 502-04 then flips the badge pins to Override/"Tablet" + Reset prunes | 502-01 (document assertions + interim badge="base" pin); 502-04 (badge Override + Reset-prunes flip) |
| `menu-design-editor.test.tsx:1110-1117` | scope pill "Tablet (base)" | pill "Tablet (overrides)" | 502-04 |
| `menu-document-render.test.tsx:228` | `buildMenuDocumentPreviewCss(doc,"tablet")` === desktop golden | tablet preview = base + tablet deltas (device-forced branch); a doc WITHOUT tablet records still previews === desktop golden **modulo the §2.3 re-freeze** | 502-02 |
| `menu-document-render.test.tsx:349-350` | canvas parity: mobile flatten CARRIES the hide rule (`buildMenuDocumentPreviewCss(doc,"mobile")` contains `hideRuleFor("blk_cta")`, desktop does not) | preview builders emit NO hide rules for ANY device — canvas visibility is owned by the 502-04 ghost gate (§2.2 ghost-handoff test) | 502-02 |
| `menu-document-render.test.tsx:414-431` | nav-items hidden-on-mobile wins in BOTH mobileModes — front `@media` AND canvas flatten (the `:431` preview-contains-hide-rule pin) | front `@media` half unchanged; the canvas-flatten half flips — preview contains NO hide rule (ghost handoff) | 502-02 |
| `site-shell-runtime.test.ts:536-537` | menu-document header asserts `data-site-nav-group` + `<summary>Services ${token}</summary>` (details markup) | doc header goes hover-mode: parent link rendered ONCE + nested `.site-nav-sublist`, NO `<summary>` for Services in the doc header; the legacy-path asserts at `:310-311` stay UNCHANGED (details mode) | 502-03 |
| `page-runtime-shell-branch.test.tsx:72` | "navigationDocument absent ⇒ default `SiteHeaderNav` markup is unchanged" | FLAT fixture keeps passing UNCHANGED; if the fixture contains nested items the expected markup consciously updates to the recursive-`<details>` legacy structure (comment naming 502-03) | 502-03 |

Closure check: `grep -an "tablet" <each file>` — zero remaining "deferred"
language; every flip present; the `wide` unknown-key tests green.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — verified against source 2026-07-02:
`menuUpdateSchema` (`core/server/validation/menuSchemas.ts`) already allows
`document: { type: ["object","null"] }` with service-side strict validation;
`menus.settings` is freeform jsonb. `brand.text` and `responsive.tablet` ride
the existing validated `PATCH /menus/:id` envelope — NO schema/route/RBAC
change, NO migration. This subtask **proves** the invariants:

- **Schema-first / reject-unknown:** unknown breakpoint/group/prop keys throw
  `MenuDocumentError` with the offending path; the route 4xx's
  `menu_document_invalid` (exactly 400, `ApiError.details = { path }` —
  precedent `menus.test.ts:296-333`). `brand.text` is string-only, trimmed,
  120-capped, sparse-omitted, rendered as React text (no innerHTML). Divider
  context-rule declarations derive ONLY from already-validated enum/number
  props — raw stored input never reaches CSS (asserted §2.2).
- **Fail-closed read, non-destructive legacy:** the stored read stays
  fail-closed (whole-doc blast radius re-asserted with the `wide` fixture);
  the ONE conscious carve-out is SPLIT (parent decision 3): a 501-era mobile
  `mobileMode` override is HOISTED into the base then pruned
  (behavior-preserving — published mobile CSS byte-identical before/after),
  the truly-dead `dropdownDirection` is prune-only; both are asserted
  explicitly (§1.1), including that the migrated doc round-trips clean so
  the next save persists the hoisted+pruned form (non-destructive 501-era
  migration). Legacy docs without `responsive`/`text` parse byte-unchanged.
- **Byte-identity guards (named):** `buildSiteShellCss(null)` unchanged —
  `tests/unit/pages/siteShellCss.test.ts` shows a ZERO-line `git diff`;
  no-override docs resolved per the §2.3 re-freeze protocol (conscious,
  enumerated-rules-only delta); docs with ONLY mobile overrides emit NO tablet
  `@media` branch. All new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped sheet; canvas token painting is
  admin-client-only inline style; the front renders published-only.
- **Conscious key-list extensions:** `BRAND_PROP_KEYS` (+`text`,
  `menuDocumentV2.ts:346`) and `MENU_RESPONSIVE_BREAKPOINT_KEYS` (+`tablet`,
  `:113`) gate BOTH write and stored read (the 501 fail-closed read trap) —
  §1.1 asserts a pre-502 stored doc that USES the new keys round-trips, and a
  post-502 doc read by the extended lists never degrades.

---

## Implementation Pseudocode (test + closure matrix)

### 1. Vitest lane — Bun-free services/UI (`_docs/TESTING_STRATEGY.md`)

#### 1.1 `tests/vitest/services/menu-document-v2.test.ts` — new describes

(Write-strict/resolve/patch matrices are OWNED by 502-01 and land with its
code — restated as the verification checklist; 502-05 fills any gap found.)

```ts
describe("menuDocumentV2 brand text (TASK-502-01)", () => {
  test("accepts a string, trims, clamps at 120 chars (fail-soft, no throw)", () => {
    // props: { mode: "text", text: "  Acme  " } ⇒ normalized text === "Acme"
    // 200-char input ⇒ stores EXACTLY MENU_BRAND_TEXT_MAX_LENGTH (120) chars,
    // NO MenuDocumentError (502-01's normative fail-soft cap — clamp/slice,
    // never throw-on-long; only non-string, non-null `text` throws — `null`
    // is tolerated as absent (sparse omit, mirrors the image prop per
    // 502-01 §1))
  });
  test("rejects non-string text with the offending path", () => {
    // text: 7 ⇒ MenuDocumentError, path "document.sections[0].blocks[0].props.text"
  });
  test("empty/whitespace/null text is OMITTED (sparse) — no `text` member persisted (null NEVER throws, per 502-01 §1)", () => {
    expect("text" in normalized.sections[0].blocks[0].props).toBe(false);
  });
  test("legacy brand blocks without text round-trip byte-unchanged; defaults stay textless", () => {
    // createDefaultMenuBlock("brand") and the legacy adapter emit NO text key
  });
});

describe("menuDocumentV2 tablet cascade (TASK-502-01)", () => {
  test("responsive.tablet round-trips verbatim (layout/navProps sparse record)", () => {});
  test("Pages cascade: tablet = base+tablet ONLY; mobile = base+mobile ONLY (mobile does NOT see tablet)", () => {
    // section with responsive: { tablet: { navProps: { itemGap: 20 } } } ⇒
    // resolve("tablet").itemGap === 20; resolve("mobile").itemGap === base
  });
  test("patchMenuSectionForDevice('tablet') writes sparse responsive.tablet; desktop still writes base", () => {});
  test("clear + prune per breakpoint: clearing the last tablet key removes responsive.tablet; a remaining mobile record survives", () => {});
  test("setMenuBlockVisibleForDevice('tablet') writes responsive.tablet.visibility (all block types); desktop stays flat/leaf-only", () => {});
});

describe("menuDocumentV2 device-defining carve-out (TASK-502-01, conscious)", () => {
  test("WRITE rejects mobileMode/dropdownDirection inside responsive navProps with the offending path", () => {
    // responsive.mobile.navProps.dropdownDirection ⇒ MenuDocumentError,
    // path "document.sections[0].responsive.mobile.navProps.dropdownDirection"
    // (expectDocError precedent: the path root is `document.` —
    // menu-document-v2.test.ts:61 / :397; matches 502-01's
    // `document.sections[0].responsive.wide`)
    // (both keys × both breakpoints — 4 cases)
  });
  test("STORED READ: dropdownDirection (truly dead) is PRUNE-ONLY, without degrading the doc", () => {
    // stored doc with responsive.mobile.navProps = { dropdownDirection: "up", itemGap: 8 }
    // ⇒ read keeps sections intact, itemGap: 8 survives, dropdownDirection GONE
    //   and NOT written into the base (never hoisted);
    // an override record left EMPTY by the prune is itself pruned;
    // the migrated doc round-trips clean through the WRITE normalizer
    // (next autosave persists the pruned form — assert normalizeWrite(read(doc)) deep-equals read(doc))
  });
  test("STORED READ: a 501-era mobile mobileMode override is HOISTED into the base, THEN pruned — published mobile CSS byte-identical (502-01 §3, parent Acceptance 3)", () => {
    // stored doc: base nav-items props.mobileMode "disclosure" +
    // responsive.mobile.navProps = { mobileMode: "inline" } ⇒ read: base
    // props.mobileMode === "inline" (hoisted, base overwritten), the
    // responsive record pruned; buildMenuDocumentCss mobile branch
    // byte-identical before/after the migration; a junk mobileMode override
    // value is NOT hoisted (prune-only, base unchanged, doc not degraded);
    // the migrated doc round-trips clean through the WRITE normalizer
  });
  test("fail-closed contrast pin: any OTHER unknown navProps key still degrades the whole doc (carve-out is exactly these two keys)", () => {});
});
```

#### 1.2 `tests/vitest/ui/menu-design-editor.test.tsx` — extend (rg-binary: `grep -an`/Read)

```ts
// Reuse the mount + updateMenu-spy harness and switchDevice(:679). All writes
// asserted via the PATCHed document, never internal state.
test("brand panel: 'Brand text' Input renders in TEXT mode only (image mode: absent); typing writes props.text via patch(); clearing DELETES the prop (sparse)", () => {});
test("canvas brand renders block.props.text || siteName — NEVER the menu name (regression pin on the old menuName fallback)", () => {});
test("tablet edit writes responsive.tablet (slider ⇒ responsive.tablet.layout.paddingY ONLY, base untouched); badge Override; Reset prunes the record and re-shows base", () => {});
test("'Mobile menu' control renders ONLY when device===mobile; 'Dropdown direction' ONLY when device!==mobile; BOTH write the BASE navProps on every device and are NOT wrapped in MenuResponsiveControlShell (no badge, no reset, no responsive record in the PATCHed doc)", () => {});
test("canvas ghost: flat-hidden leaf on Desktop ⇒ block still MOUNTED, dimmed (opacity style/class) + 'Hidden' badge, still selectable (click opens its panel); mobile-override-hidden ghosts on Mobile only; visible-on-neither ghosts on ALL devices", () => {});
test("cta panel: Size segmented + 'Open in new tab' toggle write props.size / props.target; canvas cta preview reflects variant/size (rendered via the real leaf path, not a static chip)", () => {});
test("every ColorSwatchControl receives the site-resolved palette prop; the canvas frame carries the inline --color-* variable map (assert style attribute contains the 7 token vars)", () => {});
test("recursive NavItemsPreview: a 3-level tree renders nested ul.site-nav-sublist with the grandchild PRESENT in the canvas DOM (no silent drop)", () => {});
test("divider canvas preview renders the leaf frame with data-block-id (no literal '—' span)", () => {});
test("no setState-in-effect: console.error spy clean across all device-forked flows", () => {});
```

### 2. Bun lane — route/runtime suites

#### 2.1 `tests/integration/routes/menus.test.ts`

```ts
test("PATCH /menus/:id document carrying brand.text + responsive.tablet persists verbatim (settings.appearance/extras intact)", () => {
  // clone the :260 responsive-persistence shape; document now includes
  // brand { props: { mode: "text", text: "Acme Co" } } and a section
  // responsive: { tablet: { navProps: { itemGap: 20 } }, mobile: {...} };
  // GET back: both records round-trip, mobile unchanged.
});
test("PATCH invalid brand.text (non-string) and unknown breakpoint 'wide' each ⇒ ApiError 400 menu_document_invalid with the exact path", () => {
  // copy the :296-333 try/catch handler-direct precedent EXACTLY (no HTTP-body
  // invention): expect(apiError.status).toBe(400);
  // details { path: "document.sections[0].responsive.wide" } / (".../props.text")
});
// NOTE: the OLD :317 fixture used responsive.tablet as the invalid key —
// 502-01 flips it to "wide" (§0); verify, do not re-add tablet-rejects.
```

#### 2.2 `tests/unit/site/menu-document-render.test.tsx` — emission + SSR

```ts
// EMISSION — tablet branch (front buildMenuDocumentCss):
test("tablet overrides emit per-GROUP delta rules inside the BOUNDED tablet media query — exactly `@media (min-width: 640px) and (max-width: 1023px)` from pageResponsiveMediaBounds.tablet — and 390px/mobile rules never contain tablet values", () => {});
test("a doc with ONLY mobile overrides emits NO tablet @media block — sheet byte-identical to its pre-502 output (modulo §2.3 re-freeze)", () => {});
test("hide-on-tablet visibility emits the doc-scoped DUAL selector ([data-menu-block-id],[data-block-id]{display:none}) inside the tablet branch, every comma member `${header}`-prefixed", () => {});

// EMISSION — canvas tablet branch (buildMenuDocumentPreviewCss):
test("device='tablet' flattens base+tablet deltas (tablet⇒desktop mapping GONE); a doc without tablet records previews === the desktop preview", () => {});
test("canvas mobile disclosure sim-open: the preview mobile sheet KEEPS the closed `.site-nav-list{display:none}` rule and appends the sim-open rule (`.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`) AFTER it — source-order win, net computed effect = list visible; mobileMode:'inline' emits no sim-open rule; FRONT mobile branch contains NO sim-open rule (front emission unchanged — per 502-02 §Disclosure preview)", () => {});
test("ghost handoff: override-hidden and flat+override-hidden blocks carry the dual hide rule in the correct FRONT branch per 502-02's four-way visibility plan; buildMenuDocumentPreviewCss output for EVERY device contains NO hideRule string (502-04 ghost owns canvas visibility — the load-bearing precondition for §1.2's dimmed-selectable-ghost test)", () => {});

// EMISSION — divider context rules (per-divider-block, doc-scoped):
test("a doc WITH a divider block emits the frame-as-line pair (`.site-header-inner [data-block-id=\"X\"]{align-self:center;width:<thickness>px;height:1.5em;background:...}` — NO `display:` declaration, per 502-02 §4's cascade guard: a `display:` at (0,3,0) would beat every (0,2,0) visibility hide — + inner `hr{display:none}`) in front AND preview output; a doc WITHOUT a divider emits NEITHER (conditional — golden doc unaffected)", () => {});
test("divider declarations derive only from validated enum/number props (inject a hostile stored tone via the raw fixture ⇒ fail-closed read, never CSS)", () => {});

// EMISSION — nested sublists (DOC-SCOPED only):
test("FRONT sheet: the nested fly-out rules (`.site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}` + per-level open-on-hover/focus-within) appear EXACTLY ONCE, in the shared `@media (min-width: 640px)` branch (502-02 emits `navNestingRules` in `desktopShared`, which already covers tablet widths) — ABSENT from the bounded tablet delta branch AND the mobile branch; PREVIEW builders (per-device flatten): present in the desktop AND tablet outputs, absent from the mobile flatten (mobile renders all levels inline-indented, no fly-out rule)", () => {});
test("buildSiteShellCss output contains NO `.site-nav-sublist .site-nav-sublist` rule (base sheet untouched — 502-03 option (b) adds no CSS anywhere; siteShellCss.test.ts stays zero-diff per §2.4)", () => {});

// SSR — recursion + brand (SiteHeaderMenuDocumentRender / SiteHeaderNav):
test("3-level tree renders nested ul.site-nav-sublist inside ul.site-nav-sublist; the GRANDCHILD link is present; the parent label appears EXACTLY ONCE in the header HTML (flatten + duplication both dead)", () => {
  // extend the :64 golden fixture to depth 3; count occurrences of the
  // parent label string in the rendered HTML === 1
});
test("legacy no-document header (SiteHeaderNav), per 502-03's RESOLVED option (b): recursive `<details class=\"site-nav-group\">` per level (base sheet untouched — class-inheritance styles each depth), grandchild PRESENT inside a nested .site-nav-sublist, and the linked parent rendered as the FIRST entry of its DIRECT sublist only (reachability convention KEPT on the legacy path — never flattened descendants). NOTE: 'label exactly once' is a doc-path/hover-mode property (previous test) and does NOT apply here", () => {});
test("BrandRender chain: props.text wins; empty/missing text falls back to siteName; neither ⇒ null (markup/classes unchanged)", () => {});
test("front visibility unchanged: flat-hidden leaf absent from DOM; hide-on-tablet block PRESENT in DOM (CSS-gated); both-invisible block absent (extend the 501 DOM-presence guard to the tablet axis)", () => {});
```

#### 2.3 Golden re-freeze protocol (CONSCIOUS — the one allowed byte delta)

The frozen goldens (`GOLDEN_*` rule arrays :161-201, byte pin :225, preview
pin :228) captured pre-501 output. 502-02's nested-sublist structural rules
are emitted for every doc with a nav-items block — the golden `buildDoc()`
HAS one, so a strict "byte-identical to pre-502" pin is IMPOSSIBLE for those
rules. Resolve it explicitly, not silently:

1. **Strictly identical (no re-freeze permitted):** `buildSiteShellCss(null)`
   (`siteShellCss.test.ts` — zero-line `git diff`); the mobile-only-doc
   tablet-branch absence (§2.2); divider rules absent without a divider
   block; the FRONT mobile disclosure `display:none` rule.
2. **Conscious re-freeze (exactly once, reviewed rule-by-rule):** extend
   `GOLDEN_DESKTOP_RULES` (the desktop-shared array — its composition into
   `GOLDEN_FRONT_CSS` + `GOLDEN_PREVIEW_DESKTOP_CSS` carries the delta to the
   front ≥640 branch and the desktop/tablet previews automatically) by ONLY
   the full 502-02 §5 `navNestingRules` block, verbatim (every member
   `${menuDocScope}`-prefixed): hide-by-default
   (`.site-nav-sublist{display:none}`); the per-level hover/focus-within
   open pair
   (`.site-nav-item:hover>.site-nav-sublist, … :focus-within>.site-nav-sublist{display:grid}`);
   `.site-nav-sublist>li{position:relative}`; the direction-aware nested
   fly-out
   (`.site-nav-sublist .site-nav-sublist{left:100%;top:0;bottom:auto}` —
   `bottom:0;top:auto` when `dropdownDirection:"top"`); and the caret rule
   (`li[data-site-nav-group="true"]>.site-nav-link::after{content:" \25BE";font-size:.7em}`);
   plus `GOLDEN_PREVIEW_MOBILE_CSS` GAINS the disclosure sim-open member
   (`.site-nav-list{display:flex;flex-direction:column;align-items:stretch;padding-top:8px}`)
   appended AFTER the retained closed `display:none` member (source-order
   win — NO member is removed; 502-02 §6 `previewMobileOpen`).
   `GOLDEN_STRUCT_BASE` is NOT extendable — 502-02 keeps
   `buildCanvasStructuralBaseline` byte-unchanged (its `summary` rules become
   dead selectors for doc headers, consciously KEPT), so that array stays
   byte-identical. The transitional `details[open]` rule is EXCLUDED from
   the post-502 golden: 502-02 emits NO transitional/interim rule (its
   nesting block and 502-03's hover markup land in one commit — parent
   Sequencing pin, normative in both siblings); if the halves ever land
   apart anyway, VERIFY 502-03 deleted any interim `details[open]` line
   before freezing — a `details[open]`/`.site-nav-group[open]` member in the
   frozen arrays is a FAIL. The re-frozen arrays become the post-502 pin.
   The closure checklist records the exact added rule strings in the
   changelog — any OTHER diff line in the golden arrays (including any
   REMOVED or reordered member) is a FAIL.
3. The equal-override no-delta pin (:272) and the drawer pin (:108) stay
   green UNEDITED.

#### 2.4 `tests/unit/pages/siteShellCss.test.ts`

```
NO edits, unconditionally — 502-03's resolved option (b) (legacy keeps
recursive `<details>`, "this subtask adds no CSS anywhere") owes this file
NO additive assertion; legacy-structure coverage lives in
menu-document-render.test.tsx (§2.2). `git diff --stat` target: ZERO lines
on the whole file (buildSiteShellCss(null) pin inviolable).
```

### 3. Gates + the mandated real-flow smoke

#### 3.1 Gates

```
bun --cwd core lint
bun --cwd core lint:types
bunx tsc -p tsconfig.json --noEmit  # REPO ROOT — lint:types excludes tests/**; this subtask's deliverable IS test code
bun run test:vitest                 # full lane, log-clean (re-run named files on known spurious timeout flakes)
bun run test:bun                    # REPO ROOT (DB gate; resets the config wizard — click through after)
bun run gates:coderso
```

#### 3.2 SMOKE — owner mandate: ≥5 DISTINCT real-flow scenarios, real-input
playwright (`playwright-cli`), menu-design area. **Every scenario asserts
VISIBLE EFFECT — computed style / geometry / DOM absence — NEVER control
presence.** Dev-server gotcha: Bun server code does not hot-reload — kill the
stale `bun --eval` process and re-run `coderso-dev-core-host`; a white admin
page means the server is down. Site token hexes: read the ACTIVE site tokens
first (settings) and assert against those values, not hardcoded hexes.

```
SCENARIO 1 — Fresh-create end-to-end (bug 1/4/5/6 happy path)
  admin: Menus → create "Smoke502" → add items incl. a 3-level branch
  (Parent → Child → Grandchild) → Design tab.
  Set: brand text "Smoke Brand"; nav link color = Secondary swatch; insert a
  divider block; insert a cta-button "Get started".
  CANVAS asserts: brand renders "Smoke Brand" (NOT "Smoke502");
  getComputedStyle(.site-nav-link).color === site secondary hex (NOT admin
  beige #f1efeb, NOT unset); divider box ≥1px wide × ~1.5em tall.
  Publish → front :3000 @1280px: same four asserts on the real header
  (brand string, link computed color, divider geometry, cta rendered).

SCENARIO 2 — Override/reset cycle across desktop/tablet/mobile (bug 2)
  Base: itemGap 8 + link color A. Tablet device: itemGap 24 + color B.
  Mobile device: itemGap 4 (leave color inherited).
  CANVAS: Desktop shows 8/A; Tablet 24/B (badge Override); Mobile 4/A —
  mobile does NOT show 24/B (cascade: mobile inherits DESKTOP).
  Publish → front computed gap/color at 1280px (8/A), 744px (24/B),
  390px (4/A). Back in admin: Reset the tablet itemGap → canvas re-shows 8;
  GET /menus/:id → responsive.tablet no longer contains the key (pruned);
  front @744 re-verifies 8 after re-publish.

SCENARIO 3 — Deep nesting: canvas AND front hover (bug 7)
  With the 3-level branch: CANVAS shows the recursive structure with the
  grandchild reachable (nested .site-nav-sublist present, grandchild text in
  canvas DOM).
  Front @1280px, REAL mouse: hover Parent → level-1 sublist visible; hover
  Child → fly-out sublist visible with the Grandchild link's bounding box
  fully on-screen (boundingBox() intersects viewport); the string "Parent"
  appears EXACTLY ONCE in the header (duplication dead).
  Front @390px: OPEN the mobile disclosure FIRST (click its summary — the
  default mobileMode "disclosure" keeps `.site-nav-list{display:none}` until
  open, so geometry asserts on a closed sheet fail); all three levels present
  inline; assert each deeper level's link boundingBox().x is strictly greater
  than its parent's (the indent accumulates via 16px-per-depth NESTING —
  do NOT assert computed padding-left, which is 16px at EVERY sublist depth);
  no fly-out (no position:absolute sublist).

SCENARIO 4 — Every-panel-control-with-visible-effect sweep (bugs 3/4/6 + WYSIWYG)
  Iterate EVERY control in the section / nav-items / brand / cta / divider
  panels. For each: change the value → assert the canvas computed style/DOM
  equals the picked value (swatches → computed color === site token hex;
  sliders → computed gap/padding px; segments → flex-direction / font-size /
  alignment; Visible toggle → ghost opacity <1 + "Hidden" badge; brand text →
  rendered string; cta Size → computed font-size/padding delta; Open in new
  tab → target="_blank" after publish). Device scoping asserted here too:
  "Mobile menu" control absent on Desktop/Tablet, "Dropdown direction" absent
  on Mobile; after editing both, GET the document → NO responsive record for
  either key. ANY control without a measurable effect is a FAIL (this is the
  scenario that catches the next dead-override/dead-prop).

SCENARIO 5 — Publish → front parity at real viewports (bugs 2/6 + regression)
  After 1–4: toggle the cta Visible OFF on Tablet only; publish.
  Tablet canvas: cta ghosts (dimmed + badge, still selectable). Front: cta
  PRESENT in the DOM at ALL THREE widths (CSS-gated, matching §2.2 SSR) but
  NOT VISIBLE @744px — playwright isHidden()/computed display:none from the
  dual hide rule inside the bounded tablet @media — and visible @1280px and
  @390px. DOM-ABSENCE assertions apply ONLY to flat-hidden and
  visible-on-neither blocks (per §2.2 / 502-02's four-way plan); asserting
  DOM absence for a tablet-only hide is a contract violation (it would push
  the implementer to render-skip and break desktop/mobile visibility).
  Parity diff per device: for a fixed key-style set (link color, itemGap,
  paddingY, brand text, divider geometry) canvas computed values @device ===
  front computed values @1280/744/390px. Re-check nested hover + brand on the
  front. Legacy regression: a site WITHOUT a menu document (flat item list)
  still renders the old header (buildSiteShellCss path) unchanged; a nested
  legacy tree renders recursive click-open `<details>` (502-03 option (b)).
```

Record the scenario transcript (commands + measured values) in the closure
notes; "toggle exists" screenshots do NOT satisfy the mandate.

### 4. Closure

- **Changelog:** `_docs/_CHANGELOG/1211-2026-07-02-task-502-menu-design-fixes-v2.md`
  — 1210 is the last used number; **re-verify next-free at closing time**
  (parallel streams). Link TASK-502 + all five subtasks. State explicitly: no
  new endpoint/RBAC/migration; tablet cascade now LIVE (Pages semantics,
  mobile does not inherit tablet); the device-defining carve-out (mobileMode
  hoist-then-prune, dropdownDirection prune-only — non-destructive, published
  mobile rendering unchanged); the §2.3 golden re-freeze with the exact
  rule strings added (no member removed); `buildSiteShellCss(null)`
  zero-line diff; the
  §0 pin flips.
- **Changelog 1210 correction (same pass):** line 134 `menus` routes
  "39/39" → "11/11" (doc-only fix; 11 is the **PRE-502** count of the file —
  9 `testIfDb(` + 2 plain `test(`, pinned by the parent task line 75 and
  verifiable via `grep -c 'testIfDb(' tests/integration/routes/menus.test.ts`
  + `grep -cE '^test\(' …` at the pre-502 commit. Explicitly do **NOT** use
  the closure bun-run count: that run includes this task's own §2.1
  additions (tablet-persists, `brand.text`-invalid) and would write a
  post-502 number into a 501-era historical entry — the exact defect this
  correction fixes).
- **Permanent docs:** EXTEND the `menuDocumentV2 Document Contract`
  subsection `_docs/PAGE_MODEL.md` (~:1048-1128, added by 501-04) with:
  `brand.props.text` (fallback chain text → siteName → null), the tablet
  cascade (`responsive.tablet`, both breakpoints inherit DESKTOP), the
  device-defining carve-out (mobileMode/dropdownDirection: write-reject in
  responsive; on stored read mobileMode is hoisted into the base then pruned,
  dropdownDirection prune-only), the nested-sublist render contract (recursive
  `SiteNavItem`, doc-scoped fly-out CSS, base sheet untouched), and the
  divider context-CSS behavior.
- **Named residuals (recorded, NOT scope):** brand text formatting/
  typography; divider `orientation` prop + spacer flex-push + `blockGap` +
  per-block margin/padding controls; divider tone/thickness inspector
  controls; hover/active emission semantics (state-only background pill —
  panel copy updated in 502-04, semantics unchanged); menu-drawer still
  unimplemented BY DESIGN.
- **Board:** flip TASK-502 + all five subtasks to ✅ Done in
  `_docs/_TASKS/README.md` board **+ Statistics** (closing agent only, single
  edit).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):** §1.1–1.2 —
`tests/vitest/services/menu-document-v2.test.ts`,
`tests/vitest/ui/menu-design-editor.test.tsx`; §0 verification of
`tests/vitest/site/page-runtime-shell-branch.test.tsx:72` (502-03's flip).
Full `bun run test:vitest` green AND log-clean.

**Bun lane (menu suites):** §2 — `tests/integration/routes/menus.test.ts`,
`tests/unit/site/menu-document-render.test.tsx`,
`tests/unit/pages/siteShellCss.test.ts` (pin zero-line diff),
`tests/integration/runtime/site-shell-runtime.test.ts` (§0 verification of
502-03's `:536-537` hover-mode flip; legacy pins `:310-311` intact). Full
root `bun run test:bun` green (wizard-reset caveat).

**Must-not-weaken:** the write-strict/fail-closed/leaf-reuse describes; the
`wide` unknown-key rejection (replacing tablet — reject-unknown coverage may
not shrink); the drawer pin (:108); the equal-override no-delta pin (:272);
the scoped-CSS assertions; `buildSiteShellCss(null)` (:40-41). Golden edits
ONLY per the §2.3 re-freeze protocol.

**Typecheck the test tree:** root `bunx tsc -p tsconfig.json --noEmit` — core
`lint:types` (and `gates:coderso`) exclude `tests/**`.

**Smoke:** §3.2 — all five scenarios executed with real input at real
viewports (1280/744/390px), visible-effect assertions, transcript recorded.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry — next free AFTER 1210, expected **1211** (verify
  at closure), + the 1210 "39/39"→"11/11" correction.
- `_docs/PAGE_MODEL.md` menuDocumentV2 subsection extension (§4).
- Named residuals recorded (§4).
- `_docs/_TASKS/README.md` board + Statistics on closure (closing agent only).
