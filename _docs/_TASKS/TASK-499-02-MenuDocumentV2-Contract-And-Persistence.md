# TASK-499-02: menuDocumentV2 Contract + Persistence
# FileName: TASK-499-02-MenuDocumentV2-Contract-And-Persistence.md

**Priority:** High
**Category:** Services / Content (Menus) / Schema / Persistence
**Estimated Effort:** Large
**Dependencies:** TASK-458-02 (`normalizeMenuAppearance`), TASK-458-03 (`menuNavExtras`), TASK-455 (site shell envelope)
**Status:** ⏳ To Do
**Parent Task:** TASK-499

---

## Overview

Add a **NEW `core/services/menus/menuDocumentV2.ts`** — a composable, menu-scoped
document with its OWN section/block enums and its OWN
`MENU_DOCUMENT_SCHEMA_VERSION` — and wire it into the `menus.settings` jsonb
envelope (draft + `published` snapshot) per key, with no DB migration. This is
the keystone gate that TASK-499-03 (authoring) and TASK-499-04 (front renderer)
build on. It does NOT change any UI or front render yet; it ships the contract,
the normalizers, the legacy adapter, and the persistence plumbing with tests.

- **Goal:** a strict write normalizer (`normalizeMenuDocumentV2ForWrite`), a
  fail-closed read normalizer (`normalizeStoredMenuDocumentV2ForRead`), a legacy
  adapter (`buildMenuDocumentV2FromLegacy`), a published resolver
  (`resolvePublishedMenuDocument`), and an envelope extension that carries
  `document` alongside `appearance`/`extras` without dropping either.
- **Owning modules:** `core/services/menus/menuDocumentV2.ts` (new — owns the write/read
  normalizers, the legacy adapter, AND the `resolvePublishedMenuDocument`/
  `resolveStoredMenuDocument` resolvers, §5),
  `core/services/menus/normalizeMenuAppearance.ts` (type-only `MenuSettings.document`
  field via `import type { MenuDocumentV2 }` — NO runtime code, no resolver here — plus
  one new public color validator), `core/services/menus/menuService.ts`
  (`UpdateMenuInput.document`, per-key merge/publish),
  `core/server/validation/menuSchemas.ts` (accept `document` on the existing route),
  `core/server/routes/menuRoutes.ts` (`mapMenuError` — add an explicit
  `isMenuDocumentError` branch: today `mapMenuError` (`:40-50`) only handles the
  `field`-keyed `MenuAppearanceError`/`MenuNavExtrasError`; `MenuDocumentError`
  carries a `path` (not a `field`), so without this branch a thrown
  `MenuDocumentError` falls through `:95` (`instanceof Error`) → the `error.message`
  switch (no match) → `null` ⇒ a generic 500 instead of a 400 `menu_document_invalid`).
- **Out of scope:** the authoring UI (499-03), the front renderer (499-04). The
  legacy `appearance`+`extras` render path and `menuDesignDocument.ts` stay
  working for back-compat in this subtask.

### Why Option B (dedicated `menuDocumentV2`, not extending the page schema)

The page schema is a closed, central engine: `pageSectionTypes`/`pageBlockTypes`
are frozen enums (`pageDocumentV2.ts:31-72`) with `assertKnownKeys` throwing
`page_document_unknown_field` (`:1624-1641`) and per-type capability/prop/default
tables. Extending it with menu types (Option A) would deepen page↔menu coupling,
force every page-palette/capability table to carry menu-only gating, and bind the
menu's versioning to `PAGE_DOCUMENT_SCHEMA_VERSION`. Option B keeps the menu's
types, gating, and version **independent**, and the page schema **unpolluted**,
while reusing the proven leaf validators. The cost (a thin menu authoring surface
instead of reusing `PageEditor` over the page schema) is paid in TASK-499-03 with
a lower-risk, isolated editor.

---

## Security Contract

`menuDocumentV2` is **schema-first / reject-unknown / backward-compatible**:

