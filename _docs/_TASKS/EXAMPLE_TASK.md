# TASK-000: Coderso Task Format Example
# FileName: EXAMPLE_TASK.md

This file is a template-only example. Do not add `TASK-000` to the task board.
Real board-level task files must use `TASK-###_Short_Title.md`; real physical
child files must use the child naming rules from `_docs/_TASKS/README.md`.

**Priority:** Medium
**Category:** Core / Example
**Estimated Effort:** Medium
**Dependencies:** None
**Status:** ⏳ To Do

---

## Overview

Describe the user-facing or developer-facing goal, the relevant Coderso product
contract, and the source-of-truth docs that constrain the implementation.

Example Coderso constraints:

- Runtime/kernel behavior follows Bun ownership from `_docs/TESTING_STRATEGY.md`.
- Admin UI work follows shared navigation/cache patterns from `AGENTS.md`.
- API work follows `_docs/CMS_API.md`, `_docs/AUTH_SPEC.md`,
  `_docs/RBAC_SPEC.md`, and `_docs/SECURITY_SPEC.md`.

---

## Security Contract

Include this section for every API-related task or subtask. For docs-only or
non-API work, state that no endpoint or permission model changes.

- **Endpoint visibility:** `internal` or `public`.
- **Auth model:** session, API key scope, anonymous public read/write, or not
  applicable.
- **RBAC:** required permission(s) or not applicable.
- **CSRF:** admin/internal write expectations or not applicable.
- **Rate-limit bucket:** auth, admin, public_write, or not applicable.
- **Validation:** schema owner and reject-unknown behavior.
- **Anti-abuse controls:** nonce/signature/HMAC, optional reCAPTCHA, or not
  applicable.

---

## Sub-Tasks

- [ ] Identify the owning domain/service module and source-of-truth docs.
- [ ] Implement the smallest contract-aligned change.
- [ ] Add or update tests in the correct Bun/Vitest lane.
- [ ] Update task board, changelog, and any impacted contract docs.

---

## Implementation Pseudocode

```ts
export function normalizeExampleInput(input: unknown): ExampleConfig {
  const parsed = exampleSchema.parse(input);
  return {
    mode: parsed.mode ?? "default",
    limit: clamp(parsed.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT),
  };
}
```

Expected data flow:

- Validate external/admin/runtime payloads schema-first.
- Normalize through the owning domain/service helper.
- Keep routes orchestration-only and map domain errors at the route boundary.
- Preserve legacy data through non-destructive adapters when required.

Error handling:

- Reject unknown fields at the schema boundary.
- Use machine-readable service errors such as `example_invalid` or
  `example_not_found`.
- Map known errors to `ApiError` only at the route boundary.

Regression-test shape:

- Unit/domain tests cover normalization, defaults, limits, and legacy adapters.
- Route tests cover registration, auth/RBAC/CSRF, validation, and error mapping.
- UI tests cover cache hydration, dirty-state protection, and user-visible states
  when the task touches admin React surfaces.

---

## Testing Requirements

- `bun --cwd core lint`
- `bun --cwd core lint:types`
- Relevant Bun tests for runtime, route, DB-backed, security, performance, or
  plugin lifecycle behavior.
- Relevant Vitest tests for Bun-free domain, admin/UI, SDK, or widget logic.
- `git diff --check` for documentation-only changes.

---

## Documentation Updates Required

- `_docs/_TASKS/README.md`: update task board status and statistics.
- `_docs/_CHANGELOG/`: add a task-linked changelog entry when the task closes.
- Relevant source-of-truth docs for any API, architecture, UX, cache, plugin,
  widget, assistant, release-gate, or security contract changes.
