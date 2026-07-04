# TASK-508-03: Front & Preview Parity — No-Markup-Hook Proof + Front Regression Assertions

# FileName: TASK-508-03-Front-And-Preview-Parity.md

**Parent Task:** TASK-508
**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Small
**Dependencies:** TASK-508-01 (model keystone: `linkAlign` / `submenuDirection` / `submenuMode` + allowlists + R1(a) hint fix — must land green first), TASK-508-02 (CSS emission: robust `flyoutAnimRule`, `submenuDirection` two-rule emitter, accordion emitter, `linkAlign` in `levelLinkDecls`, `previewForceOpenLevel` `visibility:visible` — the front consumes its `buildMenuDocumentCss` output). Also TASK-499/501/502/504/506/507 (the front render seam + doc-scoped sheet contract).
**Status:** ✅ Done
**Completed:** 2026-07-03

---

## Goal

**Prove — and formally lock with front-side regression assertions — that every TASK-508
field (`linkAlign`, `submenuDirection`, `submenuMode`) and the R2 robust flyout rewrite need
ZERO front markup/class/attribute change**, because the shipped recursive nav structure +
the doc-scoped `[data-site-menu-doc="true"]` sheet already carry every new visual as pure CSS.
If — and only if — implementation proves a minimal hook is unavoidable, this subtask is its
sole home (added without breaking `buildSiteShellCss(null)` byte-identity). This subtask also
ENUMERATES the canvas-preview parity contract handed to 508-04 (`renderPreviewNavItem` mirror
+ the `previewForceOpenLevel` force-open sim).

**Sole writer of `core/site/siteShell.tsx` (expected ZERO code changes).** Does NOT touch
`menuDocumentV2.ts` (508-01), `menuDocumentCss.ts` (508-02), `MenuDesignEditor.tsx` (508-04),
or `siteShellCss.ts` (frozen). Delivers the front-parity **assertions** as tests owned here +
handed to 508-05.

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** This subtask adds NO server surface: it renders the same
published-only document tree via the existing `SiteHeaderMenuDocumentRender` (front) with the
same `<style>{buildMenuDocumentCss(document)}</style>` doc-scoped sheet seam. No new
route/RBAC/endpoint/migration, no `schemaVersion` bump. All new fields ride the existing
validated `PATCH /menus/:id` write path; the front only READS the already-normalized document.

---

## Grounded current front markup (verified fresh — `core/site/siteShell.tsx`, 643 lines)

The hover-mode menu-document header is rendered by `SiteHeaderMenuDocumentRender`
(`@555-621`) → `NavItemsRender` (`@452-488`) → the RECURSIVE `SiteNavItem` (`@219-302`,
`interaction="hover"`). The exact emitted tree (verified by Read + `grep -an`):

```
<header class="site-header" data-site-header="true" data-site-menu-doc="true">   // @580-583 (SITE_MENU_DOC_ATTRIBUTE)
  <style>{buildMenuDocumentCss(document)}</style>                                // @584 — the ONLY styling seam (508-02 output)
  <div class="site-header-inner">
    <nav class="site-nav" data-site-nav="true" data-menu-block-id={id}>          // @467-472
      <details class="site-nav-disclosure" data-site-nav-disclosure="true">…    // @473-475 (mobile)
      <ul class="site-nav-list" data-site-nav-list="true">                       // @476
        <li class="site-nav-item" data-site-nav-group="true">                    // @285 (group) / @238,269 (leaf)
          <a  class="site-nav-link" data-site-nav-link="true">…</a>              // @205-206 (linked parent/leaf)
          | <span class="site-nav-link site-nav-group-label" tabIndex={0}>…      // @295 (linkless group — focusable)
          <ul class="site-nav-sublist">                                          // @245 (recursive; nested = @257 SiteNavItem)
            … recursive SiteNavItem …
</header>
```

