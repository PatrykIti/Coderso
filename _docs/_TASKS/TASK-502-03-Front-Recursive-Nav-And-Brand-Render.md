# TASK-502-03: Front — Recursive Nav & Brand Render
# FileName: TASK-502-03-Front-Recursive-Nav-And-Brand-Render.md

**Priority:** High
**Category:** Site Front / Navigation / Content (Menus)
**Estimated Effort:** Medium
**Dependencies:** TASK-502-01 (`brand.props.text` + `"tablet"` in `MENU_RESPONSIVE_BREAKPOINT_KEYS` + generalized `hasMenuBlockVisibilityOverride`/`resolveMenuBlockVisibleForDevice`), TASK-502-02 (doc-scoped sublist hide/open + nested fly-out rules that gate this subtask's hover markup), TASK-499-04 (`SiteHeaderMenuDocumentRender`), TASK-501-02 (render-if-visible-anywhere gate)
**Status:** ⏳ To Do
**Parent Task:** TASK-502

---

## Overview

Front render half of parent bugs **7 (nested submenus flattened)** and
**1 (brand text)**. **SOLE WRITER of `core/site/siteShell.tsx`** — every
markup change 502-02's CSS needs lands here (per the parent reconcile); NO
other subtask touches this file.

Verified against source 2026-07-02 (`siteShell.tsx` is rg-binary — use
`Read`/`grep -an`):

1. **Nav flatten + duplication (bug 7).** `flattenNavigationDescendants`
   (`siteShell.tsx:97-107`) squashes every publicly visible descendant into
   ONE dropdown level, and `SiteNavItem:156`
   (`const entries = hasRealHref(item.href) ? [item, ...dropdownItems] : dropdownItems`)
   prepends a DUPLICATE parent link. `SiteNavItem` (`:143-172`) never
   recurses, and it is shared by BOTH front paths — legacy `SiteHeaderNav`
   (`:218-219`) and the document-driven `NavItemsRender` (`:316-318`) — so
   menu-document headers inherit the bug. The data pipeline is fully
   recursive and untouched (`treeBuilder.ts` unlimited depth,
   `navigationMenuMapping.ts:89-92` recurses); the loss is render-only.
2. **Brand text (bug 1, front side).** `BrandRender` (`:324-355`) text mode
   renders `{siteName}` only (`:349-353`, `if (!siteName) return null`);
   after 502-01 the block may carry a validated sparse `props.text` that must
   win over the site name.
3. **Tablet render gate (bug 2 consequence).** `shouldRenderMenuBlock`
   (`:283-286`) ORs desktop+mobile only. Its CONTRACT is unchanged (render
   iff visible on ≥1 device; `PageBlockFrame` flat-skip and `menuLeafToPageBlock`
   stay as-is — the front flat path is already correct per bug 6), but once
   502-01 makes a show-only-on-tablet block producible (flat `visible:false`
   + `responsive.tablet.visibility.visible:true`), the OR must enumerate
   tablet or 502-02's tablet-branch show rule has no DOM node to reveal. See
   work item 4 — verify-gated, derived from the model's key list.

**Out of scope:** the model (502-01 — this subtask only CONSUMES
`brand.props.text` and the tablet helpers); ALL CSS emission (502-02 owns
`menuDocumentCss.ts`; `siteShellCss.ts` is frozen — see the audit resolution
below); the Design editor canvas (502-04 mirrors this markup in
`NavItemsPreview` and the brand preview); brand text formatting (named
parent residual); `menu-drawer` (unchanged non-goal).

---

## Audit resolution (parent's EXPLICIT question): legacy header nesting

The parent delegates this decision here and RECORDS the answer in its
render-path-fork sketch ("Legacy nested-depth audit (DELEGATED to 502-03,
resolved THERE with base-sheet evidence — this sketch records the answer)");
parent Acceptance 8, its 502-03 summary bullet and its SSR test list all pin
the SAME resolution (reconciled — no flatten/duplication-survives language
remains anywhere in the parent). Resolved with base-sheet evidence,
**option (b): the legacy path keeps `<details class="site-nav-group">`,
applied recursively at every level.**

Proof that option (a) (plain hover markup everywhere) FAILS for the legacy
no-document header: sublist visibility today relies ENTIRELY on the native
`<details>` closed-state (UA-level content hiding). `buildSiteShellCss`
(`core/site/siteShellCss.ts`) contains **no sublist hide rule at any
breakpoint** — base `.site-nav-sublist` is `display:grid` (`:151`), desktop
adds `position:absolute;top:100%` (`:157`), mobile adds `padding-left:16px`
(`:171`); the only `display:none` rules target the mobile `.site-nav-list`
disclosure (`:167`) and the desktop `.site-nav-disclosure` (`:152`). Plain
`<ul>` submenus under a header styled ONLY by this frozen sheet would render
permanently open. Closed-`<details>` content also cannot be revealed by CSS,
so hover-open `<details>` is impossible without JS. Therefore:

- **Legacy `SiteHeaderNav` ⇒ `interaction="details"`:** recursive
  `<details>` per level, click-open, styled by the untouched base sheet.
  Base-sheet rules apply per depth by CLASS: nested `.site-nav-item` rows get
  `position:relative` (`:143`), nested `.site-nav-sublist` gets the grid +
  desktop absolute + mobile indent — nested dropdowns open below their row
  (reachable; fly-out polish is a doc-scoped-only feature). The documented
  linked-parent reachability convention (`:155`) is KEPT in this mode
  (summary is not a link): the parent renders as the FIRST entry of its own
  sublist — now its DIRECT sublist only, never flattened descendants.
  Conscious trade-off, comment-documented: the "label exactly once" guarantee
  is a hover-mode (menu-document) property; details mode trades it for parent
  reachability. Flip-point named for the auditor.
- **Menu-document `NavItemsRender` ⇒ `interaction="hover"`:** plain nested
  lists, NO `<details>`, NO duplication — hidden/shown per level exclusively
  by 502-02's doc-scoped rules (hide-by-default + `:hover`/`:focus-within`
  open + nested fly-out), which 502-02 MUST emit unconditionally in every
  doc-scoped sheet (front + preview) since this markup has no other
  visibility mechanism. `:focus-within` keeps keyboard reachability — for
  linked parents via the natively focusable anchor, and for linkless `#`
  groups ONLY because the group-label span carries `tabIndex={0}` (work
  item 1, parent NORMATIVE contract): children inside `display:none` cannot
  receive focus, so without that tabIndex the subtree would be
  keyboard-unreachable. Touch at ≥640px (no hover, no focus ring) has NO
  first-tap-opens semantics — conscious owner-approved parent residual (see
  Documentation Updates).

