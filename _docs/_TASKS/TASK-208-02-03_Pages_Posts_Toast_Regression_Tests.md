# TASK-208-02-03: Pages Posts Toast Regression Tests
# FileName: TASK-208-02-03_Pages_Posts_Toast_Regression_Tests.md

**Priority:** High
**Category:** QA/Admin UI
**Estimated Effort:** Medium
**Dependencies:** TASK-208-02-01, TASK-208-02-02
**Status:** To Do

---

## Overview

Add regression coverage for Pages and Posts list mutation toast delivery.

## Sub-Tasks

No child task files.

## Implementation Checklist

- Use the existing `tests/vitest/ui/page-post-list-wave.test.tsx` suite.
- Add one hoisted `sonner` mock that captures `toast.success` and
  `toast.error`.
- Reset toast mocks in `beforeEach`.
- Prefer extending current list action tests instead of adding broad duplicate
  render paths.

## Pseudocode

```tsx
const toastMock = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: toastMock,
}));

beforeEach(() => {
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});
```

Create success assertion:

```tsx
await clickCreatePage();
await waitFor(() =>
  expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("created"))
);
```

Delete confirmation assertion:

```tsx
await user.click(screen.getByRole("menuitem", { name: /delete/i }));
expect(toastMock.success).not.toHaveBeenCalledWith(expect.stringContaining("deleted"));
await user.click(screen.getByRole("button", { name: /delete page/i }));
await waitFor(() =>
  expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("deleted"))
);
```

Partial failure assertion:

```tsx
mockPublishPage.mockRejectedValueOnce(new Error("Publish failed"));
await applyBulkPublish();
expect(screen.getByText(/failed/i)).toBeInTheDocument();
expect(toastMock.error).toHaveBeenCalledWith(expect.stringMatching(/failed/i));
```

## Testing Requirements

- `tests/vitest/ui/page-post-list-wave.test.tsx`
  - update existing Pages create/action/bulk tests,
  - update existing Posts create/action/bulk tests,
  - add delete-confirm ordering assertions where not already covered.

## Documentation Updates Required in This Round

- No source docs beyond `TASK-208-02-01` and `TASK-208-02-02`.
- Record validation command output in task status notes when complete.

## Acceptance Criteria

1. The suite proves Pages list toast success and error paths.
2. The suite proves Posts list toast success and error paths.
3. The suite proves delete toast ordering after confirmation.
