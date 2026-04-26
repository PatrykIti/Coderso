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

import { createListActionToastAdapter } from "../../../core/admin/ui/shared/listActionToasts";
import { customScreenListToasts } from "../../../core/admin/ui/custom-screens/customScreenListToasts";

afterEach(() => {
  vi.clearAllMocks();
});

test("list action toasts emit single success and normalized error messages", () => {
  const adapter = createListActionToastAdapter({
    labels: { singular: "page", plural: "pages" },
    actions: {
      create: { pastTense: "created", failureVerb: "create" },
      publish: { pastTense: "published", failureVerb: "publish" },
    },
  });

  expect(adapter.success("create", { targetLabel: "Landing" })).toBe(
    'Page "Landing" created.'
  );
  expect(toastState.success).toHaveBeenCalledWith('Page "Landing" created.');

  const apiError = {
    name: "ApiClientError",
    message: "Publish denied.",
    code: "request_failed",
    status: 403,
  };

  expect(adapter.error("publish", apiError)).toBe(
    "Publish denied."
  );
  expect(toastState.error).toHaveBeenCalledWith("Publish denied.");

  expect(adapter.error("publish", new Error("plain failure"))).toBe(
    "Failed to publish page."
  );
  expect(adapter.error("publish", null)).toBe("Failed to publish page.");
  expect(toastState.error).toHaveBeenCalledWith("Failed to publish page.");
});

test("list action toasts summarize full success, all failure, and partial failure", () => {
  const adapter = createListActionToastAdapter({
    labels: { singular: "post", plural: "posts" },
    actions: {
      publish: { pastTense: "published", failureVerb: "publish" },
      delete: { pastTense: "deleted", failureVerb: "delete" },
    },
  });

  const success = adapter.summarizeBulkAction("publish", ["post-1", "post-2"], [
    { status: "fulfilled", value: undefined },
    { status: "fulfilled", value: undefined },
  ]);

  expect(success).toMatchObject({
    ok: true,
    toastMessage: "2 posts published.",
    inlineMessage: "2 posts published.",
    succeededCount: 2,
    failedCount: 0,
    failedTargets: [],
  });
  adapter.emitBulk(success);
  expect(toastState.success).toHaveBeenCalledWith("2 posts published.");

  const partial = adapter.summarizeBulkAction("delete", ["post-1", "post-2"], [
    { status: "fulfilled", value: undefined },
    { status: "rejected", reason: new Error("delete failed") },
  ]);

  expect(partial).toMatchObject({
    ok: false,
    toastMessage: "Deleted 1 post; failed 1.",
    inlineMessage: "Deleted 1 post; failed 1.",
    succeededCount: 1,
    failedCount: 1,
    failedTargets: ["post-2"],
  });
  adapter.emitBulk(partial);
  expect(toastState.error).toHaveBeenCalledWith("Deleted 1 post; failed 1.");

  const failure = adapter.summarizeBulkAction("delete", ["post-1", "post-2"], [
    { status: "rejected", reason: new Error("delete failed") },
    { status: "rejected", reason: new Error("delete failed") },
  ]);

  expect(failure).toMatchObject({
    ok: false,
    toastMessage: "Failed to delete 2 posts.",
    succeededCount: 0,
    failedCount: 2,
    failedTargets: ["post-1", "post-2"],
  });
});

test("list action toasts support resource-specific draft copy and entry refs", () => {
  const adapter = createListActionToastAdapter({
    labels: { singular: "entry", plural: "entries" },
    actions: {
      draft: {
        pastTense: "moved to draft",
        failureVerb: "move",
        errorFallback: "Failed to move entry to draft.",
        bulkPartialMessage: ({ succeededCount, failedCount, labels }) =>
          `Moved ${succeededCount} ${
            succeededCount === 1 ? labels.singular : labels.plural
          } to draft; failed ${failedCount}.`,
        bulkFailureMessage: ({ failedCount, labels }) =>
          `Failed to move ${failedCount} ${
            failedCount === 1 ? labels.singular : labels.plural
          } to draft.`,
      },
    },
  });

  const failedRef = { id: "entry-2", typeSlug: "products" };
  const summary = adapter.summarizeBulkAction(
    "draft",
    [
      { id: "entry-1", typeSlug: "articles" },
      failedRef,
    ],
    [
      { status: "fulfilled", value: undefined },
      { status: "rejected", reason: new Error("draft failed") },
    ]
  );

  expect(summary.toastMessage).toBe("Moved 1 entry to draft; failed 1.");
  expect(summary.failedTargets).toEqual([failedRef]);
  expect(adapter.error("draft", { status: 400, message: "Draft denied." })).toBe(
    "Draft denied."
  );
  expect(adapter.error("draft", undefined)).toBe(
    "Failed to move entry to draft."
  );
});

test("custom screen list toasts cover create, activate, draft, and delete copy", () => {
  expect(
    customScreenListToasts.success("create", { targetLabel: "Catalog" })
  ).toBe('Custom screen "Catalog" created.');
  expect(customScreenListToasts.error("activate", undefined)).toBe(
    "Failed to activate custom screen."
  );

  const partial = customScreenListToasts.summarizeBulkAction(
    "moveToDraft",
    ["screen-1", "screen-2"],
    [
      { status: "fulfilled", value: undefined },
      { status: "rejected", reason: new Error("draft failed") },
    ]
  );

  expect(partial.toastMessage).toBe(
    "Moved 1 custom screen to draft; failed 1."
  );
  customScreenListToasts.emitBulk(partial);
  expect(toastState.error).toHaveBeenCalledWith(
    "Moved 1 custom screen to draft; failed 1."
  );
});