**Every selector the 508 CSS targets already exists in this markup — verified against the
508-02 selector maps:**
- `linkAlign` → `LEVEL_LINK_SELECTORS[lvl]` targets `.site-nav-link` (present @205, @295). ✅
- `submenuDirection` rule A (level-1 precise) → `.site-nav-list > .site-nav-item > .site-nav-sublist` (present: `.site-nav-list` @476 > `.site-nav-item` @285 > `.site-nav-sublist` @245/@299). ✅
- `submenuDirection` rule B + `submenuPlacement` → anchored (0,5,0) `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` (the recursive nesting @257 emits `.site-nav-sublist` inside `.site-nav-sublist`). ✅
- R2 flyout `sub`/`shownSel` (`:hover`/`:focus-within` on the group `<li>`) → `li.site-nav-item[data-site-nav-group="true"]` (@285) + the focusable trigger (`a.site-nav-link` OR `span[tabIndex=0]` @295) that fires `:focus-within`. ✅
- R3b accordion → `.site-nav-list` (@476) `flex-direction:column` + `.site-nav-sublist` (@245) `position:static` + indent. ✅

**Conclusion: NO markup/class/attribute/aria change is needed.** All three new fields + the
flyout rewrite are pure doc-scoped CSS riding pre-existing hooks. This is the DEFAULT outcome
and the primary deliverable of 508-03: a formal no-hook proof, not a code edit.

---

## R2 reachability: WHY `visibility:hidden` keeps the front zero-JS-reachable (front-side proof)

508-02 replaces the `display:none`-at-rest reveal (for animated flyouts only) with an
always-`display:grid` box hidden via `visibility:hidden;opacity:0`. The front markup makes this
reachability-safe with ZERO markup change because:

- The reveal trigger is the group `<li data-site-nav-group="true">` (@285) `:hover` /
  `:focus-within` — UNCHANGED. `:focus-within` fires when the item's OWN trigger takes focus:
  a linked parent `a.site-nav-link` (@287, natively focusable) or a linkless
  `span.site-nav-link.site-nav-group-label` with `tabIndex={0}` (@295 — the load-bearing
  keyboard hook, comment @291-294). A `visibility:hidden` sublist's links are NOT tab-focusable
  (exact parity with `display:none`), so the tab path is: focus the trigger → parent
  `:focus-within` → sublist flips `visibility:visible` → its links become focusable → subsequent
  tabs enter and HOLD `:focus-within`. This is the SAME mechanism the current `display:none`
  pattern relies on — the front need not change.
- `visibility:hidden` also removes the subtree from pointer events + the a11y tree at rest =
  exact reachability + a11y parity with `display:none`. No `aria-hidden`, no JS, no new attribute.

**Front-side assertion (this subtask):** render a menu-document header with
`flyoutAnimation:"slide"` and assert the emitted `<style>` (from `buildMenuDocumentCss`, @584)
carries the R2 keyframe states against the TWO DISTINCT selectors 508-02 actually emits
(`flyoutAnimRule`, `menuDocumentCss.ts` @641-667) — the REST keyframe and the SHOWN keyframe do
NOT share a selector:
- REST keyframe (`display:grid;visibility:hidden;opacity:0` [+`transform:translateY(-6px)` for
  slide]) rides the NON-`:hover` `sub` selector — L1 `${menuDocScope} .site-nav-list >
  .site-nav-item > .site-nav-sublist` (@646), L2 `${menuDocScope} .site-nav-list > .site-nav-item
  > .site-nav-sublist .site-nav-sublist` (@650);
- SHOWN keyframe (`visibility:visible;opacity:1;transform:none`) rides ONLY `shownSel` =
  `${openParent}:hover > .site-nav-sublist,${openParent}:focus-within > .site-nav-sublist` (@661);
- plus the `.site-nav-link` / `.site-nav-sublist` hooks it targets.

