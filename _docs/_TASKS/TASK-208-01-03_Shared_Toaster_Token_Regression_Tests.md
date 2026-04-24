# TASK-208-01-03: Shared Toaster Token Regression Tests
# FileName: TASK-208-01-03_Shared_Toaster_Token_Regression_Tests.md

**Priority:** High
**Category:** QA/Admin UI
**Estimated Effort:** Small
**Dependencies:** TASK-208-01-01, TASK-208-01-02
**Status:** To Do

---

## Overview

Lock the shared toaster contract before adding resource list action toasts.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Keep `tests/vitest/admin/adminApp.test.tsx` focused on the app-level host:
  one toaster, top-right position, `richColors`, close button, duration, and
  accessible label.
- Add `tests/vitest/admin/sonner.test.tsx` for the wrapper internals because
  `adminApp.test.tsx` mocks `@/components/ui/sonner` and cannot prove the real
  token style map.
- In the wrapper test, mock `sonner` and `next-themes`, render `Toaster`, and
  capture props passed to the underlying Sonner component.
- Keep the direct wrapper test Bun-free and inside the Vitest admin/UI lane.

## Pseudocode

```tsx
// tests/vitest/admin/adminApp.test.tsx
const toasterProps: Array<{
  position?: string;
  richColors?: boolean;
  style?: React.CSSProperties;
}> = [];

vi.mock("@/components/ui/sonner", () => ({
  Toaster: (props) => {
    toasterProps.push(props);
    return <div data-testid="admin-toaster" />;
  },
}));

expect(toasterProps).toHaveLength(1);
expect(toasterProps[0]).toMatchObject({
  position: "top-right",
  closeButton: true,
  richColors: true,
  duration: 4000,
  containerAriaLabel: "Admin notifications",
});
```

If the wrapper style is tested separately:

```tsx
// tests/vitest/admin/sonner.test.tsx
expect(style["--success-text"]).toBe("var(--admin-state-success)");
expect(style["--error-text"]).toBe("var(--admin-state-danger)");
expect(style["--warning-text"]).toBe("var(--admin-state-warning)");
expect(capturedProps.theme).toBe("dark"); // from mocked useTheme()
```

## Testing Requirements

- `tests/vitest/admin/adminApp.test.tsx`
  - add or extend one test for shared toaster host props.
- `tests/vitest/admin/sonner.test.tsx`
  - assert token-backed state style variables,
  - assert the dynamic `useTheme()` value is forwarded,
  - assert state styling supports the shared `richColors` host and does not use
    Sonner's bundled HSL palette values.

## Documentation Updates Required in This Round

- No extra docs beyond `TASK-208-01-02` unless the test identifies a different
  public design-token contract.

## Acceptance Criteria

1. Tests fail if `richColors` is removed from the shared admin toaster.
2. Tests fail if the shared toaster stops being top-right/accessible/closeable.
3. Tests cover the token variable names used for toast states.
4. Tests fail if the wrapper hard-codes a theme instead of using the active
   Admin UI Theme mode.
