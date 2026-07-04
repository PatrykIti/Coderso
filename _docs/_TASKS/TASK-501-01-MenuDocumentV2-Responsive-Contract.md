# TASK-501-01: menuDocumentV2 Responsive Contract
# FileName: TASK-501-01-MenuDocumentV2-Responsive-Contract.md

**Parent Task:** TASK-501
**Priority:** High
**Category:** Services / Content (Menus) / Schema / Responsive
**Estimated Effort:** Medium
**Dependencies:** TASK-499-02 (menuDocumentV2 shipped), TASK-458-02 (`normalizeMenuAppearance`); Pages reference: `pageDocumentV2.ts` resolve/clear (:3220-3327), `pageEditorMutationActions.ts` device-forked patchers (:93-227), `pageEditorState.ts` override readers (:31-54)
**Status:** ✅ Done
**Completed:** 2026-07-02

---

## Overview

The **model keystone** of TASK-501. Extends the menu document contract with
sparse per-device override records and the new `orientation` appearance field,
plus the pure resolve/patch/clear helpers that 501-02 (CSS) and 501-03
(editor) consume. Zero UI, zero CSS in this subtask — two service files only:

1. `core/services/menus/normalizeMenuAppearance.ts` —
   `orientation?: "horizontal" | "vertical"` enum field.
2. `core/services/menus/menuDocumentV2.ts` —
   `MenuSectionV2.responsive?.mobile.{layout,navProps}` +
   `MenuBlockV2.responsive?.mobile.visibility` (ALL block types),
   `orientation` added to `NAV_ITEMS_PROP_KEYS`, reject-unknown write
   normalizers, the **conscious** key-list extensions on the fail-closed read,
   and the resolve/read/patch/clear/prune helper set (Pages ports).

**Breakpoint scope (owner decision, parent §"Scoping decision"):** mobile
only — `MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"]`. **Tablet is DEFERRED**:
the front sheet has exactly two media branches (`buildMenuDocumentCss`
:150-161) and the canvas maps tablet⇒desktop (`buildMenuDocumentPreviewCss`
:209-213), so in all helpers `device === "tablet"` writes/reads the **base**,
exactly like desktop. Adding `"tablet"` later is a purely additive key-list
extension because the record is reject-unknown.

### Verified current-state anchors (re-checked 2026-07-02)

- `MenuSectionV2` (`menuDocumentV2.ts:131-137`) = `{id,type,name,layout,blocks}`;
  reject-unknown via `MENU_SECTION_KEYS` (:439, enforced :447-448).
- `MenuBlockV2` (:112-129): native blocks allow keys
  `MENU_NATIVE_BLOCK_KEYS = ["id","type","props"]` (:364); leaf blocks
  (`cta-button`/`divider`/`spacer`) allow `+ style,visibility` (:365), both
  enforced by `assertBlockKeys` (:367-375, applied :398-402). Leaf props/
  style/visibility are validated by `normalizeThroughPageLeaf` (:309-350)
  through the PAGE pipeline — the page block schema has its OWN `responsive`
  member with a wider shape (`props`/`style`/`visibility` per breakpoint), so
  the menu leaf branch MUST strip `responsive` before wrapping (see §2.4).
- `NAV_ITEMS_PROP_KEYS` (:86-96), `MENU_BAR_LAYOUT_KEYS` (:74-83);
  `normalizeAppearanceSubset` (:207-229) rejects cross-subset keys BEFORE
  pick and maps `MenuAppearanceError` → `MenuDocumentError(path.field)`.
- **READ IS FAIL-CLOSED** (:498-506): `normalizeStoredMenuDocumentV2ForRead`
  delegates to the strict writer; ANY unknown key ANYWHERE degrades the WHOLE
  stored document to empty ⇒ legacy look. Forgetting one key-list extension =
  silent total data loss on read. Every key list touched here is therefore a
  deliberate, tested change.
