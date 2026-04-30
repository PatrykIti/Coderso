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
import { normalizeWidgetBlock } from "../../../core/widgets/validator";
import type { WidgetEditorProps } from "../../../core/widgets/types";

const StubEditor: ComponentType<WidgetEditorProps<ListingFiltersData>> = () => null;

test("listing filters renders placeholder when listing query is missing", () => {
  const html = renderToString(
    <ListingFiltersBlock data={listingFiltersDefaults} variant="default" />
  );

  expect(html).toContain("Select a listing query");
  expect(html).toContain('data-listing-widget="listing-filters"');
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

test("listing filters editors render expected sections", () => {
  const wizard = renderToString(
    <ListingFiltersWizardEditor
      value={listingFiltersDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(wizard).toContain("Listing query");
  expect(wizard).toContain("Runtime behavior");

  const visual = renderToString(
    <ListingFiltersVisualEditor
      value={listingFiltersDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(visual).toContain("Facet controls");
  expect(visual).toContain("Add facet");

  const advanced = renderToString(
    <ListingFiltersAdvancedEditor
      value={listingFiltersDefaults}
      onChange={() => undefined}
      variant="default"
    />
  );
  expect(advanced).toContain("Runtime payload");
  expect(advanced).toContain("Contract");
});
