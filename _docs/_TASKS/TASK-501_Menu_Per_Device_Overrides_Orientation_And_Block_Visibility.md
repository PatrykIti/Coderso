# TASK-501: Menu Per-Device Overrides, Orientation & Block Visibility
# FileName: TASK-501_Menu_Per_Device_Overrides_Orientation_And_Block_Visibility.md

**Priority:** High
**Category:** Admin UI / Content (Menus) / Navigation / Page Builder / Responsive
**Estimated Effort:** Large
**Dependencies:** TASK-499 (menuDocumentV2 + Design tab + `menuDocumentCss.ts`), TASK-458-02 (`normalizeMenuAppearance`), Pages responsive-override machinery as the UX reference (`pageEditorMutationActions.ts`, `PageEditor.tsx` ResponsiveControlShell)
**Status:** ⏳ To Do

---

## Overview

**The gap.** The shipped menuDocumentV2 Design tab (TASK-499) has a
`DeviceSwitcher` (`MenuDesignEditor.tsx` ~:882/:1058) and a device-forced canvas
(`buildMenuDocumentPreviewCss(doc, device)` ~:378), but every panel writer is
**FLAT** — `setLayoutField` (~:418-432), `setNavField` (~:622-634) and
`patchBlock` (~:434-443) always mutate the single base `section.layout` /
`nav-items` props. Switching the canvas to Mobile changes *what you look at*,
never *what you edit*: one global appearance drives every viewport. On top of
that:

- **No orientation.** `MenuAppearance` (`normalizeMenuAppearance.ts` ~:68-91)
  has no `orientation` field; the nav list is horizontally flexed always
  (vertical stacking exists only inside the mobile disclosure-open rule,
  `menuDocumentCss.ts:133`).
- **No per-device block visibility.** Leaf blocks carry a flat
  `visibility: { visible }` (all-or-nothing, every viewport); menu-native
  blocks (`nav-items`, `brand`, …) carry none. There is no way to compose a
  structurally different mobile bar (e.g. CTA desktop-only).

**Owner-chosen UX (2026-07-02): the Pages per-breakpoint override pattern.**
Mirror `patchBlockPropsForDevice` / `patchSectionControlForDevice`
(`pageEditorMutationActions.ts:93-227`): when the DeviceSwitcher is on
**Mobile**, edits write a **SPARSE** `responsive.mobile` override record
instead of the base; the panel shows **resolved** values (base merged with the
override) plus a Base/Override/Inherited badge and an explicit **Reset**
(remove the override, re-inherit desktop) per control — a port of
`ResponsiveStateBadge` / `ResponsiveControlShell` (`PageEditor.tsx:4786-4874`).
Explicit removal only — **NO auto-remove-on-equality** — with empty-record
pruning on clear, exactly like `clearResponsiveOverride`
(`pageDocumentV2.ts:3294-3327`). Cascade matches Pages: mobile inherits
**desktop** (`pageResponsiveCss.ts` header :11-13).

Three features ride the one mechanism:

1. **Per-device design overrides** — `MenuSectionV2` gains
   `responsive?: { mobile?: { layout?: MenuBarLayout; navProps?: NavItemsProps } }`.
   One section-level record covers the whole appearance surface, because the
   CSS pipeline reads exactly `section.layout` + `nav-items` props
   (`collectMenuAppearance`, `menuDocumentCss.ts:71-77`).
2. **Orientation** — new `nav-items` appearance field
   `orientation: "horizontal" | "vertical"` (enum-validated in
   `normalizeMenuAppearance`, added to `NAV_ITEMS_PROP_KEYS`), a
   SegmentedControl in the nav-items panel, and
   `flex-direction:column;align-items:stretch` emitted from the SHARED
   `buildMenuRuleSets` (front + canvas from one place). Default `"horizontal"`
   emits **NOTHING** (zero byte-drift for existing documents). Combined with
   #1 it is per-device settable (e.g. vertical only on mobile).
3. **Per-device block visibility** — `MenuBlockV2` (ALL block types, incl.
   menu-native) gains
   `responsive?: { mobile?: { visibility?: { visible: boolean } } }`.
   "Hide on mobile" for any block; "show only on mobile" for leaf blocks
   (flat `visibility.visible:false` as the desktop value + a mobile
   `visible:true` override). This is **document-level render/CSS gating**, not
   the page visibility pipeline; the existing flat leaf-block `visibility`
   semantics stay untouched for documents without a responsive record.