- **Write path (strict):** `normalizeMenuDocumentV2ForWrite` throws a
  machine-readable `MenuDocumentError` (`menu_document_invalid` + offending
  `path`) on unknown section/block types, unknown props, malformed values, or
  over-capacity trees; nothing is persisted. Mirrors `MenuNavExtrasError`
  (`menuNavExtras.ts:35-44`) and `MenuAppearanceError`
  (`normalizeMenuAppearance.ts:31-40`).
- **Per-block prop allowlist is asserted, not `pick`-ed.** Menu-bar `layout` and
  `nav-items` props are DISJOINT subsets of the same `MenuAppearance` key space, so
  running the full `normalizeMenuAppearance` then `pick(subset)` would silently
  ACCEPT-and-DROP a cross-subset key (e.g. `linkColor` on a menu-bar layout, or
  `sticky` on nav-items) — reject-unknown would not hold. The write path MUST assert
  the raw input contains NO key outside the intended subset (throwing
  `MenuDocumentError` with a `path` of the form `block-path.offendingKey` on the
  FIRST extra key) BEFORE `pick` (§2); `pick` is never the allowlist enforcer.
- **Read path (fail-closed):** `normalizeStoredMenuDocumentV2ForRead` never
  throws — unreadable input degrades to an empty document (⇒ default look).
- **Reused leaf validators only.** `cta-button`(=page `button`)/`divider`/`spacer`
  blocks AND `brand.image` (=page `image`) are validated by the EXISTING page block
  pipeline (the `menuNavExtras.ts:65-118` wrapper trick — wrap in a throwaway page
  section, run `normalizePageDocumentV2ForWrite` /
  `normalizeStoredPageDocumentV2ForRead`, then enforce the menu allowlist). These —
  and ONLY these — carry block `style`/`visibility`/box-spacing, which therefore
  inherit the page schema's validated, sanitized shapes.
- **Menu-native blocks carry NO `style`/`visibility`.** `nav-items`/`brand`/`search`/
  `account`/`language` are NOT page types, so the §3 wrapper never processes them
  and the page `normalizeBlockStyle`/`normalizeBlockVisibility` validators are
  module-private (`pageDocumentV2.ts:2164,2310`) and MUST NOT be deep-imported.
  These blocks intentionally OMIT style/visibility (redundant — their appearance is
  the validated menu-bar `layout` + nav-items appearance props). This closes the
  "no validation path" gap: there is no menu-native style/visibility field to leave
  unvalidated. Menu-native block/section props reuse `normalizeMenuAppearance`'s
  validated color/number/enum shapes — raw stored input never reaches CSS.
- **Versioning.** `MENU_DOCUMENT_SCHEMA_VERSION = 1`, independent of
  `PAGE_DOCUMENT_SCHEMA_VERSION = 2`. A stored non-empty `document` object without the
  exact marker (or a lower/unknown version) fails the strict write check (§4), so the
  fail-closed stored-read degrades it to empty ⇒ `resolvePublishedMenuDocument` returns
  `null` ⇒ it is treated as legacy appearance+extras (backward-compatible). NO
  stamp-on-absent for a non-empty document.
- **No new endpoint / no migration.** `document` rides the existing `PATCH
  /menus/:id` via `UpdateMenuInput.document`; `menus.settings` is freeform
  nullable jsonb (`schema.ts:1127`). Existing RBAC.

---

## Implementation Pseudocode

### 1. `menuDocumentV2.ts` — enums, types, version

