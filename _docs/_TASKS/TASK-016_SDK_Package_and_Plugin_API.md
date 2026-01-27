# TASK-016: SDK Package and Plugin API
# FileName: TASK-016_SDK_Package_and_Plugin_API.md

**Priority:** High
**Category:** Core/SDK
**Estimated Effort:** Large
**Dependencies:** TASK-015
**Status:** Done (2026-01-27)

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

## Commands (if needed)

```bash
# packages/sdk
bun --cwd packages/sdk add -d typescript
```

---

## Sub-Tasks

### TASK-016-01_SDK_package_exports

**Status:** Done (2026-01-27)

Exports:
- `@core/sdk/server`
- `@core/sdk/client`
- `@core/sdk/shared`

Rules:
- ESM only (`type: "module"`).
- Ship type declarations for all exports.
- Keep API surface stable and versioned.

Example helper:

```ts
export function definePlugin(register: (ctx: ServerContext) => void) {
  return register;
}
```

Client helper sketch:

```ts
export function defineAdmin(register: (ctx: ClientContext) => void) {
  return register;
}
```

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `package.json` | workspaces config for `core`, `store`, `packages/*` |
| `packages/sdk/package.json` | exports map |
| `packages/sdk/src/server.ts` | definePlugin + types |
| `packages/sdk/src/client.ts` | defineAdmin + types |
| `packages/sdk/src/shared.ts` | shared types |

Package.json sketch:

```json
{
  "name": "@core/sdk",
  "type": "module",
  "exports": {
    "./server": "./dist/server.js",
    "./client": "./dist/client.js",
    "./shared": "./dist/shared.js"
  }
}
```

Root workspace sketch:

```json
{
  "workspaces": ["core", "store", "packages/*"]
}
```

tsconfig sketch:

```json
{
  "compilerOptions": {
    "declaration": true,
    "outDir": "dist"
  }
}
```

Shared types sketch:

```ts
export type PluginMeta = { name: string; version: string };
```

---

### TASK-016-02_Hook_context_and_assets_helpers

**Status:** Done (2026-01-27)

- Hook handlers receive `(payload, ctx)`.
- Assets API returns URL and public path.
- Provide `permissions` and `settings` APIs in both server and client context.

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

Hooks API sketch:

```ts
export type HookHandler<T> = (payload: T, ctx: HookContext) => void;
```

Assets API sketch:

```ts
export interface AssetsAPI {
  getUrl(path: string): string;
  getPublicPath(path: string): string;
}
```

---

### TASK-016-03_Runtime_bindings_in_core

**Status:** Done (2026-01-27)

- Provide implementations for ServerContext and ClientContext.
- Bind assets API to plugin public path.
- Expose SettingsAPI/StorageAPI with scoped keys.

Rules:
- Scope storage keys by plugin name to avoid collisions.
- Enforce permissions check on server routes registered by plugin.

**Implementation Checklist:**

| File | What to Add |
| --- | --- |
| `core/plugins/sdkRuntime.ts` | runtime context factory |

Runtime context sketch:

```ts
export function createServerContext(plugin) {
  return {
    apiVersion: "1",
    plugin,
    settings: createSettingsApi(plugin.name),
    assets: createAssetsApi(plugin),
  };
}
```

---

## Testing Requirements

- [ ] `tests/unit/sdk/exports.test.ts` verifies SDK exports.
- [ ] `tests/unit/sdk/assets.test.ts` returns versioned URLs.
- [ ] `tests/unit/sdk/hookContext.test.ts` verifies HookContext shape.
- [ ] `tests/unit/sdk/storageScope.test.ts` enforces plugin scoping.

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
- `tests/unit/sdk/storageScope.test.ts`

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