### Scoping decision — tablet DEFERRED (mobile-only overrides in v1)

The breakpoint enum for menu overrides is
`MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"]`. Rationale: the front sheet
today has exactly two media branches (`buildMenuDocumentCss` :150-161 —
desktop `min-width` + mobile `max-width:639px`), the canvas deliberately maps
tablet⇒desktop (`buildMenuDocumentPreviewCss` :209-213), and the Pages cascade
gives mobile-inherits-desktop anyway. Including tablet would force a NEW
bounded tablet `@media` on the front AND un-mapping tablet in the canvas — out
of scope. Because the responsive record is reject-unknown, adding `"tablet"`
later is a purely additive key-list extension. In the editor, **tablet edits
write the BASE** (the badge shows "Base"), matching the canvas mapping.

### Non-goals

- **NO `menu-drawer` implementation** — it exists only as a section type with
  zero editor/front support (`siteShell.tsx:244-246` renders `sections[0]`
  only, pinned by `tests/unit/site/menu-document-render.test.tsx:105`). The
  per-device overrides + visibility replace the need for it in this task.
- **NO new endpoint / RBAC / migration** — see Security Contract.
- **NO `core/site/siteShellCss.ts` changes** — `buildSiteShellCss(null)`
  byte-identity is inviolable (`tests/unit/pages/siteShellCss.test.ts`).

---

## Contract sketch (normative for the subtasks)

```ts
// core/services/menus/menuDocumentV2.ts — 501-01
const MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"] as const;           // tablet deferred
const MENU_SECTION_OVERRIDE_GROUP_KEYS = ["layout", "navProps"] as const;

type MenuSectionResponsive = {
  mobile?: { layout?: MenuBarLayout; navProps?: NavItemsProps };       // SPARSE — edited keys only
};
type MenuBlockResponsive = {
  mobile?: { visibility?: { visible: boolean } };
};
// MenuSectionV2 += responsive?: MenuSectionResponsive
// MenuBlockV2 (native AND leaf) += responsive?: MenuBlockResponsive

// Write normalizers (throw MenuDocumentError with the offending path; reuse
// normalizeAppearanceSubset ~:207-229 which rejects cross-subset keys BEFORE pick):
normalizeMenuSectionResponsive(value, path)   // rejects unknown breakpoints/groups/props
normalizeMenuBlockResponsive(value, path)     // rejects everything except mobile.visibility.visible:boolean
// CRITICAL read-path rule: MENU_SECTION_KEYS (:439) += "responsive";
// MENU_NATIVE_BLOCK_KEYS (:364) += "responsive"; MENU_LEAF_BLOCK_KEYS (:365)
// += "responsive". The stored read is FAIL-CLOSED (:498-506) — any missed key
// list degrades the WHOLE document to empty (silent data loss). Empty records
// (`responsive:{}`, `mobile:{}`) are pruned on write, never persisted.

// Pure resolve/patch/clear helpers (immutably; consumed by 501-02 CSS + 501-03 editor):
resolveMenuSectionAppearanceForDevice(section, device): { layout: MenuBarLayout; navProps: NavItemsProps };
readMenuSectionOverrideValue(section, "mobile", group, key): unknown | undefined;   // badge detection
patchMenuSectionForDevice(doc, sectionId, device, group, patch): MenuDocumentV2;    // desktop/tablet ⇒ base
clearMenuSectionOverride(doc, sectionId, "mobile", group, key): MenuDocumentV2;     // delete leaf, prune empty parents
resolveMenuBlockVisibleForDevice(block, device): boolean;   // desktop = flat visibility?.visible ?? true; mobile = override ?? desktop
setMenuBlockVisibleForDevice(doc, blockId, device, visible): MenuDocumentV2;        // mobile ⇒ responsive; desktop ⇒ flat (leaf only)
clearMenuBlockVisibilityOverride(doc, blockId, "mobile"): MenuDocumentV2;
```

```ts
// core/services/menus/normalizeMenuAppearance.ts — 501-01
// MenuAppearance += orientation?: "horizontal" | "vertical" (~:68-91)
// fieldNormalizers.orientation = enum ["horizontal","vertical"] (~:176-194)
// resolved default: "horizontal" (sanitize read stays fail-closed-drop)
```

