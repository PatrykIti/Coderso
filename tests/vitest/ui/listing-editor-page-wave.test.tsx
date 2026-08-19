// @vitest-environment happy-dom
//
// TASK-105-04 listings wave, LEAF A2 — ListingEditorPage slice (split target).
// Re-homes the editor tests from the former `listings-cluster-wave.test.tsx`
// under the shared `listingsClusterFixtures` mock world. New coverage adds the
// save-failure alert, the non-API load-failure fallback, and the dirty/draft
// badge lifecycle with discard restore.

import React from "react";
import { expect, test, vi } from "vitest";
import {
  clickButtonByText,
  findInputByPlaceholder,
  findInputsByPlaceholder,
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

test("ListingEditorPage edits query state, previews normalized payload, discards changes, saves, and refreshes from cache bus", async () => {
  window.history.replaceState({}, "", "/admin/advanced/listings/query-1");
  const { ListingEditorPage } = await import("../../../core/admin/ui/listings/ListingEditorPage");

  const view = mount(<ListingEditorPage />);

  try {
    await flush();

    // TASK-479-16-L02: editor header is the restyled PageHeader (title = query name)
    // inside the rounded-2xl "Listing editor" frame; the ad-hoc "Edit listing query"
    // heading was replaced.
    expect(view.container.textContent).toContain("Listing editor");
    expect(view.container.textContent).toContain("Homepage listing");
    expect(listingsState.getDetailCalls).toContainEqual({ id: "query-1", force: true });

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Homepage featured cards"),
        "Homepage cards"
      );
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional context for editors."),
        "Updated cards"
      );
    });

    const sourceSelect = findSelectByOptions(view.container, [
      "entries",
      "posts",
      "users",
      "taxonomies",
    ]);
    React.act(() => {
      setSelectValue(sourceSelect, "posts");
    });
    expect(view.container.textContent).toContain("Uses the default post content type mapping.");

    const includeDraftsSelect = findSelectByOptions(view.container, ["no", "yes"]);
    React.act(() => {
      setSelectValue(includeDraftsSelect, "yes");
    });

    clickButtonByText(view.container, "Add filter");
    clickButtonByText(view.container, "Add sort");

    const sortFieldInputs = Array.from(view.container.querySelectorAll("input")).filter(
      (element) =>
        element instanceof HTMLInputElement && element.getAttribute("placeholder") === "sort field"
    );
    const numericInputs = Array.from(view.container.querySelectorAll("input")).filter(
      (element) => element instanceof HTMLInputElement && element.getAttribute("type") === "number"
    );
    const fieldsTextarea = findTextareaByPlaceholder(view.container, "id, title, slug, status");
    const templateSelect = findSelectByOptions(view.container, ["__none__", "template-1"]);

    React.act(() => {
      setInputValue(
        findInputsByPlaceholder(view.container, "field path (e.g. status)").at(-1),
        "category"
      );
      setSelectValue(
        findSelectsByOptions(view.container, [
          "eq",
          "neq",
          "lt",
          "lte",
          "gt",
          "gte",
          "contains",
          "in",
          "nin",
          "between",
          "exists",
        ]).at(-1),
        "in"
      );
      setInputValue(sortFieldInputs.at(-1), "title");
      setSelectValue(findSelectsByOptions(view.container, ["asc", "desc"]).at(-1), "asc");
      setInputValue(numericInputs[0], "24");
      setInputValue(numericInputs[1], "5");
      setTextareaValue(fieldsTextarea, "id, title, slug");
      setSelectValue(templateSelect, "template-1");
    });
    await flush();

    React.act(() => {
      setInputValue(
        findInputsByPlaceholder(view.container, "value (comma separated for arrays)").at(-1),
        "featured, news"
      );
    });

    clickButtonByText(view.container, "Run preview");
    await flush();

    expect(listingsState.previewQueryCalls.at(-1)).toEqual({
      source: "posts",
      sourceConfig: { includeDrafts: true },
      filters: [
        { field: "status", op: "eq", value: "published" },
        { field: "category", op: "in", value: ["featured", "news"] },
      ],
      sort: [
        { field: "updatedAt", dir: "desc" },
        { field: "title", dir: "asc" },
      ],
      pagination: { limit: 24, offset: 5 },
      fields: ["id", "title", "slug"],
    });
    // TASK-479-16-L02: the canvas header shows the bound-query result count badge
    // ("Bound query · N results"); the resolved rows stay inspectable in the cards.
    expect(view.container.textContent).toContain("Bound query");
    expect(view.container.textContent).toContain("1 results");
    expect(view.container.textContent).toContain("Preview row");

    clickButtonByText(view.container, "Discard");
    await flush();

    clickButtonByText(view.container, "Save query");
    await flush();

    expect(listingsState.updateQueryCalls[0]).toEqual({
      id: "query-1",
      input: {
        name: "Homepage listing",
        description: "Homepage cards",
        query: listingsState.detailResult.query,
      },
    });

    listingsState.detailResult = {
      ...listingsState.detailResult,
      name: "Remote listing",
      description: "Remote cards",
    };

    await React.act(async () => {
      for (const subscriber of listingsState.subscribers) {
        subscriber({ key: "listingQueryDetail:query-1" });
      }
      await Promise.resolve();
    });

    expect(view.container.textContent).toContain("Remote listing");

    clickButtonByText(view.container, "Back to list");
    expect(listingsState.navigateCalls).toContain("/advanced/listings");
  } finally {
    view.cleanup();
  }
});

