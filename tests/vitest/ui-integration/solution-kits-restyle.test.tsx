import React from "react";
import { afterEach, expect, test } from "vitest";

import { cacheKeys } from "../../../core/admin/services/cachePolicy";
import { clearSolutionKitsCache } from "../../../core/admin/services/solutionKitsClient";
import { SolutionKitsPage } from "../../../core/admin/ui/kits/SolutionKitsPage";
import { renderAdminUi } from "../../utils/adminRouterRender";

type StorageStub = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

const createLocalStorage = (): StorageStub => {
  const store = new Map<string, string>();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
};

const ACTIVE_KIT_STORAGE_KEY = "coderso.solutionKits.activeKit.v1";

const KITS = [
  {
    id: "automotive-workshop",
    title: "Automotive Workshop",
    shortDescription: "Bookings + leads",
    recommendedModules: ["booking", "reviews"],
    features: ["Lead form"],
  },
  {
    id: "small-ecommerce",
    title: "Small Ecommerce",
    shortDescription: "Sell products",
    recommendedModules: ["catalog"],
    features: ["Product grid"],
  },
];

const seedKits = (storage: StorageStub, kits: unknown) =>
  storage.setItem(cacheKeys.solutionKitsList, JSON.stringify({ value: kits, savedAt: Date.now() }));

let restoreLocal: (() => void) | null = null;

const installLocalStorage = (): StorageStub => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;
  const storage = createLocalStorage();
  (globalThis as { localStorage?: unknown }).localStorage = storage as unknown;
  restoreLocal = () => {
    if (original === undefined) {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    } else {
      (globalThis as { localStorage?: unknown }).localStorage = original;
    }
  };
  return storage;
};

afterEach(() => {
  restoreLocal?.();
  restoreLocal = null;
  // Reset the module-level kit cache so each test hydrates only from its own seed.
  clearSolutionKitsCache();
});

test("featured banner is a non-action hero; the reviewed CTA stays single", () => {
  // Banner renders regardless of kit hydration (no cache seed needed here).
  const html = renderAdminUi(<SolutionKitsPage />, {
    path: "/admin/advanced/solution-kits",
  });

  expect(html).toContain("Launch a full site in minutes"); // banner hero heading
  expect(html).toContain("AI assembled"); // banner badge
  expect(html).toContain("Reviewed Site Builder"); // right-column card
  expect(html).toContain("Open LLM Guide"); // the single reviewed-flow CTA
  // Guard the "duplicate banner CTA" fix: the CTA label appears exactly once.
  expect(html.split("Open LLM Guide").length - 1).toBe(1);
  // The banner must not introduce a second reviewed-flow handoff button.
  expect(html).not.toContain("Browse all kits");
});

test("grid renders one card per cached kit with title + module badges", () => {
  const storage = installLocalStorage();
  seedKits(storage, KITS);

  const html = renderAdminUi(<SolutionKitsPage />, {
    path: "/admin/advanced/solution-kits",
  });

  expect(html).toContain("Automotive Workshop");
  expect(html).toContain("Small Ecommerce");
  // Module badge text = de-hyphenated token; `capitalize` is CSS-only, so the
  // rendered HTML text stays lowercase "booking".
  expect(html).toContain("booking");
  expect(html).not.toContain("Loading solution kits");
});

test("active kit shows Selected state and the page never offers Apply kit", () => {
  const storage = installLocalStorage();
  seedKits(storage, KITS);
  // Pre-set the active-kit selection key (first cached kit also resolves as the
  // effective selection, so the first card renders as active either way).
  storage.setItem(ACTIVE_KIT_STORAGE_KEY, "automotive-workshop");

  const html = renderAdminUi(<SolutionKitsPage />, {
    path: "/admin/advanced/solution-kits",
  });

  expect(html).toContain("Selected"); // success badge + button label on active card
  expect(html).toContain("Select kit"); // non-active card keeps the read-only label
  expect(html).not.toContain("Apply kit"); // reviewed-flow constraint preserved
});
