# TASK-209-03-01: Custom Screen List Action Toast Adapter
# FileName: TASK-209-03-01_Custom_Screen_List_Action_Toast_Adapter.md

**Priority:** High
**Category:** Coderso Custom Screens + Admin/UI
**Estimated Effort:** Small
**Dependencies:** TASK-209-03, TASK-208-01
**Status:** To Do

---

## Overview

Define the Custom Screens list-action toast adapter using the existing shared
helper.

The helper already owns success/error emission, error normalization, bulk
counts, and partial-failure message shape. Custom Screens should provide only
resource labels and action copy.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Add a resource-local adapter in `CustomScreenListPage.tsx` or extract
  `customScreenListToasts.ts` if the create drawer needs the same config.
- Use labels:
  - singular: `custom screen`
  - plural: `custom screens`
- Actions:
  - `create`: created / create
  - `activate`: activated / activate
  - `moveToDraft`: moved to draft / move to draft
  - `delete`: deleted / delete
- Use target labels for create success when available:

```ts
const customScreenListToasts = createListActionToastAdapter({
  labels: { singular: "custom screen", plural: "custom screens" },
  actions: {
    create: { pastTense: "created", failureVerb: "create" },
    activate: { pastTense: "activated", failureVerb: "activate" },
    moveToDraft: { pastTense: "moved to draft", failureVerb: "move to draft" },
    delete: { pastTense: "deleted", failureVerb: "delete" },
  },
});
```

- If `moved to draft` copy reads awkwardly through the generic helper, add a
  `singleSuccessMessage` override in the adapter config instead of branching in
  the component.
- Keep the action key aligned with the Custom Screens status contract. Do not
  introduce a user-facing or code-level `deactivate` lifecycle unless a later
  service contract adds it.
- Do not add new direct `toast.*` calls for this task's targeted actions.

## Security Contract

- Visibility: internal admin UI feedback only.
- Auth model: existing authenticated admin session/admin API key model.
- RBAC: unchanged from the caller; this leaf does not execute mutations.
- CSRF: no writes are introduced by the adapter leaf.
- Rate-limit bucket: no new route calls.
- Reject-unknown validation: no payload changes.
- Anti-abuse: no destructive action changes in this leaf.

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `./node_modules/.bin/vitest run --config vitest.config.ts tests/vitest/ui/list-action-toasts.test.ts`
- Custom Screens list mounted tests should assert emitted messages through a
  hoisted `sonner` mock.

## Documentation Updates Required

- `_docs/CONTENT_LIST_UX.md` on final closure.
- `_docs/_TASKS/README.md`
- `_docs/_CHANGELOG/*` on completion.

## Acceptance Criteria

1. Custom Screens list feedback goes through `createListActionToastAdapter`.
2. Adapter copy covers create, activate, moveToDraft, delete, and bulk results.
3. Error messages still preserve API/client error messages when available.
