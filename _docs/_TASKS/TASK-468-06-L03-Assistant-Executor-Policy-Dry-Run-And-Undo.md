# TASK-468-06-L03: Assistant Executor Policy Dry Run And Undo
# FileName: TASK-468-06-L03-Assistant-Executor-Policy-Dry-Run-And-Undo.md

**Parent Subtask:** TASK-468-06
**Priority:** High
**Category:** Assistant / Custom Screens / Execution Policy
**Estimated Effort:** Large
**Dependencies:** TASK-468-06-L01, TASK-468-06-L02
**Status:** ⏳ To Do

---

## Overview

Update assistant execution policy for V4 Custom Screen mutations. The executor
must support dry-run/review, auditable mutation summaries, undo metadata, and
idempotent application through the Custom Screens service.

## Sub-Tasks

- [ ] Route V4 screen actions through existing assistant dry-run/review flow.
- [ ] Produce human-readable mutation summaries without exposing raw secret data.
- [ ] Store undo metadata for section/block/binding mutations where existing
  assistant infrastructure supports undo.
- [ ] Ensure action execution uses the same V4 service validation as manual
  editor saves.
- [ ] Remove `custom-screen.widget.patch` from executable registry/policy/undo
  handling for V4 screens, or mark it non-executable legacy-only before closure.
- [ ] Add executor tests for dry-run, apply, conflict, undo, and audit events.

## Files To Change

| File | Required change |
|---|---|
| `core/services/assistant/actionExecutorService.ts` | V4 screen executor policy. |
| `core/services/assistant/actionUndoManifest.ts` | Undo metadata for V4 screen mutations. |
| `core/services/assistant/operationPolicy/cmsResourcePolicies.ts` | RBAC/operation policy hooks for screen actions. |
| `core/services/assistant/operationPolicy/adminSurfacePolicies.ts` | Audit-log/admin-surface policy updates if audit payload gating changes. |
| `core/services/customScreens/customScreenService.ts` | Reuse V4 mutation/save path. |
| `core/services/content/typeService.ts` | Load the current screen content-type context when executor dry-run needs normalization before persistence. |
| `tests/vitest/assistant/customScreenExecutor.test.ts` | Executor policy coverage. |

## Implementation Pseudocode

```ts
export async function executeCustomScreenAction(input: ExecuteScreenActionInput) {
  const mutation = mapAssistantActionToScreenMutation(input.action);
  const current = await deps.customScreens.getCustomScreen(input.screenId);
  if (!current) throw new Error("custom_screen_not_found");
  const contentType = await deps.getContentType(current.contentTypeId);
  const next = normalizeCustomScreenDefinitionForWrite(
    { schemaVersion: 4, definition: mutation(current.definition) },
    { contentType }
  );

  if (input.mode === "dry-run") {
    return createDryRunResult({ before: current.definition, after: next });
  }

  return deps.customScreens.updateCustomScreen(input.screenId, {
    schemaVersion: 4,
    definition: next,
  });
}
```

Data flow:

- Assistant action is validated by V4 schemas.
- Executor loads current normalized V4 screen definition.
- Pure mutation produces next definition.
- Dry-run returns diff summary; apply persists through service route.
- Audit event stores action id, screen id, changed ids, and safe summary.

Error handling:

- Conflicts return reviewable errors and do not overwrite newer definitions.
- Do not invent a definition-specific conflict-control service API in this leaf;
  reload current screen state before applying unless the service owner adds an
  explicit conflict contract first.
- Invalid actions fail before service write.
- Undo records are omitted only with explicit unsupported-operation reason.

Regression-test shape:

```ts
test("dry-run returns V4 diff and does not persist", async () => {
  const result = await executeCustomScreenAction({ action, mode: "dry-run" });
  expect(result.changedBlocks).toContain("title");
  expect(deps.customScreens.updateCustomScreen).not.toHaveBeenCalled();
});
```

## Security Contract

- **Endpoint visibility:** existing internal assistant/admin action endpoints.
- **Auth model:** authenticated admin session and existing assistant execution
  authorization.
- **RBAC:** `content:write` required for apply; `content:read` for dry-run
  planning where no mutation occurs.
- **CSRF expectations:** required for apply mutations.
- **Rate-limit bucket:** existing assistant/admin action buckets.
- **Reject unknown validation:** executor accepts only registry-validated V4
  action payloads and service-normalized definitions.
- **Anti-abuse controls:** no public write path.
- **Secret handling:** dry-run, audit, and undo payloads store safe summaries and
  structural diffs only, not raw privileged record values or secrets.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/assistant/customScreenExecutor.test.ts`
- Assistant audit tests if touched.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/AUDIT_SPEC.md` if audit payload shape changes.

## Acceptance Criteria

1. Assistant V4 actions support dry-run/review before mutation.
2. Apply uses the same V4 validation and persistence path as manual saves.
3. Audit/undo payloads are safe, bounded, and machine-readable.