**`buildSiteShellCss(null)` does not change by one byte either way**
(`tests/unit/pages/siteShellCss.test.ts` diff = ZERO lines). Legacy headers
whose items have NO children render **byte-identical markup**; nested legacy
trees intentionally change (that IS the bug-7 fix — the recon reproduced the
flatten on `SiteHeaderNav` itself).

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — verified 2026-07-02: this subtask touches
ONLY server-rendered markup in `core/site/siteShell.tsx`. Zero server
surface, zero client JS added (the shell stays ZERO-JS: `<details>` native +
CSS-only hover), zero schema code (502-01 owns the model; `brand.text`
arrives already validated/trimmed/capped through the existing
`PATCH /menus/:id` envelope).

- **Brand text is React-escaped:** rendered as a JSX text child (no
  `dangerouslySetInnerHTML`), so the stored string can never inject markup;
  the 120-char cap + trim live in the 502-01 normalizer, re-trimmed here as
  defense in depth.
- **Brand href unchanged:** the existing `sanitizeAuthoringLinkHref` re-check
  at the DOM seam (`:335`) stays — no unsafe scheme reaches the anchor.
- **Fail-closed:** unreadable documents still never reach
  `SiteHeaderMenuDocumentRender` (resolver degrades to `null` ⇒ default
  path); `SiteNavItem` renders nothing for items that are neither linked nor
  ancestors of linked items (no empty dropdowns, no dangling toggles).
- **Front renders published-only** (unchanged).

---

## Work Items (execution-ready)

### 1. Recursive `SiteNavItem` — delete flatten + duplication (`siteShell.tsx:97-172`)

