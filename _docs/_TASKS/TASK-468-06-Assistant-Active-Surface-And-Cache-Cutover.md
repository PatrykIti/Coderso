# TASK-468-06: Assistant Active Surface And Cache Cutover
# FileName: TASK-468-06-Assistant-Active-Surface-And-Cache-Cutover.md

**Parent Task:** TASK-468
**Priority:** High
**Category:** Assistant / Custom Screens / Admin Cache
**Estimated Effort:** Large
**Dependencies:** TASK-468-05, TASK-467
**Status:** ✅ Done
**Completed:** 2026-06-22

---

## Overview

Move assistant and active-surface behavior from widget-block semantics to the
new screen document semantics. Assistant planning and execution should talk in
terms of screen sections, blocks, bindings, list view summaries, and writable
field names.

## Sub-Tasks

- [x] TASK-468-06-L01: Assistant V4 Action Schemas Registry And Mapper.
- [x] TASK-468-06-L02: V4 Active Surface Context Hydration.
- [x] TASK-468-06-L03: Assistant Executor Policy Dry Run And Undo.
- [x] TASK-468-06-L04: Assistant Client Cache And Regression Coverage.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/actionPlanSchema.ts` | Add strict schemas for `custom-screen.section.add`, `custom-screen.block.add`, `custom-screen.block.patch`, `custom-screen.binding.set`, and list-view patch actions. |
| `core/services/assistant/actionPlanTypes.ts` | Add typed V4 Custom Screen action variants. |
| `core/services/assistant/cmsOperationActionMapper.ts` | Map supported CMS operation drafts to V4 screen actions. |
| `core/services/assistant/actionRegistry.ts` | Register the new V4 action types. |
| `core/services/assistant/actionFamilyContracts.ts` | Add action-family metadata and merge/conflict behavior. |
| `core/services/assistant/operationPolicy/cmsResourcePolicies.ts` | Add operation policy/RBAC hooks for screen section/block/binding actions. |
| `core/services/assistant/actionUndoManifest.ts` | Add undo-manifest entries for V4 screen mutations. |
| `core/services/assistant/actionExecutorService.ts` | Execute V4 screen actions through the Custom Screen service and preserve dry-run/review semantics. |
| `core/services/assistant/blueprints/blueprintActionAssembler.ts` | Add blueprint assembly/ordering support for V4 screen actions if blueprints can create/update screens. |
| `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts` | Emit V4 screen sections/blocks/bindings only; do not generate `custom-screen-builder` widgets. |
| `core/services/assistant/blueprints/catalogFamilyBlueprint.ts` | Route catalog family screen plans through V4 screen documents instead of legacy widget blocks. |
| `tests/vitest/assistant/blueprint-admin-surface-composer.test.ts` | Flip blueprint assertions to V4 screen blocks and absence of retired widget ids. |
| Assistant active surface context files | Summarize V4 screen documents and writable field names. |
| `core/admin/services/assistantClient.ts` | Invalidate V4 screen/list/detail caches through TASK-467 lightweight helper. |
| Custom Screen service/action executor tests | Cover V4 assistant actions and legacy rejection. |
| `_docs/CMS_API.md` | Document new assistant action semantics. |

## Implementation Pseudocode

```ts
export const customScreenBlockPatchActionSchema = z
  .object({
    type: z.literal("custom-screen.block.patch"),
    screenId: z.string().min(1),
    blockId: z.string().min(1),
    patch: screenBlockPatchSchema,
  })
  .strict();

async function executeCustomScreenBlockPatch(action: CustomScreenBlockPatchAction, deps: Deps) {
  const screen = await deps.customScreens.get(action.screenId);
  const definition = normalizeCustomScreenDefinitionForRead(screen);
  assertV4Definition(definition);
  const nextDefinition = patchScreenBlock(definition, action.blockId, action.patch);
  await deps.customScreens.update(action.screenId, {
    schemaVersion: 4,
    definition: nextDefinition,
  });
  return { resource: "custom-screen", id: action.screenId, cache: "customScreens" };
}
```

Active surface summary:

```ts
type CustomScreenActiveSurfaceV4 = {
  kind: "custom-screen";
  schemaVersion: 4;
  id: string;
  name: string;
  contentTypeId: string;
  selectedEntryId: string | null;
  selectedSectionId: string | null;
  selectedBlockId: string | null;
  sections: Array<{ id: string; type: string; label: string; blockCount: number }>;
  blocks: Array<{ id: string; sectionId: string; type: string; label: string; boundField?: string }>;
  writableFields: string[];
};
```

Data flow:

- Server rehydrates active surface identity before planning.
- Planner receives bounded V4 screen summaries, not raw entry payloads.
- Operation policy validates that the current admin can read/mutate the target
  Custom Screen before an action becomes executable.
- Dry-run/review renders the planned section/block/binding change without
  mutating the screen.
- Executor revalidates screen id, content type, block ids, and field bindings.
- Undo manifest captures enough previous V4 definition state to revert the
  changed section, block, binding, or list-view fragment.
- Successful actions invalidate Custom Screen list/detail/sidebar caches.

Error handling:

- Legacy V1/V2/V3 screens are migrated to V4 before V4 actions or return a
  blocking unsupported-state error.
- Missing block/field ids return machine-readable conflict/not-found errors.
- Assistant cannot create arbitrary block types outside the screen block registry.

Regression-test shape:

```ts
test("assistant patches V4 screen block without raw entry payload", async () => {
  const context = await buildActiveSurfaceContext(screenV4Fixture);
  expect(JSON.stringify(context)).not.toContain("secretValue");

  const result = await executeAction({
    type: "custom-screen.block.patch",
    screenId: "screen-1",
    blockId: "block-title",
    patch: { props: { label: "Customer name" } },
  });

  expect(result.cache).toBe("customScreens");
});
```

## Security Contract

- **Endpoint visibility:** existing internal assistant/admin execution routes.
- **Auth model:** authenticated admin session.
- **RBAC:** active Custom Screen context requires `content:read`; mutations
  require `content:write`.
- **CSRF expectations:** unchanged for assistant execute/write routes.
- **Rate-limit bucket:** existing assistant/admin write buckets.
- **Reject unknown validation:** strict action schemas and screen document
  normalizers reject unknown fields.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** active surface summaries must not include raw records,
  provider keys, tokens, cookies, storage credentials, or protected settings.

## Testing Requirements

- Assistant action schema/mapper/executor Vitest suites.
- Active-surface hydration tests.
- Operation policy, undo manifest, dry-run/review, and blueprint assembler tests
  for the new V4 action types.
- Blueprint admin-surface composer tests proving generated screen plans do not
  reference `custom-screen-builder`, `screen-field-value`, `screen-field-group`,
  or `screen-two-column`.
- `bun run test:vitest -- tests/vitest/admin/assistantClient.test.ts`
- `bun run check:admin-boundary`
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/CMS_API.md`
- `_docs/ARCHITECTURE.md`
- Parent task/changelog on family closure.

## Acceptance Criteria

1. Assistant V4 screen actions operate on sections, blocks, and bindings.
2. Widget-block patch semantics are not used for V4 screens.
3. Active-surface context is bounded and secret-safe.
4. Operation policy, undo manifest, dry-run/review, and blueprint assembly
   remain wired for V4 screen actions.
5. Cache invalidation remains consistent after assistant mutations.
