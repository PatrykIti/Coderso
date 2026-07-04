# TASK-502-01: Menu Model — Brand Text & Tablet Breakpoint
# FileName: TASK-502-01-Menu-Model-Brand-Text-And-Tablet-Breakpoint.md

**Parent Task:** TASK-502
**Priority:** High
**Category:** Services / Content (Menus) / Schema / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-501-01 (responsive records + helper set — this subtask generalizes them), TASK-499-02 (menuDocumentV2); Pages reference: `pageResponsiveCss.ts:10-13` (cascade rationale: mobile inherits DESKTOP, not tablet), `pageDocumentV2.ts` clear/prune ports already in place
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

The **model keystone** of TASK-502. One file owned exclusively:
`core/services/menus/menuDocumentV2.ts`. (`normalizeMenuAppearance.ts` is
**verify-only** — `mobileMode`/`dropdownDirection` normalizers already exist
at `:196-197`; brand text lives in the document contract, not appearance.)
Zero UI, zero CSS here. Three contract changes, consumed by 502-02 (CSS),
502-03 (front) and 502-04 (editor):

1. **Brand text (parent bug 1, schema side)** — optional `brand.props.text`
   (string, trimmed, 120-cap, sparse/omit-when-empty) + the CONSCIOUS
   `BRAND_PROP_KEYS` extension. Normative fallback chain (stored here,
   rendered by 502-03/04): `props.text` (per-menu override) → `siteName`
   (`site.name` setting) → `null`.
2. **Tablet breakpoint (parent decision 2)** — `"tablet"` joins
   `MENU_RESPONSIVE_BREAKPOINT_KEYS`; section AND block responsive records
   gain a sparse `tablet` member; every resolve/patch/set helper generalizes
   its `"mobile"` literal to the device's own breakpoint. **Pages cascade,
   EXACTLY:** desktop = base; tablet and mobile EACH merge ONLY their own
   record over the desktop base — mobile does NOT inherit tablet
   (`pageResponsiveCss.ts:10-13`).
3. **Device-defining carve-out (parent decision 3, model side)** —
   `mobileMode` and `dropdownDirection` are device-DEFINING, never
   overridable: a responsive `navProps` record carrying either key is
   **rejected on WRITE** (machine-readable path). On **STORED READ** the one
   conscious fail-open carve-out applies (a 501-era doc may legitimately hold
   such a record; degrading the whole doc for it would be data loss) — but
   the two keys are NOT symmetric (parent root cause 3) and get SPLIT
   treatment: `dropdownDirection` is truly DEAD (desktop-branch-only emission
   reads the BASE — `menuDocumentCss.ts:250-254`) ⇒ silently PRUNED, nothing
   else; a mobile `mobileMode` override is LIVE (the mobile branch consumes
   the mobile-resolved value — `mobileModeRules(mobileResolved)`,
   `menuDocumentCss.ts:327`) ⇒ **HOISTED into the base appearance, THEN
   pruned** — behavior-preserving (mobileMode only ever affects the mobile
   branch; published mobile rendering UNCHANGED, asserted byte-identical).
   Non-destructive migration either way: the migrated doc round-trips clean ⇒
   the next autosave persists the hoisted+pruned form.

### Verified current-state anchors (`menuDocumentV2.ts`, 1072 lines, re-read 2026-07-02)

- `BrandProps` `:132-137` = `{ mode; href; image? }` — no text member.
  `BRAND_PROP_KEYS = ["mode","href","image"]` `:346`; `normalizeBrandProps`
  `:348-384` rejects unknown keys (`:354-358`), fail-softs unsafe `href` to
  `"/"` via `sanitizeAuthoringLinkHref` (`:377`), and tolerates
  `null`-as-absent for `image` (`:380`).
- `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"]` `:113`;
  `MenuSectionResponsive = { mobile?: MenuSectionOverride }` `:127`;
  `MenuBlockResponsive = { mobile?: MenuBlockOverride }` `:130`;
  `MenuDeviceKind` comment `:118` states "Desktop AND tablet address the base
  (canvas maps tablet⇒desktop)" — the 501 deferral being un-deferred.
- Write normalizers `normalizeMenuSectionResponsive` `:278-309` and
  `normalizeMenuBlockResponsive` `:313-344` iterate
  `MENU_RESPONSIVE_BREAKPOINT_KEYS` via `.includes` — adding `"tablet"` to
  the const is the ONLY structural change they need (the `:286` comment
  `"desktop"/"tablet"/junk ⇒ reject` must drop `"tablet"`). Prune chain
  (empty group `:304`, empty override `:306`, empty record `:308`) is
  breakpoint-generic already.