```ts
// core/services/menus/menuDocumentV2.ts  (Bun-free, import-side-effect free)
export const MENU_DOCUMENT_SCHEMA_VERSION = 1 as const;

export const menuSectionTypes = ["menu-bar", "menu-drawer"] as const;
export const menuBlockTypes = [
  // menu-native (own normalizers):
  "nav-items",            // KEYSTONE — binds the published item tree (positions + nesting)
  "brand",                // text (site.name) | image (reuses the shared `image` leaf)
  "search", "account", "language",   // optional utilities (phase-2 behind the same gating)
  // reused shared leaf blocks (delegated to the page block pipeline):
  "cta-button",           // 1:1 delegate to the page `button` leaf validator
  "divider", "spacer",
] as const;
export type MenuSectionType = (typeof menuSectionTypes)[number];
export type MenuBlockType = (typeof menuBlockTypes)[number];

export const MENU_DOCUMENT_INVALID = "menu_document_invalid" as const;
export class MenuDocumentError extends Error {
  readonly code = MENU_DOCUMENT_INVALID; readonly path: string;
  constructor(path: string) { super(MENU_DOCUMENT_INVALID); this.name = "MenuDocumentError"; this.path = path; }
}
export const isMenuDocumentError = (e: unknown): e is MenuDocumentError => e instanceof MenuDocumentError;

// style/visibility split (MUST be exact — it determines the validation path):
//   * MENU-NATIVE blocks (nav-items, brand, search, account, language) carry NO
//     block `style`/`visibility`. Their appearance flows entirely through the
//     validated menu-bar `layout` + the nav-items appearance props (both reuse
//     the strict `normalizeMenuAppearance` validators), so per-block
//     style/visibility would be both redundant AND UNVALIDATABLE: the
//     `normalizeBlockStyle`/`normalizeBlockVisibility` validators are
//     module-private in `pageDocumentV2.ts:2164,2310` and MUST NOT be
//     deep-imported (Option-B boundary). Declaring style/visibility on these
//     blocks would leave them with no validation path — so they are omitted.
//   * REUSED LEAF blocks (cta-button, divider, spacer) DO carry `style`/
//     `visibility`, validated FOR FREE by the page block pipeline via the §3
//     wrapper (they are the only blocks routed through it). brand's optional
//     `image` sub-prop is likewise validated via the wrapper (page `image`
//     type), but the `brand` block itself stays menu-native (no style/vis).
export type MenuBlockV2 =
  | { id: string; type: "nav-items"; props: NavItemsProps }
  | { id: string; type: "brand";     props: BrandProps }
  | { id: string; type: "search" | "account" | "language"; props: MenuUtilityProps }
  | { id: string; type: "cta-button"; props: PageButtonProps /* reused leaf */; style?: PageBlockStyleV2; visibility?: PageBlockVisibilityV2 }
  | { id: string; type: "divider" | "spacer"; props: Record<string, unknown> /* reused leaf */; style?: PageBlockStyleV2; visibility?: PageBlockVisibilityV2 };
export type MenuSectionV2 = {
  id: string; type: MenuSectionType; name: string;
  layout: MenuBarLayout;            // menu-bar surfaceColor/padding/alignment/border/shadow/sticky
  blocks: MenuBlockV2[];
};
export type MenuDocumentV2 = {
  schemaVersion: typeof MENU_DOCUMENT_SCHEMA_VERSION;
  sections: MenuSectionV2[];        // exactly one menu-bar today; menu-drawer optional
};
```

### 2. Menu-native prop schemas — REUSE the appearance validators

`menu-bar` layout props ARE the `MenuAppearance` surface fields; `nav-items` props
ARE the `MenuAppearance` typography/link fields. Reuse `normalizeMenuAppearance`
verbatim (it is already strict, reject-unknown, token-backed):

```ts
// menu-bar layout = MenuAppearance subset {surfaceColor,paddingX,paddingY,alignment,borderColor,borderWidth,shadow,sticky}
// nav-items props  = MenuAppearance subset {itemGap,fontSize,fontWeight,textTransform,linkColor,linkHoverColor,linkActiveColor,dropdownDirection,mobileMode}
// REJECT-UNKNOWN per subset — `normalizeMenuAppearance` is strict only over the
// FULL appearance key set, so a nav-items-only key on a menu-bar layout (e.g.
// `linkColor`) — or a menu-bar-only key on nav-items (e.g. `sticky`) — PASSES the
// full normalize and would be silently DROPPED by `pick`, violating the Security
// Contract's reject-unknown guarantee. So assert the RAW input carries no key
// outside the intended subset BEFORE `pick` (throw on the FIRST offender); never
// lean on `pick` to enforce the per-block prop allowlist.
const normalizeMenuBarLayout = (value: unknown, path: string): MenuBarLayout => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  for (const key of Object.keys(value))                                          // reject cross-subset / unknown keys
    if (!MENU_BAR_LAYOUT_KEYS.includes(key as never)) throw new MenuDocumentError(`${path}.${key}`);
  try { return pick(normalizeMenuAppearance(value), MENU_BAR_LAYOUT_KEYS); }     // strict reuse (value-level)
  catch (e) { if (isMenuAppearanceError(e)) throw new MenuDocumentError(`${path}.${e.field}`); throw e; }
};
// nav-items props are normalized identically against NAV_ITEMS_PROP_KEYS — same
// pre-`pick` extra-key assertion (throw `${path}.${offendingKey}` on the first
// key outside the subset) so a menu-bar-only field cannot slip through.
// brand: { mode: "text" | "image", href?: string (default "/"),
//          image?: { reuse the page `image` leaf via the wrapper trick } }
// cta-button / divider / spacer: delegate to the page leaf pipeline (see §3).
```