```ts
// core/site/menuDocumentCss.ts — 501-02
// buildMenuRuleSets gains the mobile-RESOLVED appearance next to the base one;
// the mobile branch appends per-GROUP delta rules — a rule group is emitted
// only when SOME field in the group's mobile-resolved input differs from base,
// and a triggered group emits ALL its declarations with explicit/neutral
// values so clearing an override reverts without leakage (501-02 §2-3) —
// AFTER the mobileMode disclosure/inline rules
// (:128-140) so overrides — orientation included — win source order (the
// disclosure-open rule :133 already forces column when open). Orientation
// vertical emits `${header} .site-nav-list{flex-direction:column;align-items:stretch}`.
// Visibility: renderer stamps data-menu-block-id={block.id} on MENU-NATIVE
// wrappers only (nav <nav>, brand <a>, utility <span> — attribute-only on the
// existing outermost element; for nav-items that is the <nav> LANDMARK
// (siteShell.tsx:272), an ancestor wrapper ABOVE the .site-nav-disclosure +
// .site-nav-list pair — NEVER .site-nav-list itself: at (0,2,0) a
// [data-menu-block-id]{display:none} on the list loses to the sheet's own
// `${header} .site-nav-list{display:flex}` rules (inline mobileMode :139,
// canvas baseline :181) and can NEVER beat the ~(0,4,0) disclosure-open rule
// :134 — hiding the ANCESTOR sidesteps specificity entirely); leaf blocks
// keep PageBlockFrame's existing data-block-id (no new wrapper — avoids
// DOM-shape drift, see 501-02 §4 "Dual selector rationale"). Blocks visible
// on NEITHER device stay render-skipped (today's flat gating, byte-unchanged);
// blocks with a responsive visibility record are ALWAYS DOM-rendered and
// gated per branch via the doc-scoped DUAL attribute selector — EVERY
// selector in the comma list carries the `${header}` prefix (comma lists do
// NOT inherit it; the sheet has no shadow scoping, so a bare attribute
// selector would apply PAGE-WIDE, violating the Security Contract):
//   hide-on-mobile      ⇒ mobile branch:  `${header} [data-menu-block-id="X"],${header} [data-block-id="X"]{display:none}`
//   show-only-on-mobile ⇒ desktop branch: `${header} [data-menu-block-id="X"],${header} [data-block-id="X"]{display:none}`
// (front wraps desktop in min-width ≥640 / mobile in max-width:639 — no
// un-hide/revert rules needed). Canvas flatten keeps tablet ⇒ desktop branch.
// Docs with NO overrides ⇒ byte-identical output to today (asserted).
```

React-hooks rule (501-03): no setState-in-effect; all device-forked writes
happen in **event handlers** (the existing `setLayoutField`/`setNavField`
call sites plus the per-block visibility toggle), which route through
`patchMenuSectionForDevice` / `setMenuBlockVisibleForDevice` keyed on the
current `device` state. `patchBlock` content writes (brand/cta/utility) are
NOT device-forked — they stay FLAT on every device (the responsive contract
covers only `layout`, `navProps`, and `visibility`).

---

## Architecture (files to add / change)

```
EDIT core/services/menus/menuDocumentV2.ts          (501-01: responsive records + key-list extensions + resolve/patch/clear helpers)
EDIT core/services/menus/normalizeMenuAppearance.ts (501-01: orientation enum field)
EDIT core/site/menuDocumentCss.ts                   (501-02: per-device rule sets, orientation, visibility rules; front @media + canvas flatten from ONE buildMenuRuleSets)
EDIT core/site/siteShell.tsx                        (501-02: SiteHeaderMenuDocumentRender stamps data-menu-block-id on menu-native wrappers — leaf frames keep PageBlockFrame's data-block-id — + renders responsive-gated blocks)
EDIT core/admin/ui/menus/MenuDesignEditor.tsx       (501-03: device-forked writers, MenuResponsiveControlShell badge+Reset, orientation SegmentedControl, per-block mobile visibility toggle, resolved panel values, canvas "(mobile overrides)" scope hint)
ADD  tests (501-04; see Testing Requirements)
(core/server/validation/menuSchemas.ts, menuService.ts, menusClient.ts: NO change —
 the document envelope already flows end-to-end; verify only)
```

---

## Subtasks