- **`mode` is currently ALWAYS `"write"`**: the read entry
  `normalizeStoredMenuDocumentV2ForRead` `:637-645` delegates to
  `normalizeMenuDocumentV2ForWrite`, which hardcodes `"write"` at `:627`. The
  threaded `mode` param DOES branch inside `normalizeThroughPageLeaf`
  `:446-452` (page write vs page read normalizer) but is never exercised with
  `"stored-read"`. ⇒ The carve-out MUST NOT be implemented by flipping this
  existing `mode` channel (that would silently switch leaf-block validation
  to the lenient page read path on every stored read — an unrelated
  behavioral change). A separate narrow channel is required (see §3 below).
- Helpers with `"mobile"` literals to generalize: `isMobileDevice` `:742`,
  `resolveMenuSectionAppearanceForDevice` `:782-796`,
  `patchMenuSectionForDevice` `:825-879` (mobile-branch destructures
  `mobile` literally `:863-876`), `resolveMenuBlockVisibleForDevice`
  `:914-921`, `hasMenuBlockVisibilityOverride` `:928-929`,
  `setMenuBlockVisibleForDevice` `:937-960`.
- Helpers ALREADY breakpoint-parameterized (type-widen only, verify no
  literal): `readMenuSectionOverrideValue` `:799-809`,
  `clearMenuSectionOverride` `:886-911`, `clearMenuBlockVisibilityOverride`
  `:967-986`.
- Fail-closed read-trap comments to keep truthful: `MENU_NATIVE_BLOCK_KEYS`
  `:477`, `MENU_LEAF_BLOCK_KEYS` `:479`, `MENU_SECTION_KEYS` `:572` — no key
  additions needed here (the new keys live INSIDE `props`/`responsive`,
  which are already allowlisted), but the module header `:48-57` and the
  `:742-743` comment state "tablet DEFERRED" and must be rewritten.
- `createDefaultMenuBlock("brand")` `:655-656` and the legacy adapter's brand
  seed `:1020-1026` stay **textless** (no `text` = inherit site name).
- Downstream compile surface (NOT owned here, must keep compiling):
  `menuDocumentCss.ts:287-289` calls `hasMenuBlockVisibilityOverride(block)`
  zero-breakpoint and resolves desktop/mobile (502-02 adds tablet);
  `MenuDesignEditor.tsx:627/:632/:873/:878/:949/:957` hardcodes `"mobile"` at
  badge/reset call sites (still valid — `"mobile"` remains a member; 502-04
  generalizes them). The editor ALSO passes the LIVE device at these call
  sites, whose Tablet runtime semantics flip the moment this subtask lands,
  with ZERO editor edits: `patchMenuSectionForDevice(doc, section.id,
  device, …)` `:580` (layout) and `:897` (navProps),
  `resolveMenuSectionAppearanceForDevice(section, device)` `:618`/`:868`,
  `resolveMenuBlockVisibleForDevice(block, device)` `:797`/`:902`, and
  `setMenuBlockVisibleForDevice(current, block.id, device, next)` `:973`
  (the flat "Visible" toggle `:969-975`). **Interim state** (502-01 landed,
  502-02/03/04 not yet): a Tablet edit WRITES a `responsive.tablet` record
  the front ignores (no tablet `@media` until 502-02); the flat toggle at
  `:973` reads flat `block.visibility?.visible`, so on Tablet it does not
  reflect its own write (appears dead while records accumulate); badges
  still claim "base" (`isMenuOverrideDevice` `:303` narrows to `"mobile"`);
  there is no tablet Reset UI; and the design editor AUTOSAVES server-side
  (recon bug 6), so these records PERSIST without pressing Save. SHARPEST
  interim regression (the carve-out breaks EXISTING Mobile controls in the
  unchanged editor): the "Dropdown direction" and "Mobile menu" segmented
  controls (`MenuDesignEditor.tsx:1105-1134`, shell-wrapped) write
  `responsive.mobile.navProps.dropdownDirection|mobileMode` on the Mobile
  device via `setNavField` → `patchMenuSectionForDevice(…, device,
  "navProps", …)` (`:897`); the new write-reject carve-out turns that record
  into `MenuDocumentError` on the server-side PATCH ⇒ 400
  `menu_document_invalid`, and because the editor saves the WHOLE draft
  (`updateMenu(menuId, { document: doc })` `:1320`), EVERY subsequent save of
  that draft keeps failing until the record is removed via the shell's Reset
  — fixed only by 502-04 removing the shells and rebinding both controls to
  base writes. NO existing test exercises these two controls (zero
  `mobileMode`/`dropdownDirection` hits in
  `tests/vitest/ui/menu-design-editor.test.tsx` and
  `tests/vitest/services/menu-document-v2.test.ts`), so the §5/§Testing gates
  stay green over this live-editor data-write hard-failure. Hence the
  landing-order requirement in the acceptance criteria.
