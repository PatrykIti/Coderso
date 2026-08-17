# TASK-573: Entry Gated Probe Cheap Bounded Read

**Status:** ⏳ To Do
**Started:**
**Completed:**
**Priority:** Medium
**Size:** Small

# FileName: TASK-573_Entry_Gated_Probe_Cheap_Bounded_Read.md

**Parent Task:** none
**Source Findings:** M-517-02 (audit `_TMP-audit-task-517-entry-visibility.md`, verified at HEAD `4e3dab15`)

## Purpose

`entryRouteIsGated()` runs before the shared-cache read on every detail URL but
uses the full `getEntry()`/`getEntryBySlug()` which selects a wide
`entryListSelection` (tags, `data`, author, encrypted email columns) and performs
SEO and taxonomy reads. The probe only needs visibility (and existence), so the
hot public path pays for unbounded JSON and extra queries, contradicting the
"single cheap read" comment.

## Evidence

- `core/server/publicEntryGateUi.tsx:145-162` — `entryRouteIsGated()` calls
  `getEntry()`/`getEntryBySlug()`.
- `core/services/content/entryReadService.ts:149-170` — wide selection + SEO +
  taxonomy reads; `entryListSelection` at `:17-55` includes `tags`, `data`,
  author, encrypted email.

## Scope

- Add `getEntryVisibilityById` / `getEntryVisibilityBySlug` with a minimal
  projection (`id`, `visibility`, plus `typeId` if required), no joins, no SEO,
  no taxonomy, no `data`/email columns.
- Wire the probe to the narrow read.
- Add a test asserting the minimal projection and that heavy loaders are NOT
  invoked (mock-based dependency check).

## Fix Strategy

```ts
// entryReadService.ts
export async function getEntryVisibilityBySlug(slug: string) {
  return db.select({ id: entries.id, visibility: entries.visibility })
    .from(entries).where(eq(entries.slug, slug)).limit(1);
}
```

## Security Contract

- Endpoints unchanged (public detail render); no payload change.
- Probe result is only visibility/existence; no private fields returned.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest query-shape test (narrow projection, no heavy loader calls).
