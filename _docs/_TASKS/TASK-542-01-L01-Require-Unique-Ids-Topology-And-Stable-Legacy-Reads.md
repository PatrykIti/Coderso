# TASK-542-01-L01: Require Unique IDs, Topology, and Stable Legacy Reads

# FileName: TASK-542-01-L01-Require-Unique-Ids-Topology-And-Stable-Legacy-Reads.md

**Parent Task:** TASK-542
**Parent Subtask:** TASK-542-01
**Priority:** High
**Category:** Menus / Domain Model / Validation
**Estimated Effort:** Medium
**Dependencies:** TASK-541-02-L02
**Status:** ⏳ To Do
**Changelog:** 1319 (pinned; closure only)

---

## Exclusive ownership

- `core/services/menus/menuDocumentV2.ts` (facade after the split below)
- `core/services/menus/menuDocumentV2Schema.ts`
- `core/services/menus/menuDocumentV2Normalize.ts`
- `core/services/menus/menuDocumentV2Devices.ts`
- `core/services/menus/menuDocumentV2Ops.ts`

Do not edit `menuDocumentCss.ts`, routes, service orchestration, renderer,
MenuDesignEditor, or TASK-541 color code. The named direct gate suites
(`tests/vitest/services/menu-document-v2.test.ts`, `tests/unit/menus/menuService.test.ts`,
`tests/integration/routes/menus.test.ts`) may receive mechanical/type-only adjustments
when the facade split requires them (import/type fixes only, no assertion weakening);
additive contract tests belong to TASK-542-04-L01.

## Line-gate split plan

`menuDocumentV2.ts` is 2,765 lines at HEAD 3c470092 and must be split in this
same change: the 1,000-line gate applies at TASK-542 close, so deferring to a
later family is not allowed. Split by cohesive responsibility and preserve the
public facade so every existing import site keeps importing `menuDocumentV2`
unchanged.

| New module | Responsibility |
|---|---|
| `menuDocumentV2Schema.ts` | schema contract: type declarations, enum/const arrays, key sets, number ranges, defaults, `MenuDocumentError`, `isMenuDocumentError` |
| `menuDocumentV2Normalize.ts` | strict normalization engine: primitive guards, deterministic ID allocation, block/section/leaf/segment/appearance normalizers, exact-key gates, topology assertion, `normalizeMenuDocumentV2ForWrite`, `normalizeStoredMenuDocumentV2ForRead`, empty-document constant |
| `menuDocumentV2Devices.ts` | device resolvers plus read/patch/clear/has overrides (section appearance, block visibility, brand style, nav level, nav chrome) and `menuDocumentHasScrolledVariantForAnyDevice` |
| `menuDocumentV2Ops.ts` | document CRUD (`createDefaultMenuBlock`, `createDefaultMenuDocumentV2`, `findMenuBlock`, `insertMenuBlock`, `deleteMenuBlock`, `reorderMenuBlock`) plus `normalizeMenuBoxShadowValue`, `resolveBrandImageSrc` |
| `menuDocumentV2.ts` | facade: re-exports the four modules' public symbols; adds no new public surface |

Land order: `Schema → Normalize → Devices → Ops → Facade`. Re-run
`bun --cwd core lint:types`, `bun --cwd core lint`, and the owned
`tests/vitest/services/menu-document-v2.test.ts` after each step. Post-split
receipt: each extraction module is at most 1,000 physical lines (`wc -l`) and
the facade is a thin re-export; record the verified line counts in closeout
evidence.

## Grounded anchors

- Random ID owner and permissive `readMenuBlockId`:
  `menuDocumentV2.ts:430-456`.
- Block exact-key gate but generated ID: `:1411-1506`.
- Section gate/generated ID: `:1509-1558`.
- Top-level normalizer without unknown-key check/topology: `:1563-1585`.
- Write/read entry points: `:1588-1605`.
- First-section-only consumer helpers: `:1651-1659`.
- Existing effective-device resolvers and scrolled layout fields: re-grep
  `resolveMenuSectionAppearanceForDevice` and `surfaceColorScrolled`.

## Implementation Pseudocode