- Existing tests PINNING the old contract (this subtask updates them):
  `tests/vitest/services/menu-document-v2.test.ts:311`
  (`toEqual(["mobile"])`), `:390-400` (`responsive.tablet` rejected on
  write — drop `"tablet"` from the `["desktop","tablet","wide"]` loop at
  `:391`), `:529-539` (stored `responsive.tablet` fixture `:535` degrades
  doc to empty — also rewrite the `:530-533` comment that names the
  "deferred tablet" as the example unknown key), `:557-562`
  (`tablet === desktop` resolve), `:601-606` (desktop/tablet device loop
  patches the base), `:806-810` (tablet visibility === desktop).
  Adjacent trap: `:476-510` (non-boolean/unknown visibility members) is an
  UNRELATED reject test — do NOT touch it (§5 "do not weaken").
  PLUS one pin OUTSIDE the services file:
  `tests/vitest/ui/menu-design-editor.test.tsx:787` ("tablet edit writes the
  BASE and the badge reads 'base' (tablet deferred)") asserts
  `document.sections[0].layout.paddingY === 18` AND
  `JSON.stringify(document)` free of `"responsive"` after a Tablet edit —
  the UNCHANGED editor passes the live device into
  `patchMenuSectionForDevice` (`MenuDesignEditor.tsx:580`), so this test
  goes red at 502-01 time (same cannot-wait class as the bun fixture).
  Owned in §5.

---

## Implementation plan (execution-ready)

### 1. Brand text — `brand.props.text`

```ts
/** Authoring cap for the per-menu brand text override (exported: 502-04 sets Input maxLength). */
export const MENU_BRAND_TEXT_MAX_LENGTH = 120 as const;

// :346 — CONSCIOUS key-list extension (fail-closed read trap: BRAND_PROP_KEYS
// gates BOTH write and stored read; forgetting it would degrade every saved
// doc carrying brand.text to empty on read — asserted in tests):
const BRAND_PROP_KEYS = ["mode", "href", "image", "text"] as const;

// BrandProps (:132-137) — additive optional member:
export type BrandProps = {
  mode: "text" | "image";
  href: string;
  image?: Record<string, unknown>;
  /**
   * Per-menu brand text override. Fallback chain (normative for 502-03 front
   * AND 502-04 canvas): props.text → siteName (`site.name` setting) → null.
   * Absent = inherit the site name. Text FORMATTING is a named residual, not
   * a member here.
   */
  text?: string;
};

// normalizeBrandProps (:348-384) — after the href block, before `props.image`:
if (value.text !== undefined && value.text !== null) {        // null tolerated as absent (mirrors image :380)
  if (typeof value.text !== "string") throw new MenuDocumentError(`${path}.text`);
  const text = value.text.trim().slice(0, MENU_BRAND_TEXT_MAX_LENGTH); // fail-soft cap (mirrors the href fail-soft), never throw-on-long
  if (text.length > 0) props.text = text;                     // SPARSE: empty/whitespace ⇒ OMIT ⇒ inherit site name
}
```

No change to `createDefaultMenuBlock("brand")` (`:655-656`) or the legacy
adapter (`:1020-1026`) — fresh and migrated brands inherit the site name.
Rendered as React text only (502-03/04); never reaches CSS.

### 2. Tablet breakpoint — types + vocab

```ts
// :113 — the un-deferral. Order tablet-first (wider viewport first; the CSS
// builder 502-02 iterates this const for branch emission):
export const MENU_RESPONSIVE_BREAKPOINT_KEYS = ["tablet", "mobile"] as const;
export type MenuResponsiveBreakpoint = (typeof MENU_RESPONSIVE_BREAKPOINT_KEYS)[number];

// :127 / :130 — widen to the generic record (sparse, per-breakpoint):
export type MenuSectionResponsive = Partial<Record<MenuResponsiveBreakpoint, MenuSectionOverride>>;
export type MenuBlockResponsive = Partial<Record<MenuResponsiveBreakpoint, MenuBlockOverride>>;

// :118-119 — MenuDeviceKind comment rewrite:
/** Editor device kind. Desktop = base; tablet and mobile each address their
 *  OWN sparse responsive record. Cascade (Pages, pageResponsiveCss.ts:10-13):
 *  tablet and mobile BOTH inherit the DESKTOP base; mobile does NOT inherit tablet. */
export type MenuDeviceKind = "desktop" | "tablet" | "mobile";
```

`normalizeMenuSectionResponsive` / `normalizeMenuBlockResponsive` need no
structural edit (`.includes` over the const); update the `:286` comment to
`// "desktop"/junk ⇒ reject`. `"desktop"` inside `responsive` stays REJECTED
(desktop is the base, never a record).

Rewrite the module header block `:48-57` (drop "tablet is DEFERRED"; state
the Pages cascade + the device-defining carve-out) and delete the `:742-743`
deferral comment.

### 3. Device-defining carve-out — reject-on-write, hoist/prune-on-stored-read

```ts
// Exported: 502-04 uses it to scope the panel controls; tests assert it.
export const MENU_NAV_DEVICE_DEFINING_KEYS = ["mobileMode", "dropdownDirection"] as const;

// The carve-out needs a read/write divergence the module does not have today
// (see anchors: mode is always "write"). Introduce a NARROW channel — do NOT
// flip the existing leaf `mode` param (leaf validation stays strict on read;
// the designed whole-doc blast radius is otherwise unchanged):
type MenuResponsiveCarveout = "reject" | "prune";

const normalizeMenuDocumentV2 = (value: unknown, carveout: MenuResponsiveCarveout): MenuDocumentV2 => {
  /* body of today's normalizeMenuDocumentV2ForWrite (:613-630), threading
     carveout → normalizeMenuSection(section, path, "write", carveout)
     → normalizeMenuSectionResponsive(value.responsive, path, carveout).
     The leaf/brand `mode` argument stays the literal "write" in BOTH paths. */
};

export function normalizeMenuDocumentV2ForWrite(value: unknown): MenuDocumentV2 {
  return normalizeMenuDocumentV2(value, "reject");
}
export function normalizeStoredMenuDocumentV2ForRead(value: unknown): MenuDocumentV2 {
  try {
    return normalizeMenuDocumentV2(value, "prune"); // fail-closed EXCEPT the one carve-out
  } catch {
    return { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [] };
  }
}

// Inside normalizeMenuSectionResponsive (:302-305), before normalizeNavItemsProps:
if (raw.navProps !== undefined && raw.navProps !== null) {
  if (!isPlainObject(raw.navProps)) throw new MenuDocumentError(`${path}.${key}.navProps`);
  let navInput: Record<string, unknown> = raw.navProps;
  for (const defKey of MENU_NAV_DEVICE_DEFINING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(navInput, defKey)) continue;
    if (carveout === "reject") throw new MenuDocumentError(`${path}.${key}.navProps.${defKey}`);
    if (navInput === raw.navProps) navInput = { ...navInput };   // copy-on-first-prune
    delete navInput[defKey];                                     // stored-read: prune the RECORD either way (mobileMode was hoisted in the pre-pass below)
  }
  const navProps = normalizeNavItemsProps(navInput, `${path}.${key}.navProps`);
  if (Object.keys(navProps).length > 0) override.navProps = navProps; // existing prune chain handles empty ⇒ group ⇒ record ⇒ member
}

// HOIST pre-pass (stored read ONLY, parent decision 3 — runs in
// normalizeMenuSection's "prune" path BEFORE block normalization): a 501-era
// responsive.mobile.navProps.mobileMode override is LIVE data (the mobile
// branch reads mobileResolved — menuDocumentCss.ts:327), so prune-only would
// silently change published mobile rendering (e.g. inline back to
// disclosure). When raw.responsive?.mobile?.navProps carries an OWN
// mobileMode whose raw value is a VALID enum member ("disclosure"|"inline"),
// write it into the raw FIRST nav-items block's props.mobileMode (the
// normative base target, overwriting the base value) — the existing
// normalizeNavItemsProps then validates the hoisted value like any base
// prop. Invalid/junk override values are NOT hoisted (prune-only — hoisting
// junk would degrade the doc the carve-out exists to save). tablet records
// and dropdownDirection are NEVER hoisted (never consumed / truly dead).
// Behavior-preserving: mobileMode only ever affects the mobile branch, which
// read the override until now — asserted via byte-identical mobile CSS
// before/after the migration.
```

Notes (assert each in tests):
- The keys stay VALID in the BASE `nav-items` props (`NAV_ITEMS_PROP_KEYS`
  `:95-106` unchanged) — only their presence inside a `responsive.*.navProps`
  record is illegal.
- Hoist/prune-on-read is the ONLY read/write divergence: a stored doc with
  any OTHER unknown responsive key still degrades whole-doc to empty
  (designed blast radius, unchanged).
- Migration semantics: read hoists (mobile `mobileMode` → base) and prunes
  the record → editor state holds the migrated doc → the next save persists
  it (no destructive rewrite, no touch of other fields). Behavior-preserving
  (owner decision, parent Acceptance 3): a 501-era `mobileMode` mobile
  override that used to win in the mobile branch keeps winning — as the
  hoisted BASE value — so published mobile rendering is UNCHANGED
  (byte-identical mobile CSS before/after). The truly-dead
  `dropdownDirection` is prune-only (no rendering ever read it).
- The block-level record needs no carve-out (visibility only).

### 4. Helper generalization (breakpoint-generic device fork)

```ts
// Replace isMobileDevice (:742) with:
/** desktop ⇒ null (base); tablet/mobile ⇒ their own sparse record. */
const menuDeviceBreakpoint = (device: MenuDeviceKind): MenuResponsiveBreakpoint | null =>
  device === "desktop" ? null : device;

// resolveMenuSectionAppearanceForDevice (:782-796):
const bp = menuDeviceBreakpoint(device);
if (bp === null) return { layout: { ...section.layout }, navProps: { ...baseNavProps } };
const override = section.responsive?.[bp];             // ONLY the device's own record —
return {                                               // mobile NEVER merges tablet
  layout: { ...section.layout, ...(override?.layout ?? {}) },
  navProps: { ...baseNavProps, ...(override?.navProps ?? {}) },
};

// patchMenuSectionForDevice (:825-879): desktop branch unchanged (base write,
// FIRST-nav-items normative target preserved). The override branch replaces
// every literal `mobile` with computed [bp]:
const record = section.responsive?.[bp] ?? {};
const nextGroup = applyPatch((record[group] ?? {}) as Record<string, unknown>);
const { [group]: _g, ...restRecord } = record;
const nextRecord = (Object.keys(nextGroup).length > 0
  ? { ...restRecord, [group]: nextGroup } : restRecord) as MenuSectionOverride;
const { [bp]: _b, ...restResponsive } = section.responsive ?? {};
const responsive: MenuSectionResponsive = Object.keys(nextRecord).length > 0
  ? { ...restResponsive, [bp]: nextRecord } : restResponsive;
// prune chain to the byte-identical legacy shape — unchanged (:874-877).
// A tablet patch must never touch an existing mobile record and vice versa.

// resolveMenuBlockVisibleForDevice (:914-921):
const desktopVisible = "visibility" in block ? (block.visibility?.visible ?? true) : true;
const bp = menuDeviceBreakpoint(device);
if (bp === null) return desktopVisible;
return block.responsive?.[bp]?.visibility?.visible ?? desktopVisible; // own record ?? DESKTOP (never tablet)

// hasMenuBlockVisibilityOverride (:928-929) — optional-breakpoint widening.
// Zero-arg = ANY breakpoint (back-compat: menuDocumentCss.ts:287 render-if-
// visible-anywhere gate keeps compiling and now sees tablet records too —
// 502-02 owns the emission); with arg = that record only (502-04 badge/Reset):
export const hasMenuBlockVisibilityOverride = (
  block: MenuBlockV2,
  breakpoint?: MenuResponsiveBreakpoint
): boolean =>
  breakpoint !== undefined
    ? block.responsive?.[breakpoint]?.visibility !== undefined
    : MENU_RESPONSIVE_BREAKPOINT_KEYS.some((bp) => block.responsive?.[bp]?.visibility !== undefined);

// setMenuBlockVisibleForDevice (:937-960): desktop branch unchanged (flat
// leaf visibility; menu-native ⇒ documented no-op). tablet/mobile:
return {
  ...block,
  responsive: {
    ...(block.responsive ?? {}),
    [bp]: { ...(block.responsive?.[bp] ?? {}), visibility: { visible } },
  },
};

// readMenuSectionOverrideValue (:799-809), clearMenuSectionOverride (:886-911),
// clearMenuBlockVisibilityOverride (:967-986): already take a
// MenuResponsiveBreakpoint param and use computed access/destructuring —
// they pick "tablet" up from the type widening alone. VERIFY no "mobile"
// literal remains in their bodies; doc comments updated.
```

**Error handling summary (unchanged mechanism):** write path throws
`MenuDocumentError` with the exact offending path (now including
`…responsive.tablet…` and `…responsive.<bp>.navProps.mobileMode|dropdownDirection`);
helpers never throw (missing id/override ⇒ identity); read path never throws
(fail-closed + the one documented prune carve-out).

### 5. Existing-test updates (owned here — the pins above break by design)

Update `tests/vitest/services/menu-document-v2.test.ts` pins listed in the
anchors: keys const `["tablet","mobile"]`; `responsive.tablet` moves from the
reject fixture to an accepted round-trip (the reject/degrade fixtures switch
to `responsive.desktop` + a junk key); `tablet === desktop` resolve/patch/
visibility pins become own-record assertions. Do NOT weaken any other
existing assertion. New coverage in §Testing Requirements.

ALSO owned here (same cannot-wait reasoning as the bun fixture):
`tests/vitest/ui/menu-design-editor.test.tsx:787` — the UNCHANGED editor
passes the live device into `patchMenuSectionForDevice`
(`MenuDesignEditor.tsx:580`), so once `tablet` becomes a real breakpoint a
Tablet edit writes `responsive.tablet` and BOTH document assertions
(`sections[0].layout.paddingY === 18`; `JSON.stringify(document)` not
containing `"responsive"`) go red between 502-01 and 502-04. Rewrite that
test to pin the NEW model contract through the unchanged editor: after the
Tablet edit, `Object.prototype.hasOwnProperty.call(section.layout,
"paddingY") === false` (base untouched) and
`section.responsive?.tablet?.layout` deep-equals `{ paddingY: 18 }` (sparse
own record; no `mobile` record materializes) — mirroring the mobile-override
test directly above it. Keep the badge assertions AS-IS as the INTERIM UI
pin (`data-menu-responsive-field="base"`, badge text "Base" — still truthful
because `isMenuOverrideDevice` `:303` narrows to `"mobile"` until 502-04);
retitle to name the handoff (e.g. "tablet edit writes the sparse
responsive.tablet record (badge/Reset generalization owned by 502-04)").
Explicit interim assertion handed to 502-04: it flips those badge pins to
`override`/"Tablet" when it generalizes the call sites. Do NOT weaken any
other assertion in that file.

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/RBAC/endpoint/migration** — verified against source 2026-07-02:

- `brand.text` and `responsive.tablet` travel INSIDE the existing validated
  `PATCH /menus/:id` envelope: `menuUpdateSchema`
  (`core/server/validation/menuSchemas.ts`) already allows
  `document: { type: ["object","null"] }` with deep validation delegated to
  `normalizeMenuDocumentV2ForWrite`; `menus.settings` is freeform jsonb ⇒
  **no schema/route/RBAC change, no migration**. This subtask verifies (does
  not edit) `menuSchemas.ts`, `menuService.ts`, `menusClient.ts`.
- **Schema-first / reject-unknown:** `text` joins the `BRAND_PROP_KEYS`
  allowlist consciously; non-string throws `MenuDocumentError(path.text)`;
  trimmed + capped at `MENU_BRAND_TEXT_MAX_LENGTH`; rendered as React text
  only (no dangerouslySetInnerHTML, never emitted into CSS). Tablet override
  VALUES reuse the exact base subset normalizers (color regex, clamped
  numbers, enums) — raw stored input never reaches CSS.
- **Fail-closed read, non-destructive legacy:** the stored read keeps the
  whole-doc-degrade blast radius; the ONE conscious carve-out
  (tolerate-not-degrade for `MENU_NAV_DEVICE_DEFINING_KEYS` inside responsive
  `navProps`) is SPLIT: a mobile `mobileMode` override is HOISTED into the
  base appearance then pruned (behavior-preserving — the mobile branch reads
  that override today, so prune-only would silently change published mobile
  rendering); `dropdownDirection` (truly dead, base-read desktop-only) is
  prune-only. Both persist the migrated form on next write — no destructive
  rewrite, asserted explicitly in tests (including byte-identical mobile CSS
  before/after the mobileMode hoist). Leaf-block validation stays STRICT on
  stored read (the narrow carve-out channel, NOT the leaf `mode` flip —
  pinned by test).
- **Byte-identity guards (named):** legacy docs WITHOUT
  `responsive`/`brand.text` normalize byte-identically (no new members ever
  materialize); docs with ONLY mobile overrides round-trip byte-identically
  (tablet is purely additive); `buildSiteShellCss(null)` and
  `buildMenuDocumentCss` emission are untouched by this subtask (502-02/03
  own those guards).

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free services)** — `tests/vitest/services/menu-document-v2.test.ts` (extend + update pins):

- **Brand text:** write⇒read round-trip of `props.text` on a brand block;
  `"  Acme  "` stores `"Acme"` (trim); a 200-char string stores exactly
  `MENU_BRAND_TEXT_MAX_LENGTH` chars (cap, no throw); `""`/`"   "`/`null`
  produce a brand WITHOUT a `text` member (sparse omit); `text: 42` /
  `text: {}` throw `MenuDocumentError` with path `…props.text`; a legacy
  brand without `text` round-trips deep-equal with `"text" in props === false`;
  `createDefaultMenuBlock("brand")` and `buildMenuDocumentV2FromLegacy`
  output stay textless.
- **Tablet round-trip:** a doc with `responsive.tablet.layout`,
  `responsive.tablet.navProps`, tablet+mobile records side by side on one
  section, and block `responsive.tablet.visibility.visible:false` on a
  native AND a leaf block — deep-equal preserved through write⇒read.
- **Reject-unknown (write):** `responsive.desktop` and junk breakpoints still
  throw with exact path; cross-subset keys inside `responsive.tablet.layout`
  / `.navProps` throw; block `responsive.tablet.props` throws (leaf-strip
  trap unchanged).
- **Cascade (normative):** `resolveMenuSectionAppearanceForDevice` — tablet
  = base merged with ONLY the tablet record; mobile = base merged with ONLY
  the mobile record; **a tablet-only override leaves the mobile resolve
  deep-equal to desktop** (mobile does NOT inherit tablet — the acceptance
  pin); un-overridden keys inherit the base on both.
- **Patch/set/clear per breakpoint:** tablet patch creates a sparse
  `responsive.tablet` with only the patched key and NEVER touches an
  existing `mobile` record (and vice versa — reference/deep-equal check);
  desktop patch still writes the base (FIRST-nav-items target pin kept);
  delete-on-undefined + prune chain per breakpoint (clearing the sole tablet
  override deep-equals the pre-override doc); `setMenuBlockVisibleForDevice`
  tablet writes `responsive.tablet.visibility` on native AND leaf, desktop
  stays flat-leaf/native-no-op; `clearMenuSectionOverride` /
  `clearMenuBlockVisibilityOverride` accept `"tablet"`;
  `hasMenuBlockVisibilityOverride(block)` true for a tablet-only record,
  `hasMenuBlockVisibilityOverride(block, "mobile")` false for it.
- **Device-defining carve-out (asserted consciously):** WRITE:
  `responsive.mobile.navProps.mobileMode` and
  `responsive.tablet.navProps.dropdownDirection` throw with that exact path.
  STORED READ (`normalizeStoredMenuDocumentV2ForRead`), split treatment:
  a `responsive.mobile.navProps.mobileMode` override is HOISTED into the
  FIRST nav-items block's base `props.mobileMode` (overwriting the base
  value) and its record entry pruned — assert a 501-era doc with such an
  override emits **byte-identical mobile CSS before and after the
  migration** (`buildMenuDocumentCss` mobile branch); a junk/invalid
  `mobileMode` override value is NOT hoisted (prune-only, base unchanged,
  doc not degraded); `dropdownDirection` is prune-only (never hoisted, base
  unchanged). In every case sibling override keys in the same record
  survive, the doc is NOT degraded; a record left empty by pruning prunes
  group ⇒ breakpoint ⇒ `responsive` member (deep-equals the never-overridden
  shape); the migrated output round-trips clean through the strict writer
  (migration path). BASE `nav-items.props.mobileMode`/`dropdownDirection`
  still accepted.