- `normalizeMenuAppearance.ts`: `MenuAppearance` fields :68-91 (all optional,
  NO orientation today), `fieldNormalizers` :176-194, `normalizeEnum` :166-167,
  strict write `normalizeMenuAppearance` :213-231 (throws
  `MenuAppearanceError` on unknown key/bad value), fail-closed
  `sanitizeMenuAppearance` :238-250 (drops).
- Pages reference semantics being ported: sparse lazily-created override
  records written only for `device !== "desktop"`
  (`pageEditorMutationActions.ts:93-227`); resolve = base merged with
  `responsive[breakpoint]` (`pageDocumentV2.ts:3220-3280`); **explicit**
  removal only via `clearResponsiveOverride`/`clearBlockResponsiveOverride`
  (delete leaf, prune empty parents, drop empty breakpoint record + empty
  `responsive` member, `pageDocumentV2.ts:3294-3327`); NO
  auto-remove-on-equality; override detection compares against BASE
  (`pageEditorState.ts:31-54`). Cascade: mobile inherits **desktop**
  (`pageResponsiveCss.ts` header :11-13) — with menus' single mobile
  breakpoint this is trivially the same rule.

---

## Implementation plan (execution-ready)

### 1. `normalizeMenuAppearance.ts` — orientation enum field

```ts
// next to the other enum vocab consts (:49-54):
export const menuAppearanceOrientations = ["horizontal", "vertical"] as const;
export type MenuAppearanceOrientation = (typeof menuAppearanceOrientations)[number];

// MenuAppearance (:68-91) — additive optional field, doc comment states the
// resolved default:
/** Nav list flow. Default `"horizontal"`; the default emits NO CSS (501-02). */
orientation?: MenuAppearanceOrientation;

// fieldNormalizers (:176-194):
orientation: (value) => normalizeEnum(menuAppearanceOrientations, value),
```

That is the whole file change. `normalizeMenuAppearance` (strict throw) and
`sanitizeMenuAppearance` (fail-closed drop) pick the new normalizer up
automatically via `isKnownField`/`Object.entries` — no further edits. The
default `"horizontal"` is applied at CSS-build time only (501-02), never
persisted (matches the module contract, header :16-22).

### 2. `menuDocumentV2.ts` — responsive records

#### 2.1 Types + vocab (near :74-99)

```ts
export const MENU_RESPONSIVE_BREAKPOINT_KEYS = ["mobile"] as const;      // tablet deferred (parent §scoping)
export type MenuResponsiveBreakpoint = (typeof MENU_RESPONSIVE_BREAKPOINT_KEYS)[number];
const MENU_SECTION_OVERRIDE_GROUP_KEYS = ["layout", "navProps"] as const;
export type MenuSectionOverrideGroup = (typeof MENU_SECTION_OVERRIDE_GROUP_KEYS)[number];

/** Editor device kind. Desktop AND tablet address the base (canvas maps tablet⇒desktop). */
export type MenuDeviceKind = "desktop" | "tablet" | "mobile";

export type MenuSectionOverride = {
  layout?: MenuBarLayout;      // SPARSE — edited keys only
  navProps?: NavItemsProps;    // SPARSE — edited keys only (incl. orientation)
};
export type MenuSectionResponsive = { mobile?: MenuSectionOverride };

export type MenuBlockOverride = { visibility?: { visible: boolean } };
export type MenuBlockResponsive = { mobile?: MenuBlockOverride };
```

`NAV_ITEMS_PROP_KEYS` (:86-96) gains `"orientation"` (the
`satisfies readonly (keyof MenuAppearance)[]` constraint compiles only after
§1 lands — do §1 first). `MenuBarLayout`/`NavItemsProps` (:98-99) update
automatically via `Pick`.

- `MenuSectionV2` (:131-137) += `responsive?: MenuSectionResponsive;`
- EVERY `MenuBlockV2` union member (:112-129) += `responsive?: MenuBlockResponsive;`
  (per-device visibility here is document-level render/CSS gating for ALL
  block types incl. menu-native — it does NOT touch the page visibility
  pipeline; the module doc comment :40-46 gets a sentence saying exactly
  that, so the "native blocks carry NO visibility" invariant reads as
  "…no FLAT style/visibility").

