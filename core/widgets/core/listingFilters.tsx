import type { ComponentType } from "react";

import type { WidgetDefinition, WidgetEditorContract, WidgetEditorProps } from "../types";
import {
  listingFiltersDefaults,
  listingFiltersSchema,
  type ListingFiltersData,
} from "./listingFiltersContract";
import { ListingFiltersBlock } from "./listingFiltersRenderer";

export * from "./listingFiltersContract";
export { ListingFiltersBlock, resolveFacetOptionOwnership } from "./listingFiltersRenderer";

export const listingFiltersEditorContract: WidgetEditorContract = {
  version: 2,
  sections: [
    {
      mode: "wizard",
      id: "listing-filters.wizard.query-source",
      title: "Listing query source",
      role: "source",
      writablePaths: ["listingQueryId"],
    },
    {
      mode: "wizard",
      id: "listing-filters.wizard.facet-setup",
      title: "Facet setup",
      role: "setup",
      writablePaths: [
        "facets.kind",
        "facets.field",
        "facets.op",
        "facets.sortOptions.field",
        "facets.sortOptions.dir",
      ],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.variant-layout",
      title: "Variant and layout",
      role: "layout",
      writablePaths: [
        "variant",
        "layout.maxWidth",
        "layout.collapsibleFacets",
        "layout.defaultCollapsed",
        "layout.stickySidebar",
      ],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.copy-behavior",
      title: "Filter copy and behavior",
      role: "content",
      writablePaths: [
        "title",
        "description",
        "searchLabel",
        "searchPlaceholder",
        "applyLabel",
        "showSearch",
        "autoApply",
      ],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.surface",
      title: "Filter surface",
      role: "visual",
      writablePaths: ["style.frameBackground", "style.frameBorderColor", "style.actionBackground"],
    },
    {
      mode: "visual",
      id: "listing-filters.visual.facet-presentation",
      title: "Facet presentation",
      role: "content",
      writablePaths: [
        "facets.order",
        "facets.label",
        "facets.options.label",
        "facets.sortOptions.label",
        "facets.presentation.controlMode",
        "facets.presentation.rangeInputMode",
        "facets.presentation.rangeStep",
        "facets.presentation.dateInputMode",
      ],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.source-summary",
      title: "Source and facets summary",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "listingQueryId",
        "facets",
        "facets.id",
        "facets.kind",
        "facets.field",
        "facets.op",
      ],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.runtime-diagnostics",
      title: "Runtime diagnostics",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: [
        "resolved.listingQueryId",
        "resolved.searchQuery",
        "resolved.rejectedTokens",
        "resolved.error",
      ],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.runtime-status",
      title: "Runtime status",
      role: "diagnostics",
      writablePaths: [],
      readOnlyPaths: ["resolved.metrics"],
    },
    {
      mode: "advanced",
      id: "listing-filters.advanced.contract-summary",
      title: "Contract summary",
      role: "summary",
      writablePaths: [],
    },
  ],
};

export function createListingFiltersWidget(editors: {
  wizard: ComponentType<WidgetEditorProps<ListingFiltersData>>;
  visual: ComponentType<WidgetEditorProps<ListingFiltersData>>;
  advanced: ComponentType<WidgetEditorProps<ListingFiltersData>>;
}): WidgetDefinition<ListingFiltersData> {
  return {
    type: "listing-filters",
    title: "Listing Filters",
    description: "Faceted runtime filters for listing query widgets.",
    category: "content",
    variants: [
      {
        id: "default",
        label: "Default",
        description: "Facet controls bound to URL-synced listing runtime state.",
      },
      {
        id: "horizontal",
        label: "Horizontal",
        description: "A compact filter bar for above-list placement.",
      },
      {
        id: "sidebar",
        label: "Sidebar",
        description: "A narrow aside intended for side-column placement.",
      },
      {
        id: "drawer",
        label: "Drawer",
        description: "A collapsible panel suited to mobile-heavy filter layouts.",
      },
    ],
    schema: listingFiltersSchema,
    defaults: listingFiltersDefaults,
    editor: editors,
    editorCapabilities: {
      visualOwnsVariantSelection: true,
    },
    editorContract: listingFiltersEditorContract,
    render: ListingFiltersBlock,
  };
}
