import { expect, test, vi } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import {
  getUserSetting,
  getUserSettingIsolated,
  getUserSettings,
  invalidateUserSettingsCache,
  setUserSetting,
  setUserSettingIsolated,
  type UserSettings,
} from "../../../core/admin/services/userSettingsClient";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const makeSettings = (): UserSettings => ({
  "pages.openAfterCreate": true,
  "customScreens.openAfterCreate": true,
  "forms.openAfterCreate": true,
  "media.openAfterUpload": false,
  "widgets.hero.presets": [],
  "posts.editor.preferences": {
    version: 2,
    focusModeOnOpen: false,
    compactSidePanels: false,
    showOutlineHints: true,
    editorDensity: "comfortable",
    showKeyboardHints: true,
    defaultInspectorTab: "post",
    restoreLastSidebarsState: true,
  },
  "assistant.mode": "docs-only",
  "assistant.ui.enabled": true,
  "assistant.ui.avatarEnabled": false,
  "assistant.ui.avatarAsset": null,
  "customScreens.entry.preferences": {
    version: 1,
    showFieldMetadata: false,
  },
});

test("getUserSettings uses read-through cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    return jsonResponse(makeSettings());
  };

  try {
    invalidateUserSettingsCache();
    const first = await getUserSettings();
    const second = await getUserSettings();

    expect(first).toEqual(second);
    expect(calls).toHaveLength(1);
    expect(calls[0]?.input).toBe("/admin/api/user-settings");
  } finally {
    globalThis.fetch = originalFetch;
    invalidateUserSettingsCache();
  }
});

test("setUserSetting updates cached settings", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const settings = makeSettings();

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init });
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/user-settings") && init?.method === "GET") {
      return jsonResponse(settings);
    }
    if (url.includes("/user-settings/customScreens.openAfterCreate") && init?.method === "PATCH") {
      settings["customScreens.openAfterCreate"] = false;
      return jsonResponse({
        key: "customScreens.openAfterCreate",
        value: false,
      });
    }
    if (url.includes("/user-settings/forms.openAfterCreate") && init?.method === "PATCH") {
      settings["forms.openAfterCreate"] = false;
      return jsonResponse({
        key: "forms.openAfterCreate",
        value: false,
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    invalidateUserSettingsCache();
    resetCsrfToken();

    await getUserSettings();
    await setUserSetting("customScreens.openAfterCreate", false);
    await setUserSetting("forms.openAfterCreate", false);

    const next = await getUserSetting("customScreens.openAfterCreate");
    expect(next.value).toBe(false);
    const nextForms = await getUserSetting("forms.openAfterCreate");
    expect(nextForms.value).toBe(false);

    const getCalls = calls.filter((call) => String(call.input).endsWith("/user-settings"));
    expect(getCalls).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateUserSettingsCache();
  }
});

