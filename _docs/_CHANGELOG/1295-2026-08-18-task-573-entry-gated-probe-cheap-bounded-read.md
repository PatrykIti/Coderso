# 1295 - TASK-573 Entry Gated Probe Cheap Bounded Read

**Date:** 2026-08-18
**Version:** Unreleased
**Tasks:** TASK-573

## Key Changes

### Content Reads
- `entryReadService.ts` gains `getEntryVisibilityById` and
  `getEntryVisibilityBySlug` with a minimal projection (`id`, `visibility`),
  no joins, no SEO, no taxonomy, and no `data`/author/encrypted-email
  columns; the slug probe is scoped by `(typeId, slug)` per the
  `content_entries_type_slug_idx` uniqueness contract.
- `entryRouteIsGated()` in `publicEntryGateUi.tsx` wires BOTH narrow reads
  (id branch and slug branch; the slug branch resolves `typeId` from the
  type slug first), replacing the previous full
  `getEntry()`/`getEntryBySlug()` probe on the hot public detail path.
- Probe result is visibility/existence only; no private fields returned.

## Validation
- `bun --cwd core lint` + `lint:types` green; Vitest query-shape test asserts
  the minimal projection (`id`/`visibility` only), that heavy loaders are NOT
  invoked (mock-based dependency check), and that the slug probe is typeId
  scoped.
- `tests/integration/runtime/entry-visibility-gate.test.ts` stays green.
- Runtime smoke: covered by the entry-visibility suite
  (`wf579-517smoke`, anon cached render + gated flows).