```tsx
// DELETE flattenNavigationDescendants (:97-107) and its doc comment (:92-96).
// DELETE the parent-duplication line (:156) — replaced per interaction mode.

type SiteNavInteraction = "details" | "hover";

// An item earns markup iff it links somewhere or shelters a descendant that
// does — preserves today's "no empty dropdowns" behavior at every depth.
const isRenderableNavItem = (item: NavigationItem): boolean =>
  hasRealHref(item.href) ||
  (item.children ?? []).some(
    (child) => isPubliclyVisibleNavigationItem(child) && isRenderableNavItem(child)
  );

const SiteNavItem = ({
  item,
  interaction = "details", // fail-safe default: works with the frozen base sheet alone
}: {
  item: NavigationItem;
  interaction?: SiteNavInteraction;
}) => {
  const children = (item.children ?? [])
    .filter(isPubliclyVisibleNavigationItem)   // hidden item hides its subtree (flatten parity)
    .filter(isRenderableNavItem);

  if (children.length === 0) {
    if (!hasRealHref(item.href)) return null;  // unchanged leaf semantics (:146-153)
    return (
      <li className="site-nav-item">
        <SiteNavLink item={item} />
      </li>
    );
  }

  const sublist = (
    <ul className="site-nav-sublist">
      {interaction === "details" && hasRealHref(item.href) ? (
        // Details-mode reachability convention (audit resolution): summary is
        // not a link, so the linked parent stays reachable as the FIRST entry
        // of its DIRECT sublist (never flattened descendants).
        <li className="site-nav-item">
          <SiteNavLink item={item} />
        </li>
      ) : null}
      {children.map((child, index) => (
        <SiteNavItem key={`${child.label}-${index}`} item={child} interaction={interaction} />
      ))}
    </ul>
  );

  if (interaction === "details") {
    return (
      <li className="site-nav-item">
        <details className="site-nav-group" data-site-nav-group="true">
          <summary>{item.label}</summary>
          {sublist}
        </details>
      </li>
    );
  }

  // hover mode (menu-document headers): parent renders ONCE as its own link
  // (or a plain group label when it links nowhere); 502-02's doc-scoped CSS
  // owns hide-by-default + per-level :hover/:focus-within open + fly-out.
  return (
    <li className="site-nav-item" data-site-nav-group="true">
      {hasRealHref(item.href) ? (
        <SiteNavLink item={item} />
      ) : (
        // BOTH classes — normative 502-02 Coordination contract: link
        // color/typography (and the caret) rules target .site-nav-link, so
        // group labels style without new appearance selectors.
        // tabIndex={0} — parent NORMATIVE keyboard contract: spans are not
        // focusable by default and children inside display:none cannot
        // receive focus, so without it 502-02's :focus-within open rule
        // could NEVER fire for this subtree (keyboard-unreachable; the
        // replaced <details>/<summary> was keyboard-operable).
        <span className="site-nav-link site-nav-group-label" tabIndex={0}>
          {item.label}
        </span>
      )}
      {sublist}
    </li>
  );
};
```

- `SiteHeaderNav` (`:218-219`) passes `interaction="details"` (or relies on
  the default); `NavItemsRender` (`:316-318`) passes `interaction="hover"`.
- `data-site-nav-group="true"` moves onto the `<li>` in hover mode so
  existing selectors/tests keep a stable group hook and 502-02 can target
  group rows (caret on the parent link/label, `position:relative` anchoring).
- Update the file-head pattern comment (`:31-39`): document the TWO
  interaction modes and why legacy keeps `<details>` (audit resolution
  summary + `buildSiteShellCss` freeze).
- Key pattern stays `` `${label}-${index}` `` (existing convention `:164/:219`).

### 2. `BrandRender` text fallback chain (`siteShell.tsx:324-355`)

```tsx
const BrandRender = ({ block, siteName }: { ... }) => {
  const href = sanitizeAuthoringLinkHref(block.props.href) ?? "/";   // unchanged (:335)
  if (block.props.mode === "image" && block.props.image) { ...unchanged... }
  // Fallback CHAIN (parent contract): per-menu override -> site name -> null.
  // 502-01 stores text trimmed/capped/sparse; trim again = defense in depth.
  const text = block.props.text?.trim() || siteName || null;
  if (!text) return null;
  return (
    <a className="site-header-brand" href={href} data-menu-block-id={block.id}>
      {text}
    </a>
  );
};
```

- The chain applies to text mode AND the image-mode-without-image
  fallthrough (same branch today, `:349-354`) — consistent with the canvas
  chain 502-04 renders (`block.props.text || siteName || "Site name"`), so
  canvas === front for every combination.
