// @vitest-environment happy-dom
//
// TASK-105-04 listings wave, LEAF A2 — ListingListPage slice (split target).
//
// Re-homes the former `listings-cluster-wave.test.tsx` list-page tests plus the
// tracked `listing-list-page-wave.test.tsx` list-page coverage under one shared
// mock world (`listingsClusterFixtures`). Assertions are preserved: active-tab
// routing, query-param tab, confirm-gated deletes with force refresh, tab-scoped
// bulk delete, dual load errors, and the pure filter helpers. New coverage adds
// query/template search narrowing with empty-filter states, single + bulk delete
// failure paths, and the useListingTemplates cache/force/error contract.

import React from "react";
import { expect, test, vi } from "vitest";
import {
  clickButtonByText,
  findInputByPlaceholder,
  findSelectByOptions,
  findSelectsByOptions,
  findTextareaByPlaceholder,
  flush,
  getListingsState,
  mount,
  setInputValue,
  setSelectValue,
  setTextareaValue,
} from "./listingsClusterFixtures";

const listingsState = getListingsState();

const clickByLabel = (container: HTMLElement, label: string) => {
  const button = Array.from(container.querySelectorAll("button")).find(
    (candidate) => candidate.getAttribute("aria-label") === label
  );
  if (!button) {
    throw new Error(`Missing labelled button: ${label}`);
  }
  React.act(() => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
};

// Full async settle: flushes the complete delete -> refresh -> summary chain
// that spans several awaited service calls, not just the microtask queue.
const settle = async () => {
  await React.act(async () => {
    await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
  });
};

test("ListingListPage routes active-tab New through the shell", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    clickButtonByText(view.container, "New");
    expect(listingsState.navigateCalls).toContain("/advanced/listings/new");

    clickButtonByText(view.container, "Templates");
    expect(listingsState.navigateCalls).toContain("/advanced/listings?tab=templates");

    clickButtonByText(view.container, "New");
    expect(view.container.textContent).toContain("New listing template");
    expect(listingsState.navigateCalls).toHaveLength(2);
  } finally {
    view.cleanup();
  }
});

test("ListingListPage opens templates tab from query params", async () => {
  window.history.replaceState({}, "", "/admin/advanced/listings?tab=templates");
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Cards");
    expect(view.container.textContent).toContain("/cards");
    expect(view.container.textContent).not.toContain("Article listing");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage controls template create, edit, delete, and save errors", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    const buttons = () => Array.from(view.container.querySelectorAll("button"));

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Templates"))
        ?.click();
    });
    expect(view.container.textContent).toContain("Cards");

    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("New"))
        ?.click();
    });
    expect(view.container.textContent).toContain("New listing template");
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage cards"), "Homepage cards");
      setInputValue(findInputByPlaceholder(view.container, "homepage-cards"), "homepage-cards");
      setSelectValue(
        findSelectsByOptions(view.container, ["grid", "list", "table", "calendar", "map"]).at(-1),
        "list"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional description for your team"),
        "Homepage template"
      );
    });
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "add-binding")
        ?.click();
    });
    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Save template"))
        ?.click();
    });
    await flush();

    expect(listingsState.createTemplateCalls[0]).toEqual(
      expect.objectContaining({
        name: "Homepage cards",
        slug: "homepage-cards",
        description: "Homepage template",
        layout: "list",
        config: expect.objectContaining({
          fields: [{ key: "title", source: "title", label: "Title" }],
        }),
      })
    );
    expect(listingsState.listTemplateCalls).toContain(true);

    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Edit")
        ?.click();
    });
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage cards"), "Cards updated");
      setInputValue(findInputByPlaceholder(view.container, "homepage-cards"), "cards-updated");
      setSelectValue(
        findSelectsByOptions(view.container, ["grid", "list", "table", "calendar", "map"]).at(-1),
        "grid"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional description for your team"),
        "Updated template"
      );
    });
    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Save template"))
        ?.click();
    });
    await flush();

    expect(listingsState.updateTemplateCalls[0]).toEqual({
      id: "template-1",
      input: expect.objectContaining({
        name: "Cards updated",
        slug: "cards-updated",
        description: "Updated template",
        layout: "grid",
      }),
    });

    listingsState.saveTemplateError = listingsState.apiError("Template save failed");
    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("New"))
        ?.click();
    });
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Homepage cards"), "Broken template");
      buttons()
        .find((button) => button.textContent?.includes("Save template"))
        ?.click();
    });
    await flush();

    expect(view.container.textContent).toContain("Template save failed");

    listingsState.saveTemplateError = null;
    listingsState.deleteTemplateError = listingsState.apiError("Template delete failed");
    React.act(() => {
      buttons()
        .find((button) => button.textContent === "Delete")
        ?.click();
    });
    expect(listingsState.deleteTemplateCalls).not.toContain("template-1");
    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Delete template"))
        ?.click();
    });
    await flush();

    expect(listingsState.deleteTemplateCalls).toContain("template-1");
    expect(view.container.textContent).toContain("Template delete failed");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage shows template loading, empty, and load-error states", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");

  listingsState.cachedTemplateItems = undefined;
  listingsState.templateItems = [];
  const emptyView = mount(<ListingListPage />);

  try {
    clickButtonByText(emptyView.container, "Templates");
    expect(emptyView.container.textContent).toContain("Loading listing templates...");
    await flush();
    expect(emptyView.container.textContent).toContain("No listing templates yet.");
  } finally {
    emptyView.cleanup();
  }

  listingsState.reset();
  listingsState.cachedTemplateItems = undefined;
  listingsState.templateItems = [];
  listingsState.templateError = listingsState.apiError("Templates load failed");

  const errorView = mount(<ListingListPage />);

  try {
    clickButtonByText(errorView.container, "Templates");
    await flush();
    expect(errorView.container.textContent).toContain("Unable to load listing templates");
    expect(errorView.container.textContent).toContain("Templates load failed");
  } finally {
    errorView.cleanup();
  }
});

