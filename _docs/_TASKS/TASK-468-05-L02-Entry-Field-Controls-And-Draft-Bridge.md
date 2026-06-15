# TASK-468-05-L02: Entry Field Controls And Draft Bridge
# FileName: TASK-468-05-L02-Entry-Field-Controls-And-Draft-Bridge.md

**Parent Subtask:** TASK-468-05
**Priority:** High
**Category:** Admin UI / Custom Screens / Entry Editing
**Estimated Effort:** Large
**Dependencies:** TASK-468-05-L01
**Status:** ⏳ To Do

---

## Overview

Connect V4 screen field bindings to custom content entry edit controls. This
leaf owns draft value state, field control selection, validation feedback, save
payload construction, and read/write binding enforcement.

## Sub-Tasks

- [ ] Add `ScreenEntryDraftBridge` or equivalent model for screen-bound entry
  drafts.
- [ ] Map content type fields to existing admin field controls without using
  screen widgets.
- [ ] Enforce read-only, hidden, required, relation, media, and computed field
  behavior.
- [ ] Preserve existing entry save/publish/delete route semantics.
- [ ] Add tests for validation, dirty state, relation/media fields, and
  read-only bindings.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/custom-screens/runtime/ScreenEntryDraftBridge.tsx` | New screen-bound entry draft bridge. |
| `core/admin/ui/custom-screens/runtime/screenFieldControls.tsx` | Field control resolver for screen runtime. |
| `core/admin/ui/custom-screens/CustomScreenEntryEditor.tsx` or equivalent | Use V4 runtime and draft bridge. |
| `tests/vitest/ui-integration/custom-screens/*EntryDraft*.test.tsx` | Entry draft coverage. |
| Bun route tests for entry writes | Update only if payload contracts change. |

## Implementation Pseudocode

```ts
function createEntryDraftFromBindings(
  input: ScreenEntryDraftInput
): ScreenEntryDraftState {
  const writableBindings = input.bindings.filter((binding) => binding.mode === "write");
  return {
    values: pickRecordValues(input.record, writableBindings),
    errors: {},
    dirty: false,
  };
}

function buildEntrySavePayload(state: ScreenEntryDraftState, contentType: ContentTypeSummary) {
  return validateEntryDraftValues(state.values, contentType);
}
```

Data flow:

- Runtime renderer identifies writable field bindings.
- Draft bridge initializes values from authorized record data.
- Field controls update draft state.
- Save payload contains only allowed writable field values.

Error handling:

- Read-only or missing bindings cannot create writable save payload keys.
- Required field validation blocks save and points to the rendered field control.
- Server validation errors merge back into draft errors without clearing edits.

Regression-test shape:

```tsx
test("read-only binding renders value but is excluded from save payload", async () => {
  render(<ScreenEntryDraftBridge fixture={readOnlySlugFixture} />);
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(api.lastEntryPatch.values).not.toHaveProperty("slug");
});
```

## Security Contract

- **Endpoint visibility:** existing internal admin custom content entry routes.
- **Auth model:** authenticated admin session.
- **RBAC:** `content:read` for load; `content:write` for entry mutations;
  preserve stronger publish/delete permissions where they already exist.
- **CSRF expectations:** required for entry writes.
- **Rate-limit bucket:** existing admin write bucket.
- **Reject unknown validation:** save payload must include only schema-known,
  writable content type fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** protected fields must not be rendered or submitted unless
  authorized by the existing entry route contract.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui-integration/custom-screens`
- Bun route tests for entry write contract if touched.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/CONTENT_TYPES_SPEC.md`

## Acceptance Criteria

1. Entry editing uses screen field bindings and existing admin field controls,
   not screen widgets.
2. Save payloads contain only authorized writable fields.
3. Dirty state and validation errors preserve unsaved edits.