| ID | Title | File | Status |
|---|---|---|---|
| TASK-501-01 | menuDocumentV2 Responsive Contract | TASK-501-01-MenuDocumentV2-Responsive-Contract.md | ⏳ To Do |
| TASK-501-02 | Menu CSS Responsive Emission | TASK-501-02-Menu-CSS-Responsive-Emission.md | ⏳ To Do |
| TASK-501-03 | Design Editor Device-Forked Controls | TASK-501-03-Design-Editor-Device-Forked-Controls.md | ⏳ To Do |
| TASK-501-04 | Menu Responsive Tests, Docs, Closure | TASK-501-04-Menu-Responsive-Tests-Docs-Closure.md | ⏳ To Do |

- **501-01 (keystone)** — the schema: sparse `responsive.mobile` records on
  `MenuSectionV2` (layout/navProps) + `MenuBlockV2` (visibility, all block
  types), the `orientation` enum in `normalizeMenuAppearance` +
  `NAV_ITEMS_PROP_KEYS`, reject-unknown write normalizers, the CONSCIOUS
  key-list extensions on the fail-closed read, and the pure
  resolve/patch/clear/prune helpers.
- **501-02** — CSS: `buildMenuRuleSets` consumes base + mobile-resolved
  appearance, emits mobile diff rules after the mobileMode rules, the
  orientation `flex-direction:column` rule (default emits nothing), and
  per-block visibility gating via the doc-scoped dual
  `data-menu-block-id`/`data-block-id` hide rules (mobile branch =
  hide-on-mobile, desktop branch = show-only-on-mobile) for BOTH the front
  `@media` builder and the device-forced canvas flatten.
- **501-03** — editor: the APPEARANCE writers become device-forked (Mobile ⇒
  sparse override, in event handlers): `setLayoutField` ⇒ section `layout`,
  `setNavField` ⇒ `navProps`, plus the per-block visibility toggle; every
  appearance control wrapped in a ported `MenuResponsiveControlShell`
  (Base/Override/Inherited badge + Reset with `data-menu-responsive-reset`),
  orientation SegmentedControl in the nav-items panel, per-block visibility
  toggle on Mobile, panel displays resolved values while badges compare
  against base. `patchBlock` content writes (brand/cta/utility) stay FLAT
  and their inputs UNwrapped on every device.
- **501-04** — closure: full vitest + bun matrices, byte-identity guards,
  playwright smoke (canvas + :3000 real mobile viewport), docs + changelog
  (next free number, expected 1209) + README/board/Statistics.

**Sequencing / land order:** 501-01 (model keystone) → 501-02 (CSS) → 501-03
(editor) → 501-04 (closure). 501-02 AND 501-03 both depend on 501-01; 501-03
additionally consumes 501-02's `buildMenuDocumentPreviewCss` emission for the
in-canvas mobile preview, so 501-02 lands (or at minimum its builder API is
merged) before 501-03's canvas work.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/endpoint/RBAC/migration — the document rides the existing validated
`PATCH /menus/:id` write path.** Verified against source:

- `menuUpdateSchema` (`core/server/validation/menuSchemas.ts:12`) ALREADY
  allows `document: { type: ["object","null"] }` (`:30`) with service-side
  strict validation — the new `responsive` keys arrive inside that existing
  envelope, so **NO schema change** is needed and no new endpoint or RBAC rule
  is added. `menus.settings` is already freeform jsonb — **NO migration**.
- **Schema-first / reject-unknown:** all new enums + `normalize*` live in the
  service module (`menuDocumentV2.ts` / `normalizeMenuAppearance.ts`); the
  write normalizer throws machine-readable `MenuDocumentError` with the
  offending `path` for unknown breakpoints/groups/props; override values reuse
  the SAME validated color/number/enum field normalizers as the base
  (`fieldNormalizers` ~:176-194) — raw stored input never reaches CSS.
- **Fail-closed read, non-destructive legacy:** the stored-read normalizer
  stays fail-closed (`menuDocumentV2.ts:498-506`); legacy documents WITHOUT
  `responsive` parse byte-unchanged; docs WITH unknown responsive keys degrade
  to the empty document ⇒ default look (asserted consciously in tests — this
  is the designed blast radius, not an accident). Deterministic contracts:
  sparse records, explicit clear + prune, no auto-remove-on-equality.