test("ListingListPage deletes queries behind confirmation and refreshes", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Listings");
    expect(view.container.textContent).toContain("Article listing");

    const buttons = () => Array.from(view.container.querySelectorAll("button"));
    React.act(() => {
      // TASK-479-16-L01: query records are cards now; delete is an icon button with
      // an aria-label "Delete listing query: <name>".
      buttons()
        .find((button) =>
          (button.getAttribute("aria-label") ?? "").startsWith("Delete listing query")
        )
        ?.click();
    });
    expect(listingsState.deleteQueryCalls).not.toContain("11111111-1111-4111-8111-111111111111");
    React.act(() => {
      buttons()
        .find((button) => button.textContent?.includes("Delete query"))
        ?.click();
    });
    await flush();
    expect(listingsState.deleteQueryCalls).toContain("11111111-1111-4111-8111-111111111111");
    // The delete handler refreshes the query list with force + background after
    // the authoritative delete commits.
    expect(listingsState.listQueryCalls).toContain(true);
  } finally {
    view.cleanup();
  }
});

test("ListingListPage scopes bulk delete to the active tab", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    clickByLabel(view.container, "Select Articles");
    expect(view.container.textContent).toContain("Selected 1");

    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["delete"]), "delete");
    });
    clickButtonByText(view.container, "Apply");
    clickButtonByText(view.container, "Delete selected");
    await flush();

    expect(listingsState.deleteQueryCalls).toContain("11111111-1111-4111-8111-111111111111");
    expect(listingsState.deleteTemplateCalls).not.toContain("template-1");

    clickButtonByText(view.container, "Templates");
    clickByLabel(view.container, "Select Cards");
    expect(view.container.textContent).toContain("Selected 1");
    React.act(() => {
      setSelectValue(findSelectByOptions(view.container, ["delete"]), "delete");
    });
    clickButtonByText(view.container, "Apply");
    clickButtonByText(view.container, "Delete selected");
    await flush();

    expect(listingsState.deleteTemplateCalls).toContain("template-1");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage renders load errors from both listing hooks", async () => {
  listingsState.queryError = listingsState.apiError("Queries failed.");
  listingsState.templateError = listingsState.apiError("Templates failed.");
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Unable to load listing queries");
    expect(view.container.textContent).toContain("Queries failed.");
    expect(view.container.textContent).toContain("Unable to load listing templates");
    expect(view.container.textContent).toContain("Templates failed.");
  } finally {
    view.cleanup();
  }
});

test("Listings filter helpers narrow query and template resources", async () => {
  const { filterListingQueries, filterListingTemplates } =
    await import("../../../core/admin/ui/listings/ListingListPage");
  const queryId = "11111111-1111-4111-8111-111111111111";

  expect(
    filterListingQueries(listingsState.queryItems, "article", "all").map((item) => item.id)
  ).toEqual([queryId]);
  expect(filterListingQueries(listingsState.queryItems, "missing", "all")).toEqual([]);
  expect(
    filterListingQueries(listingsState.queryItems, "", "entries").map((item) => item.id)
  ).toEqual([queryId]);
  expect(filterListingQueries(listingsState.queryItems, "", "posts")).toEqual([]);

  expect(
    filterListingTemplates(listingsState.templateItems, "cards", "all").map((item) => item.id)
  ).toEqual(["template-1"]);
  expect(filterListingTemplates(listingsState.templateItems, "cards", "list")).toEqual([]);
  expect(
    filterListingTemplates(listingsState.templateItems, "card", "grid").map((item) => item.id)
  ).toEqual(["template-1"]);
});

