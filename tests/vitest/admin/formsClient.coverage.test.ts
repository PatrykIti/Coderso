import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  apiRequest,
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  broadcastCacheEvent,
  resetLocalCache,
  primeLocalCache,
  readLocalCacheValue,
} = vi.hoisted(() => {
  const localCacheStore = new Map<string, unknown>();
  return {
    apiRequest: vi.fn(),
    readLocalCache: vi.fn(),
    writeLocalCache: vi.fn(),
    clearLocalCache: vi.fn(),
    broadcastCacheEvent: vi.fn(),
    resetLocalCache: () => {
      localCacheStore.clear();
    },
    primeLocalCache: (key: string, value: unknown) => {
      localCacheStore.set(key, value);
    },
    readLocalCacheValue: (key: string) => localCacheStore.get(key) ?? null,
  };
});

vi.mock("@/services/apiClient", () => ({
  apiRequest,
  ApiClientError: class ApiClientError extends Error {
    code: string;
    status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  },
  getCsrfToken: vi.fn(() => Promise.resolve("csrf-token")),
  isApiClientError: (error: unknown) => error instanceof Error && error.name === "ApiClientError",
}));

vi.mock("@/utils/storageCache", () => ({
  readLocalCache,
  writeLocalCache,
  clearLocalCache,
  createMemoryBackedLocalCache: () => ({
    read: readLocalCache,
    write: writeLocalCache,
    clear: clearLocalCache,
  }),
}));

vi.mock("@/utils/cacheBus", () => ({ broadcastCacheEvent }));

import {
  clearFormsCache,
  createForm,
  deleteForm,
  exportFormSubmissions,
  getCachedFormActions,
  getCachedFormDetail,
  getCachedForms,
  getForm,
  getFormDetail,
  getFormDetailCached,
  listFormActionRuns,
  listFormActions,
  listFormActionsCached,
  listFormFields,
  listForms,
  listFormsCached,
  listFormSubmissions,
  retryFormActionRun,
  submitForm,
  updateForm,
  updateFormActions,
  updateFormFields,
} from "../../../core/admin/services/formsClient";
import type { FormSettings } from "../../../core/admin/services/formsClient";
import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import {
  getDefaultFormSettings,
  normalizeFormSettings,
} from "../../../core/services/forms/formSettings";

const settings: FormSettings = {
  layoutMode: "single",
  saveProgress: true,
  stepTitles: ["Step 1"],
  preset: "custom",
  automationRetry: { enabled: false, maxAttempts: 3, baseDelayMs: 1000, maxDelayMs: 10000 },
};

const form = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "form-1",
  name: "Contact",
  slug: "contact",
  status: "published",
  description: null,
  successMessage: null,
  successRedirectUrl: null,
  submissionAccess: "public",
  settings,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const field = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "field-1",
  type: "text",
  label: "Name",
  name: "name",
  required: true,
  settings: {},
  orderIndex: 0,
  ...overrides,
});

const action = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "action-1",
  formId: "form-1",
  type: "email",
  label: "Notify",
  enabled: true,
  continueOnError: false,
  condition: { operator: "always" },
  config: {},
  orderIndex: 0,
  createdAt: "2026-02-18T00:00:00.000Z",
  updatedAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const run = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "run-1",
  formId: "form-1",
  submissionId: null,
  actionId: "action-1",
  actionType: "email",
  actionLabel: "Notify",
  status: "success",
  attempt: 1,
  trigger: "submission",
  errorCode: null,
  errorMessage: null,
  requestPayload: null,
  responsePayload: null,
  actionCondition: { operator: "always" },
  actionConfig: {},
  submissionPayload: {},
  retryOfId: null,
  createdAt: "2026-02-18T00:00:00.000Z",
  ...overrides,
});

const submission = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "submission-1",
  formId: "form-1",
  payload: {},
  status: "complete",
  createdAt: "2026-02-18T00:00:00.000Z",
  ip: null,
  userAgent: null,
  ...overrides,
});

const json = (init: Record<string, unknown>) => ({
  headers: { "Content-Type": "application/json" },
  ...init,
});

beforeEach(() => {
  vi.resetAllMocks();
  resetLocalCache();
  readLocalCache.mockImplementation(
    (key: string, _ttlMs: number, validate?: (value: unknown) => boolean) => {
      const value = readLocalCacheValue(key);
      if (value === null) return null;
      if (validate && !validate(value)) return null;
      return value;
    }
  );
  writeLocalCache.mockImplementation((key: string, value: unknown) => {
    primeLocalCache(key, value);
  });
  clearLocalCache.mockImplementation((key: string) => {
    primeLocalCache(key, undefined);
  });
  clearFormsCache();
});

