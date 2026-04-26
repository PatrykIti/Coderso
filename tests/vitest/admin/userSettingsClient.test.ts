import { expect, test } from "vitest";

import { resetCsrfToken } from "../../../core/admin/services/apiClient";
import {
  getUserSetting,
  getUserSettings,
  invalidateUserSettingsCache,
  setUserSetting,
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
  "media.openAfterUpload": false,
  "widgets.favorites": ["hero"],
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
    if (
      url.includes("/user-settings/customScreens.openAfterCreate") &&
      init?.method === "PATCH"
    ) {
      settings["customScreens.openAfterCreate"] = false;
      return jsonResponse({
        key: "customScreens.openAfterCreate",
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

    const next = await getUserSetting("customScreens.openAfterCreate");
    expect(next.value).toBe(false);

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
    if (
      url.includes("/user-settings/posts.editor.preferences") &&
      init?.method === "PATCH"
    ) {
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
