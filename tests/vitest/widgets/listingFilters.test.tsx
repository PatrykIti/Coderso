import React from "react";
import type { ComponentType } from "react";
import { expect, test } from "vitest";
import { renderToString } from "react-dom/server";

import {
  ListingFiltersAdvancedEditor,
  ListingFiltersVisualEditor,
  ListingFiltersWizardEditor,
} from "../../../core/admin/ui/widgets/editors/ListingFiltersEditors";
import {
  ListingFiltersBlock,
  createListingFiltersWidget,
  listingFiltersDefaults,
  normalizeListingFiltersData,
  type ListingFiltersData,
} from "../../../core/widgets/core/listingFilters";
import { clearWidgets, registerWidget } from "../../../core/widgets/registry";
import { validateWidgetEditorContract } from "../../../core/widgets/editorContract";
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ListingFiltersData>> = () => null;

test("listing filters renders placeholder when listing query is missing", () => {
  const html = renderToString(
    <ListingFiltersBlock data={listingFiltersDefaults} variant="default" />
  );

  expect(html).toContain("Select a listing query");
  expect(html).toContain('data-listing-widget="listing-filters"');
  expect(html).toContain('aria-label="Listing filters configuration"');
});

test("listing filters renders resolved facets and runtime markers", () => {
  const html = renderToString(
    <ListingFiltersBlock
      variant="default"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-1",
        facets: [
          {
            id: "status",
            kind: "checkbox",
            label: "Status",
            field: "status",
            op: "in",
            options: [
              { value: "published", label: "Published" },
              { value: "draft", label: "Draft" },
            ],
          },
        ],
        resolved: {
          listingQueryId: "listing-query-1",
          searchQuery: "release",
          metrics: [
            {
              id: "status",
              kind: "checkbox",
              label: "Status",
              token: "status.in",
              options: [
                { value: "published", label: "Published", count: 8, active: true },
                { value: "draft", label: "Draft", count: 2, active: false },
              ],
              range: null,
            },
          ],
        },
      })}
      blockId="listing-filters-1"
    />
  );

  expect(html).toContain("Status");
  expect(html).toContain("Published");
  expect(html).toContain('data-listing-block-id="listing-filters-1"');
  expect(html).toContain('data-listing-query-id="listing-query-1"');
});

test("listing filters exposes accessible section, form, and search semantics", () => {
  const html = renderToString(
    <ListingFiltersBlock
      variant="default"
      blockId="filters-a11y"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-a11y",
        title: "Property filters",
        searchLabel: "Find listings",
        searchPlaceholder: "Search properties",
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
      })}
    />
  );

  const titleId = "listing-filters-filters-a11y-title";
  const searchId = "listing-filters-filters-a11y-search";
  expect(html).toMatch(
    new RegExp(
      `<section(?=[^>]*data-listing-widget="listing-filters")(?=[^>]*aria-labelledby="${titleId}")`
    )
  );
  expect(html).toMatch(
    new RegExp(
      `<form(?=[^>]*data-listing-runtime-form="true")(?=[^>]*aria-labelledby="${titleId}")`
    )
  );
  expect(html).toContain(`id="${titleId}"`);
  expect(html).toContain(`for="${searchId}"`);
  expect(html).toContain(`id="${searchId}"`);
  expect(html).toContain('type="search"');
  expect(html).toMatch(/auto[Cc]omplete="off"/);
});

test("listing filters explains empty option-backed facets in the main canvas", () => {
  const html = renderToString(
    <ListingFiltersBlock
      variant="default"
      blockId="filters-empty-options"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-empty-options",
        facets: [
          {
            id: "status",
            kind: "checkbox",
            label: "Status",
            field: "status",
            op: "in",
          },
          {
            id: "type",
            kind: "radio",
            label: "Type",
            field: "type",
            op: "eq",
          },
          {
            id: "category",
            kind: "taxonomy",
            label: "Category",
            field: "category",
            op: "in",
          },
        ],
        resolved: {
          listingQueryId: "listing-query-empty-options",
          metrics: [
            {
              id: "status",
              kind: "checkbox",
              label: "Status",
              token: "status.in",
              options: [],
              range: null,
            },
          ],
        },
      })}
    />
  );

  expect(html.match(/data-listing-empty-options="1"/g)).toHaveLength(3);
  expect(html).toContain("No matching options are available from the selected listing data yet.");
  expect(html).toContain(
    "Options will appear when listing data resolves or a safe option list is configured."
  );
  expect(html).not.toContain('type="radio"');
});