NOTE: the reveal fires on the sublist-bearing group `<li>`,
which DOES carry `data-site-nav-group="true"`, but `flyoutAnimRule` (508-02, `menuDocumentCss.ts`
@641-667) emits the bare `.site-nav-item` child-combinator chain shown above — NOT the
attribute-qualified `[data-site-nav-group="true"]` form — so any coherence assertion must match
the emitted string (or DERIVE it from the CSS), never a hardcoded attribute selector. I.e. every
selector 508-02 emits resolves to a node that `SiteHeaderMenuDocumentRender` actually renders (no
dangling selector). This is a front↔CSS coherence guard, not a re-test of 508-02's string.

---

## Execution-ready contract

### Step 1 — Formal no-hook proof (primary; expected the whole subtask)

Assert (in code + in `tests/unit/site/menu-document-render.test.tsx`, the front render suite)
that `SiteHeaderMenuDocumentRender` output for a document carrying ALL new fields is markup-
byte-identical (modulo the `<style>` body, which 508-02 owns) to a no-override document:

```ts
// pseudocode — front regression assertions (bun render suite)
const base    = makeMenuDocV2();                                  // no overrides
const decked  = withNavChrome(base, { submenuDirection: "down", submenuMode: "accordion" });
const decked2 = withLevelStyle(decked, 1, { linkAlign: "center" });
const decked3 = withFlyoutAnimation(decked2, "slide");

const htmlBase = renderToStaticMarkup(<SiteHeaderMenuDocumentRender document={base}   navigation={nav} />);
const htmlDeck = renderToStaticMarkup(<SiteHeaderMenuDocumentRender document={decked3} navigation={nav} />);

// (a) MARKUP identical after stripping the <style>…</style> body (CSS is 508-02's territory)
expect(stripStyleBody(htmlDeck)).toBe(stripStyleBody(htmlBase));   // ZERO new class/attr/aria on the tree

// (b) The <li>/<a>/<span>/<ul> hooks every 508 selector needs are present
expect(htmlDeck).toContain('class="site-nav-list" data-site-nav-list="true"');
expect(htmlDeck).toMatch(/<li class="site-nav-item" data-site-nav-group="true">/);
expect(htmlDeck).toMatch(/<span class="site-nav-link site-nav-group-label" tabindex="0">|class="site-nav-link"/);
expect(htmlDeck).toContain('class="site-nav-sublist"');

// (c) doc-scope stamp present so the 508-02 sheet applies
expect(htmlDeck).toContain(`${SITE_MENU_DOC_ATTRIBUTE}="true"`);   // data-site-menu-doc @582
```