Add ONE public, additive export to `normalizeMenuAppearance.ts` so menuDocumentV2
shares the SAME color contract without duplicating the regex (used by `brand`
hrefs are validated by the page leaf; colors all flow through appearance reuse,
so this export is only needed if a menu-native block introduces a color field
NOT already in `MenuAppearance` — keep it minimal):

```ts
// normalizeMenuAppearance.ts — extract the existing private normalizeColor as public:
export const normalizeMenuColorValue = (value: unknown): string | null => normalizeColor(value);
```

### 3. Reused leaf blocks — through the page pipeline (the proven trick)

```ts
// Reuse menuNavExtras.ts:65-86's pattern: wrap candidate leaf blocks in ONE
// throwaway page section, run the PUBLIC page normalizers, then enforce the
// menu leaf allowlist. This gives button/image/divider/spacer + style +
// visibility + box-spacing validation for FREE, with no page-schema edit.
const MENU_LEAF_PAGE_TYPES = { "cta-button": "button", divider: "divider", spacer: "spacer" } as const;
const normalizeMenuLeafBlock = (block, mode: "write" | "stored-read", path) => {
  const pageType = MENU_LEAF_PAGE_TYPES[block.type];            // brand.image uses "image"
  const wrapper = { schemaVersion: PAGE_DOCUMENT_SCHEMA_VERSION, breakpoints: ["desktop","tablet","mobile"],
    seo: {}, settings: {}, sections: [{ ...createPageSectionV2("custom"), blocks: [{ ...block, type: pageType }] }] };
  const doc = mode === "write" ? normalizePageDocumentV2ForWrite(wrapper) : normalizeStoredPageDocumentV2ForRead(wrapper);
  const out = doc.sections[0]?.blocks[0];
  if (!out) throw new MenuDocumentError(path);
  return { ...out, type: block.type };                          // re-tag back to the menu type
};
```

### 4. Write / read / create normalizers

