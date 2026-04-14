export type AssistantResourceCatalogBudget = {
  maxItemsPerGroup: number;
  maxFieldsPerResource: number;
  truncated: boolean;
};

export type AssistantResourceFieldSummary = {
  name: string;
  type: string;
  required: boolean;
  label: string | null;
  orderIndex: number | null;
};

export type AssistantContentTypeSummary = {
  id: string;
  slug: string;
  name: string;
  entryCount: number | null;
  fields: AssistantResourceFieldSummary[];
};

export type AssistantCustomScreenBindingSummary = {
  widgetId: string;
  field: string;
  propPath: string;
  mode: "read" | "write" | "readwrite";
};

export type AssistantCustomScreenSummary = {
  id: string;
  name: string;
  contentTypeId: string;
  status: "draft" | "active" | "unknown";
  showInSidebar: boolean;
  sidebarLabel: string | null;
  writableBindingFields: string[];
  bindings: AssistantCustomScreenBindingSummary[];
};

export type AssistantListingSortSummary = {
  field: string;
  dir: "asc" | "desc";
};

export type AssistantListingQuerySummary = {
  id: string;
  name: string;
  description: string | null;
  source: string;
  contentTypeId: string | null;
  taxonomyId: string | null;
  includeDrafts: boolean;
  fields: string[];
  sort: AssistantListingSortSummary[];
  limit: number | null;
};

export type AssistantListingTemplateSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  layout: string;
  configKeys: string[];
};

export type AssistantFormSummary = {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  submissionAccess: string;
  fields: AssistantResourceFieldSummary[];
};

export type AssistantMenuItemSummary = {
  id: string;
  label: string;
  href: string | null;
  pageId: string | null;
  parentId: string | null;
  orderIndex: number;
  depth: number;
};

export type AssistantMenuSummary = {
  id: string;
  name: string;
  location: string | null;
  itemCount: number;
  items: AssistantMenuItemSummary[];
};

export type AssistantSeoDocumentSummary = {
  id: string;
  targetType: "page" | "entry";
  targetId: string;
  targetTitle: string | null;
  slug: string | null;
  title: string | null;
  status: string;
};

export type AssistantWidgetSlotSummary = {
  id: string;
  label: string;
  kind: "fixed" | "repeatable";
  allowedTypes: string[];
  minItems: number | null;
  maxItems: number | null;
};

export type AssistantWidgetSummary = {
  id: string;
  source: "core" | "template";
  name: string;
  description: string | null;
  category: string;
  module: string;
  complexity: string;
  audience: string;
  variants: string[];
  slots: AssistantWidgetSlotSummary[];
  surfaces: string[];
  requires: string[];
  status: "draft" | "published";
};

export type AssistantResourceCatalogSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  budget: AssistantResourceCatalogBudget;
  contentTypes: AssistantContentTypeSummary[];
  customScreens: AssistantCustomScreenSummary[];
  listings: {
    queries: AssistantListingQuerySummary[];
    templates: AssistantListingTemplateSummary[];
  };
  forms: AssistantFormSummary[];
  menus: AssistantMenuSummary[];
  seoDocuments: AssistantSeoDocumentSummary[];
  widgets: AssistantWidgetSummary[];
  warnings: string[];
};
