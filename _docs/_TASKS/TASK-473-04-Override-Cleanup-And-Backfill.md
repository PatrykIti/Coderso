# TASK-473-04: Override Cleanup And Backfill
# FileName: TASK-473-04-Override-Cleanup-And-Backfill.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Custom Screens / Entry Presentation / Data Hygiene
**Estimated Effort:** Medium
**Dependencies:** TASK-473-01
**Status:** ⏳ To Do

---

## Overview

Ensure deleting a screen, entry, field, or block cannot leave active, unsafe, or
orphaned presentation override state. Cleanup removes or ignores overrides whose
target no longer exists, without corrupting `content_entries.data`. Reads
defensively ignore overrides for missing targets so a stale row never affects
rendering before cleanup runs.

## Current State (summary)

- Override store + service owned by TASK-473-01
  (`screenEntryPresentationOverrides.ts`).
- Screen lifecycle is owned by `customScreenService.ts`; entry lifecycle is owned
  by `core/services/content/entryService.ts`; content-type field changes are
  owned by the content type services. Cleanup must use DB cascades where the FK
  owner is available and service/read filtering where the target is logical
  (field/block path) rather than a table row.

## Sub-Tasks

- [ ] On screen delete: remove all overrides scoped to that `screenId` through FK
  cascade or the Custom Screen service cleanup hook.
- [ ] On entry delete: remove all overrides scoped to that `entryId` through FK
  cascade or the content entry service cleanup hook.
- [ ] On field/block removal: drop overrides whose `blockId`/`propPath` no longer
  resolves (or ignore them at read time and reap lazily).
- [ ] Make override reads defensively skip unresolved targets.
- [ ] Add cleanup/backfill tests for each deletion path.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/screenEntryPresentationOverrides.ts` | Cleanup helpers + defensive read filtering. |
| `core/services/customScreens/customScreenService.ts` | Trigger override cleanup on screen delete and definition/block mutations. |
| `core/services/content/entryService.ts` | Trigger or verify override cleanup on entry delete when not handled by FK cascade. |
| `core/services/content/typeService.ts` | Trigger or verify field-target cleanup/read filtering after field removal. |
| `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts` | Cleanup + defensive-read coverage. |

## Implementation Pseudocode

```ts
async function cleanupOverridesForDeletedScreen(screenId: string) {
  await overrideRepository.deleteByScreen(screenId);
}
async function cleanupOverridesForDeletedEntry(entryId: string) {
  await overrideRepository.deleteByEntry(entryId);
}
// Read-time defense: drop overrides whose block/prop/field no longer resolves
function resolveActiveOverrides(overrides, document, contentType) {
  return overrides.filter((o) =>
    findBlock(document, o.blockId) && isAllowedPropPath(o.propPath, contentType));
}
```

Data flow:

- Delete hooks call cleanup synchronously with the owning mutation unless the
  migration owns the same behavior through FK cascade.
- Read paths filter unresolved overrides so rendering is correct even before a
  lazy reap.

Error handling:

- Cleanup is idempotent; deleting already-absent overrides is a no-op.
- Cleanup must never delete or mutate `content_entries` rows.

Regression-test shape:

```ts
test("deleting an entry removes its overrides and leaves content entries intact", async () => {
  await seedOverride({ screenId: "s1", entryId: "e1", blockId: "b1", propPath: "image" });
  await deleteEntry("e1");
  expect(await getScreenEntryPresentationOverrides("s1", "e1")).toEqual([]);
  expect(await otherEntriesUntouched()).toBe(true);
});
```

## Security Contract

- **Endpoint visibility:** none — service-layer cleanup hooks.
- **Auth model:** cleanup runs within already-authorized delete operations.
- **RBAC:** inherits the deleting operation's permissions; no new surface.
- **CSRF expectations:** N/A (no new route).
- **Rate-limit bucket:** N/A.
- **Reject unknown validation:** N/A (no external payload).
- **Anti-abuse controls:** none required.
- **Secret handling:** cleanup must not read or log protected values; it only
  deletes scoped override rows.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`
- DB-backed cleanup tests when `DATABASE_URL` is available
  (`set -a && source .env && set +a`).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/DATA_MODEL.md` (override lifecycle / cleanup).

## Acceptance Criteria

1. Deleting screens, entries, fields, or blocks cannot leave active unsafe
   override state.
2. Override reads defensively ignore unresolved targets.
3. Cleanup never corrupts or deletes `content_entries` data.
4. vitest, lint, and types are green.
