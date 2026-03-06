import React from "react";
import { expect, test } from "vitest";

import {
  clearAuthBootstrapCache,
  resolveAuthBootstrap,
} from "../../../core/admin/services/authClient";
import {
  clearAssistantRuntimeStateCache,
  loadAssistantRuntimeStateCached,
} from "../../../core/admin/ui/assistant/AssistantPanel";

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("admin shell auth bootstrap stays within single-shot request budget", async () => {
  const originalFetch = globalThis.fetch;
  let authMeCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/me")) {
      authMeCalls += 1;
      return jsonResponse({
        user: {
          id: "user-1",
          email: "admin@example.com",
          name: "Admin",
        },
      });
    }
    return jsonResponse({});
  };

  try {
    clearAuthBootstrapCache();
    const first = await resolveAuthBootstrap();
    const [second, third] = await Promise.all([
      resolveAuthBootstrap(),
      resolveAuthBootstrap(),
    ]);

    expect(first.state).toBe("authenticated");
    expect(second.state).toBe("authenticated");
    expect(third.state).toBe("authenticated");
    expect(authMeCalls).toBeLessThanOrEqual(1);
  } finally {
    clearAuthBootstrapCache();
    globalThis.fetch = originalFetch;
  }
});

test("assistant runtime state cache stays within shell request budget", async () => {
  const originalFetch = globalThis.fetch;
  let assistantStatusCalls = 0;
  let userSettingsCalls = 0;

  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/assistant/status")) {
      assistantStatusCalls += 1;
      return jsonResponse({
        enabled: true,
        defaultMode: "docs-only",
        retrievalBackend: "filesystem",
        llmAvailable: false,
        indexReady: true,
        indexBuilding: false,
        indexError: null,
        lastReindexAt: null,
        docCount: 10,
        chunkCount: 40,
      });
    }
    if (url.endsWith("/user-settings")) {
      userSettingsCalls += 1;
      return jsonResponse({
        "pages.openAfterCreate": true,
        "media.openAfterUpload": true,
        "widgets.favorites": [],
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
    }
    return jsonResponse({});
  };

  try {
    clearAssistantRuntimeStateCache();
    await Promise.all([
      loadAssistantRuntimeStateCached(),
      loadAssistantRuntimeStateCached(),
      loadAssistantRuntimeStateCached(),
    ]);
    await loadAssistantRuntimeStateCached();

    expect(assistantStatusCalls).toBeLessThanOrEqual(1);
    expect(userSettingsCalls).toBeLessThanOrEqual(1);
  } finally {
    clearAssistantRuntimeStateCache();
    globalThis.fetch = originalFetch;
  }
});
