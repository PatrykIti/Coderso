import { afterEach, expect, test, vi } from "vitest";

const toastState = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: toastState.success,
    error: toastState.error,
  },
}));

import { createAdminActionToastAdapter } from "../../../core/admin/ui/shared/actionToasts";

afterEach(() => {
  vi.clearAllMocks();
});

test("admin action toasts emit success and bounded error messages", () => {
  const adapter = createAdminActionToastAdapter({
    actions: {
      saveDraft: {
        success: "Draft saved.",
        errorFallback: "Failed to save draft.",
      },
      publish: {
        success: "Page published.",
        errorFallback: "Failed to publish page.",
      },
    },
  });

  expect(adapter.success("saveDraft")).toBe("Draft saved.");
  expect(toastState.success).toHaveBeenCalledWith("Draft saved.");

  expect(
    adapter.error("publish", {
      name: "ApiClientError",
      message: "Publish denied.",
      status: 403,
      code: "forbidden",
    })
  ).toBe("Publish denied.");
  expect(toastState.error).toHaveBeenCalledWith("Publish denied.");

  expect(adapter.error("saveDraft", new Error("raw failure"))).toBe(
    "Failed to save draft."
  );
  expect(toastState.error).toHaveBeenCalledWith("Failed to save draft.");
});
