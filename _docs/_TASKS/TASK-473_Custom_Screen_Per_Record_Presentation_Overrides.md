# TASK-473: Custom Screen Per-Record Presentation Overrides
# FileName: TASK-473_Custom_Screen_Per_Record_Presentation_Overrides.md

**Priority:** Medium
**Category:** Custom Screens / Entry Presentation / Storage Contract
**Estimated Effort:** Large
**Dependencies:** TASK-468-05, TASK-468-07-L01
**Status:** ⏳ To Do

---

## Overview

Design and implement durable per-record presentation overrides for Custom Screen
entry detail canvases without storing hidden style/image/text-size fields inside
`content_entries.data`. Entry `data` remains owned by the content type schema;
presentation overrides need an explicit storage/API contract that can be
validated, audited, permissioned, and cleaned up independently.

This follow-up owns examples such as record-specific image choices, text-size
or emphasis overrides, and other presentation metadata that should affect how a
record appears in one Custom Screen without becoming part of the content type's
business data.

## Sub-Tasks

- [ ] Define the storage owner for per-screen/per-entry presentation overrides.
- [ ] Add strict schemas and normalizers for allowed override targets and
  values.
- [ ] Add internal admin routes or extend existing entry-screen routes with
  reject-unknown validation and machine-readable errors.
- [ ] Wire the record detail floating Value/presentation panel to read, save,
  clear, and reload overrides without dirty-state loss.
- [ ] Add cleanup/backfill behavior for deleted screens, entries, fields, and
  blocks.
- [ ] Document the contract in Custom Screen API/docs and add changelog/board
  closure evidence.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/*` | New override schema, normalizer, service, and error mapping owner. |
| `core/db/migrations/*` | Migration artifacts if a new table is chosen. |
| `core/server/routes/*` | Internal admin read/write routes or route extension. |
| `core/admin/ui/custom-screens/*` | Floating panel controls for override read/write/clear. |
| `tests/vitest/customScreens/*` | Pure schema/service tests. |
| `tests/integration/routes/*` | Internal route validation and RBAC tests. |
| `_docs/CMS_API.md` | API/storage contract docs. |
| `_docs/CMS_SPEC.md` | Product/UX scope docs. |

## Implementation Pseudocode

```ts
type ScreenEntryPresentationOverride = {
  screenId: string;
  entryId: string;
  blockId: string;
  propPath: string;
  value: unknown;
  updatedBy: string;
};

function normalizeScreenEntryPresentationOverride(input: unknown) {
  rejectUnknownKeys(input, ["blockId", "propPath", "value"]);
  const blockId = normalizePath(input.blockId);
  const propPath = normalizeSafeBindingPath(input.propPath);
  const value = normalizeAllowedPresentationValue(input.value);
  return { blockId, propPath, value };
}

async function saveScreenEntryPresentationOverrides(input: {
  screenId: string;
  entryId: string;
  overrides: ScreenEntryPresentationOverride[];
  actorId: string;
}) {
  await assertScreenEntryWriteAccess(input);
  const normalized = input.overrides.map(normalizeScreenEntryPresentationOverride);
  return overrideRepository.replaceScopedOverrides(input.screenId, input.entryId, normalized);
}
```

Data flow:

- Record detail loads content entry data and presentation overrides separately.
- Canvas rendering merges overrides after content data is validated, without
  mutating `content_entries.data`.
- Save writes content field changes through existing entry services and writes
  presentation overrides through the new override service.

Error handling:

- Unknown block ids, deleted fields, invalid prop paths, and unsupported values
  return machine-readable `custom_screen_override_*` errors.
- Partial save failures preserve local dirty state and show which layer failed:
  entry content or presentation override.
- Cleanup removes or ignores overrides for deleted screens, entries, and blocks
  without corrupting content entries.

Regression-test shape:

```ts
test("presentation overrides do not enter content entry data", async () => {
  await saveScreenEntryPresentationOverrides({
    screenId: "screen-1",
    entryId: "entry-1",
    overrides: [{ blockId: "image-1", propPath: "image", value: "media-1" }],
    actorId: "admin-1",
  });

  expect(await getEntry("entry-1")).not.toHaveProperty("data.image");
  expect(await getScreenEntryPresentationOverrides("screen-1", "entry-1")).toContainEqual(
    expect.objectContaining({ blockId: "image-1", propPath: "image" })
  );
});
```

## Security Contract

- **Endpoint visibility:** internal admin only unless a later public runtime task
  explicitly adds public presentation writes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for reads; `content:write` for writes; preserve any
  stronger screen/entry permission checks added by TASK-468 follow-ups.
- **CSRF expectations:** required for all admin write routes.
- **Rate-limit bucket:** existing admin write bucket for mutations and admin
  read bucket for reads.
- **Reject unknown validation:** required at route and service boundaries for
  override payloads, targets, prop paths, and values.
- **Anti-abuse controls:** no public write path in this task; if public writes
  are later added, require nonce plus HMAC/signature and optional reCAPTCHA.
- **Secret handling:** overrides must not store provider credentials, CSRF
  tokens, cookies, private settings, or protected field values outside the
  existing admin authorization model.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens`
- `set -a && source .env && set +a && bun test tests/integration/routes/customScreensRoutes.test.ts`
- DB migration tests when `DATABASE_URL` is available.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `bun --cwd core build:admin`
- `bun run check:admin-boundary`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`
- `_docs/DATA_MODEL.md` if storage changes.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/` and `_docs/_CHANGELOG/README.md` on closure.

## Acceptance Criteria

1. Per-record presentation overrides persist outside `content_entries.data`.
2. Override payloads are strictly validated, permissioned, and auditable.
3. Record detail UI can save and reload overrides without exposing builder
   controls in record mode.
4. Deleting screens, entries, fields, or blocks cannot leave active unsafe
   override state.
