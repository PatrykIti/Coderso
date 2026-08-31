// @vitest-environment happy-dom

import { expect, test, beforeEach, vi } from "vitest";

import {
  buildAdvancedFeatureFlagsForSolutionKit,
  getActiveSolutionKitId,
  setActiveSolutionKitId,
  subscribeActiveSolutionKitId,
} from "../../../core/admin/services/solutionKitSelection";

beforeEach(() => {
  window.localStorage.clear();
});

test("active solution kit preference round-trips through local storage", () => {
  expect(getActiveSolutionKitId()).toBeNull();

  setActiveSolutionKitId("medical-clinic");
  expect(getActiveSolutionKitId()).toBe("medical-clinic");

  setActiveSolutionKitId(null);
  expect(getActiveSolutionKitId()).toBeNull();
});

test("subscribeActiveSolutionKitId reacts to same-tab updates", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeActiveSolutionKitId(listener);

  try {
    setActiveSolutionKitId("automotive-workshop");
    expect(listener).toHaveBeenLastCalledWith("automotive-workshop");

    setActiveSolutionKitId(null);
    expect(listener).toHaveBeenLastCalledWith(null);
  } finally {
    unsubscribe();
  }
});

test("buildAdvancedFeatureFlagsForSolutionKit keeps solution kits visible and expands screen/dependency modules", () => {
  const flags = buildAdvancedFeatureFlagsForSolutionKit({
    id: "services-directory",
    title: "Services Directory",
    shortDescription: "Directory starter",
    recommendedModules: [
      "engine",
      "entries",
      "custom-screens",
      "widgets",
      "forms",
      "listings",
      "filters",
      "search",
    ],
    features: [],
    manifest: {
      id: "services-directory",
      title: "Services Directory",
      vertical: "services-directory",
      includes: {
        contentTypes: ["provider"],
        entries: [],
        widgets: ["hero", "search-box", "listing-filters", "content-list"],
        templates: ["directory-home", "directory-list"],
        forms: ["directory-inquiry"],
        menus: ["primary", "footer"],
      },
      requiredModules: [
        "engine",
        "entries",
        "custom-screens",
        "forms",
        "listings",
        "filters",
        "search",
        "widgets",
      ],
      optionalModules: [],
      postInstallTasks: [],
    },
  });

  expect(flags["ai-kit-wizard"]).toBe(true);
  expect(flags.engine).toBe(true);
  expect(flags.entries).toBe(true);
  expect(flags.widgets).toBe(true);
  expect(flags.forms).toBe(true);
  expect(flags.listings).toBe(true);
  expect(flags.filters).toBe(true);
  expect(flags.search).toBe(true);
  expect(flags.booking).toBe(false);
  expect(flags.commerce).toBe(false);
  expect(flags.reviews).toBe(false);
  expect(flags["custom-screens"]).toBe(true);
});

test("buildAdvancedFeatureFlagsForSolutionKit enables dependencies from the module registry", () => {
  const flags = buildAdvancedFeatureFlagsForSolutionKit({
    id: "small-ecommerce",
    title: "Small E-commerce",
    shortDescription: "Shop starter",
    recommendedModules: ["commerce"],
    features: [],
  });

  expect(flags["ai-kit-wizard"]).toBe(true);
  expect(flags.commerce).toBe(true);
  expect(flags.listings).toBe(true);
  expect(flags.filters).toBe(true);
  expect(flags.search).toBe(false);
});

test("legacy storage key migrates to the canonical key on read", () => {
  window.localStorage.setItem("nextless.solutionKits.activeKit.v1", "medical-clinic");
  expect(getActiveSolutionKitId()).toBe("medical-clinic");
  expect(window.localStorage.getItem("coderso.solutionKits.activeKit.v1")).toBe("medical-clinic");
  expect(getActiveSolutionKitId()).toBe("medical-clinic");
});

test("subscribeActiveSolutionKitId ignores storage events for other keys", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeActiveSolutionKitId(listener);
  try {
    window.dispatchEvent(
      new StorageEvent("storage", { key: "unrelated-key", newValue: "medical-clinic" })
    );
    expect(listener).not.toHaveBeenCalled();
  } finally {
    unsubscribe();
  }
});

test("subscribeActiveSolutionKitId treats invalid storage values as null", () => {
  const listener = vi.fn();
  const unsubscribe = subscribeActiveSolutionKitId(listener);
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "coderso.solutionKits.activeKit.v1",
        newValue: "not-a-kit",
      })
    );
    expect(listener).toHaveBeenCalledWith(null);
  } finally {
    unsubscribe();
  }
});
