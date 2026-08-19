// @vitest-environment happy-dom
//
// TASK-105-04 listings wave, LEAF A2 — ListingFilters wizard editor slice
// (split target). Split from `listing-filters-editor-wave.test.tsx` with the
// shared `listingFiltersEditorFixtures` mock world; assertions are unchanged.

import React, { useState } from "react";
import { expect, test, vi } from "vitest";

import type { ListingFiltersData } from "../../../core/widgets/core/listingFilters";
import {
  clickByText,
  clickElement,
  findInputsByPlaceholder,
  findSectionByTitle,
  findSelectsByOptions,
  flush,
  getListingFiltersState,
  mount,
  setSelectValue,
  writablePaths,
} from "./listingFiltersEditorFixtures";

const listingFiltersState = getListingFiltersState();

test("ListingFilters editor modes expose non-overlapping writable ownership metadata", async () => {
  const { ListingFiltersAdvancedEditor, ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const baseValue: ListingFiltersData = {
    listingQueryId: "query-1",
    title: "Filter results",
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "status",
        op: "in",
        options: [{ value: "published", label: "Published" }],
      },
    ],
  };

  const wizard = mount(
    <ListingFiltersWizardEditor value={baseValue} onChange={() => undefined} variant="default" />
  );
  const visual = mount(
    <ListingFiltersVisualEditor value={baseValue} onChange={() => undefined} variant="default" />
  );
  const advanced = mount(
    <ListingFiltersAdvancedEditor value={baseValue} onChange={() => undefined} variant="default" />
  );

  try {
    await flush();

    const wizardPaths = writablePaths(wizard.container);
    const visualPaths = writablePaths(visual.container);
    const advancedPaths = writablePaths(advanced.container);
    const allPaths = [...wizardPaths, ...visualPaths, ...advancedPaths];
    const duplicatePaths = allPaths.filter((path, index) => allPaths.indexOf(path) !== index);

    expect(wizardPaths).toEqual(
      expect.arrayContaining([
        "listingQueryId",
        "facets.0.kind",
        "facets.0.sortOptions.0.field",
        "facets.0.sortOptions.0.dir",
        "facets.1.field",
        "facets.1.op",
      ])
    );
    expect(wizardPaths).not.toContain("facets.0.id");
    expect(wizardPaths).not.toContain("facets.0.sortOptions.0.value");
    expect(wizardPaths).not.toContain("facets.1.options.0.value");
    expect(visualPaths).toEqual(
      expect.arrayContaining([
        "variant",
        "layout.maxWidth",
        "title",
        "showSearch",
        "style.frameBackground",
        "facets.0.order",
        "facets.0.label",
        "facets.0.sortOptions.0.label",
        "facets.1.label",
        "facets.1.options.0.label",
      ])
    );
    expect(visualPaths).not.toContain("listingQueryId");
    expect(wizardPaths).not.toContain("style.frameBackground");
    expect(advancedPaths).toEqual([]);
    expect(duplicatePaths).toEqual([]);
    expect(visual.container.querySelector('input[aria-label="Frame background value"]')).toBeNull();
    expect(advanced.container.querySelector("textarea")).toBeNull();
  } finally {
    wizard.cleanup();
    visual.cleanup();
    advanced.cleanup();
  }
});

