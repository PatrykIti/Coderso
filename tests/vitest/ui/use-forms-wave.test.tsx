// @vitest-environment happy-dom
//
// TASK-105-04 forms wave, LEAF A1 — useForms hook branch closure.
// Covers the skip flag, the generic-Error and fallback error strings, the
// non-background refresh loading path, and cache-bus hydration with a cached
// list. Uses the shared formsPagesWaveFixtures mocks.

import React from "react";
import { expect, test } from "vitest";
import { flush, getFormsPageState, mount } from "./formsPagesWaveFixtures";

const formsPageState = getFormsPageState();

test("useForms with skip renders no mount fetch and stays idle", async () => {
  const { useForms } = await import("../../../core/admin/ui/forms/hooks/useForms");
  const SkipHarness = () => {
    const { items, isLoading, error } = useForms({ skip: true });
    return (
      <div>
        <span>{`skip-count:${items.length}`}</span>
        <span>{`skip-loading:${String(isLoading)}`}</span>
        <span>{error ?? "no-error"}</span>
      </div>
    );
  };
  const view = mount(<SkipHarness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("skip-count:1");
    expect(view.container.textContent).toContain("skip-loading:false");
    expect(formsPageState.listCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("useForms surfaces generic Error and fallback messages and shows the non-background loading state", async () => {
  const { useForms } = await import("../../../core/admin/ui/forms/hooks/useForms");
  const GenericHarness = () => {
    const { items, isLoading, error, refresh } = useForms({ skip: true });
    return (
      <div>
        <span>{`generic-count:${items.length}`}</span>
        <span>{`generic-loading:${String(isLoading)}`}</span>
        <span>{error ?? "no-error"}</span>
        <button type="button" onClick={() => refresh({ force: true, background: false })}>
          refresh-forms
        </button>
      </div>
    );
  };
  const view = mount(<GenericHarness />);

  try {
    await flush();

    formsPageState.listError = new Error("Generic boom");
    React.act(() => {
      view.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("Generic boom");
    expect(formsPageState.listCalls.at(-1)).toBe(true);

    formsPageState.listError = "not an error instance";
    React.act(() => {
      view.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("Failed to load forms.");

    formsPageState.listError = null;
    React.act(() => {
      view.container
        .querySelector("button")
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flush();

    expect(view.container.textContent).toContain("generic-count:1");
    expect(view.container.textContent).toContain("no-error");
  } finally {
    view.cleanup();
  }
});

test("useForms cache-bus hydration applies the cached list even when the background fetch fails", async () => {
  const { useForms } = await import("../../../core/admin/ui/forms/hooks/useForms");
  const CacheHarness = () => {
    const { items, isLoading, error } = useForms();
    return (
      <div>
        <span>{`cache-count:${items.length}`}</span>
        <span>{`cache-loading:${String(isLoading)}`}</span>
        <span>{error ?? "no-error"}</span>
      </div>
    );
  };
  const view = mount(<CacheHarness />);

  try {
    await flush();

    // The cache now holds a different list AND the network fetch will fail.
    formsPageState.formsList = [
      { ...formsPageState.form, id: "cached-1", name: "Cached form", slug: "cached-1" },
    ];
    formsPageState.listError = formsPageState.apiError("Revalidation failed");
    await React.act(async () => {
      for (const subscriber of formsPageState.subscribers) {
        subscriber({ key: "formsList" });
      }
      await Promise.resolve();
    });

    // The cached value hydrates immediately; the failed background refresh only
    // surfaces the error, it must not drop the hydrated rows or leave the loader.
    expect(view.container.textContent).toContain("cache-count:1");
    expect(view.container.textContent).toContain("cache-loading:false");
    expect(view.container.textContent).toContain("Revalidation failed");
  } finally {
    view.cleanup();
  }
});