```ts
export function normalizeMenuDocumentV2ForWrite(value: unknown): MenuDocumentV2 {
  if (!isPlainObject(value)) throw new MenuDocumentError("document");
  const sections = requireArray(value.sections, "document.sections");
  // schemaVersion (schema-first / reject-unknown, NO stamp-on-absent): a NON-EMPTY
  // document MUST carry the EXACT current marker — reject an absent OR a lower/unknown
  // version. This is precisely what makes a marker-less/lower-version STORED `document`
  // object fail-closed to empty on read (normalizeStoredMenuDocumentV2ForRead catches
  // the throw) ⇒ resolvePublishedMenuDocument returns null ⇒ legacy appearance+extras,
  // so the "absent/lower ⇒ legacy" contract below holds verbatim. An EMPTY document
  // (sections: []) needs no marker: it collapses to null via isEmptyMenuDocument
  // regardless (the editor always seeds schemaVersion via createDefaultMenuDocumentV2,
  // so no legitimate non-empty write ever arrives marker-less).
  if (sections.length > 0 && value.schemaVersion !== MENU_DOCUMENT_SCHEMA_VERSION)
    throw new MenuDocumentError("document.schemaVersion");
  return { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION,
    sections: sections.map((s, i) => normalizeMenuSection(s, `document.sections[${i}]`, "write")) };
}
export function normalizeStoredMenuDocumentV2ForRead(value: unknown): MenuDocumentV2 {
  // Fail-closed delegate to the strict writer: a marker-less/lower-version stored
  // document throws (above) ⇒ degrades to empty here ⇒ resolver null ⇒ legacy.
  try { return normalizeMenuDocumentV2ForWrite(value); }
  catch { return { schemaVersion: MENU_DOCUMENT_SCHEMA_VERSION, sections: [] }; }
}
export const isEmptyMenuDocument = (d: MenuDocumentV2 | null) =>
  !d || d.sections.length === 0 || d.sections.every(s => s.blocks.length === 0);

// Default template the empty Design represents and "Build from default" seeds:
//   menu-bar ⊃ [ brand(text), nav-items, cta-button? ]  (positions + logo + optional CTA)
export function createDefaultMenuDocumentV2(): MenuDocumentV2 { ... }

// Block-composition helpers (pure; over doc.sections[0].blocks) — consumed by the
// TASK-499-03 thin editor so it is a real composer (add / remove / reorder), not
// add-only. Each returns a NEW document; ids are stable.
export function createDefaultMenuBlock(type: MenuBlockType): MenuBlockV2 { ... }   // default props per type
export function findMenuBlock(doc: MenuDocumentV2, id: string | null): MenuBlockV2 | null { ... }  // read helper
export function insertMenuBlock(doc: MenuDocumentV2, block: MenuBlockV2): MenuDocumentV2 { ... }  // append to menu-bar
export function deleteMenuBlock(doc: MenuDocumentV2, id: string): MenuDocumentV2 { ... }
export function reorderMenuBlock(doc: MenuDocumentV2, id: string, dir: "up" | "down"): MenuDocumentV2 { ... }

// Legacy adapter — seed a document from the existing appearance+extras WITHOUT
// writing (used on first Design open). Maps appearance -> menu-bar layout +
// nav-items props; extras(button) -> cta-button; extras(image) -> brand(image).
// FRESH-MENU CONTRACT (shared with TASK-499-03's seed chain): returns `null` when
// there is NOTHING legacy to seed (appearance === null AND extras.length === 0).
// The return type MUST therefore be `MenuDocumentV2 | null` — a non-null adapter
// would (a) make the TASK-499-03 `?? createDefaultMenuDocumentV2()` fall-through
// UNREACHABLE dead code and (b) seed a fresh Design from a doc that has NO
// brand(text) block (brand only comes from extras(image)), contradicting both the
// `createDefaultMenuDocumentV2` template below and the 499-03 "empty/legacy menu
// seeds menu-bar ⊃ brand/nav-items" test. So: fresh menu ⇒ adapter returns null ⇒
// chain reaches createDefaultMenuDocumentV2() (which DOES include brand(text)).
export function buildMenuDocumentV2FromLegacy(
  appearance: MenuAppearance | null, extras: PageBlockV2[]): MenuDocumentV2 | null { ... }
```

### 5. `MenuSettings.document` (type-only) + published/stored resolvers

The envelope TYPE addition lives in `normalizeMenuAppearance.ts`; the RUNTIME
resolvers live in `menuDocumentV2.ts` (matching the Goal + Owning-modules). Keeping
them split avoids a runtime circular import: `menuDocumentV2.ts` already imports
`normalizeMenuAppearance`/`isMenuAppearanceError`/`normalizeMenuColorValue` FROM
`normalizeMenuAppearance.ts` at runtime (§2), so the reverse edge MUST be type-only.

```ts
// normalizeMenuAppearance.ts — extend the stored envelope TYPE ONLY (no runtime code).
// Reference MenuDocumentV2 via a TYPE-ONLY import (erased at compile time ⇒ NO runtime
// cycle):  import type { MenuDocumentV2 } from "./menuDocumentV2";
export type MenuSettings = {
  appearance?: MenuAppearance; extras?: PageBlockV2[]; document?: MenuDocumentV2;
  published?: { appearance?: MenuAppearance; extras?: PageBlockV2[]; document?: MenuDocumentV2 };
};
```