- **Front renders published-only** (unchanged): the resolver reads the
  `published` snapshot; all new CSS stays inside the
  `[data-site-menu-doc="true"]`-scoped document sheet;
  `buildSiteShellCss(null)` is untouched.

---

## Acceptance Criteria (measured live, not synthetic-only)

1. **Canvas Mobile shows the overridden look** — with the DeviceSwitcher on
   Mobile, an itemGap/color/orientation override and a hidden CTA render in
   the Design canvas; switching back to Desktop shows the unchanged base.
2. **Front matches at a real mobile viewport** — `:3000` at ≤639px width shows
   the mobile-overridden appearance + visibility (playwright, real viewport);
   ≥640px shows the untouched desktop look. Desktop output for a menu with NO
   overrides is byte-identical to pre-TASK-501.
3. **Reset restores inheritance** — the per-control Reset removes the mobile
   override (record pruned from the stored document), the badge flips
   Override → Inherited, and the canvas re-inherits the desktop value live.
4. **Legacy menus untouched** — existing documents without `responsive` and
   the no-document default (`SiteHeaderNav` + `buildSiteShellCss(null)`
   byte-identity) are unchanged; orientation default `"horizontal"` emits
   zero new CSS.
5. Full gates green: `bun --cwd core lint`, `lint:types`, `test:bun`, full
   vitest, repo gate alias.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free UI/services):**
- `tests/vitest/services/menu-document-v2.test.ts` — responsive round-trips;
  write reject-unknown for breakpoint/group/prop keys (`MenuDocumentError` +
  `path`); fail-closed read of legacy docs WITHOUT `responsive` (unchanged)
  AND of docs WITH unknown responsive keys (whole doc degrades — assert this
  consciously); resolve merge (mobile inherits desktop); clear + prune (empty
  `mobile`/`responsive` removed); visibility resolution incl. the
  render-if-visible-anywhere rule.
- `tests/vitest/services/normalize-menu-appearance.test.ts` — orientation enum
  accept/reject + default-emits-nothing sanitize.
- `tests/vitest/ui/menu-design-editor.test.tsx` — device-forked writes
  (Desktop edit ⇒ base; Mobile edit ⇒ sparse override), badge states,
  `data-menu-responsive-reset` clears + re-inherits, orientation segmented,
  per-block mobile visibility toggle; no setState-in-effect regressions.

**Bun lane (route/runtime suites already covering menus):**
- `tests/integration/routes/menus.test.ts` — a `document` PATCH carrying
  `responsive` persists per-key without dropping `appearance`/`extras`;
  invalid responsive payload 4xx's with `menu_document_invalid`.
- `tests/unit/site/menu-document-render.test.tsx` — front `@media` emission
  (mobile branch overrides + hide rules; desktop branch show-only-on-mobile
  hide — both via the dual `data-menu-block-id`/`data-block-id` selector,
  every comma-list member `${header}`-prefixed — assert no unscoped
  attribute selector in the emitted sheet), canvas flatten per device
  (tablet ⇒ desktop), orientation rule, `data-menu-block-id` stamping on
  menu-native wrappers (leaf frames keep `data-block-id`; nav-items stamp on
  the `<nav>` ancestor, NOT `.site-nav-list`), **nav-items block hidden on
  mobile actually wins in BOTH `mobileMode:"inline"` and
  `mobileMode:"disclosure"` with the disclosure `[open]` — front `@media`
  AND canvas flatten** (guards the ancestor-wrapper stamp against the
  higher-specificity `.site-nav-list{display:flex}` / disclosure-open
  rules), no-override byte-identity of
  `buildMenuDocumentCss`.
- `tests/unit/pages/siteShellCss.test.ts` — byte-identity guard changes by
  ZERO lines.

Plus real-input playwright smoke on canvas + `:3000` (Acceptance 1-3).
Dev-server gotcha for the smoke: Bun server code does not hot-reload — kill
the stale `bun --eval` process and re-run `coderso-dev-core-host` before
trusting admin-API responses.

---

## Documentation Updates Required

- `_docs/_CHANGELOG/` entry on closure (next free number, expected 1209),
  linking TASK-501 + all four subtasks.
- Cross-link the responsive contract from the menuDocumentV2 notes added by
  TASK-499 (PAGE_MODEL/site-shell docs).
- `_docs/_TASKS/README.md` board + Statistics on status changes (closing
  agent only).
