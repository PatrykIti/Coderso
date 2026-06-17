# TASK-454-04-L01: Shared Dirty Navigation Guard Contract
# FileName: TASK-454-04-L01-Shared-Dirty-Navigation-Guard-Contract.md

**Parent Subtask:** TASK-454-04
**Priority:** High
**Category:** Admin UI / Navigation / Shared UX
**Estimated Effort:** Medium
**Dependencies:** TASK-454-01-L01
**Status:** ⏳ To Do

---

## Overview

Extract the existing Settings dirty-navigation pattern into a shared guard
without changing Settings behavior. The shared guard must use
`AdminRouterContext.registerBlocker` when a router context exists,
`resolveAdminHref`, `ConfirmActionDialog`, and `beforeunload`.

## Sub-Tasks

- [ ] Create a shared hook/component for dirty navigation.
- [ ] Migrate `SettingsDirtyNavigationProvider` to use it or wrap it without
      changing public exports.
- [ ] Preserve `skipBlockers` confirm flow.
- [ ] Keep current-route navigation prompt-free.

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/shared/*` | New shared dirty-navigation guard module. |
| `core/admin/ui/settings/SettingsDirtyNavigation.tsx` | Delegate to shared guard while preserving exports. |
| `tests/vitest/ui/settings-shell.test.tsx` | Regression coverage. |
| `tests/vitest/ui/admin-router-context-blocker.test.tsx` | Router blocker coverage if needed. |

## Implementation Pseudocode

```tsx
export const normalizeAdminHrefForComparison = (href: string) => {
  const withoutHash = href.split("#")[0] ?? href;
  const withoutQuery = withoutHash.split("?")[0] ?? withoutHash;
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1);
  }
  return withoutQuery;
};

export function useAdminDirtyNavigationGuard(options: {
  blocked: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirmDiscard?: () => void;
}) {
  const adminBasePath = useAdminBasePath();
  const router = useOptionalAdminRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const isCurrentHref = useCallback((href: string) => {
    if (!router) return false;
    return normalizeAdminHrefForComparison(resolveAdminHref(adminBasePath, href)) === normalizeAdminHrefForComparison(router.path);
  }, [adminBasePath, router]);

  const requestNavigation = useCallback((href: string) => {
    if (!router) return true;
    if (!options.blocked || isCurrentHref(href)) return true;
    setPendingHref(href);
    return false;
  }, [isCurrentHref, options.blocked, router]);

  useEffect(() => {
    if (!router) return undefined;
    return router.registerBlocker(requestNavigation);
  }, [requestNavigation, router]);
  useEffect(() => {
    if (!options.blocked || typeof window === "undefined") return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [options.blocked]);

  return {
    requestNavigation,
    dialog: <ConfirmActionDialog ... onConfirm={() => confirmNavigation(router)} />,
  };
}
```

Data flow: shared guard stores only pending href and delegates actual route
transition to `router.navigate(href, { skipBlockers: true })`. Without a router
provider, SPA blocking is a no-op so direct component tests do not crash;
navigation-guard behavior tests must wrap `AdminRouterProvider`.

Error handling: cancel clears only `pendingHref`; confirm calls optional discard
callback before navigating.

Regression-test shape:

- Settings dirty form still blocks navigation.
- Settings confirm continues and clears dirty store.
- Settings cancel keeps current route.

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/admin-router-context-blocker.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- None unless docs mention shared dirty-navigation behavior.

## Acceptance Criteria

1. Settings dirty navigation is unchanged.
2. Shared guard is reusable by Page Editor without duplicate router logic.
3. Hard-navigation warning is owned by the shared guard.
4. Page Editor tests that do not exercise routing can render without
   `AdminRouterProvider`; routing tests must include the provider.
