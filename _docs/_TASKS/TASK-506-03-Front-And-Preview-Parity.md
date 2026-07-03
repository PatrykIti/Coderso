# TASK-506-03: Front & Preview Parity — No-Markup-Change Assertion + Byte-Identity Guards

# FileName: TASK-506-03-Front-And-Preview-Parity.md

**Parent Task:** TASK-506
**Priority:** High
**Category:** Site Front / Navigation / Menus / Responsive
**Estimated Effort:** Small
**Dependencies:** TASK-506-01 (model shapes + allowlists + F1/F2 helpers — lands first), TASK-506-02 (`buildMenuRuleSetsForDocument` emission for B1–B5 — the doc-scoped CSS this subtask asserts is byte-clean when unauthored). Rides the existing `SiteHeaderMenuDocumentRender` front path (TASK-499/504-03).
**Status:** ✅ Done
**Completed:** 2026-07-03 (changelog 1215)

---

## Objective

**Sole writer of `core/site/siteShell.tsx`.** Determine — and formally assert — whether
any of the five TASK-506 bundles (B1 separators, B2 indicator, B3 caret/flyout, B4 pill,
B5 nested placement) or the two foundations (F1 base-reset, F2 visible-default) require a
front markup / class / aria change. **Fresh research verified against source concludes:
NONE do.** Every structural hook the bundles need already exists in the rendered menu-document
tree. This subtask therefore:

1. **Asserts NO front markup/class/aria change** — `siteShell.tsx` lands with ZERO
   functional edits (a doc-comment note pointing at the 506 hooks is the only allowed touch).
2. Adds **front-side regression assertions** proving the required hooks are present and stable
   (`li[data-site-nav-group="true"]`, `a.site-nav-link` / `span.site-nav-link.site-nav-group-label`,
   nested `ul.site-nav-sublist`, `.site-nav-list`, `[aria-current="page"]`, `[data-menu-block-id]`).
3. Guards **`buildSiteShellCss(null)` byte-identity** and **no-override menu-document render
   byte-identity** — the frozen base sheet and the unauthored front sheet must not shift by one byte.
4. **Enumerates the canvas-preview parity requirements handed to 506-04** — (H1) `renderPreviewNavItem`
   (in `MenuDesignEditor.tsx`, NOT this file) must keep mirroring the front markup exactly, so any
   B1–B5 `::after`/border/positioning rule paints identically on canvas and front; AND (H2) the
   CSS-level force-open seam — `previewForceOpenLevel` (`menuDocumentCss.ts:894`) must be extended to
   NEUTRALIZE B3's `flyoutAnimation` rest-state on the force-opened chain by emitting the SAME shown
   values 506-02's rest-state mechanism uses. **506-02 is the sole owner of that rest-state decision**
   and has ADOPTED the `display …ms allow-discrete` + `@starting-style` + opacity/transform reveal (NOT a
   `visibility` toggle) — so under that adopted mechanism the neutralizer is
   `display:grid;opacity:1;transform:none` (NO `visibility`, matching 506-02:569/575). H2 MUST track
   506-02's rest-state, not re-decide it (§H2 note); else the animated flyout renders BLANK on canvas
   despite being structurally open.

> **Escape hatch (kept explicit).** If, during 506-02 impl, ANY bundle is proven to need a
> data-attribute hook (e.g. a `data-*` on the pill wrapper or a caret target that pure CSS on the
> existing classes cannot reach), THAT hook lands HERE (this is the single-writer of `siteShell.tsx`),
> minimally, and MUST keep `buildSiteShellCss(null)` byte-identical + mirror into `renderPreviewNavItem`
> (handoff to 506-04). Default expectation, per the research below: no hook needed.

---

## Security Contract

**UI/client-state + schema-first document-contract extension; no new
route/RBAC/endpoint/migration.** This subtask renders published-document markup only; it adds
no field, no allowlist key, no normalizer, no route. The front already renders published-only
(`SiteHeaderMenuDocumentRender`) and stamps `aria-current="page"` front-only from the resolved
active path (`siteShell.tsx:556,212`) — absent/null `activePath` ⇒ zero stamps ⇒ byte-identical
render. NO `menuDocumentV2` `schemaVersion` bump. All new CSS stays inside the
`[data-site-menu-doc="true"]`-scoped document sheet emitted by 506-02.

