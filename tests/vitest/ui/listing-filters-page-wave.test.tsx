// @vitest-environment happy-dom
//
// TASK-105-04 listings wave, LEAF A2 — ListingFiltersPage + ListingSearchPage
// slice (split target). Re-homes the filters/search page tests from the former
// `listings-cluster-wave.test.tsx` under the shared `listingsClusterFixtures`
// mock world and extends coverage: preview loading/error states, examples
// toggle + use-example wiring, the no-query-selected and invalid-id fallbacks,
// the token-id extraction conflict rules, and search source-selection fallbacks.

import React from "react";
import { expect, test, vi } from "vitest";
import {
  clickButtonByText,
  findSelectByOptions,
  flush,
  getListingsState,
  mount,
  setInputValue,
  setSelectValue,
} from "./listingsClusterFixtures";

const listingsState = getListingsState();
const LISTING_QUERY_ID = "11111111-1111-4111-8111-111111111111";

const clickSwitch = (container: HTMLElement, index: number) => {
  const checkbox = Array.from(container.querySelectorAll('input[type="checkbox"]'))[index];
  if (!(checkbox instanceof HTMLInputElement)) {
    throw new Error(`Missing switch #${index}`);
  }
  React.act(() => {
    // The DOM click() method runs the checkbox default action (toggles the
    // checked state); a synthetic dispatched click does not in happy-dom.
    checkbox.click();
  });
};

test("ListingFiltersPage extracts listing ids, previews tokens, and applies examples", async () => {
  const { ListingFiltersPage, extractListingQueryIdFromQueryString } =
    await import("../../../core/admin/ui/listings/ListingFiltersPage");

  expect(extractListingQueryIdFromQueryString(`?lq.${LISTING_QUERY_ID}.status.eq=published`)).toBe(
    LISTING_QUERY_ID
  );
  expect(
    extractListingQueryIdFromQueryString("?lq.one.status.eq=published&lq.two.status.eq=draft")
  ).toBeNull();

  const view = mount(<ListingFiltersPage />);

  try {
    expect(view.container.textContent).toContain("Filters");
    expect(view.container.textContent).toContain("Show examples");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    const select = () => view.container.querySelector("select");
    const input = () => view.container.querySelector("input");

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Show examples"))
        ?.click();
    });
    expect(view.container.textContent).toContain("Combined query");

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Use example"))
        ?.click();
    });

    await React.act(async () => {
      setSelectValue(select() ?? undefined, LISTING_QUERY_ID);
      buttons()
        .find((button) => button.textContent?.includes("Run preview"))
        ?.click();
    });

    expect(listingsState.previewFiltersCalls[0]).toEqual({
      listingQueryId: LISTING_QUERY_ID,
      queryString: `lq.${LISTING_QUERY_ID}.__q=about`,
    });
    expect(view.container.textContent).toContain("Ignored tokens");
    expect(view.container.textContent).toContain("Rows snapshot");
  } finally {
    view.cleanup();
  }
});

test("ListingSearchPage previews selected sources and handles failures", async () => {
  const { ListingSearchPage } = await import("../../../core/admin/ui/listings/ListingSearchPage");
  const view = mount(<ListingSearchPage />);

  try {
    expect(view.container.textContent).toContain("Search");
    expect(view.container.textContent).toContain("What this preview searches");

    const inputs = () => Array.from(view.container.querySelectorAll("input"));
    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    await React.act(async () => {
      setInputValue(inputs()[0], "hero");
      setInputValue(inputs()[1], "15");
      buttons()
        .find((button) => button.textContent?.includes("Run preview"))
        ?.click();
    });

    expect(listingsState.previewSearchCalls[0]).toEqual({
      q: "hero",
      limit: 15,
      sources: ["pages", "entries"],
    });
    expect(view.container.textContent).toContain("Resolved query");
    expect(view.container.textContent).toContain("Homepage");

    listingsState.previewPublicSearchResult = Promise.reject(
      new Error("Search preview failed")
    ) as never;

    await React.act(async () => {
      buttons()
        .find((button) => button.textContent?.includes("Run preview"))
        ?.click();
    });

    expect(view.container.textContent).toContain("Search preview failed");
  } finally {
    view.cleanup();
  }
});

test("ListingFiltersPage shows the preview loading state and disables the run button", async () => {
  const { ListingFiltersPage } = await import("../../../core/admin/ui/listings/ListingFiltersPage");
  const { previewListingFilters } = await import("@/services/listingsClient");

  vi.mocked(previewListingFilters).mockImplementationOnce(
    () => new Promise(() => undefined) as never
  );

  const view = mount(<ListingFiltersPage />);

  try {
    React.act(() => {
      clickButtonByText(view.container, "Run preview");
    });
    expect(view.container.textContent).toContain("Previewing...");
    const runButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Previewing")
    );
    expect(runButton).toBeDefined();
    expect(runButton?.hasAttribute("disabled")).toBe(true);
  } finally {
    view.cleanup();
  }
});