- Markup/classes byte-unchanged when `props.text` is absent (legacy docs
  render identically). No typography/formatting (parent residual).

### 3. Cross-file handshake (NORMATIVE for 502-02/502-04 — no code here)

The hover markup above is inert without these; name them so the audits can
check both sides:

- **502-02 (`menuDocumentCss.ts`) emits UNCONDITIONALLY in every doc-scoped
  sheet (front + canvas preview), ONLY inside the shared ≥640 branch:**
  sublist hide-by-default; per-level open
  (`.site-nav-item:hover>.site-nav-sublist`, `:focus-within` twin); nested
  fly-out (desktop/tablet, respecting `dropdownDirection`);
  `.site-nav-sublist>li{position:relative}`; caret + padding parity
  for the hover-mode parent link/label. The mobile (<640) branch carries NO
  sublist hide and NO un-hide — all levels stay inline-indented via the
  untouched base sheet (`display:grid` + cumulative `padding-left:16px`). **Hook reconcile (PINNED):** hover
  mode emits NO `.site-nav-group` class — the ONLY group hook is
  `data-site-nav-group="true"` on the parent `<li>`, so 502-02's caret rule
  targets `li[data-site-nav-group="true"]>.site-nav-link::after` (NOT
  `li.site-nav-group>`). One selector covers linked parents AND the linkless
  label because the label carries BOTH `site-nav-link site-nav-group-label`
  classes (work item 1) — the base sheet's link padding/color/typography
  (`siteShellCss.ts:144`) then applies with no new appearance selectors; the
  base sheet's own caret targets `summary::after` only (`siteShellCss.ts:150`).
- **SAME-COMMIT landing (NORMATIVE — mirrored verbatim in 502-02
  Coordination and the parent Sequencing):** 502-02's
  unconditional `.site-nav-sublist{display:none}` also matches TODAY'S
  details-based doc-header sublists, while its open rule
  (`.site-nav-item:hover>.site-nav-sublist`) does NOT (the current sublist is
  a child of `<details>`, not a direct `li` child) — shipped alone it blanks
  every published menu-document dropdown. NORMATIVE: 502-02's nested-sublist
  rule block and this subtask's hover markup land in the SAME commit
  (implementation order stays 502-02 → 502-03; the tree only ships with both
  halves). 502-02 emits NO transitional/interim rule, and this subtask never
  edits `menuDocumentCss.ts` — 502-02 stays its sole owner, no exception.
- **502-04 (`NavItemsPreview`)** mirrors this exact recursive
  class/attribute structure (`site-nav-item` / `data-site-nav-group` /
  `site-nav-sublist` / `site-nav-group-label`) so the doc-scoped rules apply
  identically on canvas. `tabIndex={0}` on the linkless group-label span is
  PART of the mirror — NOT an editor-optional attribute: 502-02 emits the
  `:focus-within` open rule in the canvas preview sheet too, and the parent's
  smoke scenario 7 asserts the `#` group label is keyboard-focusable, so a
  canvas span without it can never open its sublist by keyboard. 502-04's §8
  `renderPreviewItem` snippet must carry the attribute; a snippet omitting it
  is drift against this contract, not a conscious exception.
- **`menuLeafToPageBlock` (`:259-274`) stays MODULE-PRIVATE — NO export
  (RECONCILED; mirrored in the parent's render-path-fork note and 502-04
  Coordination):** 502-04's real-leaf cta/divider canvas preview does NOT
  import it — it ships a blessed LOCAL replica (`canvasMenuLeafToPageBlock`)
  with visibility hardcoded `{visible:true}`, because a verbatim import would
  carry the `:271-273` hand-off-to-CSS visibility skip into the canvas,
  fighting 502-04's ghost gate (the sole canvas visibility owner).
  Replica-vs-original drift is pinned by 502-04's vitest suite. This subtask
  ships NO export and no signature change; 502-04 never touches this file
  (single-writer intact).

### 4. `shouldRenderMenuBlock` — semantics unchanged, enumeration verify-gated (`siteShell.tsx:283-286`)

Contract UNCHANGED (render iff visible on ≥1 device; visible-on-NO-device ⇒
render-skipped; `PageBlockFrame` flat-skip + `menuLeafToPageBlock`'s
`hasMenuBlockVisibilityOverride` branch untouched — the flat front path is
already correct per parent bug 6). ONE mechanical, verify-gated extension:

