// @vitest-environment happy-dom
//
// TASK-105-04 listings wave, LEAF A2 — ListingFilters advanced editor slice
// (split target). Split from `listing-filters-editor-wave.test.tsx` with the
// shared `listingFiltersEditorFixtures` mock world; assertions are unchanged.

import React, { useState } from "react";
import { expect, test, vi } from "vitest";

import type { ListingFiltersData } from "../../../core/widgets/core/listingFilters";
import {
  clickByText,
  clickElement,
  findInputByPlaceholder,
  findSectionByTitle,
  findSelectsByOptions,
  findTextareaByPlaceholder,
  flush,
  getListingFiltersState,
  mount,
  setInputValue,
  setSelectValue,
  setTextareaValue,
} from "./listingFiltersEditorFixtures";

const listingFiltersState = getListingFiltersState();

test("ListingFilters editors cover listing query selection, runtime behavior, safe facet setup, and runtime summaries", async () => {
  const { ListingFiltersAdvancedEditor, ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const onChangeSpy = vi.fn();

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return (
      <>
        <ListingFiltersWizardEditor
          value={value}
          variant="default"
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
        />
        <ListingFiltersVisualEditor
          value={value}
          variant="default"
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
        />
        <ListingFiltersAdvancedEditor
          value={value}
          variant="default"
          onChange={(next) => {
            onChangeSpy(next);
            setValue(next);
          }}
        />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    expect(view.container.textContent).toContain("Listing query source");
    expect(view.container.textContent).toContain("Facet setup");
    expect(view.container.textContent).toContain("Runtime diagnostics");
    expect(view.container.textContent).toContain("Runtime status");

    React.act(() => {
      setSelectValue(
        findSelectsByOptions(view.container, ["__no_listing_query__", "query-1"])[0],
        "query-1"
      );
      setInputValue(findInputByPlaceholder(view.container, "Filter results"), "Filter panel");
      setTextareaValue(
        findTextareaByPlaceholder(view.container, "Optional helper text."),
        "Narrow down entries"
      );
      setInputValue(findInputByPlaceholder(view.container, "Search"), "Search label");
      setInputValue(
        findInputByPlaceholder(view.container, "Search results..."),
        "Search within results"
      );
      setInputValue(findInputByPlaceholder(view.container, "Apply filters"), "Run filters");
    });

    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    const behaviorSection = findSectionByTitle(
      view.container,
      "Filter copy and behavior"
    ) as HTMLElement;
    const switches = Array.from(behaviorSection.querySelectorAll("input[type='checkbox']"));
    clickElement(switches[0]);
    clickElement(switches[1]);

    clickByText(facetsSection, "Add facet");
    React.act(() => {
      const fieldSelects = findSelectsByOptions(facetsSection, [
        "__no_field__",
        "id",
        "title",
        "updatedAt",
      ]);
      setSelectValue(fieldSelects[fieldSelects.length - 1], "title");
    });

    const lastPayload = onChangeSpy.mock.lastCall?.[0];
    expect(lastPayload).toEqual(
      expect.objectContaining({
        listingQueryId: "query-1",
        title: "Filter panel",
        description: "Narrow down entries",
        searchLabel: "Search label",
        searchPlaceholder: "Search within results",
        applyLabel: "Run filters",
        showSearch: false,
        autoApply: false,
      })
    );
    expect(view.container.textContent).not.toContain('"resolved"');
    expect(view.container.querySelector("textarea[readonly]")).toBeNull();
    expect(view.container.textContent).toContain("_docs/_WIDGETS/LISTING_FILTERS.md");
    expect(view.container.textContent).toContain("Preview");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors surface listing query loading errors", async () => {
  const { ListingFiltersAdvancedEditor, ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  listingFiltersState.queryError = {
    name: "ApiClientError",
    message: "Listing queries failed",
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return (
      <>
        <ListingFiltersWizardEditor value={value} onChange={setValue} variant="default" />
        <ListingFiltersVisualEditor value={value} onChange={setValue} variant="default" />
        <ListingFiltersAdvancedEditor value={value} onChange={setValue} variant="default" />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Listing queries failed");
  } finally {
    view.cleanup();
  }
});
