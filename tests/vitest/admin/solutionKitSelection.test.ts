// @vitest-environment happy-dom

import { expect, test, beforeEach, vi } from "vitest";

import {
  buildCodersoFeatureFlagsForSolutionKit,
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

test("buildCodersoFeatureFlagsForSolutionKit keeps solution kits visible and gates unrelated modules", () => {
  const flags = buildCodersoFeatureFlagsForSolutionKit({
    id: "services-directory",
    title: "Services Directory",
    shortDescription: "Directory starter",
    recommendedModules: ["engine", "entries", "widgets", "forms", "listings", "filters", "search"],
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
      requiredModules: ["engine", "entries", "forms", "listings", "filters", "search", "widgets"],
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
  expect(flags["custom-screens"]).toBe(false);
});