```ts
// AFTER 502-01 lands "tablet" in MENU_RESPONSIVE_BREAKPOINT_KEYS, derive the
// enumeration from the model so the gate can never drift from the key list:
const MENU_RENDER_DEVICES = ["desktop", ...MENU_RESPONSIVE_BREAKPOINT_KEYS] as const;

const shouldRenderMenuBlock = (block: MenuBlockV2): boolean =>
  !hasMenuBlockVisibilityOverride(block) ||
  MENU_RENDER_DEVICES.some((device) => resolveMenuBlockVisibleForDevice(block, device));
```

- **Why:** a show-only-on-tablet block (flat `visible:false` +
  `responsive.tablet.visibility.visible:true`, producible via 502-04's
  Tablet toggle) resolves false on desktop AND mobile — the current OR would
  DOM-skip it and 502-02's tablet-branch show rule would have nothing to
  reveal (the exact bug shape 501-02 fixed for mobile).
- **Gate:** implement ONLY IF 502-01 ships the tablet visibility override as
  contracted (`resolveMenuBlockVisibleForDevice(block,"tablet")` = tablet
  override ?? flat; `hasMenuBlockVisibilityOverride` covering tablet). If
  502-01's contract changed, leave the function literally untouched.
- **Behavior identity:** for every pre-tablet document the result is
  bit-identical (no tablet override can exist ⇒ short-circuit or identical
  OR). `resolveMenuBlockVisibleForDevice` already accepts `"tablet"` today
  (`menuDocumentV2.ts:914-921`, returns the flat value), so this compiles
  even before/after independently.

### Error handling / edge cases

- Item invisible (`meta.visibility === "logged_in"`) ⇒ whole subtree skipped
  (flatten parity, filter-then-recurse).
