# TASK-454-04: Shared Unsaved Navigation Guard
# FileName: TASK-454-04-Shared-Unsaved-Navigation-Guard.md

**Parent Task:** TASK-454
**Priority:** High
**Category:** Admin UI / Navigation / Dirty State
**Estimated Effort:** Medium
**Dependencies:** TASK-454-01
**Status:** ✅ Done
**Completed:** 2026-06-17

---

## Overview

Add the missing SPA and hard-navigation guard for Page Editor dirty state using
the shared admin router blocker pattern. Prefer extracting the Settings dirty
navigation logic into a reusable shared hook/component so Settings behavior
stays unchanged and Page Editor does not hand-build link interception.

## Sub-Tasks

- [x] TASK-454-04-L01: Shared Dirty Navigation Guard Contract
- [x] TASK-454-04-L02: PageEditor Guard Wiring And Regression Coverage

## Files To Change

| File | Required change |
|---|---|
| `core/admin/ui/settings/SettingsDirtyNavigation.tsx` | Reuse or wrap the shared guard without behavior drift. |
| `core/admin/ui/shared/*` or `core/admin/ui/contexts/*` | New shared guard module if extraction is chosen. |
| `core/admin/ui/pages/PageEditor.tsx` | Register dirty/recoverable guard with Page Editor state. |
| `tests/vitest/ui/settings-shell.test.tsx` | Settings regression after extraction. |
| `tests/vitest/ui/admin-router-context-blocker.test.tsx` | Router blocker parity if needed. |
| `tests/vitest/ui/page-editor-v2-flow.test.tsx` | Page Editor dirty navigation coverage. |

## Implementation Pseudocode

```tsx
function useAdminDirtyNavigationGuard(input: {
  blocked: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirmDiscard?: () => void;
}) {
  const router = useOptionalAdminRouter();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const requestNavigation = useCallback((href: string) => {
    if (!router) return true;
    if (!input.blocked || isCurrentHref(router.path, href)) return true;
    setPendingHref(href);
    return false;
  }, [input.blocked, router]);

  useEffect(() => {
    if (!router) return undefined;
    return router.registerBlocker(requestNavigation);
  }, [requestNavigation, router]);
  useEffect(() => {
    if (!input.blocked || typeof window === "undefined") return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [input.blocked]);

  const confirm = () => {
    const href = pendingHref;
    input.onConfirmDiscard?.();
    setPendingHref(null);
    if (href && router) router.navigate(href, { skipBlockers: true });
  };

  return { dialogProps: { open: Boolean(pendingHref), onConfirm: confirm } };
}
```

Data flow:

- `AdminLink`, explicit `navigate`, and popstate keep routing through
  `AdminRouterContext.registerBlocker`.
- Direct Page Editor tests without `AdminRouterProvider` get a no-op SPA guard
  instead of a thrown missing-context error.
- Confirmed navigation uses existing `skipBlockers`.
- Hard navigation/browser close uses `beforeunload` while blocked.

Error handling:

- Current-route navigation should not prompt.
- Confirm dialog cancel preserves editor state.
- Confirm navigation discards local state for the transition only; server
  autosave revisions remain available.

Regression-test shape:

- Dirty Page Editor blocks sidebar/AdminLink SPA navigation.
- Dirty Page Editor blocks popstate and restores previous history path.
- Existing direct Page Editor tests still mount without a router provider.
- Confirm continues; cancel stays.
- Settings dirty navigation behavior remains green.

## Security Contract

- **Endpoint visibility:** no endpoints.
- **Auth model:** unchanged.
- **RBAC:** unchanged.
- **CSRF expectations:** unchanged.
- **Rate-limit bucket:** unchanged.
- **Reject unknown validation:** unchanged.
- **Anti-abuse controls:** not applicable.

## Testing Requirements

- `bun run test:vitest -- tests/vitest/ui/page-editor-v2-flow.test.tsx tests/vitest/ui/settings-shell.test.tsx tests/vitest/ui/admin-router-context-blocker.test.tsx`
- `bun --cwd core lint`
- `bun --cwd core lint:types`

## Documentation Updates Required

- `_docs/ADMIN_CACHE.md` if shared dirty-navigation semantics are documented
  alongside editor cache behavior.

## Acceptance Criteria

1. Page Editor cannot lose local unsaved work through SPA navigation without a
   confirmation.
2. Hard navigation gets the browser-native warning while dirty.
3. Settings dirty navigation remains behaviorally unchanged.