#### 2.2 Write normalizers (reject-unknown, prune-empty)

```ts
const normalizeMenuSectionResponsive = (
  value: unknown,
  path: string
): MenuSectionResponsive | undefined => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const out: MenuSectionResponsive = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(MENU_RESPONSIVE_BREAKPOINT_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);            // "desktop"/"tablet"/junk ⇒ reject
    }
    if (raw === undefined || raw === null) continue;
    if (!isPlainObject(raw)) throw new MenuDocumentError(`${path}.${key}`);
    const override: MenuSectionOverride = {};
    for (const groupKey of Object.keys(raw)) {
      if (!(MENU_SECTION_OVERRIDE_GROUP_KEYS as readonly string[]).includes(groupKey)) {
        throw new MenuDocumentError(`${path}.${key}.${groupKey}`);  // "style"/"blocks"/… ⇒ reject
      }
    }
    if (raw.layout !== undefined) {
      // Reuses the SAME subset normalizer as the base ⇒ same reject-unknown
      // + color/number/enum validation (raw stored input never reaches CSS).
      const layout = normalizeMenuBarLayout(raw.layout, `${path}.${key}.layout`);
      if (Object.keys(layout).length > 0) override.layout = layout;         // prune empty
    }
    if (raw.navProps !== undefined) {
      const navProps = normalizeNavItemsProps(raw.navProps, `${path}.${key}.navProps`);
      if (Object.keys(navProps).length > 0) override.navProps = navProps;   // prune empty
    }
    if (Object.keys(override).length > 0) out[key as MenuResponsiveBreakpoint] = override;
  }
  return Object.keys(out).length > 0 ? out : undefined;          // empty ⇒ NEVER persisted
};

const MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS = ["visible"] as const;

const normalizeMenuBlockResponsive = (
  value: unknown,
  path: string
): MenuBlockResponsive | undefined => {
  if (!isPlainObject(value)) throw new MenuDocumentError(path);
  const out: MenuBlockResponsive = {};
  for (const [key, raw] of Object.entries(value)) {
    if (!(MENU_RESPONSIVE_BREAKPOINT_KEYS as readonly string[]).includes(key)) {
      throw new MenuDocumentError(`${path}.${key}`);
    }
    if (raw === undefined || raw === null) continue;
    if (!isPlainObject(raw)) throw new MenuDocumentError(`${path}.${key}`);
    for (const groupKey of Object.keys(raw)) {
      if (groupKey !== "visibility") throw new MenuDocumentError(`${path}.${key}.${groupKey}`);
      // "props"/"style" here ⇒ reject: menu block overrides carry ONLY visibility.
    }
    if (raw.visibility === undefined || raw.visibility === null) continue;
    if (!isPlainObject(raw.visibility)) throw new MenuDocumentError(`${path}.${key}.visibility`);
    for (const vKey of Object.keys(raw.visibility)) {
      if (!(MENU_BLOCK_VISIBILITY_OVERRIDE_KEYS as readonly string[]).includes(vKey)) {
        throw new MenuDocumentError(`${path}.${key}.visibility.${vKey}`);
      }
    }
    const visible = raw.visibility.visible;
    if (visible === undefined) continue;                          // empty record ⇒ pruned
    if (typeof visible !== "boolean") {
      throw new MenuDocumentError(`${path}.${key}.visibility.visible`);
    }
    out[key as MenuResponsiveBreakpoint] = { visibility: { visible } };
  }
  return Object.keys(out).length > 0 ? out : undefined;
};
```

#### 2.3 Key-list extensions — the CONSCIOUS fail-closed edits

```ts
const MENU_NATIVE_BLOCK_KEYS = ["id", "type", "props", "responsive"];
const MENU_LEAF_BLOCK_KEYS = ["id", "type", "props", "style", "visibility", "responsive"];
const MENU_SECTION_KEYS = ["id", "type", "name", "layout", "blocks", "responsive"];
```

