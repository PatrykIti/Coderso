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

test("SolutionKitsPage renders reviewed site builder CTA without legacy wizard controls", () => {
  const html = renderAdminUi(<SolutionKitsPage />, {
    path: "/admin/advanced/solution-kits",
  });

  expect(html).toContain("Solution Kits");
  expect(html).toContain("Reviewed Site Builder");
  expect(html).toContain("Open LLM Guide");
  expect(html).not.toContain("AI Site Wizard");
  expect(html).not.toContain("Business profile");
  expect(html).not.toContain("Plan review");
  expect(html).not.toContain("Apply kit");
  expect(html).not.toContain("Dry run");
  expect(html).not.toContain("Rerun");
  expect(html).not.toContain("Rollback latest");
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
      path: "/admin/advanced/solution-kits",
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