describe("cached getters and validators", () => {
  test("getCachedForms hydrates, normalizes and returns null on miss", () => {
    expect(getCachedForms()).toBeNull();
    writeLocalCache(cacheKeys.formsList, [form()]);
    expect(getCachedForms()).toEqual([form()]);
    expect(getCachedForms()).toEqual([form()]);
  });

  test("getCachedFormDetail normalizes the stored detail", () => {
    expect(getCachedFormDetail("form-1")).toBeNull();
    writeLocalCache(cacheKeys.formDetail("form-1"), { form: form(), fields: [field()] });
    expect(getCachedFormDetail("form-1")).toEqual({ form: form(), fields: [field()] });
  });

  test("getCachedFormActions reads the actions detail cache", () => {
    expect(getCachedFormActions("form-1")).toBeNull();
    writeLocalCache(cacheKeys.formActions("form-1"), [action()]);
    expect(getCachedFormActions("form-1")).toEqual([action()]);
  });
});

describe("form list flows", () => {
  test("listForms returns the raw array", async () => {
    apiRequest.mockResolvedValueOnce([form()]);
    await expect(listForms()).resolves.toEqual([form()]);
    expect(apiRequest).toHaveBeenCalledWith("/forms", { method: "GET" });
  });

  test("listFormsCached hits cache, in-flight and fetch paths", async () => {
    writeLocalCache(cacheKeys.formsList, [form()]);
    await expect(listFormsCached()).resolves.toEqual([form()]);
    expect(apiRequest).not.toHaveBeenCalled();
    clearFormsCache();

    apiRequest.mockResolvedValueOnce([form()]);
    const first = listFormsCached();
    const second = listFormsCached();
    await expect(Promise.all([first, second])).resolves.toEqual([[form()], [form()]]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.formsList, [form()]);

    apiRequest.mockResolvedValueOnce([form({ name: "Fresh" })]);
    await expect(listFormsCached({ force: true })).resolves.toEqual([form({ name: "Fresh" })]);
  });

  test("getForm fetches and normalizes a single record", async () => {
    apiRequest.mockResolvedValueOnce(form());
    await expect(getForm("form-1")).resolves.toEqual(form());
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1", { method: "GET" });
  });

  test("getFormDetail combines form and fields", async () => {
    apiRequest.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("/fields") ? [field()] : form())
    );
    await expect(getFormDetail("form-1")).resolves.toEqual({ form: form(), fields: [field()] });
  });

  test("getFormDetail rejects when the form payload is malformed", async () => {
    apiRequest.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("/fields") ? [field()] : null)
    );
    await expect(getFormDetail("form-1")).rejects.toThrow();
  });

  test("getFormDetailCached reads the detail cache and upserts after fetch", async () => {
    writeLocalCache(cacheKeys.formDetail("form-1"), { form: form(), fields: [field()] });
    await expect(getFormDetailCached("form-1")).resolves.toEqual({
      form: form(),
      fields: [field()],
    });
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockImplementation((path: string) =>
      Promise.resolve(
        path.endsWith("/fields") ? [field({ id: "field-2" })] : form({ name: "Remote" })
      )
    );
    await expect(getFormDetailCached("form-1", { force: true })).resolves.toEqual({
      form: form({ name: "Remote" }),
      fields: [field({ id: "field-2" })],
    });
    expect(getCachedForms()).toEqual([form({ name: "Remote" })]);
  });
});

