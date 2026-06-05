# TASK-407-05-L04: Custom Screen and Beginner Editing Surface Decisions
# FileName: TASK-407-05-L04-Custom-Screen-and-Beginner-Editing-Surface-Decisions.md

**Parent Subtask:** TASK-407-05
**Priority:** High
**Category:** Assistant + Custom Screens
**Estimated Effort:** Medium
**Dependencies:** TASK-407-05-L03
**Status:** ⏳ To Do

---

## Overview

Decide when generated content engines need beginner-friendly custom/admin
editing surfaces and when unsupported editing surfaces must be gated.

## Sub-Tasks

- Add rules for custom-screen candidates tied to supported content engines.
- Map beginner editing needs to existing custom screen/admin surface patterns.
- Gate unsupported custom screens, write methods, or plugin/runtime extensions.
- Include review summary facts explaining what the user will edit later.

## Security Contract

- Endpoint visibility: internal admin/plugin/runtime scoping only; no public
  assistant write endpoint.
- Auth model: existing admin session.
- RBAC: custom screen and content-engine write permissions from existing
  contracts.
- CSRF: required for admin writes.
- Rate-limit bucket: `assistant`.
- Reject unknown validation: custom screen ids, routes, permissions, and
  generated action payloads must pass strict schemas.
- Anti-abuse: user text cannot create arbitrary admin routes, unsafe relative
  paths, plugins, write methods, or public endpoints.
- Secret handling: screen metadata and diagnostics must not include secrets,
  provider keys, cookies, auth state, raw prompts, or raw reference text.

## Files To Change

| Area | Files |
|---|---|
| Decisions | `core/services/assistant/blueprints/guidedCustomScreenDecisions.ts` |
| Admin surface helpers | `core/services/assistant/blueprints/blueprintAdminSurfaceComposer.ts` |
| Tests | `tests/vitest/assistant/guidedCustomScreenDecisions.test.ts` |

## Implementation Pseudocode

```ts
export function resolveGuidedCustomScreens(engines: GuidedContentEngineCandidate[]) {
  return engines.map((engine) => {
    if (!engine.needsBeginnerEditingSurface) return noCustomScreen(engine);
    if (!supportsCustomScreen(engine)) return gatedCustomScreen(engine);
    return buildCustomScreenCandidate(engine, allowedAdminSurfaceForEngine(engine));
  });
}
```

## Data Flow and Error Handling

- Supported content-engine candidates enter custom-screen decision rules.
- Unsupported admin surfaces or unsafe route/permission requests become gates.
- Review facts explain beginner editing surfaces before action execution.

## Testing Requirements

- Tests for supported engine -> custom screen candidates.
- Tests for unsupported custom-screen gates.
- Tests for safe relative route and permission validation.
- `bun --cwd core lint`
- `bun --cwd core lint:types`
- `git diff --check`

## Documentation Updates Required

- `_docs/ASSISTANT_SITE_BUILDER.md`
- `_docs/CODERSO_PLUGIN_CONTRACT.md` only if plugin/runtime contracts change.

## Acceptance Criteria

- Custom-screen decisions are tied to supported engines.
- Unsafe or unsupported admin surfaces are gated.
- Users can see what future editing surfaces will be created before execution.
