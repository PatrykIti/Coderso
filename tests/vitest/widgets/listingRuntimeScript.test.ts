// @vitest-environment happy-dom

import React from "react";
import { afterEach, expect, test, vi } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ListingFiltersBlock,
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../../../core/widgets/core/listingFilters";
import {
  SearchBoxBlock,
  searchBoxDefaults,
  type SearchBoxData,
} from "../../../core/widgets/core/searchBox";

const originalFetch = globalThis.fetch;

const resetRuntimeFlag = () => {
  delete (window as Window & { __nextlessListingRuntimeClient?: boolean })
    .__nextlessListingRuntimeClient;
};

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const installListingFiltersRuntime = (
  data: ListingFiltersData,
  blockId = "listing-filters-runtime",
  variant: "default" | "horizontal" | "sidebar" | "drawer" = "default"
) => {
  resetRuntimeFlag();
  document.body.innerHTML = renderToString(
    React.createElement(ListingFiltersBlock, {
      data,
      variant,
      blockId,
    })
  );
  const script = document.querySelector("script");
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }
  const form = document.querySelector("form[data-listing-runtime-form]");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Missing listing runtime form");
  }
  return form;
};

const installSearchBoxRuntime = (data: SearchBoxData, blockId = "search-box-runtime") => {
  resetRuntimeFlag();
  document.body.innerHTML = renderToString(
    React.createElement(SearchBoxBlock, {
      data,
      variant: "default",
      blockId,
    })
  );
  const script = document.querySelector("script");
  if (script?.textContent) {
    // eslint-disable-next-line no-eval
    eval(script.textContent);
  }
  const form = document.querySelector("form[data-listing-runtime-form]");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error("Missing search box listing form");
  }
  return form;
};

const setInputValue = (selector: string, value: string) => {
  const input = document.querySelector(selector);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`Missing input for ${selector}`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
};

const submitForm = (form: HTMLFormElement) => {
  form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
};

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
  document.head.innerHTML = "";
  resetRuntimeFlag();
  window.history.replaceState({}, "", "http://localhost:3000/");
});

test("listing runtime serializes range and date composite controls through the shared query token contract", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-1",
      autoApply: false,
      showSearch: false,
      facets: [
        {
          id: "price",
          kind: "range",
          label: "Price",
          field: "price",
          op: "between",
          presentation: {
            rangeInputMode: "inputs-slider",
            rangeStep: 5,
          },
        },
        {
          id: "published-at",
          kind: "date-range",
          label: "Published at",
          field: "publishedAt",
          op: "between",
          presentation: {
            dateInputMode: "native-date",
          },
        },
      ],
      resolved: {
        listingQueryId: "query-1",
        metrics: [
          {
            id: "price",
            kind: "range",
            label: "Price",
            token: "price.between",
            options: [],
            range: { min: 0, max: 100, active: null },
          },
          {
            id: "published-at",
            kind: "date-range",
            label: "Published at",
            token: "publishedAt.between",
            options: [],
            range: { min: null, max: null, active: null },
          },
        ],
      },
    })
  );

  setInputValue('[data-listing-range-part="min"]', "10");
  setInputValue('[data-listing-range-part="max"]', "40");
  setInputValue('[data-listing-date-part="start"]', "2026-01-01");
  setInputValue('[data-listing-date-part="end"]', "2026-01-31");

  submitForm(form);
  await flush();

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected listing runtime fetch call.");
  }
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("lq.query-1.price.between")).toBe("10,40");
  expect(requestUrl.searchParams.get("lq.query-1.publishedAt.between")).toBe(
    "2026-01-01,2026-01-31"
  );
});

