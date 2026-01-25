# TASK-016: SDK Package and Plugin API
# FileName: TASK-016_SDK_Package_and_Plugin_API.md

**Priority:** High
**Category:** Core/SDK
**Estimated Effort:** Large
**Dependencies:** TASK-015
**Status:** To Do

---

## Overview

Implement the `@core/sdk` package with server/client/shared exports and
runtime bindings. This defines the public contract for plugins.

**Goals:**
- ESM package with stable API surface.
- Server and client helpers (`definePlugin`, `defineAdmin`).
- Hook context and assets helpers aligned with `SDK_SPEC.md`.

---

## Architecture

```
packages/sdk/
  package.json
  tsconfig.json
  src/
    server.ts
    client.ts
    shared.ts
core/plugins/
  sdkRuntime.ts

tests/unit/sdk/
  exports.test.ts
  assets.test.ts
```

---

## Sub-Tasks

### TASK-016-01_SDK_package_exports

**Status:** To Do

Exports:
- `@core/sdk/server`
- `@core/sdk/client`
- `@core/sdk/shared`

Example helper:

```ts
export function definePlugin(register: (ctx: ServerContext) => void) {
  return register;
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `packages/sdk/package.json` | exports map |
| `packages/sdk/src/server.ts` | definePlugin + types |
| `packages/sdk/src/client.ts` | defineAdmin + types |
| `packages/sdk/src/shared.ts` | shared types |

---

### TASK-016-02_Hook_context_and_assets_helpers

**Status:** To Do

- Hook handlers receive `(payload, ctx)`.
- Assets API returns URL and public path.

Example:

```ts
export type HookContext = {
  requestId: string;
  method?: string;
  path?: string;
  locale?: string;
  session?: { id: string; userId: string };
  user?: { id: string; email: string; roles: string[] };
  ip?: string;
  userAgent?: string;
};
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `packages/sdk/src/server.ts` | HooksAPI types |
| `packages/sdk/src/shared.ts` | HookContext type |

---

### TASK-016-03_Runtime_bindings_in_core

**Status:** To Do

- Provide implementations for ServerContext and ClientContext.
- Bind assets API to plugin public path.
- Expose SettingsAPI/StorageAPI with scoped keys.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/sdkRuntime.ts` | runtime context factory |

---

## Testing Requirements

- [ ] `tests/unit/sdk/exports.test.ts` verifies SDK exports.
- [ ] `tests/unit/sdk/assets.test.ts` returns versioned URLs.
- [ ] `tests/unit/sdk/hookContext.test.ts` verifies HookContext shape.

---

## New Files to Create

- `packages/sdk/package.json`
- `packages/sdk/tsconfig.json`
- `packages/sdk/src/server.ts`
- `packages/sdk/src/client.ts`
- `packages/sdk/src/shared.ts`
- `core/plugins/sdkRuntime.ts`
- `tests/unit/sdk/exports.test.ts`
- `tests/unit/sdk/assets.test.ts`
- `tests/unit/sdk/hookContext.test.ts`

---

## Documentation Updates Required

- `_docs/SDK_SPEC.md` (confirm final API surface).
- `_docs/ARCHITECTURE.md` (SDK runtime notes).

---

## Changelog Entry (planned)

- `_docs/_CHANGELOG/{N}-{YYYY-MM-DD}-sdk-package.md`
- Notes: SDK package and plugin API.

---

## Additional Docs

- `_docs/STORE_SPEC.md`
