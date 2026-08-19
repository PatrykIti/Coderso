// @vitest-environment happy-dom
//
// TASK-105-04 listings wave, LEAF A2 — ListingFilters visual editor slice
// (split target). Split from `listing-filters-editor-wave.test.tsx` with the
// shared `listingFiltersEditorFixtures` mock world; assertions are unchanged.

import React, { useState } from "react";
import { expect, test, vi } from "vitest";

import type { ListingFiltersData } from "../../../core/widgets/core/listingFilters";
import {
  clickByText,
  clickElement,
  findInputByPlaceholder,
  findInputsByPlaceholder,
  findSectionByTitle,
  findSelectsByOptions,
  flush,
  getListingFiltersState,
  mount,
  normalizeText,
  setInputValue,
  setSelectValue,
} from "./listingFiltersEditorFixtures";

const listingFiltersState = getListingFiltersState();

test("ListingFilters visual editor marks saved action background inactive while auto apply hides manual action", async () => {
  const { ListingFiltersVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");
  const inactiveMessage =
    "Action background saved, inactive while auto apply hides the manual action button.";

  const autoApplyView = mount(
    <ListingFiltersVisualEditor
      value={{
        autoApply: true,
        style: { actionBackground: "#dc2626" },
      }}
      onChange={() => undefined}
      variant="default"
    />
  );

  try {
    await flush();
    const surfaceSection = findSectionByTitle(autoApplyView.container, "Filter surface");
    const actionControl = autoApplyView.container.querySelector(
      '[data-widget-control="listing-filters.visual.action-background"]'
    );
    const swatch = actionControl?.querySelector('input[aria-label="Action background swatch"]');

    expect(normalizeText(surfaceSection?.textContent)).toContain(normalizeText(inactiveMessage));
    expect(actionControl?.textContent).toContain("Selected color");
    expect(swatch).toBeInstanceOf(HTMLInputElement);
    expect((swatch as HTMLInputElement).value).toBe("#dc2626");
  } finally {
    autoApplyView.cleanup();
  }

  const manualApplyView = mount(
    <ListingFiltersVisualEditor
      value={{
        autoApply: false,
        style: { actionBackground: "#dc2626" },
      }}
      onChange={() => undefined}
      variant="default"
    />
  );

  try {
    await flush();
    expect(normalizeText(manualApplyView.container.textContent)).not.toContain(
      normalizeText(inactiveMessage)
    );
  } finally {
    manualApplyView.cleanup();
  }
});

test("ListingFilters editors preserve incomplete facet drafts when visual settings change", async () => {
  const { ListingFiltersVisualEditor, ListingFiltersWizardEditor } =
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

    return (
      <>
        <ListingFiltersWizardEditor value={value} onChange={handleChange} variant="default" />
        <ListingFiltersVisualEditor value={value} onChange={handleChange} variant="default" />
      </>
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();

    const facetsSection = findSectionByTitle(view.container, "Facet setup") as HTMLElement;
    clickByText(facetsSection, "Add facet");
    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);

    React.act(() => {
      setInputValue(findInputByPlaceholder(view.container, "Filter results"), "Filters");
    });

    expect(findInputsByPlaceholder(facetsSection, "facet-id")).toHaveLength(0);
    expect(latestValue.facets).toHaveLength(2);
    expect(view.container.textContent).toContain("Choose a listing field for this facet.");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters visual editor explains empty option facets without promising row creation", async () => {
  const { ListingFiltersVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  const value: ListingFiltersData = {
    listingQueryId: "query-1",
    facets: [
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

  const view = mount(
    <ListingFiltersVisualEditor value={value} onChange={() => undefined} variant="default" />
  );

  try {
    await flush();

    const facetsSection = findSectionByTitle(view.container, "Facet presentation") as HTMLElement;
    expect(facetsSection.textContent).toContain(
      "Options appear after listing data resolves or a safe option list is configured."
    );
    expect(facetsSection.textContent).toContain(
      "Visual can rename existing labels, but it does not create new match values."
    );
    expect(facetsSection.textContent).not.toContain("Re-open setup to add option rows");
    expect(facetsSection.textContent).not.toContain("support-owned");
  } finally {
    view.cleanup();
  }
});

test("ListingFilters visual editor covers taxonomy labels and range/date presentation controls", async () => {
  const { ListingFiltersVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    listingQueryId: "query-1",
    facets: [
      {
        id: "category",
        kind: "taxonomy",
        label: "Category",
        field: "category",
        op: "in",
        options: [{ value: "houses", label: "Houses" }],
      },
      {
        id: "price",
        kind: "range",
        label: "Price",
        field: "price",
        op: "between",
      },
      {
        id: "published-at",
        kind: "date-range",
        label: "Published at",
        field: "publishedAt",
        op: "between",
      },
    ],
  };

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);
    return (
      <ListingFiltersVisualEditor
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

    const facetsSection = findSectionByTitle(view.container, "Facet presentation") as HTMLElement;
    const taxonomyFacet = facetsSection.querySelector(
      '[data-widget-control="listing-filters.facet.0"]'
    ) as HTMLElement | null;
    const rangeFacet = facetsSection.querySelector(
      '[data-widget-control="listing-filters.facet.1"]'
    ) as HTMLElement | null;
    const dateFacet = facetsSection.querySelector(
      '[data-widget-control="listing-filters.facet.2"]'
    ) as HTMLElement | null;

    expect(taxonomyFacet).toBeTruthy();
    expect(rangeFacet).toBeTruthy();
    expect(dateFacet).toBeTruthy();

    React.act(() => {
      const controlModeSelect = findSelectsByOptions(taxonomyFacet as HTMLElement, [
        "inline",
        "searchable",
      ])[0];
      setSelectValue(controlModeSelect, "searchable");
    });
    expect(latestValue.facets?.[0]).toMatchObject({
      presentation: { controlMode: "searchable" },
    });

    React.act(() => {
      setInputValue(
        findInputsByPlaceholder(taxonomyFacet as HTMLElement, "Option label").at(-1),
        "Homes"
      );
    });
    expect(latestValue.facets?.[0]).toMatchObject({
      options: [{ value: "houses", label: "Homes" }],
    });

    React.act(() => {
      const rangeModeSelect = findSelectsByOptions(rangeFacet as HTMLElement, [
        "inputs",
        "inputs-slider",
      ])[0];
      setSelectValue(rangeModeSelect, "inputs");
      setInputValue(
        findInputByPlaceholder(rangeFacet as HTMLElement, "Range step (optional)"),
        "10"
      );
    });
    expect(latestValue.facets?.[1]).toMatchObject({
      presentation: {
        rangeInputMode: "inputs",
        rangeStep: 10,
      },
    });

    React.act(() => {
      const dateModeSelect = findSelectsByOptions(dateFacet as HTMLElement, [
        "native-date",
        "text-fallback",
      ])[0];
      setSelectValue(dateModeSelect, "text-fallback");
    });
    expect(latestValue.facets?.[2]).toMatchObject({
      presentation: {
        dateInputMode: "text-fallback",
      },
    });
  } finally {
    view.cleanup();
  }
});

test("ListingFilters visual editor covers variant, width, and collapsible layout controls", async () => {
  const { ListingFiltersVisualEditor } =
    await import("../../../core/admin/ui/widgets/editors/ListingFiltersEditors");

  let latestValue: ListingFiltersData = {
    listingQueryId: "query-1",
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
  };
  let latestVariant = "default";

  const Harness = () => {
    const [value, setValue] = useState<ListingFiltersData>(latestValue);
    const [variant, setVariant] = useState(latestVariant);
    return (
      <ListingFiltersVisualEditor
        value={value}
        variant={variant}
        onVariantChange={(next) => {
          latestVariant = next;
          setVariant(next);
        }}
        onChange={(next) => {
          latestValue = next;
          setValue(next);
        }}
      />
    );
  };

  const view = mount(<Harness />);

  try {
    await flush();
    expect(view.container.textContent).toContain("Variant and layout");

    const layoutSection = findSectionByTitle(view.container, "Variant and layout") as HTMLElement;
    clickByText(layoutSection, "Sidebar");
    expect(latestVariant).toBe("sidebar");

    React.act(() => {
      const widthSelect = findSelectsByOptions(layoutSection, [
        "narrow",
        "content",
        "wide",
        "full",
      ])[0];
      setSelectValue(widthSelect, "narrow");
    });
    expect(latestValue.layout?.maxWidth).toBe("narrow");

    const switches = Array.from(layoutSection.querySelectorAll('input[type="checkbox"]'));
    expect(switches).toHaveLength(2);
    clickElement(switches[0]);
    expect(latestValue.layout?.collapsibleFacets).toBe(true);

    const refreshedLayoutSection = findSectionByTitle(
      view.container,
      "Variant and layout"
    ) as HTMLElement;
    const refreshedSwitches = Array.from(
      refreshedLayoutSection.querySelectorAll('input[type="checkbox"]')
    );
    expect(refreshedSwitches.length).toBeGreaterThanOrEqual(3);
    clickElement(refreshedSwitches[1]);
    expect(latestValue.layout?.defaultCollapsed).toBe(true);
    clickElement(refreshedSwitches[2]);
    expect(latestValue.layout?.stickySidebar).toBe(true);

    clickByText(refreshedLayoutSection, "Drawer");
    expect(latestVariant).toBe("drawer");
    expect(view.container.textContent).toContain(
      "Drawer uses a native disclosure shell so filters stay usable without extra runtime JS."
    );
  } finally {
    view.cleanup();
  }
});
