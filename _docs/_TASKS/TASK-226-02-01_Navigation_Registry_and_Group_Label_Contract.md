# TASK-226-02-01: Navigation Registry and Group Label Contract
# FileName: TASK-226-02-01_Navigation_Registry_and_Group_Label_Contract.md

**Priority:** High
**Category:** Admin Navigation + IA
**Estimated Effort:** Large
**Dependencies:** TASK-226-02
**Status:** Done - 2026-04-28

---

## Overview

Rename the IA-owned module registry and sidebar group from `Coderso` to
`Advanced` while keeping `Coderso` as the product name. This leaf owns labels,
registry type names, group ids, feature flag naming, custom-screen shortcut
placement, and solution-kit sidebar narrowing.

## Sub-Tasks

- [x] Rename the module registry file or exports from Coderso-specific IA names
  to Advanced-specific IA names.
- [x] Keep module labels friendly: `Engine`, `Entries`, `Screens`, `Widgets`,
  `Forms`, etc.
- [x] Change sidebar group id from `coderso` to `advanced`.
- [x] Change sidebar group label from `Coderso` to `Advanced`.
- [x] Update custom-screen shortcuts to append after the Advanced group.
- [x] Update solution-kit feature flags to narrow Advanced modules only.
- [x] Keep product-level `CodersoPluginManifest` and release-gate names only if
  they clearly refer to the Coderso platform, not the sidebar group.

## Files to Change

| File | Current line(s) | Required change |
|------|-----------------|-----------------|
| `core/admin/ui/navigation/codersoModules.ts` | 20-83, 362-392 | Rename IA-owned types/functions/constants to Advanced equivalents. |
| `core/admin/ui/navigation/codersoModules.ts` | 93-352 | Update nav hrefs in each module to `/admin/advanced/*`. |
| `core/admin/ui/navigation/sidebarConfig.ts` | 27-29, 56, 70, 73 | Import/use Advanced registry and render group `Advanced`. |
| `core/admin/ui/navigation/sidebarConfig.ts` | 63 | Keep Posts top-level, but emit canonical `/admin/advanced/posts` if Posts stays under advanced routing. |
| `core/admin/ui/navigation/sidebarConfig.ts` | 121 | Custom-screen shortcut canonical href moves to `/admin/advanced/custom-screens/...`. |
| `core/admin/ui/navigation/sidebarConfig.ts` | 145-146 | Footer docs/support URLs move from `nextless.dev` to Coderso domains or documented placeholders. |
| `core/admin/ui/layouts/AdminShell.tsx` | 34, 100, 107, 131-159 | Rename `hasCodersoGroup` and solution-kit flag wiring to Advanced semantics. |
| `core/admin/services/solutionKitSelection.ts` | 7-31, 87-120 | Rename feature flag helpers and registry references to Advanced naming. |
| `tests/vitest/admin/coderso-modules.test.ts` | 4-207 | Rename test or update to Advanced registry expectations. |
| `tests/vitest/ui/admin-shell-nav.test.tsx` | 76-175 | Expect `Advanced` group and `/admin/advanced/*` child links. |

## Security Contract

- Visibility: internal admin navigation metadata.
- Auth model: unchanged.
- RBAC: preserve item-level permissions.
- CSRF: no writes.
- Rate-limit bucket: unchanged.
- Reject-unknown validation: unchanged.
- Anti-abuse: unauthorized group hiding must still hide the group when all
  children are inaccessible.

## Pseudocode

```ts
export type AdvancedModuleId = CodersoModuleId; // temporary bridge only if needed

export const ADVANCED_MODULE_REGISTRY: AdvancedModuleDefinition[] = [
  {
    id: "engine",
    label: "Engine",
    nav: { href: "/admin/advanced/engine", defaultEnabled: true },
  },
];

export const buildAdvancedNavItems = (flags: AdvancedFeatureFlags = {}) =>
  ADVANCED_MODULE_REGISTRY.filter((module) => isNavEnabled(module, flags));
```

## Testing Requirements

- `bun run test:vitest -- tests/vitest/admin/coderso-modules.test.ts tests/vitest/admin/solutionKitSelection.test.ts`
- `bun run test:vitest -- tests/vitest/ui/admin-shell.test.tsx tests/vitest/ui/admin-shell-nav.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_NAVIGATION.md`
- `_docs/ARCHITECTURE.md`
- `_docs/CODERSO_MODULES.md` or renamed equivalent.
- `_docs/_TASKS/README.md` on status changes.

## Acceptance Criteria

1. The sidebar renders `Advanced`, not `Coderso`, for the technical module group.
2. Registry naming no longer implies that Coderso is only the advanced group.
3. Product-level Coderso names are intentionally retained or documented.
4. Custom-screen shortcuts still render after the group.
5. Permission-gated hiding behavior is unchanged.