---

## Research Grounding (verified against source this run — line-referenced)

Menu/site files read fine with `Read` + `grep -an`; `rg` binary-sniffs them (do not trust `rg`).

### Front render path — `core/site/siteShell.tsx` (623 lines)

- **`SiteHeaderMenuDocumentRender` @535-601** — the menu-document front entry. Emits
  `<header class="site-header" data-site-header="true" data-site-menu-doc="true">` @560-563 (the
  `data-site-menu-doc="true"` @562 is the CSS scope boundary `menuDocScope`), injects
  `<style>{buildMenuDocumentCss(document)}</style>` @564, then maps
  `document.sections[0].blocks` @557/566 through a `switch` @567.
- **`NavItemsRender` @447-467** → `<nav class="site-nav" data-site-nav="true"
  data-menu-block-id={blockId}>` @451 (block-id on the `<nav>` LANDMARK, NOT on `.site-nav-list`),
  then `<ul class="site-nav-list" data-site-nav-list="true">` @456 mapping items with
  `interaction="hover"`.
- **`SiteNavItem` @219-302 (hover mode):**
  - LEAF @235-242: `<li class="site-nav-item"><a class="site-nav-link" …></li>` (returns null if no
    real href @236).
  - GROUP hover @284-301: `<li class="site-nav-item" data-site-nav-group="true">` @285 — the group
    hook is a **data-attr on the `<li>`**, not a `.site-nav-group` class (contrast the legacy
    `<details class="site-nav-group">` details-mode path @270, unused by the menu-document). Parent
    renders ONCE: real href ⇒ `<a class="site-nav-link">` @287; linkless ⇒
    `<span class="site-nav-link site-nav-group-label" tabIndex={0}>` @295 (BOTH classes so link rules
    hit it; `tabIndex=0` is the normative keyboard-open contract for `:focus-within`). Then the sublist.
  - sublist @244-265: `<ul class="site-nav-sublist">` @245; hover mode injects NO duplicate parent
    link (only the details-mode branch @246-255 does); children recurse ⇒ NESTED
    `<ul class="site-nav-sublist">` inside `<li class="site-nav-item" data-site-nav-group="true">`.
- **`SiteNavLink` @193-217** → `<a class="site-nav-link" data-site-nav-link="true"
  data-site-nav-variant=… aria-current={isCurrent?"page":undefined}>` @204-213.
- **aria-current stamp (504-03):** `resolveMenuActiveHref(items, activePath)` @138/556 →
  threaded as `activeHref` down the recursive tree → `SiteNavLink` @202 `isCurrent =
  activeHref!=null && normalizeNavPath(item.href)===activeHref` ⇒ `aria-current="page"` @212.
  Only real `<a>` links can win; the group-label `<span>` @295 never gets it. Null/absent
  `activePath` ⇒ zero stamps ⇒ byte-identical (guarded by `menu-document-render.test.tsx:111-124`).
- **Brand:** `<a class="site-header-brand" … data-menu-block-id={block.id}>` @498/512. Utility blocks
  stamp `data-menu-block-id` too @528; divider/spacer/cta go through `PageBlockFrame` @589 carrying
  `[data-block-id]` (menuDocumentCss dual-hides both).

### Per-bundle verdict — is a front markup/class/aria change needed? (ALL: **NO**)

| Bundle | Hook it needs | Already present? | Source anchor |
|--------|---------------|------------------|---------------|
| **B1** item separators | `li.site-nav-item:not(:last-child)` (level 0 bar + nested dropdown) | ✅ every level | `<li class="site-nav-item">` @242/285; nested @245+recurse |
| **B2** indicator / hover / lift | `.site-nav-link::before`, `:hover`, `.site-nav-link:where([aria-current="page"])` | ✅ | `a.site-nav-link` @205; span carries `.site-nav-link` @295; aria-current @212 |
| **B3** caret toggle + flyout anim | `li[data-site-nav-group="true"]>.site-nav-link::after` (caret target); `:hover`/`:focus-within` on `.site-nav-item` (zero-JS open) | ✅ | group `<li>` @285; `tabIndex=0` span @295 enables `:focus-within` |
| **B4** pill + dropdown padding | `.site-nav-list` (pill wrapper); `.site-nav-sublist` container | ✅ | `.site-nav-list` @456; nested `.site-nav-sublist` @245 |
| **B5** nested placement | `.site-nav-list > .site-nav-item > .site-nav-sublist .site-nav-sublist` (anchored 0,5,0) | ✅ (structure exists; positioning is doc-scoped CSS only) | nested `<ul class="site-nav-sublist">` @245+recurse |
| **F1** base-reset | — model/editor only | n/a | no front/CSS structural change |
| **F2** visible-default | — model/editor only | n/a | F2 reads the same ranges/defaults the CSS builder uses |

