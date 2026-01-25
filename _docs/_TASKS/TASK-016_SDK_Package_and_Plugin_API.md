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
  src/
    server.ts
    client.ts
    shared.ts
core/plugins/
  sdkRuntime.ts
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

---

### TASK-016-03_Runtime_bindings_in_core

**Status:** To Do

- Provide actual implementations for ServerContext and ClientContext.
- Bind assets API to plugin public path.
- Expose SettingsAPI/StorageAPI with scoped keys.

---

## Testing Requirements

- [ ] Type tests verify SDK exports.
- [ ] Hook handlers receive HookContext.
- [ ] Assets API returns versioned URLs.

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