- **Blast radius unchanged:** a stored doc with `responsive.desktop` (or any
  other unknown key) still degrades the WHOLE doc to empty on read; a stored
  doc with a malformed LEAF prop still degrades the whole doc (pins that the
  carve-out channel did not flip leaf validation to the lenient page read
  path).
- **Byte-identity:** legacy doc without `responsive` ⇒ deep-equal,
  `"responsive" in section === false`; a 501-era doc with ONLY mobile
  overrides (no dead keys) ⇒ deep-equal round-trip.

**Bun lane:** ONE fixture flip owned here, landing WITH this subtask's code:
`tests/integration/routes/menus.test.ts:296-333` — swap the invalid-responsive
fixture's key from `responsive.tablet` to `responsive.wide` (same ApiError
shape, 400 `menu_document_invalid`, path `document.sections[0].responsive.wide`).
It CANNOT wait for 502-02/05: the moment this subtask makes `tablet` valid on
write, the old 400-expecting fixture goes red and the bun gate breaks between
502-01 and closure (502-05 §0 verifies the flip; the tablet-persists
happy-path route test is ADDED by 502-05 §2.1). The rest of the route
persistence extension (PATCH carrying `brand.text` + `responsive.tablet`
persists) and the render/CSS byte-identity suites land with 502-02/502-05
per the parent matrix. Gates here: `bun --cwd core lint`,
`bun --cwd core lint:types`, BOTH touched vitest files green
(`tests/vitest/services/menu-document-v2.test.ts` AND
`tests/vitest/ui/menu-design-editor.test.tsx` — the `:787` flip owned in
§5), the flipped `tests/integration/routes/menus.test.ts` suite green (bun
lane), **and root `tsc -p tsconfig.json --noEmit`** (`lint:types` does NOT
cover `tests/` — the widened helper signatures touch test call sites).