Each line carries an inline comment: *"responsive" added by TASK-501-01 —
the stored read is fail-closed (:498-506); removing/forgetting this entry
degrades every saved responsive document to empty (silent data loss).* The
501-04 test matrix pins all three.

#### 2.4 Wiring into `normalizeMenuSection` / `normalizeMenuBlock`

`normalizeMenuSection` (:441-470):

```ts
const responsive =
  value.responsive === undefined || value.responsive === null
    ? undefined
    : normalizeMenuSectionResponsive(value.responsive, `${path}.responsive`);
return { id, type: sectionType, name, layout, blocks, ...(responsive ? { responsive } : {}) };
```

`normalizeMenuBlock` (:383-437) — compute once, spread per branch:

```ts
const responsive =
  value.responsive === undefined || value.responsive === null
    ? undefined
    : normalizeMenuBlockResponsive(value.responsive, `${path}.responsive`);
// every return: { ..., ...(responsive ? { responsive } : {}) }
```

**Leaf-block trap (MUST):** the leaf branch (:425-435) forwards the raw block
into `normalizeThroughPageLeaf({ ...value, id }, …)`, and the PAGE pipeline
accepts a `responsive` member with a WIDER page shape (`props`/`style` per
breakpoint) — which would silently launder page-shaped overrides past the menu
contract. Strip it before wrapping:

```ts
const { responsive: _rawResponsive, ...leafInput } = value;   // menu-validated separately above
const leaf = normalizeThroughPageLeaf({ ...leafInput, id }, pageType, mode, path);
```

The `...(responsive ? { responsive } : {})` spread guarantees **non-destructive
legacy**: documents without `responsive` normalize to byte-identical objects
(deep-equal round-trip asserted; `createDefaultMenuBlock`,
`createDefaultMenuDocumentV2`, `buildMenuDocumentV2FromLegacy` are untouched
and never emit `responsive`).

### 3. Pure resolve/read/patch/clear helpers (exported; consumed by 501-02/03)

All immutable (map sections/blocks, spread-copy touched nodes), all Bun-free.
Signatures are normative (parent §Contract sketch):