test("listing runtime filters searchable option lists without mutating query params", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-2",
      autoApply: false,
      facets: [
        {
          id: "category",
          kind: "taxonomy",
          label: "Category",
          field: "category",
          op: "in",
          presentation: {
            controlMode: "searchable",
          },
          options: [
            { value: "houses", label: "Houses" },
            { value: "modern", label: "Modern", parentValue: "houses" },
            { value: "cabins", label: "Cabins" },
          ],
        },
      ],
      resolved: {
        listingQueryId: "query-2",
        metrics: [
          {
            id: "category",
            kind: "taxonomy",
            label: "Category",
            token: "category.in",
            options: [
              { value: "houses", label: "Houses", count: 4, active: false },
              {
                value: "modern",
                label: "Modern",
                count: 2,
                active: false,
                parentValue: "houses",
              },
              { value: "cabins", label: "Cabins", count: 1, active: false },
            ],
            range: null,
          },
        ],
      },
    })
  );

  setInputValue('[data-listing-option-search="1"]', "modern");

  const options = Array.from(document.querySelectorAll('[data-listing-searchable-option="1"]')).map(
    (node) => ({
      text: (node.textContent ?? "").trim(),
      hidden: (node as HTMLElement).hidden,
    })
  );

  expect(options).toEqual([
    { text: "Houses4", hidden: true },
    { text: "Modern2", hidden: false },
    { text: "Cabins1", hidden: true },
  ]);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("listing runtime clear-all preserves unrelated params and removes only the current namespace", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
  window.history.replaceState(
    {},
    "",
    "http://localhost:3000/?foo=bar&lq.query-3.__q=loft&lq.query-3.status.in=published&lq.other.__q=keep"
  );

  installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-3",
      autoApply: false,
      facets: [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "status",
          op: "in",
          options: [{ value: "published", label: "Published" }],
        },
      ],
      resolved: {
        listingQueryId: "query-3",
        searchQuery: "loft",
        metrics: [
          {
            id: "status",
            kind: "checkbox",
            label: "Status",
            token: "status.in",
            options: [{ value: "published", label: "Published", count: 2, active: true }],
            range: null,
          },
        ],
      },
    })
  );

  const clearButton = document.querySelector('[data-listing-clear-all="1"]');
  expect(clearButton).toBeInstanceOf(HTMLButtonElement);
  clearButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  await flush();

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected listing runtime clear-all fetch call.");
  }
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("foo")).toBe("bar");
  expect(requestUrl.searchParams.get("lq.other.__q")).toBe("keep");
  expect(requestUrl.searchParams.get("lq.query-3.__q")).toBeNull();
  expect(requestUrl.searchParams.get("lq.query-3.status.in")).toBeNull();
});

test("listing runtime submit removes stale __page when filters change", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
  window.history.replaceState(
    {},
    "",
    "http://localhost:3000/?lq.query-3.__page=4&lq.query-3.__q=loft&lq.other.__page=2"
  );

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-3",
      autoApply: false,
      facets: [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "status",
          op: "in",
          options: [{ value: "published", label: "Published" }],
        },
      ],
      resolved: {
        listingQueryId: "query-3",
        searchQuery: "loft",
        metrics: [
          {
            id: "status",
            kind: "checkbox",
            label: "Status",
            token: "status.in",
            options: [{ value: "published", label: "Published", count: 2, active: false }],
            range: null,
          },
        ],
      },
    })
  );

  const checkbox = form.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  expect(checkbox).toBeTruthy();
  if (!checkbox) {
    throw new Error("Expected listing filter checkbox.");
  }
  checkbox.checked = true;
  submitForm(form);
  await flush();

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected listing runtime submit fetch call.");
  }
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("lq.query-3.__page")).toBeNull();
  expect(requestUrl.searchParams.get("lq.query-3.__q")).toBe("loft");
  expect(requestUrl.searchParams.get("lq.query-3.status.in")).toBe("published");
  expect(requestUrl.searchParams.get("lq.other.__page")).toBe("2");
});