describe("form mutations", () => {
  test("createForm posts with normalized default settings, upserts and broadcasts", async () => {
    const created = form();
    apiRequest.mockResolvedValueOnce(created);
    await createForm({ name: "Contact" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms",
      json({
        method: "POST",
        body: JSON.stringify({
          name: "Contact",
          settings: normalizeFormSettings(getDefaultFormSettings()),
        }),
      }),
      { withCsrf: true }
    );
    expect(getCachedForms()).toEqual([form()]);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.formDetail("form-1"), {
      form: form(),
      fields: [],
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formsList,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formDetail("form-1"),
      action: "update",
    });
  });

  test("createForm passes an explicit normalized settings payload", async () => {
    apiRequest.mockResolvedValueOnce(form());
    await createForm({ name: "Contact", settings: { ...settings, layoutMode: "multi_step" } });
    const call = apiRequest.mock.calls[0] as [string, { body?: string }];
    const body = JSON.parse(call[1]?.body ?? "{}");
    expect(body.settings.layoutMode).toBe("multi_step");
  });

  test("createForm with falsy response returns without caching", async () => {
    apiRequest.mockResolvedValueOnce(null);
    await expect(createForm({ name: "X" })).resolves.toBeNull();
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });

  test("updateForm patches, merges into the existing detail and broadcasts", async () => {
    writeLocalCache(cacheKeys.formsList, [form({ name: "Old" })]);
    writeLocalCache(cacheKeys.formDetail("form-1"), {
      form: form({ name: "Old" }),
      fields: [field()],
    });
    const updated = form({ name: "New" });
    apiRequest.mockResolvedValueOnce(updated);
    await updateForm("form-1", { name: "New" });
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms/form-1",
      json({ method: "PATCH", body: JSON.stringify({ name: "New" }) }),
      { withCsrf: true }
    );
    expect(getCachedForms()).toEqual([updated]);
    expect(getCachedFormDetail("form-1")).toEqual({ form: updated, fields: [field()] });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formsList,
      action: "update",
    });
  });

  test("updateForm normalizes settings when provided and skips detail merge when absent", async () => {
    apiRequest.mockResolvedValueOnce(form());
    await updateForm("form-1", { settings: { ...settings, saveProgress: false } });
    const call = apiRequest.mock.calls[0] as [string, { body?: string }];
    const body = JSON.parse(call[1]?.body ?? "{}");
    expect(body.settings.saveProgress).toBe(false);

    apiRequest.mockResolvedValueOnce(form());
    await updateForm("form-1", { name: "Plain" });
    const secondCall = apiRequest.mock.calls[1] as [string, { body?: string }];
    expect(JSON.parse(secondCall[1]?.body ?? "{}")).toEqual({ name: "Plain" });
  });

  test("updateForm with falsy response returns without caching", async () => {
    apiRequest.mockResolvedValueOnce(null);
    await expect(updateForm("form-1", { name: "X" })).resolves.toBeNull();
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });

  test("deleteForm removes the cached form and clears dependent caches", async () => {
    writeLocalCache(cacheKeys.formsList, [form(), form({ id: "form-2" })]);
    writeLocalCache(cacheKeys.formActions("form-1"), [action()]);
    apiRequest.mockResolvedValueOnce({ ok: true });
    await deleteForm("form-1");
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms/form-1",
      { method: "DELETE" },
      { withCsrf: true }
    );
    expect(getCachedForms()).toEqual([form({ id: "form-2" })]);
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.formDetail("form-1"));
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.formActions("form-1"));
    expect(clearLocalCache).toHaveBeenCalledWith(cacheKeys.formActionRuns("form-1"));
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formsList,
      action: "invalidate",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formDetail("form-1"),
      action: "invalidate",
    });
  });

  test("deleteForm with falsy response skips cache invalidation", async () => {
    apiRequest.mockResolvedValueOnce(undefined);
    await deleteForm("form-1");
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });
});

describe("form fields and submissions", () => {
  test("listFormFields fetches fields for the form", async () => {
    apiRequest.mockResolvedValueOnce([field()]);
    await expect(listFormFields("form-1")).resolves.toEqual([field()]);
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1/fields", { method: "GET" });
  });

  test("updateFormFields puts fields and merges into the cached detail", async () => {
    writeLocalCache(cacheKeys.formDetail("form-1"), {
      form: form(),
      fields: [field()],
    });
    apiRequest.mockResolvedValueOnce([field({ id: "field-2" })]);
    await updateFormFields("form-1", [{ type: "text", label: "Email" }]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms/form-1/fields",
      json({ method: "PUT", body: JSON.stringify([{ type: "text", label: "Email" }]) }),
      { withCsrf: true }
    );
    expect(getCachedFormDetail("form-1")).toEqual({
      form: form(),
      fields: [field({ id: "field-2" })],
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formsList,
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formDetail("form-1"),
      action: "update",
    });
  });

  test("updateFormFields broadcasts even without a cached detail", async () => {
    apiRequest.mockResolvedValueOnce([field()]);
    await updateFormFields("form-1", [{ type: "text", label: "Name" }]);
    expect(writeLocalCache).not.toHaveBeenCalledWith(
      cacheKeys.formDetail("form-1"),
      expect.anything()
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formsList,
      action: "update",
    });
  });

  test("listFormSubmissions fetches submissions", async () => {
    apiRequest.mockResolvedValueOnce([submission()]);
    await expect(listFormSubmissions("form-1")).resolves.toEqual([submission()]);
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1/submissions", { method: "GET" });
  });

  test("exportFormSubmissions builds the format query", async () => {
    const exportPayload = {
      fileName: "forms.csv",
      contentType: "text/csv" as const,
      content: "a,b",
      totalRows: 1,
    };
    apiRequest.mockResolvedValueOnce(exportPayload);
    await expect(exportFormSubmissions("form-1", "json")).resolves.toEqual(exportPayload);
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1/submissions/export?format=json", {
      method: "GET",
    });
  });

  test("submitForm posts data and optional anti-abuse tokens with CSRF", async () => {
    const response = { ...submission(), runtime: { successMessage: "Thanks", redirectUrl: null } };
    apiRequest.mockResolvedValueOnce(response);
    await expect(
      submitForm("form-1", { name: "X" }, { formNonce: "n1", captchaToken: "c1" })
    ).resolves.toEqual(response);
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms/form-1/submissions",
      json({
        method: "POST",
        body: JSON.stringify({ data: { name: "X" }, formNonce: "n1", captchaToken: "c1" }),
      }),
      { withCsrf: true }
    );

    apiRequest.mockResolvedValueOnce(response);
    await expect(submitForm("form-1", { name: "X" })).resolves.toEqual(response);
    const call = apiRequest.mock.calls[1] as [string, { body?: string }];
    expect(JSON.parse(call[1]?.body ?? "{}")).toEqual({ data: { name: "X" } });
  });
});

