# TASK-573: Entry Gated Probe Cheap Bounded Read

**Status:** ✅ Done
**Started:** 2026-08-18
**Completed:** 2026-08-18
**Changelog:** 1295 (pinned)
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
// entryReadService.ts — keep the (typeId, slug) scope: entry slugs are unique
// only per type (uniqueIndex content_entries_type_slug_idx on (typeId, slug)),
// so a slug-only probe could match a different type's entry.
export async function getEntryVisibilityBySlug(typeId: string, slug: string) {
  return db.select({ id: entries.id, visibility: entries.visibility })
    .from(entries).where(and(eq(entries.typeId, typeId), eq(entries.slug, slug))).limit(1);
}
export async function getEntryVisibilityById(id: string) {
  return db.select({ id: entries.id, visibility: entries.visibility })
    .from(entries).where(eq(entries.id, id)).limit(1);
}
```

`entryRouteIsGated()` wires BOTH narrow reads (the probe has an id branch and a
slug branch); the slug branch resolves `typeId` from the type slug first.

## Security Contract

- Endpoints unchanged (public detail render); no payload change.
- Probe result is only visibility/existence; no private fields returned.

## Validation

- `bun --cwd core lint` + `bun --cwd core lint:types`.
- Vitest query-shape test (narrow projection: `id`/`visibility`/`typeId` only,
  no heavy loader calls, no SEO/taxonomy/author joins; slug probe scoped by
  typeId).
- Keep `tests/integration/runtime/entry-visibility-gate.test.ts` green.
