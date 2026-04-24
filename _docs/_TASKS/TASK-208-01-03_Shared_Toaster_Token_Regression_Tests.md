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

- Extend the existing `tests/vitest/admin/adminApp.test.tsx` Sonner mock rather
  than adding a new test-only toaster.
- Capture props passed to the mock `Toaster`.
- If `sonner.tsx` is tested through direct rendering instead of the mock, keep
  the test Bun-free and inside the Vitest admin/UI lane.

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
  duration: 4000,
  containerAriaLabel: "Admin notifications",
});
expect(toasterProps[0]?.richColors).toBeUndefined();
```

If the wrapper style is tested separately:

```tsx
expect(style["--success-text"]).toBe("var(--admin-state-success)");
expect(style["--error-text"]).toBe("var(--admin-state-danger)");
expect(style["--warning-text"]).toBe("var(--admin-state-warning)");
```

## Testing Requirements

- `tests/vitest/admin/adminApp.test.tsx`
  - add or extend one test for shared toaster host props,
  - add or extend one assertion for token-backed state style variables.

## Documentation Updates Required in This Round

- No extra docs beyond `TASK-208-01-02` unless the test identifies a different
  public design-token contract.

## Acceptance Criteria

1. Tests fail if `richColors` is reintroduced on the shared admin toaster.
2. Tests fail if the shared toaster stops being top-right/accessible/closeable.
3. Tests cover the token variable names used for toast states.