test("listing runtime submit serializes configured aliases and clears stale alias state", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
  window.history.replaceState(
    {},
    "",
    "http://localhost:3000/?rooms=2&page=4&lq.query-3.__page=4&lq.other.__page=2"
  );

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-3",
      autoApply: false,
      showSearch: false,
      aliases: {
        rooms: "data.rooms.in",
        page: "__page",
      },
      facets: [
        {
          id: "rooms",
          kind: "checkbox",
          label: "Rooms",
          field: "data.rooms",
          op: "in",
          options: [{ value: "3", label: "Three" }],
        },
      ],
      resolved: {
        listingQueryId: "query-3",
        metrics: [
          {
            id: "rooms",
            kind: "checkbox",
            label: "Rooms",
            token: "data.rooms.in",
            options: [{ value: "3", label: "Three", count: 2, active: false }],
            range: null,
          },
        ],
      },
    })
  );

  const checkbox = form.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  expect(checkbox?.name).toBe("rooms");
  if (!checkbox) {
    throw new Error("Expected listing filter checkbox.");
  }
  checkbox.checked = true;
  submitForm(form);
  await flush();

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected listing runtime submit fetch call.");
  }
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("rooms")).toBe("3");
  expect(requestUrl.searchParams.get("page")).toBeNull();
  expect(requestUrl.searchParams.get("lq.query-3.__page")).toBeNull();
  expect(requestUrl.searchParams.get("lq.query-3.data.rooms.in")).toBeNull();
  expect(requestUrl.searchParams.get("lq.other.__page")).toBe("2");
});

test("search box listing mode keeps the shared listing runtime submit contract after listing-filters changes", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const form = installSearchBoxRuntime({
    ...searchBoxDefaults,
    mode: "listing",
    listingQueryId: "query-4",
    autoApply: false,
  });

  setInputValue('[data-listing-widget="search-box"] input[data-listing-token="__q"]', "studio");
  submitForm(form);
  await flush();

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected search box listing fetch call.");
  }
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("lq.query-4.__q")).toBe("studio");
});

test("horizontal listing-filters variant keeps the shared listing runtime submit contract", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(document.body.innerHTML, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-5",
      autoApply: false,
      facets: [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "status",
          op: "in",
          options: [{ value: "published", label: "Published" }],
        },
      ],
    }),
    "listing-filters-horizontal",
    "horizontal"
  );

  const checkbox = document.querySelector(
    '[data-listing-widget="listing-filters"][data-listing-variant="horizontal"] input[type="checkbox"]'
  );
  expect(checkbox).toBeInstanceOf(HTMLInputElement);
  (checkbox as HTMLInputElement).checked = true;
  submitForm(form);
  await flush();

  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) {
    throw new Error("Expected horizontal listing runtime fetch call.");
  }
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("lq.query-5.status.in")).toBe("published");
});

test("listing runtime rebinds a replaced listing-filters form for subsequent submits", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        `
          <section data-listing-widget="listing-filters" data-listing-block-id="listing-filters-rebind" data-listing-query-id="query-5b">
            <form data-listing-runtime-form data-listing-query-id="query-5b" data-listing-auto-apply="0">
              <input name="lq.query-5b.__q" data-listing-token="__q" value="first" />
              <p data-listing-runtime-loading="1" hidden>Loading</p>
              <p data-listing-runtime-error="1" hidden>Error</p>
            </form>
          </section>
        `,
        { status: 200, headers: { "Content-Type": "text/html" } }
      )
    )
    .mockResolvedValueOnce(
      new Response(document.body.innerHTML, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-5b",
      autoApply: false,
    }),
    "listing-filters-rebind"
  );

  setInputValue('[data-listing-widget="listing-filters"] input[data-listing-token="__q"]', "first");
  submitForm(form);
  await flush();

  const reboundForm = document.querySelector(
    '[data-listing-widget="listing-filters"] form[data-listing-runtime-form]'
  );
  expect(reboundForm).toBeInstanceOf(HTMLFormElement);

  setInputValue(
    '[data-listing-widget="listing-filters"] input[data-listing-token="__q"]',
    "second"
  );
  submitForm(reboundForm as HTMLFormElement);
  await flush();

  expect(fetchMock).toHaveBeenCalledTimes(2);
  const secondCall = fetchMock.mock.calls[1] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(secondCall).toBeDefined();
  if (!secondCall) {
    throw new Error("Expected rebound listing runtime fetch call.");
  }
  const requestUrl = new URL(String(secondCall[0]));
  expect(requestUrl.searchParams.get("lq.query-5b.__q")).toBe("second");
});