```ts
// menuDocumentV2.ts — the published/stored resolvers live HERE (NOT in
// normalizeMenuAppearance.ts). They accept `unknown` and use the in-file
// normalizeStoredMenuDocumentV2ForRead + isEmptyMenuDocument (no extra import).
// resolvePublishedMenuDocument — mirror resolvePublishedMenuAppearance
// (normalizeMenuAppearance.ts:256-265): published snapshot first; legacy envelopes
// without `published` fall back to the top-level `document`; absent/empty ⇒ null.
export function resolvePublishedMenuDocument(settings: unknown): MenuDocumentV2 | null {
  if (!isPlainObject(settings)) return null;
  const published = settings.published;
  const raw = isPlainObject(published) ? published.document : settings.document;
  if (raw === undefined) return null;
  const doc = normalizeStoredMenuDocumentV2ForRead(raw);
  return isEmptyMenuDocument(doc) ? null : doc;
}
export function resolveStoredMenuDocument(settings: unknown): MenuDocumentV2 | null { /* top-level draft, fail-closed */ }
```

### 6. Persistence — per-key envelope merge/publish (no key dropped)

```ts
// menuService.ts
export type UpdateMenuInput = { name?; location?; status?; appearance?; extras?;
  /** Menu design document (TASK-499-02): validated through
   *  normalizeMenuDocumentV2ForWrite (throws menu_document_invalid). `null`/empty
   *  clears the slot back to the legacy/default look; `undefined` leaves it. */
  document?: unknown };

// mergeMenuSettingsEnvelope — WIDEN its param Pick (:182) to include `document`, else
// `input.document` does not type-check inside the new merge branch:
const mergeMenuSettingsEnvelope = (
  stored: unknown,
  input: Pick<UpdateMenuInput, "appearance" | "extras" | "document">,   // was "appearance" | "extras"
  options?: { seedPublishedSnapshot?: boolean }
): MenuSettings | null => { ... };

// readMenuDesignState (:163-172) — ALSO carry `document` into the published seed:
if (hasOwn(envelope, "document")) state.document = envelope.document;

// mergeMenuSettingsEnvelope (:180-205) — add a `document` branch alongside appearance/extras:
if (input.document !== undefined) {
  if (input.document === null) { delete envelope.document; }
  else {
    const doc = normalizeMenuDocumentV2ForWrite(input.document);
    if (isEmptyMenuDocument(doc)) delete envelope.document; else envelope.document = doc;
  }
}
// publishMenuSettingsEnvelope (:207-215) — readMenuDesignState already includes
// `document`, so the snapshot carries it with no extra code.

// updateMenu (:217-246) — TWO textually-separate gates BOTH gain `document`:
//   (1) the changesDesign VARIABLE (:219) — used to decide the existing-menu fetch:
const changesDesign = input.appearance !== undefined || input.extras !== undefined || input.document !== undefined;
//   (2) the SEPARATE merge gate (:235) — this one does NOT reference `changesDesign`,
//       so it MUST be edited too. If only :219 is changed, a document-ONLY PATCH
//       (no appearance/extras) passes the fetch but NEVER reaches
//       mergeMenuSettingsEnvelope and the document is SILENTLY not persisted — there
//       is NO compile error to catch it (unlike the Pick above):
if (input.appearance !== undefined || input.extras !== undefined || input.document !== undefined) {
  patch.settings = mergeMenuSettingsEnvelope(existing?.settings, input, {
    seedPublishedSnapshot: existing?.status === "published",
  });
}
```

### 7. Route schema — accept `document` on the EXISTING route

```ts
// core/server/validation/menuSchemas.ts — the PATCH /menus/:id update schema
// gains an optional `document?: unknown` passthrough (validated server-side by
// normalizeMenuDocumentV2ForWrite inside updateMenu, which raises the
// machine-readable error mapped at the route boundary like menu_appearance_invalid).
```