test("setUserSetting handles post editor preference payloads", async () => {
  const originalFetch = globalThis.fetch;
  const settings = makeSettings();
  const nextPreferences = {
    version: 2 as const,
    focusModeOnOpen: true,
    compactSidePanels: true,
    showOutlineHints: false,
    editorDensity: "compact" as const,
    showKeyboardHints: false,
    defaultInspectorTab: "block" as const,
    restoreLastSidebarsState: false,
  };

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/user-settings") && init?.method === "GET") {
      return jsonResponse(settings);
    }
    if (url.includes("/user-settings/posts.editor.preferences") && init?.method === "PATCH") {
      settings["posts.editor.preferences"] = nextPreferences;
      return jsonResponse({
        key: "posts.editor.preferences",
        value: nextPreferences,
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    invalidateUserSettingsCache();
    resetCsrfToken();

    await getUserSettings();
    await setUserSetting("posts.editor.preferences", nextPreferences);
    const next = await getUserSetting("posts.editor.preferences");
    expect(next.value).toEqual(nextPreferences);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateUserSettingsCache();
  }
});

test("setUserSetting handles media-center hero preset payloads", async () => {
  const originalFetch = globalThis.fetch;
  const settings = makeSettings();
  const nextPresets = [
    {
      name: "Showcase Hero",
      variant: "media-center" as const,
      data: {
        headline: "Show the product in context",
        layout: { height: "screen", bleed: "contained" },
      },
      updatedAt: "2026-05-19T08:00:00.000Z",
    },
  ];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url.endsWith("/user-settings") && init?.method === "GET") {
      return jsonResponse(settings);
    }
    if (url.includes("/user-settings/widgets.hero.presets") && init?.method === "PATCH") {
      settings["widgets.hero.presets"] = nextPresets;
      return jsonResponse({
        key: "widgets.hero.presets",
        value: nextPresets,
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    invalidateUserSettingsCache();
    resetCsrfToken();

    await getUserSettings();
    await setUserSetting("widgets.hero.presets", nextPresets);
    const next = await getUserSetting("widgets.hero.presets");
    expect(next.value).toEqual(nextPresets);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateUserSettingsCache();
  }
});

test("isolated helpers reject every non-exact response envelope", async () => {
  const originalFetch = globalThis.fetch;
  const invalidPayloads: unknown[] = [
    null,
    [],
    false,
    {},
    { key: "customScreens.entry.preferences" },
    { value: { version: 1, showFieldMetadata: true } },
    {
      key: "customScreens.entry.preferences",
      value: { version: 1, showFieldMetadata: true },
      extra: true,
    },
    {
      key: "forms.openAfterCreate",
      value: { version: 1, showFieldMetadata: true },
    },
  ];

  try {
    for (const payload of invalidPayloads) {
      globalThis.fetch = async () => jsonResponse(payload);
      await expect(getUserSettingIsolated("customScreens.entry.preferences")).rejects.toThrow(
        "user_settings_response_invalid"
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("isolated PATCH rejects every non-exact response envelope", async () => {
  const originalFetch = globalThis.fetch;
  const invalidPayloads: unknown[] = [
    null,
    [],
    {},
    { key: "customScreens.entry.preferences" },
    {
      key: "customScreens.entry.preferences",
      value: { version: 1, showFieldMetadata: true },
      extra: true,
    },
    {
      key: "forms.openAfterCreate",
      value: { version: 1, showFieldMetadata: true },
    },
  ];

  try {
    resetCsrfToken();
    for (const payload of invalidPayloads) {
      globalThis.fetch = async (input) =>
        String(input).endsWith("/auth/csrf")
          ? jsonResponse({ token: "csrf-token" })
          : jsonResponse(payload);
      await expect(
        setUserSettingIsolated(
          "customScreens.entry.preferences",
          { version: 1, showFieldMetadata: true },
          { expectedUserId: "user-a" }
        )
      ).rejects.toThrow("user_settings_response_invalid");
    }
  } finally {
    globalThis.fetch = originalFetch;
    resetCsrfToken();
  }
});

test("isolated reads and writes bypass the aggregate cache", async () => {
  const originalFetch = globalThis.fetch;
  const aggregate = makeSettings();
  const calls: string[] = [];

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/user-settings") && init?.method === "GET") {
      return jsonResponse(aggregate);
    }
    if (url.endsWith("/user-settings/customScreens.entry.preferences")) {
      return jsonResponse({
        key: "customScreens.entry.preferences",
        value: { version: 1, showFieldMetadata: true },
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    invalidateUserSettingsCache();
    resetCsrfToken();
    await getUserSettings();
    await getUserSettingIsolated("customScreens.entry.preferences");
    await setUserSettingIsolated(
      "customScreens.entry.preferences",
      { version: 1, showFieldMetadata: true },
      { expectedUserId: "user-a" }
    );

    expect((await getUserSetting("customScreens.entry.preferences")).value).toEqual({
      version: 1,
      showFieldMetadata: false,
    });
    expect(calls.filter((call) => call.endsWith("GET /admin/api/user-settings"))).toHaveLength(1);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateUserSettingsCache();
    resetCsrfToken();
  }
});

test("a delayed isolated A write cannot mutate aggregate state already owned by B", async () => {
  const originalFetch = globalThis.fetch;
  const aggregateB = makeSettings();
  let releaseA: ((response: Response) => void) | undefined;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    if (url.endsWith("/user-settings") && init?.method === "GET") {
      return jsonResponse(aggregateB);
    }
    if (
      url.endsWith("/user-settings/customScreens.entry.preferences") &&
      init?.method === "PATCH"
    ) {
      return new Promise<Response>((resolve) => {
        releaseA = resolve;
      });
    }
    return jsonResponse({}, 404);
  };

  try {
    invalidateUserSettingsCache();
    resetCsrfToken();
    const delayedA = setUserSettingIsolated(
      "customScreens.entry.preferences",
      { version: 1, showFieldMetadata: true },
      { expectedUserId: "user-a" }
    );
    await vi.waitFor(() => expect(releaseA).toBeTypeOf("function"));
    const aggregateBefore = structuredClone(await getUserSettings());
    expect(aggregateBefore["customScreens.entry.preferences"]).toEqual({
      version: 1,
      showFieldMetadata: false,
    });

    const responseA = {
      key: "customScreens.entry.preferences" as const,
      value: { version: 1 as const, showFieldMetadata: true },
    };
    releaseA?.(jsonResponse(responseA));
    await expect(delayedA).resolves.toEqual(responseA);
    expect(await getUserSettings()).toEqual(aggregateBefore);
  } finally {
    globalThis.fetch = originalFetch;
    invalidateUserSettingsCache();
    resetCsrfToken();
  }
});

test("isolated writes forward the captured owner and exact AbortSignal", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let capturedInit: RequestInit | undefined;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) return jsonResponse({ token: "csrf-token" });
    capturedInit = init;
    return jsonResponse({
      key: "customScreens.entry.preferences",
      value: { version: 1, showFieldMetadata: true },
    });
  };

  try {
    resetCsrfToken();
    await setUserSettingIsolated(
      "customScreens.entry.preferences",
      { version: 1, showFieldMetadata: true },
      { expectedUserId: "user-a", signal: controller.signal }
    );
    expect(capturedInit?.signal).toBe(controller.signal);
    expect(new Headers(capturedInit?.headers).get("x-coderso-expected-user-id")).toBe("user-a");
  } finally {
    globalThis.fetch = originalFetch;
    resetCsrfToken();
  }
});

test("an abort during CSRF acquisition prevents the initial PATCH transport", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let releaseCsrf: ((response: Response) => void) | undefined;
  let patchHits = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      return new Promise<Response>((resolve) => {
        releaseCsrf = resolve;
      });
    }
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    patchHits += 1;
    return jsonResponse({
      key: "customScreens.entry.preferences",
      value: { version: 1, showFieldMetadata: true },
    });
  };

  try {
    resetCsrfToken();
    const write = setUserSettingIsolated(
      "customScreens.entry.preferences",
      { version: 1, showFieldMetadata: true },
      { expectedUserId: "user-a", signal: controller.signal }
    );
    await vi.waitFor(() => expect(releaseCsrf).toBeTypeOf("function"));
    controller.abort();
    releaseCsrf?.(jsonResponse({ token: "csrf-token" }));
    await expect(write).rejects.toMatchObject({ name: "AbortError" });
    expect(patchHits).toBe(0);
  } finally {
    globalThis.fetch = originalFetch;
    resetCsrfToken();
  }
});

test("an abort after a refreshable CSRF response prevents the retry PATCH", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let csrfHits = 0;
  let patchHits = 0;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/auth/csrf")) {
      csrfHits += 1;
      return jsonResponse({ token: `csrf-token-${csrfHits}` });
    }
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    patchHits += 1;
    controller.abort();
    return jsonResponse({ error: { code: "csrf_invalid", message: "Invalid CSRF token" } }, 403);
  };

  try {
    resetCsrfToken();
    await expect(
      setUserSettingIsolated(
        "customScreens.entry.preferences",
        { version: 1, showFieldMetadata: true },
        { expectedUserId: "user-a", signal: controller.signal }
      )
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(csrfHits).toBe(2);
    expect(patchHits).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    resetCsrfToken();
  }
});