test("listing runtime shows local error markers instead of redirecting on recoverable refresh failures", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response("nope", { status: 500 });
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;
  const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => undefined);

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-6",
      autoApply: false,
      facets: [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "status",
          op: "in",
          options: [{ value: "published", label: "Published" }],
        },
      ],
    })
  );

  submitForm(form);
  await flush();

  expect(assignSpy).not.toHaveBeenCalled();
  expect(form.getAttribute("aria-busy")).toBe("false");
  expect(
    (document.querySelector('[data-listing-runtime-error="1"]') as HTMLElement | null)?.hidden
  ).toBe(false);
  expect(
    (document.querySelector('[data-listing-runtime-loading="1"]') as HTMLElement | null)?.hidden
  ).toBe(true);
});

test("listing runtime keeps only the latest response across listing-filters, content-list, and entry-teaser blocks", async () => {
  const firstRequest = createDeferred<Response>();
  const secondRequest = createDeferred<Response>();
  const fetchMock = vi
    .fn()
    .mockImplementationOnce(() => firstRequest.promise)
    .mockImplementationOnce(() => secondRequest.promise);
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  const form = installListingFiltersRuntime(
    normalizeListingFiltersData({
      listingQueryId: "query-7",
      autoApply: false,
      facets: [
        {
          id: "status",
          kind: "checkbox",
          label: "Status",
          field: "status",
          op: "in",
          options: [{ value: "published", label: "Published" }],
        },
      ],
    }),
    "listing-filters-stale"
  );

  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <section data-listing-widget="content-list" data-listing-block-id="content-list-stale" data-listing-query-id="query-7">
        <p data-runtime-label="content-list">old content list</p>
      </section>
      <section data-listing-widget="entry-teaser" data-listing-block-id="entry-teaser-stale" data-listing-query-id="query-7">
        <p data-runtime-label="entry-teaser">old entry teaser</p>
      </section>
    `
  );

  setInputValue('[data-listing-widget="listing-filters"] input[data-listing-token="__q"]', "first");
  submitForm(form);
  expect(form.getAttribute("aria-busy")).toBe("true");

  setInputValue(
    '[data-listing-widget="listing-filters"] input[data-listing-token="__q"]',
    "second"
  );
  submitForm(form);

  secondRequest.resolve(
    new Response(
      `
        <section data-listing-widget="listing-filters" data-listing-block-id="listing-filters-stale" data-listing-query-id="query-7">
          <form data-listing-runtime-form data-listing-query-id="query-7" data-listing-auto-apply="0">
            <input data-listing-token="__q" value="second" />
            <p data-listing-runtime-loading="1" hidden>Loading</p>
            <p data-listing-runtime-error="1" hidden>Error</p>
          </form>
        </section>
        <section data-listing-widget="content-list" data-listing-block-id="content-list-stale" data-listing-query-id="query-7">
          <p data-runtime-label="content-list">new content list</p>
        </section>
        <section data-listing-widget="entry-teaser" data-listing-block-id="entry-teaser-stale" data-listing-query-id="query-7">
          <p data-runtime-label="entry-teaser">new entry teaser</p>
        </section>
      `,
      { status: 200, headers: { "Content-Type": "text/html" } }
    )
  );
  await flush();

  firstRequest.resolve(
    new Response(
      `
        <section data-listing-widget="listing-filters" data-listing-block-id="listing-filters-stale" data-listing-query-id="query-7">
          <form data-listing-runtime-form data-listing-query-id="query-7" data-listing-auto-apply="0">
            <input data-listing-token="__q" value="first" />
            <p data-listing-runtime-loading="1" hidden>Loading</p>
            <p data-listing-runtime-error="1" hidden>Error</p>
          </form>
        </section>
        <section data-listing-widget="content-list" data-listing-block-id="content-list-stale" data-listing-query-id="query-7">
          <p data-runtime-label="content-list">stale content list</p>
        </section>
        <section data-listing-widget="entry-teaser" data-listing-block-id="entry-teaser-stale" data-listing-query-id="query-7">
          <p data-runtime-label="entry-teaser">stale entry teaser</p>
        </section>
      `,
      { status: 200, headers: { "Content-Type": "text/html" } }
    )
  );
  await flush();

  expect(document.querySelector('[data-runtime-label="content-list"]')?.textContent).toBe(
    "new content list"
  );
  expect(document.querySelector('[data-runtime-label="entry-teaser"]')?.textContent).toBe(
    "new entry teaser"
  );
  expect(
    (
      document.querySelector(
        '[data-listing-widget="listing-filters"] form'
      ) as HTMLFormElement | null
    )?.getAttribute("aria-busy")
  ).toBe("false");
});

test("listing runtime intercepts pager links and fetch-swaps the bound listing blocks (TASK-459-03)", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(
      '<html><body><section data-listing-query-id="query-9" data-listing-block-id="block-9"><p data-listing-swapped="1">Page two item</p></section></body></html>',
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  });
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  resetRuntimeFlag();
  window.history.replaceState({}, "", "http://localhost:3000/catalog");
  document.body.innerHTML = [
    '<section data-listing-query-id="query-9" data-listing-block-id="block-9">',
    '<p data-listing-item="1">Page one item</p>',
    '<nav><a href="?lq.query-9.__page=2" data-listing-page-link="1">2</a></nav>',
    "</section>",
  ].join("");
  const { getListingRuntimeClientScript } =
    await import("../../../core/widgets/core/listingRuntimeScript");
  // eslint-disable-next-line no-eval
  eval(getListingRuntimeClientScript());

  const pagerLink = document.querySelector('[data-listing-query-id] [data-listing-page-link="1"]');
  if (!(pagerLink instanceof HTMLAnchorElement)) throw new Error("Missing pager link");
  const pagerClick = new MouseEvent("click", { bubbles: true, cancelable: true });
  pagerLink.dispatchEvent(pagerClick);
  await flush();

  // The click was intercepted: the listing block fetch-swapped in place and
  // the URL carries the lq page token through pushState.
  expect(pagerClick.defaultPrevented).toBe(true);
  const firstCall = fetchMock.mock.calls[0] as unknown as
    | [RequestInfo | URL, RequestInit?]
    | undefined;
  expect(firstCall).toBeDefined();
  if (!firstCall) throw new Error("Expected pager fetch call.");
  const requestUrl = new URL(String(firstCall[0]));
  expect(requestUrl.searchParams.get("lq.query-9.__page")).toBe("2");
  expect(document.querySelector('[data-listing-swapped="1"]')?.textContent).toBe("Page two item");
  expect(window.location.search).toContain("lq.query-9.__page=2");
  // The harness resets the window once-guard per test, so earlier evals leave
  // their document-level click listeners behind — every observed fetch must
  // still target the SAME pager URL (production binds exactly once).
  expect(new Set((fetchMock.mock.calls as unknown[][]).map((call) => String(call[0]))).size).toBe(
    1
  );
  // Legacy (cl.*) pagers have no data-listing-query-id ancestor: the handler
  // returns before preventDefault, keeping the plain server navigation —
  // pinned by the Bun runtime suite (legacy pages ship no script at all).
});