```ts
const isMobileDevice = (device: MenuDeviceKind): device is "mobile" => device === "mobile";
// desktop AND tablet ⇒ base, everywhere below (tablet deferred; canvas maps tablet⇒desktop).

export function resolveMenuSectionAppearanceForDevice(
  section: MenuSectionV2,
  device: MenuDeviceKind
): { layout: MenuBarLayout; navProps: NavItemsProps } {
  const navBlock = section.blocks.find((b) => b.type === "nav-items");
  const baseNavProps: NavItemsProps = navBlock?.type === "nav-items" ? navBlock.props : {};
  if (!isMobileDevice(device)) return { layout: { ...section.layout }, navProps: { ...baseNavProps } };
  const override = section.responsive?.mobile;
  return {
    layout: { ...section.layout, ...(override?.layout ?? {}) },      // mobile inherits desktop base
    navProps: { ...baseNavProps, ...(override?.navProps ?? {}) },
  };
}

/** Badge/Reset detection — reads the RAW override (undefined = inherited), never the merge. */
export function readMenuSectionOverrideValue(
  section: MenuSectionV2,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  key: keyof MenuAppearance
): unknown {
  const record = section.responsive?.[breakpoint]?.[group];
  return record && Object.prototype.hasOwnProperty.call(record, key)
    ? (record as MenuAppearance)[key]
    : undefined;
}

/**
 * Device-forked writer. desktop/tablet ⇒ base (group "layout" ⇒ section.layout;
 * group "navProps" ⇒ the FIRST nav-items block's props ONLY — NORMATIVE
 * DECISION: the write target is the first nav-items block (`findIndex`),
 * matching the readers (`resolveMenuSectionAppearanceForDevice` above and
 * `collectMenuAppearance` in menuDocumentCss.ts both bind via `.find()` =
 * first) and the section-level `responsive.mobile.navProps` record, which can
 * only represent ONE nav-items block. Any additional nav-items blocks
 * (reachable: ADD_BLOCK_TYPES includes "nav-items" with no dedupe, up to 12
 * blocks) MUST be left untouched. This is a conscious divergence from today's
 * per-selected-block setNavField (MenuDesignEditor.tsx patchBlock-by-id): for
 * docs with >1 nav-items block, non-first blocks keep their props but stop
 * being writable through this helper — 501-03 documents what its setNavField
 * call sites inherit. mobile ⇒ lazily-created SPARSE
 * responsive.mobile[group]. `patch` values MUST be valid MenuAppearance values
 * OR `undefined`: an `undefined` patch value means DELETE-KEY-FROM-TARGET
 * (preserves today's flat delete-on-undefined writer semantics) — base-key
 * delete on desktop/tablet; override-leaf delete + empty group ⇒ mobile ⇒
 * responsive prune on mobile. NEVER a plain spread of `{key: undefined}`,
 * which would store an own `undefined` key and break both legacy
 * byte-identity and readMenuSectionOverrideValue's hasOwnProperty badge
 * detection. (The editor passes control output; the write normalizer
 * re-validates on save.) NO auto-remove-on-equality — an override exists
 * until cleared.
 */
export function patchMenuSectionForDevice(
  doc: MenuDocumentV2,
  sectionId: string,
  device: MenuDeviceKind,
  group: MenuSectionOverrideGroup,
  patch: MenuBarLayout | NavItemsProps
): MenuDocumentV2 {
  const applyPatch = <T extends Record<string, unknown>>(target: T): T => {
    const next: Record<string, unknown> = { ...target };
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) delete next[key];   // delete-on-undefined — never an own undefined key
      else next[key] = value;
    }
    return next as T;
  };
  return mapMenuSection(doc, sectionId, (section) => {
    if (!isMobileDevice(device)) {
      if (group === "layout") return { ...section, layout: applyPatch(section.layout) };
      const navIndex = section.blocks.findIndex((b) => b.type === "nav-items");
      if (navIndex === -1) return section;  // no nav-items block ⇒ identity
      return {
        ...section,
        blocks: section.blocks.map((b, i) =>
          i === navIndex && b.type === "nav-items" ? { ...b, props: applyPatch(b.props) } : b
        ),
      };
    }
    const mobile = section.responsive?.mobile ?? {};
    const nextGroup = applyPatch((mobile[group] ?? {}) as Record<string, unknown>);
    const { [group]: _g, ...restMobile } = mobile;
    const nextMobile = Object.keys(nextGroup).length > 0 ? { ...restMobile, [group]: nextGroup } : restMobile;
    const { mobile: _m, ...restResponsive } = section.responsive ?? {};
    const responsive = Object.keys(nextMobile).length > 0 ? { ...restResponsive, mobile: nextMobile } : restResponsive;
    const next = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete (next as { responsive?: unknown }).responsive;  // prune chain, same as clearMenuSectionOverride
    return next;
  });
}

/** Explicit Reset: delete ONE override key, prune empty group ⇒ empty breakpoint ⇒ empty responsive (port of clearResponsiveOverride, pageDocumentV2.ts:3294-3308). */
export function clearMenuSectionOverride(
  doc: MenuDocumentV2,
  sectionId: string,
  breakpoint: MenuResponsiveBreakpoint,
  group: MenuSectionOverrideGroup,
  key: keyof MenuAppearance
): MenuDocumentV2 {
  return mapMenuSection(doc, sectionId, (section) => {
    const record = section.responsive?.[breakpoint]?.[group];
    if (!record || !Object.prototype.hasOwnProperty.call(record, key)) return section;
    const { [key]: _removed, ...restGroup } = record as Record<string, unknown>;
    const { [group]: _g, ...restOverride } = section.responsive![breakpoint]!;
    const override = Object.keys(restGroup).length > 0 ? { ...restOverride, [group]: restGroup } : restOverride;
    const { [breakpoint]: _b, ...restResponsive } = section.responsive!;
    const responsive = Object.keys(override).length > 0 ? { ...restResponsive, [breakpoint]: override } : restResponsive;
    const next = { ...section, responsive };
    if (Object.keys(responsive).length === 0) delete (next as { responsive?: unknown }).responsive;  // prune to byte-identical legacy shape
    return next;
  });
}

/** desktop/tablet = flat leaf visibility (visibility?.visible ?? true; native blocks ⇒ true); mobile = override ?? desktop value. */
export function resolveMenuBlockVisibleForDevice(block: MenuBlockV2, device: MenuDeviceKind): boolean {
  const desktopVisible = "visibility" in block ? (block.visibility?.visible ?? true) : true;
  if (!isMobileDevice(device)) return desktopVisible;
  return block.responsive?.mobile?.visibility?.visible ?? desktopVisible;
}

/** Input to 501-02 §5's render-if-visible-anywhere gate (shouldRenderMenuBlock): a block with a visibility override is DOM-rendered whenever visible on AT LEAST ONE device and CSS-gated per branch; visible-on-neither blocks stay render-skipped even with an override. */
export const hasMenuBlockVisibilityOverride = (block: MenuBlockV2): boolean =>
  block.responsive?.mobile?.visibility !== undefined;

/**
 * mobile ⇒ responsive.mobile.visibility (any block type, incl. menu-native);
 * desktop/tablet ⇒ FLAT visibility, LEAF blocks only (native blocks carry no
 * flat visibility by contract — the helper is a documented no-op for them on
 * desktop). Mirrors setBlockVisibleForBreakpoint (pageEditorMutationActions.ts:209-227).
 */
export function setMenuBlockVisibleForDevice(
  doc: MenuDocumentV2,
  blockId: string,
  device: MenuDeviceKind,
  visible: boolean
): MenuDocumentV2 { /* mapMenuBlock + the fork above; mobile write is sparse lazily-created */ }

/** Explicit reset; prunes empty mobile ⇒ empty responsive ⇒ deletes the member (port of clearBlockResponsiveOverride, pageDocumentV2.ts:3311-3327). */
export function clearMenuBlockVisibilityOverride(
  doc: MenuDocumentV2,
  blockId: string,
  breakpoint: MenuResponsiveBreakpoint
): MenuDocumentV2 { /* mapMenuBlock + delete visibility ⇒ prune chain as in clearMenuSectionOverride */ }
```

