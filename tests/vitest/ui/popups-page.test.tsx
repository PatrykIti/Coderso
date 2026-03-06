import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { PopupEditorPage } from "../../../core/admin/ui/popups/PopupEditorPage";
import { PopupsListPage } from "../../../core/admin/ui/popups/PopupsListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

const createLocalStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

test("PopupsListPage renders shell and loading state", () => {
  const html = renderAdminUi(<PopupsListPage />, {
    path: "/admin/coderso/popups",
  });

  expect(html).toContain("Popups");
  expect(html).toContain("New popup");
  expect(html).toContain("Loading popups");
});

test("PopupsListPage renders cached popups without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.popupsList,
      JSON.stringify({
        value: [
          {
            id: "popup-1",
            name: "Cached popup",
            slug: "cached-popup",
            status: "draft",
            trigger: { type: "time_delay", delaySeconds: 3 },
            targeting: { includePaths: [], excludePaths: [], audience: "all" },
            frequency: { strategy: "session_once", cooldownMinutes: null },
            content: {
              title: "Title",
              body: "Body",
              templateId: null,
              ctaLabel: null,
              ctaHref: null,
            },
            settings: { placement: "center", dismissible: true, showOverlay: true },
            createdAt: "2026-02-19T00:00:00.000Z",
            updatedAt: "2026-02-19T00:00:00.000Z",
            publishedAt: null,
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<PopupsListPage />, {
      path: "/admin/coderso/popups",
    });

    expect(html).toContain("Cached popup");
    expect(html).not.toContain("Loading popups");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});

test("PopupEditorPage renders editor controls in create mode", () => {
  const html = renderAdminUi(<PopupEditorPage />, {
    path: "/admin/coderso/popups/new",
  });

  expect(html).toContain("New popup");
  expect(html).toContain("Identity");
  expect(html).toContain("Trigger");
  expect(html).toContain("Display Settings");
  expect(html).toContain("Save changes");
  expect(html).toContain("Publish");
});