**SMOKE:** the ≥5-scenario real-flow smoke is owned by 502-05 (parent
§Testing Requirements). This model work is exercised there by scenario 1
(brand text end-to-end) and scenario 2 (override/reset cycle across
desktop/tablet/mobile, incl. the 744px-only tablet assertion and the
stored-document no-record check after Reset).

---

## Acceptance criteria

1. All exports above exist with the normative signatures;
   `menuDocumentCss.ts` and `MenuDesignEditor.tsx` compile UNCHANGED against
   them (502-02/04 then extend behavior). COMPILE guarantee only — the
   editor's live-device call sites change Tablet runtime behavior at 502-01
   (see the anchors' interim-state note), hence criterion 7.
2. Cascade pin: tablet-only override ⇒ mobile resolve identical to desktop.
3. Carve-out pin: write-reject path exact; stored-read HOISTS a mobile
   `mobileMode` override into the base then prunes the record (published
   mobile CSS byte-identical before/after) and prune-only-drops the dead
   `dropdownDirection` — neither degrades the doc; migrated doc round-trips
   clean.
4. Legacy + mobile-only docs round-trip byte-identically (deep-equal, no new
   members).
5. `normalizeMenuAppearance.ts`, `menuSchemas.ts`, `menuService.ts`,
   `menusClient.ts` diff = empty (verified, cited in the closure note).
6. Full vitest matrix above green; root `tsc -p tsconfig.json --noEmit`
   green; no React/UI/CSS changes in this subtask (the §5 test rewrites are
   test-only).
7. Landing order: 502-01..04 land together on `feature/visual` before any
   deploy — NO standalone deploy of 502-01. Interim window otherwise: the
   autosaving editor persists Tablet `responsive.tablet` records the front
   ignores (no tablet `@media` until 502-02), the flat "Visible" toggle
   appears dead on Tablet, badges misreport "base", there is no tablet
   Reset, and — sharpest — changing Dropdown direction / Mobile menu on the
   Mobile device writes a now-rejected `responsive.mobile.navProps` record:
   autosave fails 400 (`menu_document_invalid`) and keeps failing until
   Reset — fixed by 502-04 removing the shells and rebinding both controls
   to base writes. No existing test covers those two controls
   (live-behavior-only gap), so the gates cannot catch the failure — the
   land-together mandate is the only guard (anchors' interim-state note).

## Out of scope (owned by siblings)

- Tablet `@media` emission (`pageResponsiveMediaBounds.tablet` bounds),
  canvas tablet branch (tablet⇒desktop mapping removal), visibility-plan
  tablet rules, divider/nested-sublist CSS — 502-02.
- `BrandRender` text→siteName chain on the front, recursive `SiteNavItem` —
  502-03.
- "Brand text" panel Input, device-scoped `mobileMode`/`dropdownDirection`
  controls (shells removed, base writes), tablet badges/Reset call-site
  generalization, canvas ghost gate — 502-04.
- Route/bun matrices, playwright smoke, docs/changelog (expected **1211**,
  verify at closure), board/Statistics — 502-05.
- Named residuals: brand text formatting/typography; divider layout options.