Internal plumbing: `mapMenuSection(doc, sectionId, fn)` and
`mapMenuBlock(doc, blockId, fn)` — small private immutable-map helpers over
`doc.sections` / `section.blocks` returning `doc` unchanged when the id is
absent (same tolerant shape as `reorderMenuBlock` :583-597).

**Error handling summary:** write path throws `MenuDocumentError` with the
exact offending path (`document.sections[i].responsive.<bp>[.group[.key]]`,
`…blocks[j].responsive.<bp>…`); helper functions never throw (missing
id/override ⇒ identity return); read path never throws (fail-closed :498-506,
unchanged mechanism).

---

## Security Contract

**Scope: UI/client-state + schema-first document contract extension; no new
route/endpoint/RBAC/migration — the document rides the existing validated
`PATCH /menus/:id` write path.** Verified against source:

- `menuUpdateSchema` (`core/server/validation/menuSchemas.ts:12-33`) already
  allows `document: { type: ["object","null"] }` (:30) with deep validation
  explicitly delegated to `normalizeMenuDocumentV2ForWrite` (comment :27-29).
  The new `responsive` keys travel INSIDE that existing envelope ⇒ **no
  schema/route/RBAC change**; `menus.settings` is freeform jsonb ⇒ **no
  migration**. This subtask verifies (does not edit) `menuSchemas.ts`,
  `menuService.ts`, `menusClient.ts`.