describe("form actions", () => {
  test("listFormActions fetches actions", async () => {
    apiRequest.mockResolvedValueOnce([action()]);
    await expect(listFormActions("form-1")).resolves.toEqual([action()]);
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1/actions", { method: "GET" });
  });

  test("listFormActionsCached hits cache, in-flight map and fetch paths", async () => {
    writeLocalCache(cacheKeys.formActions("form-1"), [action()]);
    await expect(listFormActionsCached("form-1")).resolves.toEqual([action()]);
    expect(apiRequest).not.toHaveBeenCalled();

    apiRequest.mockResolvedValueOnce([action({ id: "action-2" })]);
    clearLocalCache(cacheKeys.formActions("form-1"));
    const first = listFormActionsCached("form-1");
    const second = listFormActionsCached("form-1");
    await expect(Promise.all([first, second])).resolves.toEqual([
      [action({ id: "action-2" })],
      [action({ id: "action-2" })],
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.formActions("form-1"), [
      action({ id: "action-2" }),
    ]);
  });

  test("listFormActionsCached force bypasses the cache", async () => {
    writeLocalCache(cacheKeys.formActions("form-1"), [action()]);
    apiRequest.mockResolvedValueOnce([action({ id: "action-3" })]);
    await expect(listFormActionsCached("form-1", { force: true })).resolves.toEqual([
      action({ id: "action-3" }),
    ]);
    expect(apiRequest).toHaveBeenCalledTimes(1);
  });

  test("updateFormActions puts actions, writes cache and broadcasts", async () => {
    apiRequest.mockResolvedValueOnce([action({ id: "action-2" })]);
    await updateFormActions("form-1", [{ type: "email", config: {} }]);
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms/form-1/actions",
      json({ method: "PUT", body: JSON.stringify([{ type: "email", config: {} }]) }),
      { withCsrf: true }
    );
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.formActions("form-1"), [
      action({ id: "action-2" }),
    ]);
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formActions("form-1"),
      action: "update",
    });
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formActionRuns("form-1"),
      action: "invalidate",
    });
  });

  test("listFormActionRuns builds query params and writes the runs cache", async () => {
    apiRequest.mockResolvedValueOnce([run()]);
    await expect(listFormActionRuns("form-1", { status: "failed", limit: 25 })).resolves.toEqual([
      run(),
    ]);
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1/action-runs?status=failed&limit=25", {
      method: "GET",
    });
    expect(writeLocalCache).toHaveBeenCalledWith(cacheKeys.formActionRuns("form-1"), [run()]);

    apiRequest.mockResolvedValueOnce([]);
    await expect(listFormActionRuns("form-1")).resolves.toEqual([]);
    expect(apiRequest).toHaveBeenCalledWith("/forms/form-1/action-runs", { method: "GET" });
  });

  test("retryFormActionRun posts and broadcasts the run family", async () => {
    const result = {
      run: run({ id: "run-2" }),
      result: { successMessage: null, redirectUrl: null, runs: [run()] },
    };
    apiRequest.mockResolvedValueOnce(result);
    await expect(retryFormActionRun("run-1")).resolves.toEqual(result);
    expect(apiRequest).toHaveBeenCalledWith(
      "/forms/action-runs/run-1/retry",
      json({ method: "POST", body: JSON.stringify({}) }),
      { withCsrf: true }
    );
    expect(broadcastCacheEvent).toHaveBeenCalledWith({
      key: cacheKeys.formActionRuns("form-1"),
      action: "update",
    });
  });

  test("retryFormActionRun without a formId skips the broadcast", async () => {
    apiRequest.mockResolvedValueOnce({ run: null, result: null });
    await retryFormActionRun("run-1");
    expect(broadcastCacheEvent).not.toHaveBeenCalled();
  });
});