**Error handling:** `core/server/routes/menuRoutes.ts`'s `mapMenuError` (`:40-50`)
gains an explicit `isMenuDocumentError` branch that maps `MenuDocumentError`
(`menu_document_invalid`) to a 400 emitting a PATH-keyed details shape from
`error.path` (`{ path }`, mirroring the `{ field }` shape of the appearance/extras
branches — `MenuDocumentError` carries a `path`, not a `field`). Without this
branch a thrown `MenuDocumentError` falls through `:95` (`instanceof Error`) → the
`error.message` switch (no case) → `null` ⇒ a generic 500, NOT the intended 400.
Stored-read failures never surface (fail-closed). Add the matching route-level
assertion below (`tests/integration/routes/menus.test.ts`).

---

## Testing Requirements

- `bun --cwd core lint`, `bun --cwd core lint:types`, `bun --cwd core test:bun`.
- New `tests/vitest/services/menu-document-v2.test.ts`:
  - write-strict: unknown section/block type, unknown prop, malformed color/number,
    over-capacity ⇒ `menu_document_invalid` + correct `path`; nothing persisted.
  - stored-read fail-closed: garbage ⇒ empty document, never throws.
  - reused leaf blocks: `cta-button`/`divider`/`spacer`/`brand.image` inherit page
    validation (e.g. a bad button href is rejected on write, sanitized on read).
  - `menu-bar`/`nav-items` props reuse appearance validators (token colors,
    clamped numbers, enum strings); raw input never echoed.
  - `createDefaultMenuDocumentV2` = menu-bar ⊃ [brand(text), nav-items, cta-button?].
  - `buildMenuDocumentV2FromLegacy` maps appearance+extras → document round-trip.
  - version marker: a NON-EMPTY stored `document` with an absent OR lower/unknown
    `schemaVersion` ⇒ strict write throws `menu_document_invalid`
    (`document.schemaVersion`) AND stored-read degrades to empty ⇒
    `resolvePublishedMenuDocument` ⇒ `null` (legacy treatment); `=== 1` ⇒ document path.
- Persistence (`tests/unit/menus/menuService.test.ts`,
  `tests/vitest/validation/menuSchemas.test.ts`,
  `tests/integration/routes/menus.test.ts`):
  - `document` merges per key WITHOUT dropping `appearance`/`extras`; publish
    snapshots `document` under `published`; clearing ⇒ key deleted ⇒ envelope may
    collapse to `null`.
  - **Impacted route suite (`tests/integration/routes/menus.test.ts`):** its exact
    `expect(updated.settings).toEqual({...})` envelope locks (`:127`, `:151`) change
    shape once `document` rides the envelope — add a sibling case that PATCHes a
    valid `document` and asserts the envelope round-trips WITHOUT dropping a
    co-present `appearance`/`extras` (per-key merge), plus the `menuUpdateSchema`
    now accepts `document` (§7).
  - **Document-ONLY PATCH (guards the §6 `:235` gate):** a PATCH carrying ONLY
    `document` (no `appearance`/`extras`) MUST still compute `patch.settings` and
    persist the document — assert the round-trip explicitly (this is the silent-drop
    failure mode that has NO compile error if `:235` is left unedited). A co-present
    merge case alone would NOT catch it.
  - **Route error mapping (guards §7 `mapMenuError`):** mirroring the existing
    "PATCH /menus/:id maps invalid appearance to a 400 menu_appearance_invalid"
    case (`menus.test.ts:159`), add a "PATCH /menus/:id maps an invalid `document`
    to a 400 `menu_document_invalid`" case: PATCH a `document` that fails the strict
    writer and assert the caught `ApiError` has `code === "menu_document_invalid"`,
    HTTP 400, and a path-keyed `details` (`{ path }`) — NOT a generic 500. Without
    the new `isMenuDocumentError` branch this asserts red (falls through to 500).
  - **Regression:** existing appearance/extras envelope + publish tests stay green.
- `resolvePublishedMenuDocument`: published snapshot only (draft never leaks);
  legacy envelope (no `published`) falls back to top-level; empty ⇒ `null`.

---

## Documentation Updates Required

- Update `_docs/_TASKS/README.md` board + Statistics on status change (closing agent).
- Add a `_docs/_CHANGELOG/` entry linking **TASK-499** + **TASK-499-02**; document
  `MENU_DOCUMENT_SCHEMA_VERSION` and the envelope `document` key contract.
