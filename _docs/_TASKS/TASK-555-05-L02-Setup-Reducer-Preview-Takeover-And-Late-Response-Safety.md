# TASK-555-05-L02: Setup Reducer Preview Takeover and Late-Response Safety
# FileName: TASK-555-05-L02-Setup-Reducer-Preview-Takeover-And-Late-Response-Safety.md

**Parent Subtask:** TASK-555-05
**Priority:** High
**Category:** Setup Wizard / Reducer / Reliability
**Estimated Effort:** Large
**Status:** ⏳ To Do
**Dependencies:** landed TASK-555-05-L01 receipt

---

## Overview

Own one deterministic Setup mutation state machine that protects user edits from
late preview/apply/rollback responses.

## Sub-Tasks

None; this is an executable leaf.

## Scope and Exact Single-Writer Files

Own deterministic Setup mutation state and the Starter step UI. Sole writer: new
`core/admin/ui/setup/starterContentReducer.ts`,
`core/admin/ui/setup/useSetupStarterController.ts`,
`core/admin/ui/setup/steps/StarterContentStep.tsx`, and
`tests/vitest/ui-integration/setupStarterContent.test.tsx`.

## Forbidden Paths

`AdminApp.tsx`, `SetupWizard.tsx`, Solution Kits/TASK-489 UI, server/DB/artifacts,
named forbidden tasks, indexes/changelogs/workflows/smokes/root/TMP.

## Security Contract

Internal shared client only; no raw fetch. UI permission/confirm gating is defense in
depth; server owns RBAC/CSRF/admin_write. State is memory-only. Raw idempotency key may
exist only in reducer memory for one attempt and is never rendered/logged/persisted.
No package/snapshot/claim/actor enters state.

## Implementation Pseudocode

```ts
export function useSetupStarterController(initial: SetupStarterInitialState) {
  const [state, dispatch] = useReducer(starterContentReducer, initial);
  const latestValues = useRef(initial.wizardValues);
  return { state, dispatch, actions: bindStarterActions(dispatch),
    publishWizardValues: (values) => { latestValues.current = values; },
    barrier: createStarterSettlementBarrier({ state, latestValues }) };
}

case "applyResolved":
  if (event.requestToken !== state.requestToken) return state;
  return patchUntouchedIdentityFields(state, event.result.effectiveSettings);
case "identityEdited":
  return markFieldRevision(state, event.field, event.value);
```

`barrier.requireSettled()` resolves only after the current request generation settles
and returns `{values,revision}` read from `latestValues.current` after settlement. It
never closes over a caller's pre-await `current`. The controller is the sole
state/action/barrier contract consumed by L03 above the
Setup route switch. Selection -> preview -> takeover confirm -> apply -> token/revision-checked effective
settings patch. Selection/new preview rotates key and token. Late responses cannot
overwrite a post-dispatch user edit. Errors retain retry/rollback context and no
uncertain mutation is silently abandoned.

## Error Handling

Every request token settles to success/error; stale tokens are ignored; uncertain
mutations retain visible retry/status and never silently unlock Finish.

## Testing Requirements

Test reducer/controller/barrier table, preview mandatory, exact confirmation,
key reuse/rotation on starter, preview, release/digest identity changes, stale
response, post-dispatch siteName/locale edits winning, untouched values patching,
barrier returning the post-settlement latest values rather than its invocation-time
snapshot,
retry, rollback state, accessibility/focus, and no persistence.

```bash
NODE_ENV=test vitest run --config vitest.config.ts tests/vitest/ui-integration/setupStarterContent.test.tsx
bun --cwd core lint:types
bun --cwd core lint
git diff --check
wc -l core/admin/ui/setup/starterContentReducer.ts core/admin/ui/setup/useSetupStarterController.ts core/admin/ui/setup/steps/StarterContentStep.tsx tests/vitest/ui-integration/setupStarterContent.test.tsx
```

All touched files <=1000 lines.

## Documentation Updates Required

TASK-555-07-L01 owns the documentation handoff before smoke; L03 is closure metadata
only.