**All B1–B5 are pure CSS** (`::after` bars, `border-inline-end`/`border-block-end`, positioning,
and — for B3 `flyoutAnimation` — the `opacity`(+`transform`) reveal mechanism 506-02 OWNS and has
adopted: `display …ms allow-discrete` + `@starting-style` layered over the existing `display:none→grid`
toggle, NOT a `visibility` swap) on **existing classes + existing
`:hover`/`:focus-within`/`[aria-current="page"]` hooks**, emitted from the doc-scoped 506-02 sheet.
No new markup, class, or aria attribute is required.

### Byte-identity boundaries this subtask guards

- **Frozen base sheet `core/site/siteShellCss.ts` (211 lines) — ZERO edits.** `buildSiteShellCss(null)`
  must stay byte-identical (`tests/unit/pages/siteShellCss.test.ts` ZERO edits). It emits the default
  chrome (`.site-nav-sublist{…padding:6px;display:grid;gap:2px;min-width:180px}` @151; first-level
  absolute position @157; `.site-nav-group>summary::after{content:" \25BE"}` @150; nested
  `.site-nav-sublist .site-nav-sublist{padding-left:16px}` @171). The base sheet emits NO
  nested-nested *positioning* rule (confirmed) — so B5's nested placement is fully owned by 506-02's
  `navNestingRules` doc-scoped override with no base-sheet conflict. TASK-506 adds ZERO lines here.
- **No-override menu-document render — byte-identical.** `tests/unit/site/menu-document-render.test.tsx`
  already holds the byte-identity guards: `GOLDEN_FRONT_CSS` (`buildMenuDocumentCss(buildDoc())` @325),
  the `data-site-nav-group="true"` markup shape @93/98, the caret golden line @262, and the
  null-activePath byte-identity @111-124/@144. Present-only 506 emission ⇒ zero new bytes when unauthored,
  so these goldens do NOT change for an un-styled doc.

### Canvas-preview parity (handoff enumerated for 506-04)

- `renderPreviewNavItem` lives in `MenuDesignEditor.tsx` (canvas mirror), **NOT** in `siteShell.tsx`.
  It renders `<li class="site-nav-item" data-site-nav-group={children>0?"true":undefined}>`,
  `<a class="site-nav-link">` / `<span class="site-nav-link site-nav-group-label" tabIndex={0}>`, and
  nested `<ul class="site-nav-sublist">` — **mirroring the front EXACTLY**. Because 506-03 adds no
  front markup, 506-04's canvas mirror also needs no *structural/markup* change. **If the escape hatch
  fires** (506-03 adds a front data-attr), 506-04 MUST add the identical attribute to
  `renderPreviewNavItem` or the front/canvas diverge. This subtask emits that requirement as a named
  handoff (**H1**, §Handoff).
