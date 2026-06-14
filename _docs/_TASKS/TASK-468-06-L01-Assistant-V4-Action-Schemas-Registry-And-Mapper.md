# TASK-468-06-L01: Assistant V4 Action Schemas Registry And Mapper
# FileName: TASK-468-06-L01-Assistant-V4-Action-Schemas-Registry-And-Mapper.md

**Parent Subtask:** TASK-468-06
**Priority:** High
**Category:** Assistant / Custom Screens / Action Contracts
**Estimated Effort:** Large
**Dependencies:** TASK-468-04-L05
**Status:** ⏳ To Do

---

## Overview

Replace assistant Custom Screen widget-patch actions with V4 screen action
schemas. Actions must target screen sections, blocks, bindings, list
presentation, and field mappings through strict validation.

## Sub-Tasks

- [ ] Add V4 assistant action schemas for create section, insert block, patch
  block props, patch binding, reorder block, remove block, and patch list view.
- [ ] Register V4 actions in the assistant action registry.
- [ ] Add mapping from assistant action payloads to screen document operation
  helpers.
- [ ] Reject legacy widget patch actions for V4 screens.
- [ ] Add pure schema and mapper tests.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/actions/customScreens*.ts` | Replace or extend Custom Screen actions with V4 screen actions. |
| `core/services/assistant/actionRegistry*.ts` | Register V4 screen actions. |
| `core/services/customScreens/screenDocument.ts` | Reuse V4 operation/validation helpers. |
| `tests/vitest/assistant/customScreenActions.test.ts` | Action schema and mapper coverage. |

## Implementation Pseudocode

```ts
const patchScreenBlockActionSchema = strictObject({
  screenId: stringIdSchema,
  sectionId: stringIdSchema,
  blockId: stringIdSchema,
  patch: screenBlockPatchSchema,
});

export function mapAssistantActionToScreenMutation(action: AssistantScreenAction) {
  switch (action.type) {
    case "screen.block.patch":
      return (draft) => patchScreenBlock(draft, action.payload);
    case "screen.binding.patch":
      return (draft) => patchScreenBinding(draft, action.payload);
  }
}
```

Data flow:

- Assistant planner emits V4 screen action payloads.
- Registry validates payloads with strict schemas.
- Mapper converts action into pure V4 mutation helpers.
- Executor applies mutation through service/editor write path.

Error handling:

- Unknown keys, unsafe prop paths, unknown block types, and legacy widget ids
  reject with machine-readable assistant action errors.
- Missing target ids return non-mutating action failures with repair context.
- Mapper never executes arbitrary code from action payloads.

Regression-test shape:

```ts
test("rejects legacy widget patch action for V4 custom screen", () => {
  expect(() => validateAssistantScreenAction(legacyWidgetPatch)).toThrow(
    "assistant_action_invalid"
  );
});
```

## Security Contract

- **Endpoint visibility:** existing internal assistant/admin action endpoints.
- **Auth model:** authenticated admin session and existing assistant execution
  authorization.
- **RBAC:** screen mutations require `content:write`; reads require
  `content:read`.
- **CSRF expectations:** required for assistant actions that mutate admin state.
- **Rate-limit bucket:** existing assistant/admin action buckets.
- **Reject unknown validation:** action schemas must be strict and reuse V4
  section/block/binding validators.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** action payloads must not include provider keys, cookies,
  CSRF tokens, protected settings, or raw privileged entry values.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/assistant/customScreenActions.test.ts`
- Assistant service tests for action registry if separate.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md` if assistant action contracts are documented there.
- `_docs/CMS_API.md`

## Acceptance Criteria

1. Assistant Custom Screen actions target V4 screen contracts, not widget blocks.
2. Action schemas are strict and reuse domain validation.
3. Legacy widget patch actions cannot mutate V4 screens.