- **Schema-first, reject-unknown:** all new enums
  (`menuAppearanceOrientations`, `MENU_RESPONSIVE_BREAKPOINT_KEYS`,
  `MENU_SECTION_OVERRIDE_GROUP_KEYS`) and `normalize*` functions live in the
  service modules; unknown breakpoints/groups/props throw machine-readable
  `MenuDocumentError` with the offending `path`. Override VALUES reuse the
  exact base subset normalizers (`normalizeMenuBarLayout` /
  `normalizeNavItemsProps` → `fieldNormalizers`, `normalizeMenuAppearance.ts`
  :176-194: color regex, clamped numbers, enums) — raw stored input never
  reaches CSS (501-02 builds only from validated resolves).
- **Fail-closed read, non-destructive legacy:** the stored read keeps
  delegating to the strict writer (`menuDocumentV2.ts:498-506`). Legacy
  documents WITHOUT `responsive` parse byte-unchanged (spread-if-present
  emission); documents WITH unknown responsive keys degrade the WHOLE
  document to empty ⇒ default look — the designed blast radius, asserted
  consciously in tests.
- **Deterministic contracts:** sparse records only, empty
  `responsive`/`mobile`/group records pruned on write and clear, explicit
  Reset only (no auto-remove-on-equality), identity returns on missing ids.

---

## Testing Requirements (per `_docs/TESTING_STRATEGY.md`)

**Vitest lane (Bun-free services — both modules are Vitest-lane by design):**

`tests/vitest/services/normalize-menu-appearance.test.ts` (extend):
- `orientation: "horizontal" | "vertical"` accepted by
  `normalizeMenuAppearance`; `"diagonal"`/`42`/`{}` throw
  `MenuAppearanceError("orientation")`; `sanitizeMenuAppearance` drops bad
  values, keeps valid ones; absent orientation stays absent after round-trip
  (default is CSS-build-time only, never persisted).

`tests/vitest/services/menu-document-v2.test.ts` (extend):
- **Round-trips:** write⇒read of a doc with `responsive.mobile.layout`
  (e.g. `paddingY`), `responsive.mobile.navProps` (e.g.
  `orientation:"vertical"`, `itemGap`), and block
  `responsive.mobile.visibility.visible:false` on a native (`nav-items` or
  `brand`) AND a leaf (`cta-button`) block — deep-equal preserved.
- **Reject-unknown (write):** `MenuDocumentError` + exact `path` for
  `responsive.desktop` / `responsive.tablet` (breakpoint not allowed),
  `responsive.mobile.style` (unknown section group),
  `responsive.mobile.layout.linkColor` (cross-subset key),
  `responsive.mobile.navProps.sticky` (cross-subset key), block
  `responsive.mobile.props` (page-shaped group rejected — the leaf strip
  trap), `responsive.mobile.visibility.visible:"yes"` (non-boolean),
  `responsive.mobile.navProps.orientation:"diagonal"`.
- **Fail-closed read (conscious):** a legacy doc WITHOUT `responsive` reads
  byte-identically (deep-equal, and `"responsive" in section === false`); a
  stored doc WITH an unknown responsive key (e.g. `responsive.tablet`)
  degrades the WHOLE document to empty via
  `normalizeStoredMenuDocumentV2ForRead` — asserted explicitly as designed
  blast radius.
- **Prune-on-write:** `responsive: {}`, `responsive: { mobile: {} }`,
  `mobile: { layout: {} }`, `mobile: { visibility: {} }` all normalize to a
  section/block WITHOUT a `responsive` member.
- **Resolve merge:** `resolveMenuSectionAppearanceForDevice` — desktop
  returns base; mobile returns base merged with override (overridden key
  wins, un-overridden keys inherit); tablet === desktop.
