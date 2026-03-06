import React from "react";
import { expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { SolutionKitsPage } from "../../../core/admin/ui/kits/SolutionKitsPage";
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

test("SolutionKitsPage renders shell and guided wizard controls", () => {
  const html = renderAdminUi(<SolutionKitsPage />, {
    path: "/admin/coderso/solution-kits",
  });

  expect(html).toContain("Solution Kits");
  expect(html).toContain("AI Site Wizard");
  expect(html).toContain("Business profile");
  expect(html).toContain("Plan review");
  expect(html).toContain("Execute");
});

test("SolutionKitsPage renders cached cards without loading placeholder", () => {
  const originalLocal = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;

  try {
    storage.setItem(
      cacheKeys.solutionKitsList,
      JSON.stringify({
        value: [
          {
            id: "automotive-workshop",
            title: "Automotive Workshop",
            shortDescription: "Cached description",
            recommendedModules: ["booking"],
            features: ["Lead form"],
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<SolutionKitsPage />, {
      path: "/admin/coderso/solution-kits",
    });

    expect(html).toContain("Automotive Workshop");
    expect(html).not.toContain("Loading solution kits");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
