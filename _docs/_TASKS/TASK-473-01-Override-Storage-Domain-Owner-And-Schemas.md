# TASK-473-01: Override Storage Domain Owner And Schemas
# FileName: TASK-473-01-Override-Storage-Domain-Owner-And-Schemas.md

**Parent Task:** TASK-473
**Priority:** Medium
**Category:** Custom Screens / Entry Presentation / Storage Contract
**Estimated Effort:** Large
**Dependencies:** TASK-468-05, TASK-468-07-L01
**Status:** ⏳ To Do

---

## Overview

Own the storage contract for per-screen/per-entry presentation overrides so that
record-specific image/text-size/style choices persist **outside**
`content_entries.data`. This subtask defines the domain types, strict schemas and
normalizers, the override service (replace-scoped writes), machine-readable
errors, and the DB migration artifacts. Entry `data` stays owned by the content
type schema; overrides are a separate, validated, auditable layer.

## Current State (summary)

- `core/services/customScreens/` owns screen schemas/services
  (`customScreenSchemas.ts`, `customScreenService.ts`, `bindingResolver.ts`).
- No override storage exists today; per-record style/image/text-size was punted
  here from TASK-468-05.
- Migrations live in `core/db/migrations/` with `meta/_journal.json` +
  `meta/*_snapshot.json`; allocate the next available migration number at
  implementation time (`0061_*` at audit HEAD `aff5ca42`).
- Drizzle table exports live in `core/db/schema.ts` and must be updated for a new
  table-backed override store.
- `rejectUnknownKeys` + `normalize*` discipline is established in
  `customScreenSchemas.ts`; those helpers are private today, so this module must
  own or export explicit equivalents instead of importing private internals.

## Sub-Tasks

- [ ] Define `ScreenEntryPresentationOverride` types + allowed override targets
  and value domains.
- [ ] Add strict schema + `normalizeScreenEntryPresentationOverride`
  (reject-unknown, safe block id, safe prop path, allowed values).
- [ ] Add the override service: `saveScreenEntryPresentationOverrides`,
  `getScreenEntryPresentationOverrides`, `replaceScopedOverrides`.
- [ ] Add machine-readable errors (`custom_screen_override_*`).
- [ ] Add DB migration artifacts (SQL + snapshot + journal) for the override
  store, keeping the module Bun-free (lazy default deps for the repository).

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/screenEntryPresentationOverrides.ts` *(new)* | Types, schema, normalizer, service, error map owner. |
| `core/services/customScreens/customScreenService.ts` | Re-export / wire override service where needed. |
| `core/db/schema.ts` | Add the Drizzle table export for the override store. |
| `core/db/migrations/0061_*.sql` *(new; next available number)* | Override table (or chosen store). |
| `core/db/migrations/meta/0061_snapshot.json` *(new; matching migration number)* | Migration snapshot. |
| `core/db/migrations/meta/_journal.json` | Journal update. |
| `tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts` *(new)* | Pure schema/service tests. |

## Implementation Pseudocode

```ts
type ScreenEntryPresentationOverride = {
  screenId: string; entryId: string; blockId: string;
  propPath: string; value: unknown; updatedBy: string;
};

// This module owns its OWN private helpers — `rejectUnknownKeys` and the
// `normalize*` helpers in customScreenSchemas.ts are not exported.
function rejectUnknownOverrideKeys(input: unknown, allowed: readonly string[]): asserts input is Record<string, unknown> { /* throw custom_screen_override_invalid on extra keys */ }
function normalizeOverridePath(value: unknown): string { /* safe blockId/propPath: reject unsafe `__proto__`, `.`, `[]` segments */ }

function normalizeScreenEntryPresentationOverride(input: unknown) {
  rejectUnknownOverrideKeys(input, ["blockId", "propPath", "value"]);
  return {
    blockId: normalizeOverridePath(input.blockId),
    propPath: normalizeOverridePath(input.propPath),
    value: normalizeAllowedPresentationValue(input.value), // bounded enums/sizes/media-id only
  };
}

async function saveScreenEntryPresentationOverrides(input: {
  screenId: string; entryId: string;
  overrides: ScreenEntryPresentationOverride[]; actorId: string;
}) {
  await assertScreenEntryWriteAccess(input);
  const normalized = input.overrides.map(normalizeScreenEntryPresentationOverride);
  return overrideRepository.replaceScopedOverrides(input.screenId, input.entryId, normalized);
}
```

Data flow:

- Overrides are scoped by `(screenId, entryId)` and replaced atomically per save.
- The repository is injected via lazy default deps so Vitest can import the
  module without DB/runtime coupling (Bun-free domain).
- Allowed value domains are bounded (presentation enums, text-size tokens,
  media ids), never arbitrary content data.
- The override module owns its reject-unknown and safe-path helpers unless the
  shared Custom Screen schema module deliberately exports public equivalents.

Error handling:

- Unknown block ids, deleted fields, invalid prop paths, and unsupported values
  return `custom_screen_override_invalid` / `_not_found`.
- Writes never touch `content_entries.data`.

Regression-test shape:

```ts
test("presentation overrides do not enter content entry data", async () => {
  await saveScreenEntryPresentationOverrides({
    screenId: "screen-1", entryId: "entry-1",
    overrides: [{ blockId: "image-1", propPath: "image", value: "media-1" }], actorId: "admin-1",
  });
  expect(await getEntry("entry-1")).not.toHaveProperty("data.image");
  expect(await getScreenEntryPresentationOverrides("screen-1", "entry-1"))
    .toContainEqual(expect.objectContaining({ blockId: "image-1", propPath: "image" }));
});
```

## Security Contract

- **Endpoint visibility:** none in this subtask — domain/service + migration only
  (routes land in TASK-473-02).
- **Auth model:** service callers must be authenticated admin sessions
  (`assertScreenEntryWriteAccess`).
- **RBAC:** `content:read` for reads; `content:write` for writes.
- **CSRF expectations:** enforced at the route layer (TASK-473-02).
- **Rate-limit bucket:** N/A at service layer.
- **Reject unknown validation:** required at the service boundary for payloads,
  targets, prop paths, and values.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** overrides must not store provider credentials, CSRF
  tokens, cookies, private settings, or protected field values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/screenEntryPresentationOverrides.test.ts`
- DB migration tests when `DATABASE_URL` is available
  (`set -a && source .env && set +a`).
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/DATA_MODEL.md` (override store).
- `_docs/CMS_API.md` (contract owner; route surface in TASK-473-02).

## Acceptance Criteria

1. Per-record presentation overrides persist outside `content_entries.data`.
2. Override payloads are strictly normalized, bounded, and auditable
   (`updatedBy`).
3. Migration artifacts (SQL + snapshot + journal) are complete and the domain
   module imports Bun-free.
4. vitest, lint, and types are green.