- Group with `href:"#"` and only non-renderable descendants ⇒ `null` (no
  empty `<details>`/label, matching today's `:146-147`).
- `children: undefined` vs `[]` ⇒ identical (leaf).
- Depth is unbounded by design (data pipeline already is — recon verified
  `MenuTree.tsx` recursion + `menuDnD` child-intent have NO cap; no code
  change in the items editor, verify-only note for 502-04).
- `siteName` empty-string ⇒ treated as absent by the chain (`|| null`),
  matching today's falsy check.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Bun lane (menu suites):**

- `tests/unit/site/menu-document-render.test.tsx` (extend):
  - SSR `SiteHeaderMenuDocumentRender` with a 3-level tree (About → "Inna
    strona" → "Inna Strona"): the grandchild anchor sits inside a NESTED
    `.site-nav-sublist` (assert `<ul class="site-nav-sublist">` nested within
    another), the parent label string occurs EXACTLY ONCE in the header HTML,
    and the doc-header nav markup contains NO `<details` inside
    `.site-nav-list` (hover mode) while `data-site-nav-group="true"` is still
    present (existing assertion `:86` keeps passing on the `<li>`). Pin the
    handshake hooks: a linkless group parent renders
    `<span class="site-nav-link site-nav-group-label" tabindex="0">` (BOTH
    classes AND `tabindex="0"` — the parent's NORMATIVE keyboard contract:
    without it 502-02's `:focus-within` open rule can never fire for that
    subtree) and a linked group parent's `.site-nav-link` sits as a direct
    child of the `li[data-site-nav-group="true"]` (502-02's caret-rule
    target).
  - CONSCIOUS BREAKAGE in the same golden test — do NOT "fix" it by keeping
    `<details>` in hover mode: `:85-87` (the "single-depth `<details>`
    dropdown group" comment + `<summary>Services</summary>` assertion at
    `:87`) fails BY DESIGN once the doc path goes hover — rewrite those lines
    to the hover-mode assertions above (parent link once, nested sublist, no
    `<summary>` in the doc header), comment naming this task.
  - Legacy `SiteHeaderNav` SSR with the same tree: nested
    `<details class="site-nav-group">` per level, grandchild PRESENT (flatten
    gone), linked parent present as first sublist entry (details convention).
  - Legacy `SiteHeaderNav` with a FLAT item list: markup byte-identical to
    pre-502 (pin the golden string).
  - `BrandRender` chain: `props.text` beats `siteName`; absent `text` ⇒
    `siteName`; both absent ⇒ no `.site-header-brand` anchor; image mode
    byte-unchanged; text rendered escaped (`<b>x</b>` arrives as entities).
  - Render gate (gated on 502-01): show-only-on-tablet block IS in the DOM
    (frame present, gating handed to 502-02's CSS); visible-on-NO-device
    (flat false + tablet false + mobile false) renders NOTHING; a
    no-override block keeps flat semantics byte-unchanged.
- `tests/integration/runtime/site-shell-runtime.test.ts` (UPDATE — conscious
  breakage): `:536-537` asserts `data-site-nav-group` +
  `<summary>Services ${token}</summary>` inside the MENU-DOCUMENT-driven
  header — rewrite to the hover-mode group (parent link rendered once +
  nested `.site-nav-sublist`, NO `<summary>` for Services in the doc header).
  The legacy-path assertions at `:310-311` survive UNCHANGED (details mode).
- `tests/unit/pages/siteShellCss.test.ts` — **ZERO-line diff**
  (`buildSiteShellCss(null)` byte-identity inviolable; this subtask adds no
  CSS anywhere).

**Vitest lane (Bun-free):**

- `tests/vitest/site/page-runtime-shell-branch.test.tsx:72`
  ("navigationDocument absent ⇒ default SiteHeaderNav markup is unchanged")
  — verify its fixture: flat fixtures must keep passing UNCHANGED; if the
  fixture contains nested items the expected markup changes CONSCIOUSLY
  (bug-7 fix on the legacy path) — update with a comment naming this task.

**Gates:** `bun --cwd core lint`, `bun --cwd core lint:types`, the bun menu
suites above INCLUDING the integration runtime suite
(`tests/integration/runtime/site-shell-runtime.test.ts`), full vitest, AND
root `tsc -p tsconfig.json --noEmit` (covers `tests/` — `lint:types` alone
does not).

**SMOKE (this subtask's slice of the parent's ≥5-scenario owner-mandate
suite — full suite lands in 502-05; visible-effect assertions only, never
control presence):** after 502-02+502-03 land, one real-flow playwright pass
on `:3000` — publish a menu doc with a 3-level branch + brand text: at
1280px real mouse hover on level-1 shows its sublist, hover on level-2 shows
the fly-out with the grandchild's bounding box on-screen, the parent label
appears exactly once in the header DOM; at 390px all levels render
inline-indented; the brand anchor shows the typed text, and after clearing
it, the site name. This slice is re-exercised by 502-05 scenarios 1
(fresh-create), 3 (deep nesting canvas+front) and 5 (publish parity).
Dev-server gotcha: Bun server code does not hot-reload — restart
`coderso-dev-core-host`; a white admin page means the server is down.

---

## Acceptance Criteria

1. `flattenNavigationDescendants` and the `[item, ...dropdownItems]`
   duplication no longer exist in `siteShell.tsx`.
2. Menu-document front header: 3+-level trees render one recursive
   `.site-nav-sublist` per level, parent label exactly once, grandchild
   reachable via hover/focus (with 502-02's CSS) — live-verified per the
   smoke slice.
3. Legacy no-document header: nested trees render recursive click-open
   `<details>` with descendants reachable (no flatten); flat menus render
   byte-identical markup; `buildSiteShellCss(null)` byte-identical (ZERO-line
   test diff).
4. Brand: `props.text` → text; else `siteName`; else no brand anchor —
   identical chain to the 502-04 canvas.
5. Show-only-on-tablet blocks DOM-render (gated per item 4's verify);
   pre-tablet documents render bit-identically through the gate.
6. All gates green (bun lanes, full vitest, root `tsc`).

---

## Documentation Updates Required

- Update the `siteShell.tsx` file-head pattern comment (interaction modes +
  audit resolution) — in-code, this file.
- Site-shell/PAGE_MODEL notes: nested-sublist render contract + brand text
  chain (may land with 502-05's doc sweep; do not duplicate).
- Named residuals (recorded here, NOT scope): details-mode linked-parent
  duplication (legacy-only reachability convention — flip-point if the owner
  wants summary-as-link UX later); brand text formatting/typography; touch
  at ≥640px has NO first-tap-opens semantics for hover-mode groups (real
  tablets have no hover — conscious, owner-approved parent residual;
  keyboard focus via the `tabIndex={0}` group labels remains the non-pointer
  path).
- `_docs/_TASKS/README.md` board + Statistics on status change (closing
  agent only — do NOT edit from this subtask).
