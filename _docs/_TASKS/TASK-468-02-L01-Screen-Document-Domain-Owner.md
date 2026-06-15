# TASK-468-02-L01: Screen Document Domain Owner
# FileName: TASK-468-02-L01-Screen-Document-Domain-Owner.md

**Parent Subtask:** TASK-468-02
**Priority:** High
**Category:** Custom Screens / Domain Contract
**Estimated Effort:** Large
**Dependencies:** TASK-468-01-L02
**Status:** ⏳ To Do

---

## Overview

Create the pure domain owner for screen documents. This module owns V4 types,
defaults, strict normalizers, id limits, block prop normalization, and binding
validation without importing admin UI, DB clients, or runtime widget registries.

## Sub-Tasks

- [ ] Add `core/services/customScreens/screenDocument.ts`.
- [ ] Move V4 enums/defaults/normalizers into that owner.
- [ ] Keep the module Bun-free and DB-free.
- [ ] Add unit tests for valid/invalid V4 documents.
- [ ] Export only stable helpers needed by service/admin/assistant code.

## Files To Change

| File | Required change |
|---|---|
| `core/services/customScreens/screenDocument.ts` | New V4 screen document owner. |
| `core/services/customScreens/customScreenSchemas.ts` | Import V4 owner instead of duplicating logic. |
| `tests/vitest/customScreens/screenDocument.test.ts` | New pure domain coverage. |

## Implementation Pseudocode

```ts
export function normalizeScreenDocumentV1(
  input: unknown,
  context: ScreenDocumentContext
): ScreenDocumentV1 {
  const record = assertRecord(input);
  rejectUnknownKeys(record, ["schemaVersion", "sections"]);
  return {
    schemaVersion: normalizeScreenDocumentVersion(record.schemaVersion),
    sections: normalizeScreenSections(record.sections, context),
  };
}

export function normalizeScreenBlockV1(input: unknown, context: ScreenDocumentContext) {
  const record = assertRecord(input);
  rejectUnknownKeys(record, ["id", "type", "props"]);
  const type = normalizeScreenBlockType(record.type);
  return {
    id: normalizeStableId(record.id),
    type,
    props: normalizeScreenBlockProps(type, record.props, context),
  };
}
```

Data flow:

- Routes and services delegate V4 definition details to `screenDocument.ts`.
- Admin/UI imports types only, or pure helpers that do not touch runtime services.
- Assistant action validators reuse the same block/binding constraints.

Error handling:

- Invalid records throw `custom_screen_definition_invalid`.
- Unknown block types reject except legacy migration placeholders created by the
  migration adapter.
- Missing content type context fails closed for write-capable field bindings.

Regression-test shape:

```ts
test("normalizes a field block with a writable binding target", () => {
  const document = normalizeScreenDocumentV1(fieldDocumentFixture, { contentType });
  expect(document.sections[0].blocks[0].type).toBe("field");
});

test("rejects prototype path segments in binding prop paths", () => {
  expect(() => normalizeScreenBlockBinding({ propPath: "__proto__.x" }, ctx)).toThrow(
    "custom_screen_definition_invalid"
  );
});
```

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** this module owns strict V4 rejection.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** no logging of raw definitions or entry data.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/customScreens/screenDocument.test.ts`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CMS_SPEC.md`

## Acceptance Criteria

1. `screenDocument.ts` owns V4 schema/default/normalize helpers.
2. The module is Bun-free and DB-free.
3. Unknown fields and unsafe paths reject.
4. Pure domain tests cover valid and invalid V4 documents.