- **CSS-level force-open seam (NEW, handed as H2).** Markup mirroring is NECESSARY but NOT SUFFICIENT
  for canvas parity. `previewForceOpenLevel` (`menuDocumentCss.ts:894`) force-opens the ancestor chain
  with `display:grid` ONLY. Once B3 `flyoutAnimation` lands it defaults the sublist to a hidden rest
  state, which 506-02 (the sole owner of the rest-state mechanism) has ADOPTED as
  `opacity:0`(+`transform:translateY(-6px)` for slide) revealed via `transition:…,display …ms
  allow-discrete` + a matching `@starting-style` block layered over the `display:none→grid` toggle (NOT
  a `visibility` swap, and NOT a plain opacity transition that would snap on open — see 506-02:338-408),
  so a force-opened flyout stays STRUCTURALLY open but VISUALLY BLANK on the canvas — authors can't see
  the styled separators/indicator/nested-placement/animation while styling. 506-02 must extend
  `previewForceOpenLevel` to also force the SHOWN state matching its adopted rest-state — under the
  adopted `allow-discrete`/`@starting-style` mechanism that is `display:grid;opacity:1;transform:none`
  (NO `visibility`) LAST on the force-opened chain (506-02 is the sole writer of `menuDocumentCss.ts`
  and already emits this at 506-02:569/575; 506-04 only threads the level). This is a CSS/canvas concern
  (owned by 506-02), NOT a `siteShell.tsx` edit, but it is enumerated here as handoff **H2** so the
  canvas implementer does not miss it.
  > **Cross-subtask reconcile (B3 rest-state — decide ONCE in 506-02).** The force-open neutralization
  > and the B3 rest state are COUPLED: the neutralizer only reveals the flyout if it forces the exact
  > properties 506-02's rest state hides. 506-02 has adopted the `display …ms allow-discrete` +
  > `@starting-style` + opacity/transform mechanism (compatible with the existing `display:none`
  > reveal, and it reserves no layout space), so the neutralizer forces `opacity:1;transform:none` and
  > NOT `visibility`. **506-02 and 506-03 MUST agree on the same rest-state.** If 506-02 ever switched to
  > a `visibility:hidden` rest state instead, this H2 neutralization would leave the flyout
  > `visibility:hidden` (blank) on the canvas and MUST then also force `visibility:visible`. Do not let
  > this file independently re-prescribe the mechanism against 506-02.

---

## Implementation Pseudocode (execution-ready)

**Implement order:** lands AFTER 506-01 (model) and 506-02 (CSS) are green. This subtask is
assertion-first — write the regression tests, run them against the UNCHANGED `siteShell.tsx`,
confirm green, and only edit `siteShell.tsx` if a test proves a missing hook.

### Step 1 — Confirm the no-change verdict against live 506-02 emission

```
# after 506-02 lands, dump the doc-scoped sheet for a doc that styles B1..B5 across levels 0/1/2
# and confirm EVERY new rule keys ONLY off existing selectors/attrs:
grep -aoE '\[data-site-menu-doc="true"\][^{]*' <emitted-css> \
  | grep -vE '\.site-nav-(link|list|item|sublist|group-label)|\[data-site-nav-group|\[aria-current="page"\]|\[data-menu-block-id\]|:hover|:focus-within|:not\(:last-child\)|::after|summary'
# EXPECT: empty output. Any line ⇒ a selector needs a markup hook ⇒ escape hatch (Step 3).
```

### Step 2 — `siteShell.tsx`: doc-comment note ONLY (no functional edit)

Add a single grounding comment above `SiteHeaderMenuDocumentRender` (or extend the existing
@34-52 block) enumerating the 506 hooks the doc-scoped sheet relies on, so a future editor does
not "clean up" a load-bearing class/attr:

```tsx
/**
 * TASK-506 front-hook contract (asserted no-change): B1–B5 are PURE CSS from the
 * doc-scoped sheet on EXISTING hooks — do not remove:
 *   li.site-nav-item[:not(:last-child)]        (B1 separators, every level)
 *   li[data-site-nav-group="true"]             (B3 caret target + :hover/:focus-within open)
 *   a.site-nav-link / span.site-nav-link.site-nav-group-label[tabIndex=0]  (B2 ::before, B3 focus-within)
 *   ul.site-nav-sublist (nested)               (B4 container padding, B5 placement)
 *   .site-nav-list                             (B4 pill wrapper)
 *   .site-nav-link:where([aria-current="page"])(B2 indicator-on-current, 504-03)
 * NO new markup/class/aria for 506; see TASK-506-03.
 */
```

This is the only permitted touch to the file. It changes zero rendered bytes.

### Step 3 — Escape hatch (ONLY if Step 1 finds an unreachable selector)

If a bundle genuinely needs a hook (do NOT invent one speculatively):

```
- Add the MINIMAL data-attr (never a new class that could alter cascade), e.g.
  <ul className="site-nav-list" data-site-nav-list="true" data-menu-nav-pill={pillOn ? "true" : undefined}>
  → present-only (undefined ⇒ attribute absent ⇒ byte-identical when unauthored).
- Re-run buildSiteShellCss(null) byte-identity (must be unaffected — base sheet untouched).
- Re-run no-override render byte-identity (attr must be `undefined`/absent for an unstyled doc).
- HANDOFF: mirror the identical attr into renderPreviewNavItem (MenuDesignEditor.tsx) — 506-04.
- Document the hook + its trigger field in the 506-05 changelog.
```

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free — pure render/CSS):**