test("ListingFiltersPage reports preview failures and keeps the page usable", async () => {
  const { ListingFiltersPage } = await import("../../../core/admin/ui/listings/ListingFiltersPage");
  const { previewListingFilters } = await import("@/services/listingsClient");

  vi.mocked(previewListingFilters).mockRejectedValueOnce(new Error("Filter preview failed"));

  const view = mount(<ListingFiltersPage />);

  try {
    await React.act(async () => {
      clickButtonByText(view.container, "Run preview");
    });
    await flush();
    expect(view.container.textContent).toContain("Preview failed");
    expect(view.container.textContent).toContain("Filter preview failed");
  } finally {
    view.cleanup();
  }
});

test("ListingFiltersPage falls back when no query is selected and none is inferable", async () => {
  const { ListingFiltersPage } = await import("../../../core/admin/ui/listings/ListingFiltersPage");

  listingsState.queryItems = [];
  const view = mount(<ListingFiltersPage />);

  try {
    expect(view.container.textContent).toContain("No listing query selected");
    await React.act(async () => {
      clickButtonByText(view.container, "Run preview");
    });
    await flush();
    expect(view.container.textContent).toContain("Select a listing query first");
    expect(listingsState.previewFiltersCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("ListingFiltersPage rejects malformed listing query ids in runtime tokens", async () => {
  const { ListingFiltersPage } = await import("../../../core/admin/ui/listings/ListingFiltersPage");

  // No preselected query: the id must come from the runtime token, so a
  // malformed token id hits the validation branch instead of the default query.
  listingsState.queryItems = [];
  const view = mount(<ListingFiltersPage />);

  try {
    const inputs = () => Array.from(view.container.querySelectorAll("input"));
    await React.act(async () => {
      setInputValue(inputs()[0], "lq.bad-id.status.eq=published");
      clickButtonByText(view.container, "Run preview");
    });
    await flush();
    expect(view.container.textContent).toContain(
      "Listing query id in runtime tokens has invalid format"
    );
    expect(listingsState.previewFiltersCalls).toHaveLength(0);
  } finally {
    view.cleanup();
  }
});

test("ListingFiltersPage toggles examples and uses the runtime token prefix", async () => {
  const { ListingFiltersPage, extractListingQueryIdFromQueryString } =
    await import("../../../core/admin/ui/listings/ListingFiltersPage");

  // Same id across multiple tokens resolves; mixed ids conflict to null.
  expect(
    extractListingQueryIdFromQueryString(
      `lq.${LISTING_QUERY_ID}.__q=about&lq.${LISTING_QUERY_ID}.__sort=updatedAt:desc`
    )
  ).toBe(LISTING_QUERY_ID);
  expect(extractListingQueryIdFromQueryString("")).toBeNull();

  const view = mount(<ListingFiltersPage />);

  try {
    clickButtonByText(view.container, "Show examples");
    expect(view.container.textContent).toContain("How runtime query string works");
    expect(view.container.textContent).toContain(`lq.${LISTING_QUERY_ID}`);

    clickButtonByText(view.container, "Hide examples");
    expect(view.container.textContent).not.toContain("How runtime query string works");
  } finally {
    view.cleanup();
  }
});

test("ListingSearchPage omits sources and limit when none are selected or valid", async () => {
  const { ListingSearchPage } = await import("../../../core/admin/ui/listings/ListingSearchPage");
  const { previewPublicSearch } = await import("@/services/listingsClient");
  const view = mount(<ListingSearchPage />);

  try {
    const inputs = () => Array.from(view.container.querySelectorAll("input"));
    const runPreview = () => {
      React.act(() => {
        Array.from(view.container.querySelectorAll("button"))
          .find((button) => button.textContent?.includes("Run preview"))
          ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    };

    // Deselect pages + entries (posts already off) and use an invalid limit.
    React.act(() => {
      setInputValue(inputs()[0], "hero");
      setInputValue(inputs()[1], "abc");
    });
    clickSwitch(view.container, 0);
    clickSwitch(view.container, 1);
    runPreview();
    await flush();

    expect(listingsState.previewSearchCalls.at(-1)).toEqual({
      q: "hero",
    });

    // A source-less result renders the none fallback visibly.
    vi.mocked(previewPublicSearch).mockResolvedValueOnce({
      query: "hero",
      sources: [],
      items: [],
    });
    runPreview();
    await flush();
    expect(view.container.textContent).toContain("Sources: (none)");
    expect(view.container.textContent).toContain("No results.");
  } finally {
    view.cleanup();
  }
});