```ts
const MENU_DOCUMENT_KEYS = ["schemaVersion", "sections"] as const;
const MENU_ID = /^[a-z][a-z0-9_-]{0,159}$/;

function requireWriteId(value: unknown, path: string): string {
  if (typeof value !== "string") throw new MenuDocumentError(path);
  const id = value.trim();
  if (!MENU_ID.test(id)) throw new MenuDocumentError(path);
  return id;
}

function allocateLegacyId(
  raw: unknown,
  fallback: string,       // e.g. sec-menu-bar-0 / blk-0-brand-0
  used: Set<string>
): string {
  const candidate = typeof raw === "string" ? raw.trim() : "";
  // Preserve only IDs that already satisfy the canonical write grammar.
  const preferred = MENU_ID.test(candidate) ? candidate : fallback;
  if (!used.has(preferred)) {
    used.add(preferred);
    return preferred;
  }
  for (let suffix = 2; ; suffix += 1) {
    const marker = `-${suffix}`;
    // MENU_ID permits 160 total characters. Reserve marker bytes before slicing
    // so a duplicate maximum-length legacy ID remains valid on a later write.
    const base = preferred.slice(0, 160 - marker.length);
    const id = `${base}${marker}`;
    if (!MENU_ID.test(id)) throw new MenuDocumentError("document.id");
    if (!used.has(id)) {
      used.add(id);
      return id;
    }
  }
}

function assertMenuTopology(sections: MenuSectionV2[]): void {
  // sections.length===0 is the existing explicit clear sentinel and is handled
  // before persisted-document topology validation.
  if (sections.length > 2) invalid("document.sections");
  if (sections[0]?.type !== "menu-bar") invalid("document.sections[0].type");
  if (sections.slice(1).some((s) => s.type !== "menu-drawer")) invalid(...);
  if (sections.filter((s) => s.type === "menu-bar").length !== 1) invalid(...);
  if (sections.filter((s) => s.type === "menu-drawer").length > 1) invalid(...);
  // Apply the existing supported block/topology rules per section.
}

function normalizeMenuDocumentV2(value, mode) {
  assertExactKeys(value, MENU_DOCUMENT_KEYS, "document");
  if (value.schemaVersion !== MENU_DOCUMENT_SCHEMA_VERSION) invalid("document.schemaVersion");
  const ids = new Set<string>();
  const sections = value.sections.map((section, sectionIndex) =>
    normalizeMenuSection(section, sectionIndex, mode, ids));
  if (sections.length === 0) return EMPTY_MENU_DOCUMENT; // existing clear contract
  assertMenuTopology(sections);
  return { schemaVersion: 1, sections };
}

export function menuDocumentHasScrolledVariantForAnyDevice(doc): boolean {
  return (["desktop", "tablet", "mobile"] as const).some((device) => {
    const bar = resolve first menu-bar effective layout for device;
    return bar.sticky === true && hasAnyOwnScrolledPresentationKey(bar);
  });
}
```

Split write and stored-read ID policy explicitly; remove `Date.now`,
`Math.random`, and `crypto.randomUUID` from normalization. Creation helpers may
still generate new authoring IDs before write, but normalization never invents a
random one. Use a single document-wide `Set` across sections and nested blocks.

The stored-read adapter repairs missing, syntactically invalid, and colliding IDs
only after exact version and topology checks. Invalid values use the same stable
structural-path fallback as missing values; valid non-colliding legacy IDs remain
unchanged. Collision suffix allocation reserves marker length before truncation and
revalidates the result, so every repaired ID still satisfies the 160-character write
grammar. It returns a normalized copy and never invokes persistence.
Unknown keys/future versions fail to `EMPTY_MENU_DOCUMENT` through the existing
read wrapper.

`menuDocumentHasScrolledVariantForAnyDevice` examines effective layouts without
seeding unauthored fields. It returns false for an absent/empty/no-scrolled doc,
preserving no-script byte identity.

## Error and compatibility flow

- Write violations throw `MenuDocumentError` with the most precise path and map
  through existing `menu_document_invalid`/400.
- The existing empty-document/null clear path remains valid and persists no
  ambiguous document; topology rules apply to every non-empty document.
- Valid canonical documents round-trip byte-identically.
- Same malformed legacy ID input read twice yields deeply equal IDs/order.
- A document with invalid legacy IDs can be read and then saved after an unrelated
  edit without failing the stricter writer; that save persists only the canonical
  adapted copy selected by the user action.
- Ambiguous topology fails closed to the existing empty-document fallback.
- No document version bump and no destructive DB rewrite.

## Tests owned by TASK-542-04

- `tests/vitest/services/menu-document-v2.test.ts`: unknown top key, missing/
  blank/syntactically-invalid/duplicate IDs, global section/block collisions,
  duplicate 160-character IDs, suffix collisions after truncation, every invalid
  topology, stable repeated legacy repair, read→unrelated-save,
  valid write/read round-trip, empty/no-scrolled
  helper and responsive-only scrolled helper.
- `tests/integration/routes/menus.test.ts`: 400 path mapping and untouched stored
  document on rejection.
- `tests/unit/menus/menuService.test.ts`: service persistence remains orchestration
  over the owner normalizer.

## Validation

```bash
bun --cwd core lint:types
bun --cwd core lint
bunx vitest run tests/vitest/services/menu-document-v2.test.ts
set -a && source .env && set +a
bun test tests/unit/menus/menuService.test.ts tests/integration/routes/menus.test.ts
```

Rerun any named failure once in isolation. No migration artifact is expected.