test("ListingFilters wizard editor covers loading state, query reset, field suggestions, kind-scoped operators, structured rows, preview, and removal", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const onChangeSpy = vi.fn();
  let latestValue: ListingFiltersData = {
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
      {
        id: "status",
        kind: "checkbox",
        label: "Status",
        field: "status",
        op: "in",
        options: [],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);

    const handleChange = (next: ListingFiltersData) => {
      latestValue = next;
      onChangeSpy(next);
      setValue(next);
    };

    return <ListingFiltersWizardEditor value={value} onChange={handleChange} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    expect(view.container.textContent).toContain("Loading listing queries...");
    await flush();

    const querySection = findSectionByTitle(view.container, "Listing query source");
    const facetsSection = findSectionByTitle(view.container, "Facet setup");
    expect(querySection).toBeTruthy();
    expect(facetsSection).toBeTruthy();

    const querySelect = findSelectsByOptions(querySection!, ["__no_listing_query__", "query-1"])[0];
    React.act(() => {
      setSelectValue(querySelect, "query-1");
    });
    await flush();
    expect(latestValue.listingQueryId).toBe("query-1");
    expect(facetsSection?.textContent).toContain(
      "Choose from fields available in the selected listing query."
    );

    React.act(() => {
      setSelectValue(querySelect, "__no_listing_query__");
    });
    expect(latestValue.listingQueryId).toBe("");

    React.act(() => {
      setSelectValue(querySelect, "query-1");
    });
    await flush();

    expect(findInputsByPlaceholder(facetsSection as HTMLElement, "facet-id")).toHaveLength(0);

    let kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    React.act(() => {
      setSelectValue(kindSelects[1], "radio");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("radio");
    expect(latestValue.facets?.[1]?.op).toBe("eq");

    const addedFacet = facetsSection?.querySelector(
      '[data-widget-control="listing-filters.facet.1"]'
    ) as HTMLElement | null;
    expect(addedFacet).toBeTruthy();

    React.act(() => {
      const fieldSelects = findSelectsByOptions(addedFacet as HTMLElement, [
        "id",
        "title",
        "updatedAt",
        "__custom_field__",
      ]);
      const fieldSelect = fieldSelects[fieldSelects.length - 1] as HTMLSelectElement;
      expect(Array.from(fieldSelect.options).map((option) => option.value)).not.toContain(
        "__no_field__"
      );
      setSelectValue(fieldSelect, "title");
    });
    expect(latestValue.facets?.[1]?.field).toBe("title");

    let operatorSelects = findSelectsByOptions(facetsSection!, ["eq", "neq"]);
    expect(
      Array.from((operatorSelects[0] as HTMLSelectElement).options).map((option) => option.value)
    ).toEqual(["eq", "neq"]);
    React.act(() => {
      setSelectValue(operatorSelects[0], "neq");
    });
    expect(latestValue.facets?.[1]?.op).toBe("neq");

    React.act(() => {
      setSelectValue(operatorSelects[0], "__unsupported__");
    });
    expect(latestValue.facets?.[1]?.op).toBe("neq");

    expect(findInputsByPlaceholder(facetsSection as HTMLElement, "Option value")).toHaveLength(0);
    expect(facetsSection?.textContent).toContain(
      "Option values come from listing data or a safe configured option list."
    );
    expect(facetsSection?.textContent).toContain(
      "Options will appear when listing data resolves or a safe option list is configured."
    );
    expect(facetsSection?.textContent).not.toContain("support-owned");
    expect(facetsSection?.textContent).not.toContain("Re-open setup to add option rows");
    expect(facetsSection?.textContent).toContain("Preview");

    kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    React.act(() => {
      setSelectValue(kindSelects[1], "__unsupported__");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("checkbox");
    expect(latestValue.facets?.[1]?.op).toBe("in");

    kindSelects = findSelectsByOptions(facetsSection!, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);
    React.act(() => {
      setSelectValue(kindSelects[1], "sort");
    });
    expect(latestValue.facets?.[1]?.kind).toBe("sort");
    expect(latestValue.facets?.[1]?.field).toBeUndefined();
    expect(facetsSection?.textContent).toContain("Sort options choose their own listing fields.");
    expect(facetsSection?.textContent).toContain("Sort does not use filter operators.");
    expect(facetsSection?.textContent).toContain(
      "Add a sort choice that visitors can select, then choose the listing field and direction."
    );
    expect(facetsSection?.textContent).not.toContain("pipe-delimited");
    const addSortOptionButton = addedFacet?.querySelector(
      '[data-widget-control="listing-filters.facet.1.sort-option.add"]'
    );
    clickElement(addSortOptionButton);

    React.act(() => {
      const sortFieldSelects = findSelectsByOptions(addedFacet as HTMLElement, [
        "__no_field__",
        "id",
        "title",
        "updatedAt",
      ]);
      setSelectValue(sortFieldSelects[sortFieldSelects.length - 1], "title");
    });
    React.act(() => {
      const directionCandidates = findSelectsByOptions(addedFacet as HTMLElement, [
        "__no_sort_direction__",
        "asc",
        "desc",
      ]);
      setSelectValue(directionCandidates[directionCandidates.length - 1], "asc");
    });
    expect(latestValue.facets?.[1]?.sortOptions).toEqual([
      {
        value: "title:asc",
        label: "",
        field: "title",
        dir: "asc",
      },
    ]);

    const removeButton = addedFacet?.querySelector(
      '[data-widget-control="listing-filters.facet.1.remove"]'
    );
    clickElement(removeButton);
    expect(latestValue.facets).toHaveLength(1);
    expect(onChangeSpy).toHaveBeenCalled();
  } finally {
    view.cleanup();
  }
});

test("ListingFilters wizard preserves read-only custom field bindings until replaced", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    listingQueryId: "query-1",
    facets: [
      {
        id: "legacy",
        kind: "checkbox",
        label: "Legacy facet",
        field: "metadata.custom.path",
        op: "in",
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);
    return (
      <ListingFiltersWizardEditor
        value={value}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
        variant="default"
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    expect(facetsSection.textContent).toContain("A custom field binding is already configured.");
    expect(facetsSection.textContent).toContain("preserve the existing binding");
    expect(facetsSection.textContent).not.toContain("configured by support");
    expect(facetsSection.textContent).not.toContain("metadata.custom.path");

    const fieldSelects = findSelectsByOptions(facetsSection, [
      "id",
      "title",
      "updatedAt",
      "__custom_field__",
    ]);
    expect(fieldSelects).toHaveLength(1);

    const fieldSelect = fieldSelects[0] as HTMLSelectElement;
    expect(Array.from(fieldSelect.options).map((option) => option.value)).not.toContain(
      "__no_field__"
    );

    React.act(() => {
      setSelectValue(fieldSelect, "__no_field__");
    });
    expect(latestValue.facets?.[0]?.field).toBe("metadata.custom.path");

    React.act(() => {
      setSelectValue(fieldSelect, "title");
    });
    expect(latestValue.facets?.[0]?.field).toBe("title");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors show fallback text for non-API query loading failures", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  listingFiltersState.queryError = new Error("boom");

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return <ListingFiltersWizardEditor value={value} onChange={setValue} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Failed to load listing queries.");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters editors retry one transient auth-shaped query loading failure", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  listingFiltersState.queryFailuresBeforeSuccess = 1;

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>({} as ListingFiltersData);
    return <ListingFiltersWizardEditor value={value} onChange={setValue} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    await React.act(async () => {
      await new Promise((resolve) => globalThis.setTimeout(resolve, 0));
    });
    await flush();
    expect(view.container.textContent).not.toContain("Not authenticated");
    expect(view.container.textContent).toContain("Select a listing query");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters wizard editor keeps draft facets visible and surfaces local validation feedback", async () => {
  const { ListingFiltersWizardEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    facets: [
      {
        id: "sort",
        kind: "sort",
        label: "Sort",
        sortOptions: [
          {
            value: "updatedAt:desc",
            label: "Newest first",
            field: "updatedAt",
            dir: "desc",
          },
        ],
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);

    const handleChange = (next: ListingFiltersData) => {
      latestValue = next;
      setValue(next);
    };

    return <ListingFiltersWizardEditor value={value} onChange={handleChange} variant="default" />;
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain(
      "Select a listing query to enable canvas preview and facet mapping."
    );

    const querySection = findSectionByTitle(view.container, "Listing query source") as HTMLElement;
    const querySelect = findSelectsByOptions(querySection, ["__no_listing_query__", "query-1"])[0];
    React.act(() => {
      setSelectValue(querySelect, "query-1");
    });
    await flush();

    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    clickByText(facetsSection, "Add facet");
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(facetsSection.textContent).toContain("Choose a listing field for this facet.");

    const kindSelects = findSelectsByOptions(facetsSection, [
      "checkbox",
      "radio",
      "taxonomy",
      "range",
      "date-range",
      "sort",
    ]);

    React.act(() => {
      setSelectValue(kindSelects[1], "radio");
    });

    expect(latestValue.facets).toHaveLength(2);
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(facetsSection.textContent).toContain("Generated automatically");

    React.act(() => {
      const fieldSelects = findSelectsByOptions(facetsSection, [
        "__no_field__",
        "id",
        "title",
        "updatedAt",
      ]);
      setSelectValue(fieldSelects[fieldSelects.length - 1], "title");
    });

    expect(facetsSection.textContent).not.toContain("Choose a listing field for this facet.");
    expect(latestValue.facets?.[1]).toEqual(
      expect.objectContaining({
        id: "facet-2",
        field: "title",
      })
    );

    clickByText(facetsSection, "Add facet");
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(facetsSection.textContent).not.toContain("Duplicate facet ID");
  } finally {
    view.cleanup();
  }
});