test("listing filters renders range, date, searchable taxonomy, active summary, and runtime status anchors", () => {
  const html = renderToString(
    <ListingFiltersBlock
      variant="default"
      data={normalizeListingFiltersData({
        listingQueryId: "listing-query-2",
        autoApply: true,
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
            ],
          },
        ],
        resolved: {
          listingQueryId: "listing-query-2",
          searchQuery: "modern",
          metrics: [
            {
              id: "price",
              kind: "range",
              label: "Price",
              token: "price.between",
              options: [],
              range: { min: 0, max: 100, active: [10, 40] },
            },
            {
              id: "published-at",
              kind: "date-range",
              label: "Published at",
              token: "publishedAt.between",
              options: [],
              range: { min: null, max: null, active: ["2026-01-01", "2026-01-31"] },
            },
            {
              id: "category",
              kind: "taxonomy",
              label: "Category",
              token: "category.in",
              options: [
                { value: "houses", label: "Houses", count: 3, active: false },
                {
                  value: "modern",
                  label: "Modern",
                  count: 1,
                  active: true,
                  parentValue: "houses",
                },
              ],
              range: null,
            },
          ],
        },
      })}
    />
  );

  expect(html).toContain('data-listing-composite-kind="range"');
  expect(html).toContain('data-listing-composite-kind="date-range"');
  expect(html).toContain('data-listing-searchable-options="1"');
  expect(html).toContain('data-listing-clear-all="1"');
  expect(html).toContain('data-listing-runtime-loading="1"');
  expect(html).toContain("4");
  expect(html).toContain("active");
  expect(html).toContain("filters");
  expect(html).toContain('type="range"');
  expect(html).toContain('type="date"');
});

test("listing filters falls back to configured query id when resolved query id is blank", () => {
  const html = renderToString(
    <ListingFiltersBlock
      variant="default"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-1",
        resolved: {
          listingQueryId: "",
          metrics: [],
        },
      })}
    />
  );

  expect(html).toContain('data-listing-query-id="listing-query-1"');
  expect(html).not.toContain("Select a listing query");
});

test("listing filters renders sidebar and drawer variants with bounded layout controls", () => {
  const sidebarHtml = renderToString(
    <ListingFiltersBlock
      variant="sidebar"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-3",
        layout: {
          maxWidth: "narrow",
          stickySidebar: true,
          collapsibleFacets: true,
          defaultCollapsed: true,
        },
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
          listingQueryId: "listing-query-3",
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
      })}
    />
  );

  expect(sidebarHtml).toContain('data-listing-variant="sidebar"');
  expect(sidebarHtml).toContain("max-w-3xl");
  expect(sidebarHtml).toContain("md:sticky md:top-6");
  expect(sidebarHtml).toContain("<details");

  const drawerHtml = renderToString(
    <ListingFiltersBlock
      variant="drawer"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-4",
        layout: {
          maxWidth: "content",
          collapsibleFacets: true,
          defaultCollapsed: true,
        },
      })}
    />
  );

  expect(drawerHtml).toContain('data-listing-variant="drawer"');
  expect(drawerHtml).toContain("Filters panel");
  expect(drawerHtml).toContain("max-w-5xl");
});

test("listing filters cleared frame style omits decorative shell and action background", () => {
  const html = renderToString(
    <ListingFiltersBlock
      variant="default"
      data={normalizeListingFiltersData({
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-1",
        style: {},
        resolved: {
          listingQueryId: "listing-query-1",
        },
      })}
    />
  );

  expect(html).not.toContain("bg-[var(--color-bg)]/80");
  expect(html).not.toContain("bg-[var(--color-primary)]");
});