- **Patch fork:** `patchMenuSectionForDevice` — desktop patch mutates
  `section.layout` / the FIRST nav-items block's `props` (base) and leaves
  `responsive` absent; tablet patch ⇒ base too; mobile patch creates the
  sparse record with ONLY the patched key; second mobile patch merges
  (doesn't clobber sibling override keys); unknown sectionId ⇒ identity.
- **Multi-nav-items write target (normative pin):** a section with TWO
  `nav-items` blocks — a desktop `navProps` patch mutates ONLY the first
  nav-items block's `props`; the second nav-items block is untouched
  (reference-identical / deep-equal to its pre-patch value); a section with
  NO nav-items block ⇒ identity on a desktop `navProps` patch.
- **Delete-on-undefined patch:** `patchMenuSectionForDevice` with
  `{ fontWeight: undefined }` — desktop/tablet deletes the base key (today's
  flat setLayoutField/setNavField semantics preserved); mobile deletes the
  override leaf and prunes empty group ⇒ `mobile` ⇒ `responsive` (deep-equals
  the pre-override doc when it was the sole override); the result NEVER
  carries an own `undefined` key (hasOwnProperty false ⇒
  `readMenuSectionOverrideValue` reads inherited); an `undefined` patch for a
  key absent from the target leaves no residue (identity-shaped output).
- **Clear + prune:** `clearMenuSectionOverride` removes one key; removing the
  last key prunes group ⇒ breakpoint ⇒ the whole `responsive` member
  (result deep-equals the pre-override document); clearing a non-existent
  override ⇒ identity. Same for `clearMenuBlockVisibilityOverride`.
- **Visibility resolution:** `resolveMenuBlockVisibleForDevice` — native
  block desktop ⇒ `true`; leaf with flat `visible:false` desktop ⇒ `false`;
  mobile override wins over the flat value both directions (hide-on-mobile
  AND show-only-on-mobile: flat `false` + mobile `true`); no override ⇒
  mobile inherits desktop. `hasMenuBlockVisibilityOverride` true/false.
- **No auto-remove-on-equality:** patching mobile with the exact base value
  still stores the override (badge semantics belong to explicit Reset).
- **Setter fork:** `setMenuBlockVisibleForDevice` — mobile writes
  `responsive.mobile.visibility` on native AND leaf blocks; desktop writes
  flat `visibility` on leaf blocks; desktop on a native block ⇒ identity
  (documented no-op).

**Bun lane:** no bun-lane changes in this subtask. The route persistence test
(`tests/integration/routes/menus.test.ts`: `document` PATCH carrying
`responsive` persists; invalid responsive payload 4xx `menu_document_invalid`)
and the render/CSS suites land with 501-02/501-04 per the parent matrix.
Verify-only here: `bun --cwd core lint`, `bun --cwd core lint:types`, and the
existing menu vitest files green.

---

## Acceptance criteria

1. Both files compile; all helper exports exist with the normative signatures
   above (501-02/03 import them unchanged).
2. Legacy round-trip byte-identity: normalizing any pre-501 document yields
   deep-equal output with NO `responsive` members anywhere.
3. The full vitest matrix above passes; existing
   `menu-document-v2.test.ts` / `normalize-menu-appearance.test.ts` suites
   pass without modification of existing assertions.
4. `menuSchemas.ts` / `menuService.ts` / `menusClient.ts` diff = empty
   (verified, cited in the closure note).
5. No React/UI/CSS changes in this subtask (hooks rules are 501-03's
   concern: device-forked writes happen in event handlers via these helpers).

## Out of scope (owned by siblings)

- CSS emission incl. orientation rule + `data-menu-block-id` gating — 501-02.
- Editor wiring: device-forked `setLayoutField`/`setNavField`/`patchBlock`,
  `MenuResponsiveControlShell` badge/Reset, orientation SegmentedControl,
  per-block mobile visibility toggle — 501-03. NOTE for 501-03: `setNavField`
  call sites routed through `patchMenuSectionForDevice` inherit the
  FIRST-nav-items-block write target (normative, §3) — a behavior change from
  today's patchBlock-by-selected-id for documents with >1 nav-items block;
  501-03 must state this in its wiring contract.
- Route/bun test matrix, playwright smoke, docs/changelog/board — 501-04.
- `menu-drawer` runtime, tablet breakpoint, `siteShellCss.ts` — TASK-501
  non-goals.