- **`tests/unit/site/menu-document-render.test.tsx`** (extend; do NOT rewrite the goldens):
  - **Front-hook presence (new).** Render a **DEDICATED level-2 fixture** through
    `SiteHeaderMenuDocumentRender` — **NOT** the shared `navigation` (@29-45), which is one level
    deep and gives EVERY group parent an href, so it never reaches the linkless
    `span.site-nav-group-label` branch (`siteShell.tsx:295`) and yields exactly ONE
    `.site-nav-sublist`. The file already ships two suitable dedicated fixtures — reuse them (or an
    equivalent local `deepNavigation`): `threeLevelNav` (@803-818, a two-deep child branch with a
    linked group parent) for the linked-group + nested-sublist-depth assertions, and
    `linklessGroupNav` (@820-829, an `href:"#"` parent) for the linkless variant. Assert the
    required hooks exist and are stable:
    - `expect(html).toMatch(/<li class="site-nav-item" data-site-nav-group="true"><a class="site-nav-link"/)` (linked group — from `threeLevelNav`) AND the linkless variant `/<span class="site-nav-link site-nav-group-label"[^>]*tabindex="0"/` (from `linklessGroupNav`).
    - nested sublist depth: at least two `<ul class="site-nav-sublist">` for the level-2 `threeLevelNav` tree.
    - `.site-nav-list` present exactly once per nav-items block; `[data-menu-block-id]` on the `<nav>`.
  - **Shared-fixture immutability (guard, new).** The shared `navigation`/`buildDoc()` fixtures MUST
    NOT be mutated to reach these hooks (do NOT add a grandchild or a linkless parent to `navigation`):
    the CSS goldens (@325) are item-independent and safe, but the markup golden (@66-108) and the
    aria-current byte-identity tests (@111-144) are byte-pinned to the current `navigation` shape, and
    mutating it would break the very byte-identity guards this subtask is chartered to protect
    (self-contradiction with §214 "stays green ZERO edits" and guards #2/#5).
  - **No-override byte-identity (existing @325, must stay green ZERO edits):**
    `expect(buildMenuDocumentCss(buildDoc())).toBe(GOLDEN_FRONT_CSS)` and the preview goldens @326-328
    — proves an unstyled 506 doc emits zero new bytes.
  - **aria-current byte-identity (existing @111-124/@144, stays green):** null `activePath` ⇒ no
    `aria-current="page"`; the only delta of a stamped render is the attribute string.
  - **Markup-unchanged guard (new).** Render the SAME `buildDoc()` tree that a fully-B1–B5-styled doc
    would use vs the un-styled doc; assert the **markup string is identical** (styling changes only the
    `<style>` block, never the DOM) — i.e. strip the `<style>…</style>` and assert markup equality.
- **`tests/unit/pages/siteShellCss.test.ts`** — **byte-identity guard changes by ZERO lines**
  (named guard: `buildSiteShellCss(null)` unchanged; base sheet `siteShellCss.ts` untouched).

**Bun lane:** none new for this subtask (no route/runtime surface added by the front assertion).
The full render byte-identity is covered above; the route-persistence + smoke live in 506-05.

**Named guards owned by 506-03:**
1. `buildSiteShellCss(null)` ZERO-line diff (base sheet frozen).
2. No-override menu-document render byte-identical (front + preview goldens unchanged).
3. Front markup identical between styled and un-styled doc (styling is CSS-only).
4. Required front hooks present + stable (`li[data-site-nav-group]`, `.site-nav-link` /
   `.site-nav-group-label[tabindex=0]`, nested `.site-nav-sublist`, `.site-nav-list`,
   `[aria-current="page"]`, `[data-menu-block-id]`).
5. aria-current front-only byte-identity (null activePath ⇒ zero stamps).
6. Canvas-preview parity handoff to 506-04 recorded — BOTH the markup mirror (renderPreviewNavItem
   mirrors any future hook) AND the CSS force-open seam (`previewForceOpenLevel` must neutralize B3's
   animation rest-state by forcing the SHOWN state that matches 506-02's adopted rest-state — under
   506-02's `allow-discrete`/`@starting-style` mechanism that is `display:grid;opacity:1;transform:none`,
   NO `visibility` — on the force-opened chain, else the animated flyout renders blank on canvas; 506-02
   OWNS the rest-state decision and the two subtasks MUST agree on it).

---

## Handoff to 506-04 (canvas-preview parity)

**H1 — markup mirror (structural).** `renderPreviewNavItem` (MenuDesignEditor.tsx) must keep
byte-mirroring the front markup emitted by `SiteHeaderMenuDocumentRender`:
`li.site-nav-item[data-site-nav-group]`, `a.site-nav-link` /
`span.site-nav-link.site-nav-group-label[tabIndex=0]`, nested `ul.site-nav-sublist`. Since 506-03
adds no front hook, 506-04's mirror needs no structural change — but if the escape hatch fires, the
identical data-attr MUST be added to the preview mirror, else front @media and canvas flatten diverge.

**H2 — force-open must NEUTRALIZE B3's animation rest-state (CSS/canvas, not siteShell.tsx).**
`previewForceOpenLevel` (`menuDocumentCss.ts:894`) currently forces ONLY `display:grid` on the
force-opened ancestor chain. **506-02 OWNS the B3 rest-state mechanism decision** and has ADOPTED the
`display …ms allow-discrete` + `@starting-style` + opacity/transform reveal (NOT a `visibility` swap):
it defaults the sublist to a rest state of `opacity:0`(+`transform:translateY(-6px)` for slide) that
reveals via `transition:…,display …ms allow-discrete` + a matching `@starting-style` block layered over
the `display:none→grid` toggle (allow-discrete makes the discrete flip participate; never a plain
opacity transition that snaps on open — see 506-02:338-408), so once B3 lands, forcing `display:grid`
alone leaves the flyout structurally open but VISUALLY BLANK on the canvas — authors cannot see the
styled separators/indicator/nested-placement/animation while styling. 506-02 MUST extend
`previewForceOpenLevel` to also force the SHOWN state matching its adopted rest-state; under that
adopted mechanism that is `display:grid;opacity:1;transform:none` (NO `visibility`) on the force-opened
chain, emitted LAST so it beats the animation's rest default (506-02 already emits this at
506-02:569/575) — otherwise the animated flyout renders blank on canvas, violating the TASK-506
"canvas must FORCE-OPEN so authors SEE" invariant and breaking front(hover-reveals) /
preview(force-open) parity. **This H2 neutralization is COUPLED to 506-02's rest-state: the two
subtasks MUST agree on the SAME rest-state or the canvas neutralization is wrong.** 506-03 does not
re-decide the mechanism here — it tracks 506-02's adopted decision. (Were 506-02 to ever adopt a
`visibility:hidden` rest state instead, this H2 would additionally have to force `visibility:visible`,
else the force-opened flyout stays blank.) This is a CSS/canvas concern (506-02 emits the animation
default AND owns `previewForceOpenLevel` as sole writer of `menuDocumentCss.ts`; 506-04 only threads
the level) — NOT a `siteShell.tsx` edit — but it is recorded here because this is the
parity-enumeration subtask and the canvas implementer must not miss it.

---

## Acceptance Criteria

1. `siteShell.tsx` has ZERO functional edits (doc-comment note only); rendered bytes unchanged.
2. `buildSiteShellCss(null)` byte-identical (`siteShellCss.test.ts` ZERO-line diff).
3. No-override menu-document render byte-identical (front + preview goldens unchanged).
4. All required front hooks asserted present + stable by the new regression tests.
5. Front markup identical between a fully-styled and an un-styled 506 doc (CSS-only styling).
6. Gates green: `bun --cwd core lint`, `lint:types`, root `tsc -p tsconfig.json --noEmit`,
   `test:bun`, full vitest, `gates:coderso`.

---

## Affected Files

- `core/site/siteShell.tsx` — expected ZERO functional change (doc-comment 506-hook note only);
  escape-hatch data-attr lands here ONLY if a 506-02 selector proves unreachable. (506-03, sole writer)
- `tests/unit/site/menu-document-render.test.tsx` — front-hook presence + markup-unchanged + existing
  byte-identity goldens (extend, keep goldens). (506-03)
- `tests/unit/pages/siteShellCss.test.ts` — byte-identity guard, ZERO-line diff. (506-03)