test("listing filters validator accepts runtime metrics payload", () => {
  clearWidgets();
  registerWidget(
    createListingFiltersWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "listing-filters-1",
      type: "listing-filters",
      variant: "default",
      data: {
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-1",
        resolved: {
          listingQueryId: "listing-query-1",
          metrics: [
            {
              id: "status",
              kind: "checkbox",
              label: "Status",
              token: "status.in",
              options: [{ value: "published", label: "Published", count: 1, active: false }],
              range: null,
            },
          ],
          rejectedTokens: ["status.invalid"],
        },
      },
    })
  ).not.toThrow();

  clearWidgets();
});

test("listing filters validator accepts presentation metadata for range, date, and taxonomy controls", () => {
  clearWidgets();
  registerWidget(
    createListingFiltersWidget({
      wizard: StubEditor,
      visual: StubEditor,
      advanced: StubEditor,
    })
  );

  expect(() =>
    normalizeWidgetBlock({
      id: "listing-filters-advanced",
      type: "listing-filters",
      variant: "default",
      data: {
        ...listingFiltersDefaults,
        listingQueryId: "listing-query-1",
        facets: [
          {
            id: "price",
            kind: "range",
            label: "Price",
            field: "price",
            op: "between",
            presentation: {
              rangeInputMode: "inputs-slider",
              rangeStep: 10,
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
            ],
          },
        ],
      },
    })
  ).not.toThrow();

  clearWidgets();
});

test("listing filters normalization stays strict for persisted duplicate and incomplete facets", () => {
  const normalized = normalizeListingFiltersData({
    ...listingFiltersDefaults,
    facets: [
      {
        id: "Status Filter",
        kind: "checkbox",
        label: "Status",
        field: "",
        op: "in",
      },
      {
        id: "Status Filter",
        kind: "checkbox",
        label: "Status",
        field: "status",
        op: "in",
        options: [{ value: "published", label: "Published" }],
      },
    ],
  });

  expect(normalized.facets).toEqual([
    {
      id: "status-filter",
      kind: "checkbox",
      label: "Status",
      field: "status",
      op: "in",
      options: [{ value: "published", label: "Published" }],
    },
  ]);
});

test("listing filters editors render expected sections", () => {
  const wizard = renderToString(
    <ListingFiltersWizardEditor
      value={listingFiltersDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(wizard).toContain("Listing query source");
  expect(wizard).toContain("Facet setup");
  expect(wizard).not.toContain("Filter copy and behavior");

  const visual = renderToString(
    <ListingFiltersVisualEditor
      value={listingFiltersDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(visual).toContain("Filter copy and behavior");
  expect(visual).toContain("Facet presentation");
  expect(visual).not.toContain("Listing query source");

  const advanced = renderToString(
    <ListingFiltersAdvancedEditor
      value={listingFiltersDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(advanced).toContain("Source and facets summary");
  expect(advanced).toContain("Runtime status");
  expect(advanced).toContain("Contract summary");
  expect(advanced).not.toContain("Add facet");
});

test("listing filters widget declares a strict editor ownership contract", () => {
  const widget = createListingFiltersWidget({
    wizard: StubEditor,
    visual: StubEditor,
    advanced: StubEditor,
  });
  const validation = validateWidgetEditorContract(widget, { requireContract: true });

  expect(validation.valid).toBe(true);
  expect(widget.editorCapabilities?.visualOwnsVariantSelection).toBe(true);
  expect(widget.editorContract?.sections.map((section) => section.id)).toEqual([
    "listing-filters.wizard.query-source",
    "listing-filters.wizard.facet-setup",
    "listing-filters.visual.variant-layout",
    "listing-filters.visual.copy-behavior",
    "listing-filters.visual.surface",
    "listing-filters.visual.facet-presentation",
    "listing-filters.advanced.source-summary",
    "listing-filters.advanced.runtime-diagnostics",
    "listing-filters.advanced.runtime-status",
    "listing-filters.advanced.contract-summary",
  ]);
});