test("getUserSetting keyed fetch merges into a warm aggregate cache", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ input, init });
    if (url === "/admin/api/user-settings") {
      return jsonResponse(makeSettings());
    }
    if (url === "/admin/api/user-settings/assistant.mode") {
      return jsonResponse({ key: "assistant.mode", value: "llm-guide" });
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    invalidateUserSettingsCache();
    const warm = await getUserSettings();
    expect(warm["assistant.mode"]).toBe("docs-only");

    const hit = await getUserSetting("assistant.mode");
    expect(hit.value).toBe("docs-only");

    const forced = await getUserSetting("assistant.mode", { force: true });
    expect(forced.value).toBe("llm-guide");

    const merged = await getUserSettings();
    expect(merged["assistant.mode"]).toBe("llm-guide");

    expect(calls.filter((call) => call.input === "/admin/api/user-settings").length).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("setUserSetting invalidates the aggregate cache when it is cold", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    calls.push({ input, init });
    if (url.endsWith("/auth/csrf")) {
      return jsonResponse({ token: "csrf-token" });
    }
    if (url === "/admin/api/user-settings/media.openAfterUpload") {
      return jsonResponse({ key: "media.openAfterUpload", value: true });
    }
    if (url === "/admin/api/user-settings") {
      return jsonResponse(makeSettings());
    }
    throw new Error(`unexpected fetch ${url}`);
  };

  try {
    invalidateUserSettingsCache();
    const result = await setUserSetting("media.openAfterUpload", true);
    expect(result.value).toBe(true);

    await getUserSettings();
    expect(calls.filter((call) => call.input === "/admin/api/user-settings").length).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