test("ListingListPage narrows query cards by search and shows the empty-filter state", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    expect(view.container.textContent).toContain("Article listing");
    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Search queries by name..."), "zzz");
    });
    expect(view.container.textContent).toContain("No listing queries match your current filters.");
    expect(view.container.textContent).not.toContain("Article listing");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage narrows templates by search and layout with empty-filter state", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const view = mount(<ListingListPage />);

  try {
    clickButtonByText(view.container, "Templates");
    expect(view.container.textContent).toContain("/cards");

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Search templates by name..."), "zzz");
    });
    expect(view.container.textContent).toContain(
      "No listing templates match your current filters."
    );
    expect(view.container.textContent).not.toContain("/cards");

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Search templates by name..."), "");
      setSelectValue(
        findSelectByOptions(view.container, ["all", "grid", "list", "table", "calendar", "map"]),
        "list"
      );
    });
    expect(view.container.textContent).toContain(
      "No listing templates match your current filters."
    );
  } finally {
    view.cleanup();
  }
});

test("useListingTemplates hydrates from cache, refreshes with force, and reports load errors", async () => {
  const { useListingTemplates } =
    await import("../../../core/admin/ui/listings/hooks/useListingTemplates");

  const Harness = () => {
    const { items, isLoading, error, refresh } = useListingTemplates();
    return (
      <div>
        <span>{`items:${items.length}`}</span>
        <span>{`loading:${isLoading}`}</span>
        <span>{`error:${error ?? "none"}`}</span>
        <button type="button" onClick={() => void refresh({ force: true })}>
          refresh-force
        </button>
      </div>
    );
  };

  const view = mount(<Harness />);

  try {
    // Cache hit: hydrated items render without a loading state.
    expect(view.container.textContent).toContain("items:1");
    expect(view.container.textContent).toContain("loading:false");
    await flush();
    expect(view.container.textContent).toContain("error:none");

    // Force refresh reaches the cached list contract.
    clickButtonByText(view.container, "refresh-force");
    await flush();
    expect(listingsState.listTemplateCalls).toContain(true);

    // Load failure resolves into the hook error string.
    listingsState.templateError = new Error("Templates load failed");
    clickButtonByText(view.container, "refresh-force");
    await flush();
    expect(view.container.textContent).toContain("error:Templates load failed");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage reports bulk delete failures inline", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const { deleteListingQuery } = await import("@/services/listingsClient");
  const view = mount(<ListingListPage />);

  try {
    const applyBulkDelete = () => {
      clickButtonByText(view.container, "Apply");
      clickButtonByText(view.container, "Delete selected");
    };
    const selectRowAndDelete = () => {
      clickByLabel(view.container, "Select Articles");
      React.act(() => {
        setSelectValue(findSelectByOptions(view.container, ["delete"]), "delete");
      });
      applyBulkDelete();
    };

    selectRowAndDelete();
    await settle();
    expect(listingsState.deleteQueryCalls).toHaveLength(1);

    // A rejected delete keeps the selection and surfaces the bulk failure
    // summary inline (the success path cleared the selection).
    vi.mocked(deleteListingQuery).mockRejectedValueOnce(new Error("boom"));
    selectRowAndDelete();
    await settle();
    expect(view.container.textContent).toContain("Failed to delete 1 listing query.");

    // A refresh failure after commit surfaces the fallback action error. The
    // selection and delete action persist from the previous failed bulk run.
    listingsState.queryError = listingsState.apiError("Bulk query delete failed");
    applyBulkDelete();
    await settle();
    expect(view.container.textContent).toContain("Bulk query delete failed");
  } finally {
    view.cleanup();
  }
});

test("ListingListPage reports single query delete failures inline", async () => {
  const { ListingListPage } = await import("../../../core/admin/ui/listings/ListingListPage");
  const { deleteListingQuery } = await import("@/services/listingsClient");
  const view = mount(<ListingListPage />);

  try {
    vi.mocked(deleteListingQuery).mockRejectedValueOnce(
      listingsState.apiError("Query delete failed")
    );
    const deleteButton = Array.from(view.container.querySelectorAll("button")).find((button) =>
      (button.getAttribute("aria-label") ?? "").startsWith("Delete listing query")
    );
    React.act(() => {
      deleteButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    clickButtonByText(view.container, "Delete query");
    await flush();

    expect(view.container.textContent).toContain("Query delete failed");
  } finally {
    view.cleanup();
  }
});