**Byte-identity guards (front side):**
- `buildSiteShellCss(null)` is untouched — `siteShellCss.ts` is NOT edited by ANY 508 subtask;
  assert the front head (frozen base sheet) is unchanged via the existing
  `tests/unit/pages/siteShellCss.test.ts` (ZERO edits — the guard's own value).
- No-override menu-document render is byte-identical to pre-TASK-508
  (`tests/unit/site/menu-document-render.test.tsx`), because present-only emission means an
  unauthored doc's `<style>` body is byte-identical (508-02) AND the markup never changed here.

### Step 2 — Canvas-preview parity ENUMERATION handed to 508-04 (no code here)

The in-canvas preview markup lives in `core/admin/ui/menus/MenuDesignEditor.tsx`
(`renderPreviewNavItem` **@622-648**, mounted under `.site-nav-list` **@657** inside the
`SITE_MENU_DOC_ATTRIBUTE`-stamped preview host **@803**) — that file is **508-04's** single-
writer territory. `renderPreviewNavItem` already mirrors the front markup EXACTLY (verified:
`li.site-nav-item[data-site-nav-group]` **@626-627** > `a.site-nav-link` / `span.site-nav-link
.site-nav-group-label[tabIndex=0]` **@635** > nested `ul.site-nav-sublist` **@640-642**;
grandchildren never dropped, comment **@616-620**). Parity contract for 508-04:

1. **Mirror any hook.** Since Step 1 proves NO front hook is needed, 508-04 needs NO
   `renderPreviewNavItem` markup change either — the mirror already carries every selector.
   (If Step 1 is forced to add a front hook, 508-04 MUST replicate it in `renderPreviewNavItem`,
   byte-for-byte, or canvas↔front diverge.)
2. **Force-open sim visualizes direction + accordion + animation.** The preview flattens the
   sheet via `buildMenuDocumentPreviewCss` and force-opens the chain via `previewForceOpenLevel`
   (`menuDocumentCss.ts` @1250, 508-02-updated). 508-04's canvas must show: (a) the R2 flyout
   OPEN and animatable — requires 508-02's `previewForceOpenLevel` `visibility:visible` addition
   (else force-open shows the flyout hidden); (b) `submenuDirection` anchoring at every forced
   depth (level 0/1/2 chooser drives `forceOpenLevel`); (c) accordion in-flow push-down (the
   force-open `display:grid` + 508-02's `position:static` render the expansion inline). 508-04
   asserts the canvas force-open matches the front at each depth (508-05 smoke measures geometry).
3. **No preview-only selectors.** Direction/accordion/animation are all doc-scoped CSS on the
   shared markup, so canvas (flatten) and front (`@media`) come from the ONE builder — 508-04
   introduces no preview-only rule.

### Step 3 — Contingency: IF a minimal front hook is proven necessary (do NOT unless forced)

If (and only if) implementation demonstrates a field CANNOT be expressed on the existing
selectors, add the MINIMAL hook here, obeying:
- Prefer a `data-*` attribute on an EXISTING node (e.g. `data-site-nav-list` already exists
  @476/@347) over a new class or element — attributes don't perturb the frozen base sheet.
- The attribute MUST be inert for no-override docs: emit it only when the corresponding field is
  present (mirror `data-menu-block-id`'s presence-gated pattern), so `buildSiteShellCss(null)`
  and no-override render stay byte-identical.
- Replicate it in `renderPreviewNavItem` (508-04) in the SAME commit-order dependency.
- **Assessment from research: NONE of `linkAlign` / `submenuDirection` / `submenuMode` / R2 need
  a hook** — accordion's `position:static` + `flex-direction:column`, direction's offset rewrites,
  linkAlign's `text-align`, and R2's `visibility` all target existing `.site-nav-*` selectors.
  Step 3 is expected to be a no-op; it exists so 508-03 is the formal home if reality differs.

### Error handling (front)

- The front renders published-only; a malformed stored document is already fail-closed by the
  stored-read normalizer (508-01) BEFORE it reaches `SiteHeaderMenuDocumentRender`, so the front
  never sees raw/unknown keys — no new guard needed here.
- An unset field ⇒ 508-02 emits ZERO bytes ⇒ the `<style>` body is byte-identical ⇒ the front
  tree is unchanged. No front-side conditional is added.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure render/coherence; owned/handed to 508-05):**
- `tests/vitest/site/menu-document-css.test.ts` (front↔CSS coherence, no Bun): for a doc with
  each new field set, assert every selector 508-02 emits is one the front markup provides —
  `linkAlign` → `.site-nav-link`; `submenuDirection` rules → `.site-nav-list > .site-nav-item >
  .site-nav-sublist` and the anchored (0,5,0) nested form; accordion → `.site-nav-list` +
  `.site-nav-sublist`; R2 → the emitted `${menuDocScope} .site-nav-list > .site-nav-item:hover >
  .site-nav-sublist` / `:focus-within > .site-nav-sublist` reveal (the group `<li>` also carries
  `data-site-nav-group="true"`, but `flyoutAnimRule` emits the bare `.site-nav-item`
  child-combinator chain, NOT the attribute-qualified form — match/derive the emitted string) (no
  dangling selector). This is a coherence guard, NOT a re-assert of 508-02 strings.

**Bun lane (front render / route parity):**
- `tests/unit/site/menu-document-render.test.tsx` — the Step-1 front regression assertions:
  (a) MARKUP byte-identity between an all-fields-set doc and a no-override doc after stripping
  the `<style>` body (**no new class/attr/aria on the tree — the byte-identity front guard**);
  (b) the `.site-nav-list`/`.site-nav-item[data-site-nav-group]`/`.site-nav-link`|group-label
  span[tabindex=0]/`.site-nav-sublist` hooks are all present; (c) `data-site-menu-doc="true"`
  scope stamp present; (d) `flyoutAnimation:"slide"` render — the `<style>` body carries the R2
  keyframe states on the TWO DISTINCT selectors 508-02 emits: the REST keyframe
  (`display:grid;visibility:hidden;opacity:0` [+`transform:translateY(-6px)` for slide]) on the
  NON-`:hover` `sub` selector `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist`
  (L1) / `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist`
  (L2), and the SHOWN keyframe (`visibility:visible;opacity:1;transform:none`) on the
  `:hover`/`:focus-within > .site-nav-sublist` reveal selector — the rest `display:grid` is
  load-bearing: it OVERRIDES `navNestingRules`' closed `.site-nav-sublist{display:none}`
  (`menuDocumentCss.ts` @1040), and a `display:none` box CANNOT interpolate opacity/transform
  (the reveal would snap), so this assertion locks perceptible motion at render time rather than
  green-lighting an inert `display:none` implementation — both emitted as bare `.site-nav-item`
  child-combinator chains (NOT the `[data-site-nav-group="true"]` attribute form; assert the rest
  decls against the NON-hover `sub` rule block and the shown decls against the `:hover`/
  `:focus-within` rule block — never the rest keyframe inside the `:hover` block), with
  NO `@starting-style`/`allow-discrete`/`display …ms` bytes (front-side reachability + motion
  coherence, NOT a bare transition-string check); (e) accordion + direction + linkAlign set
  together render the SAME tree (no markup perturbation), and a flyout-mode doc's `<style>`
  carries ZERO accordion/direction bytes (present-only front proof).
- `tests/unit/pages/siteShellCss.test.ts` — the `buildSiteShellCss(null)` byte-identity guard
  changes by **ZERO lines** (frozen base sheet untouched; the named front invariant).

**Reject-unknown / name byte-identity note (front relevance):** the fail-closed READ-trap
round-trip tests for `linkAlign` / `submenuDirection` / `submenuMode` live in 508-01/508-05
(model), but the front render suite (b)/(d)/(e) above is the DOWNSTREAM proof that a doc
carrying those keys survives normalize→render with the class/attr NAMES byte-identical — a
forgotten allowlist key would surface here as a doc that renders with the field silently
dropped (zero emitted bytes for a set field), catching the READ trap from the render side.

**The ≥5-scenario SMOKE is authored in 508-05** (owner mandate), not here; 508-03 supplies the
front-side geometry hooks it measures (front render + `data-site-menu-doc` scope + the group
`<li>` reveal trigger) and the parity contract it asserts against the canvas.

---

## Single-writer & land order (from the parent board)

- **Single writer:** `core/site/siteShell.tsx` = **508-03** (this task; expected ZERO edits).
  No overlap with 508-01 (`menuDocumentV2.ts`), 508-02 (`menuDocumentCss.ts`), 508-04
  (`MenuDesignEditor.tsx` — owns `renderPreviewNavItem`), or the frozen `siteShellCss.ts`.
- **Land order (strictly sequential; each green before the next opens):** 508-01 → 508-02 →
  **508-03** → 508-04 → 508-05. 508-03 depends on 508-01 (fields exist) + 508-02 (the
  `buildMenuDocumentCss` output the front injects); it lands the front no-hook proof + front
  regression assertions BEFORE 508-04 wires the editor/canvas that mirrors this parity.

---

## Documentation Updates Required

Rolled into 508-05's closure (this subtask contributes the front-parity note):
- `_docs/PAGE_MODEL.md` — a line confirming the TASK-508 fields need NO front markup change (the
  recursive `.site-nav-*` structure + `data-site-menu-doc` scope already carry them) and the R2
  `visibility:hidden` reachability parity with `display:none`.
- `_docs/_CHANGELOG/` — the TASK-508 entry (**next free number = 1217**; verified fresh this run
  against `_docs/_CHANGELOG/` — highest existing = 1216 — re-verify at closure) records the front
  no-hook proof + the canvas-preview parity contract handed to 508-04.
- `_docs/_TASKS/README.md` — parent + child row bookkeeping is done by 508-05 (NOT this file).

---

## Acceptance Criteria

1. **No new front markup.** `SiteHeaderMenuDocumentRender` output for an all-fields-set doc is
   markup-byte-identical to a no-override doc (modulo the `<style>` body) — no new
   class/attr/aria on the nav tree.
2. **All 508 selectors resolve.** Every selector 508-02 emits (`linkAlign`, `submenuDirection`
   rules A/B, accordion, R2 flyout) targets a node the front markup renders — coherence guard
   green, no dangling selector.
3. **R2 reachability + perceptibility preserved.** With `flyoutAnimation` set, the `<style>`
   carries the `display:grid;visibility:hidden;opacity:0` rest state on the NON-`:hover` `sub`
   selector `${menuDocScope} .site-nav-list > .site-nav-item > .site-nav-sublist` (L1) /
   `... .site-nav-sublist .site-nav-sublist` (L2) (the `display:grid` OVERRIDES
   `navNestingRules`' closed `.site-nav-sublist{display:none}` @1040 — EXACTLY the declaration that
   makes fade/slide perceptible, since a `display:none` box cannot interpolate opacity/transform
   and would snap), and the `visibility:visible;opacity:1;transform:none` SHOWN state on the
   EXISTING group-`<li>` hover/focus-within reveal — emitted as
   the bare `${menuDocScope} .site-nav-list > .site-nav-item:hover`/`:focus-within >
   .site-nav-sublist` child-combinator chain (the group `<li>` carries `data-site-nav-group` but
   `flyoutAnimRule` does NOT attribute-qualify the selector; assert the rest decls against the
   NON-hover `sub` rule and the shown decls against the `:hover`/`:focus-within` rule — never the
   rest keyframe inside the `:hover` block); keyboard focus-within still opens the sublist (the
   `span[tabIndex=0]` hook unchanged).
4. **Byte-identity.** `buildSiteShellCss(null)` unchanged (`siteShellCss.ts` + its test ZERO
   edits); no-override menu-document render byte-identical.
5. **Parity contract enumerated for 508-04** (mirror hook — none needed; force-open sim shows
   direction/accordion/animation via 508-02's `previewForceOpenLevel` `visibility:visible`).
6. Gates green: `bun --cwd core lint`, `lint:types`, root `tsc -p tsconfig.json --noEmit`,
   `test:bun` (menu render suite), full vitest, `gates:coderso`.

---

## Affected Files (grounded)

- `core/site/siteShell.tsx` — **expected ZERO code changes**; 508-03 asserts no new
  markup/class/aria (the recursive `li.site-nav-item[data-site-nav-group] > (a.site-nav-link |
  span.site-nav-link.site-nav-group-label[tabIndex=0]) + ul.site-nav-sublist` structure @219-302
  + the `data-site-menu-doc` scope @582 already support every new field), `buildSiteShellCss(null)`
  + no-override render byte-identity. Contingency hook lands here ONLY if proven necessary. (508-03)
- `tests/unit/site/menu-document-render.test.tsx` — front regression assertions (markup
  byte-identity, hook presence, scope stamp, R2 keyframe coherence, present-only zero-byte). (508-03/05)
- `tests/vitest/site/menu-document-css.test.ts` — front↔CSS selector-coherence guard. (508-03/05)
- `tests/unit/pages/siteShellCss.test.ts` — `buildSiteShellCss(null)` byte-identity (ZERO edits). (guard)
- `core/admin/ui/menus/MenuDesignEditor.tsx` (`renderPreviewNavItem` @622-648) — NOT edited here;
  the canvas-preview parity contract is ENUMERATED for 508-04's single-writer implementation. (ref)