test("ListingEditorPage create mode creates queries and reports preview/load errors", async () => {
  const { ListingEditorPage } = await import("../../../core/admin/ui/listings/ListingEditorPage");

  window.history.replaceState({}, "", "/admin/advanced/listings/new");
  const createView = mount(<ListingEditorPage />);

  try {
    await flush();

    expect(createView.container.textContent).toContain("New listing query");
    expect(createView.container.textContent).toContain("No filters yet.");

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(createView.container, "Homepage featured cards"),
        "Taxonomy query"
      );
      setTextareaValue(
        findTextareaByPlaceholder(createView.container, "Optional context for editors."),
        "Taxonomy listing"
      );
    });

    React.act(() => {
      setSelectValue(
        findSelectByOptions(createView.container, ["entries", "posts", "users", "taxonomies"]),
        "taxonomies"
      );
    });

    React.act(() => {
      setInputValue(findInputByPlaceholder(createView.container, "taxonomy-id"), "categories");
    });

    listingsState.previewQueryError = listingsState.apiError("Preview failed");

    clickButtonByText(createView.container, "Run preview");
    await flush();

    expect(createView.container.textContent).toContain("Preview failed");

    listingsState.previewQueryError = null;
    listingsState.previewListingQueryResult = {
      total: 0,
      rows: [],
    };

    clickButtonByText(createView.container, "Save query");
    await flush();

    expect(listingsState.createQueryCalls[0]).toEqual({
      name: "Taxonomy query",
      description: "Taxonomy listing",
      query: expect.objectContaining({
        source: "taxonomies",
        sourceConfig: { taxonomyId: "categories" },
        filters: [],
        sort: [{ field: "updatedAt", dir: "desc" }],
        pagination: { limit: 12, offset: 0 },
        fields: expect.arrayContaining(["id", "title"]),
      }),
    });
    expect(listingsState.navigateCalls).toContain("/advanced/listings/created-query");
  } finally {
    createView.cleanup();
  }

  listingsState.reset();
  listingsState.detailError = listingsState.apiError("Detail failed");
  window.history.replaceState({}, "", "/admin/advanced/listings/query-1");

  const errorView = mount(<ListingEditorPage />);

  try {
    await flush();
    expect(errorView.container.textContent).toContain("Listing query error");
    expect(errorView.container.textContent).toContain("Detail failed");
  } finally {
    errorView.cleanup();
  }
});

test("ListingEditorPage reports query-not-found and generic preview failures", async () => {
  window.history.replaceState({}, "", "/admin/advanced/listings/query-1");
  const { ListingEditorPage } = await import("../../../core/admin/ui/listings/ListingEditorPage");

  listingsState.detailResult = null as unknown as typeof listingsState.detailResult;
  const missingView = mount(<ListingEditorPage />);

  try {
    await flush();

    expect(missingView.container.textContent).toContain("Listing query error");
    expect(missingView.container.textContent).toContain("Listing query not found.");
  } finally {
    missingView.cleanup();
  }

  listingsState.reset();
  listingsState.previewQueryError = new Error("boom");
  window.history.replaceState({}, "", "/admin/advanced/listings/new");

  const previewErrorView = mount(<ListingEditorPage />);

  try {
    await flush();

    clickButtonByText(previewErrorView.container, "Run preview");
    await flush();

    expect(previewErrorView.container.textContent).toContain("Failed to run listing preview.");
  } finally {
    previewErrorView.cleanup();
  }
});

test("ListingEditorPage surfaces update save failures in the error alert", async () => {
  window.history.replaceState({}, "", "/admin/advanced/listings/query-1");
  const { ListingEditorPage } = await import("../../../core/admin/ui/listings/ListingEditorPage");
  const { updateListingQuery } = await import("@/services/listingsClient");

  const view = mount(<ListingEditorPage />);

  try {
    await flush();

    vi.mocked(updateListingQuery).mockRejectedValueOnce(listingsState.apiError("Save failed"));
    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Homepage featured cards"),
        "Renamed cards"
      );
    });
    clickButtonByText(view.container, "Save query");
    await flush();

    expect(view.container.textContent).toContain("Listing query error");
    expect(view.container.textContent).toContain("Save failed");
  } finally {
    view.cleanup();
  }
});

test("ListingEditorPage falls back to the generic message for non-API load failures", async () => {
  window.history.replaceState({}, "", "/admin/advanced/listings/query-1");
  const { ListingEditorPage } = await import("../../../core/admin/ui/listings/ListingEditorPage");

  listingsState.detailError = new Error("boom");
  const view = mount(<ListingEditorPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Listing query error");
    expect(view.container.textContent).toContain("Failed to load listing query.");
  } finally {
    view.cleanup();
  }
});

test("ListingEditorPage marks drafts dirty and restores the snapshot on discard", async () => {
  window.history.replaceState({}, "", "/admin/advanced/listings/query-1");
  const { ListingEditorPage } = await import("../../../core/admin/ui/listings/ListingEditorPage");

  const view = mount(<ListingEditorPage />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Homepage listing · saved");
    expect(view.container.textContent).not.toContain("Unsaved changes");

    React.act(() => {
      setInputValue(
        findInputByPlaceholder(view.container, "Homepage featured cards"),
        "Draft name"
      );
    });
    expect(view.container.textContent).toContain("Unsaved changes");
    expect(view.container.textContent).toContain("draft");

    clickButtonByText(view.container, "Discard");
    expect(view.container.textContent).toContain("Homepage listing · saved");
    expect(view.container.textContent).not.toContain("Unsaved changes");
  } finally {
    view.cleanup();
  }
});
