import React from "react";
import { afterEach, beforeEach, expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { CustomScreenListPage } from "../../../core/admin/ui/custom-screens/CustomScreenListPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

/**
 * TASK-479-14-L05: presentation guard for the Custom Screen management list
 * restyle (TASK-479-14-L01). Confirms the soft card grid, the "In sidebar" badge
 * derived from `resolveCustomScreenSidebarShortcutState === "visible"` (never a
 * fabricated `published` field), and canonical AdminLink hrefs — while the real
 * list model wiring stays intact.
 */
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

let originalLocal: unknown;
let storage: ReturnType<typeof createLocalStorage>;

beforeEach(() => {
  originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
});

afterEach(() => {
  if (originalLocal === undefined) {
    delete (globalThis as { localStorage?: unknown }).localStorage;
  } else {
    (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
  }
});

const seedScreens = () => {
  storage.setItem(
    cacheKeys.customScreensList,
    JSON.stringify({
      value: [
        {
          // active + showInSidebar + writable binding -> shortcut state "visible".
          id: "project-catalog",
          name: "Projects",
          contentTypeId: "type-1",
          status: "active",
          showInSidebar: true,
          sidebarLabel: "Projects",
          schemaVersion: 1,
          blocks: [
            {
              id: "field-1",
              type: "screen-field-value",
              data: { label: "Headline", value: "Ocean View" },
            },
          ],
          bindings: [
            {
              id: "binding-1",
              widgetId: "field-1",
              propPath: "value",
              field: "headline",
              mode: "readwrite",
            },
          ],
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z",
        },
        {
          id: "draft-x",
          name: "Draft Screen",
          contentTypeId: "type-1",
          status: "draft",
          showInSidebar: false,
          sidebarLabel: null,
          schemaVersion: 1,
          blocks: [],
          bindings: [],
          createdAt: "2026-03-05T00:00:00.000Z",
          updatedAt: "2026-03-05T00:00:00.000Z",
        },
      ],
      savedAt: Date.now(),
    })
  );
};

test("renders soft cards; In-sidebar badge only for the active + showInSidebar screen", () => {
  seedScreens();
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toContain("rounded-2xl");
  expect(html).toContain("In sidebar");

  // The "In sidebar" badge must belong to the active screen only — the draft
  // card (rendered after it) must not carry it.
  const draftPart = html.slice(html.indexOf("Draft Screen"));
  expect(draftPart).not.toContain("In sidebar");
});

test("Open link uses the canonical workspace href via AdminLink (no hand-built path)", () => {
  seedScreens();
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toMatch(/href="[^"]*\/advanced\/custom-screens\/project-catalog\/entries/);
});

test("header exposes the prototype 'New screen' action", () => {
  seedScreens();
  const html = renderAdminUi(<CustomScreenListPage />, {
    path: "/admin/advanced/custom-screens",
  });

  expect(html).toContain("New screen");
  expect(html).toContain("Build bespoke admin surfaces");
});
