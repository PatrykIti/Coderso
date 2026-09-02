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
  expect(html).not.toContain("Cancel");
  expect(html).not.toContain("Polling");
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
          {
            id: "medical-clinic",
            title: "Medical Clinic",
            shortDescription: "Clinic description",
            recommendedModules: ["forms"],
            features: ["Appointments"],
          },
          {
            id: "beauty-salon",
            title: "Beauty Salon",
            shortDescription: "Salon description",
            recommendedModules: ["booking"],
            features: ["Bookings"],
          },
          {
            id: "local-service-business",
            title: "Local Service Business",
            shortDescription: "Local service description",
            recommendedModules: ["forms"],
            features: ["Inquiries"],
          },
          {
            id: "services-directory",
            title: "Local Services Directory",
            shortDescription: "Directory description",
            recommendedModules: ["listings"],
            features: ["Listings"],
          },
          {
            id: "small-ecommerce",
            title: "Small E-commerce",
            shortDescription: "Store description",
            recommendedModules: ["catalog"],
            features: ["Products"],
          },
        ],
        savedAt: Date.now(),
      })
    );

    const html = renderAdminUi(<SolutionKitsPage />, {
      path: "/admin/advanced/solution-kits",
    });

    expect(html).toContain("Automotive Workshop");
    expect(html).toContain("Medical Clinic");
    expect(html).toContain("Beauty Salon");
    expect(html).toContain("Local Service Business");
    expect(html).toContain("Local Services Directory");
    expect(html).toContain("Small E-commerce");
    expect(html.split("Select kit").length - 1).toBe(5);
    expect(html).not.toContain("Loading solution kits");
  } finally {
    if (originalLocal === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = originalLocal;
    }
  }
});
