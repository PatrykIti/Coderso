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

export type AssistantPageSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
};

export type AssistantPostSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
};

export type AssistantEntrySummary = {
  id: string;
  typeId: string;
  title: string;
  slug: string;
  status: string;
  publishedAt: string | null;
  updatedAt: string | null;
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
  collectionRole: "canonical-admin-screen" | "secondary-admin-screen" | null;
  compositionKey: string | null;
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

export type AssistantMediaSummary = {
  id: string;
  title: string;
  originalName: string;
  type: string;
  mimeType: string;
  size: number | null;
  alt: string | null;
  createdAt: string | null;
};

export type AssistantCommerceProductSummary = {
  id: string;
  title: string;
  slug: string;
  status: string;
  currency: string | null;
  priceAmount: number | null;
  stockState: string | null;
  updatedAt: string | null;
};

export type AssistantCommerceCollectionSummary = {
  id: string;
  name: string;
  slug: string;
  productCount: number | null;
  updatedAt: string | null;
};

export type AssistantSolutionKitSummary = {
  id: string;
  title: string;
  shortDescription: string | null;
  recommendedModules: string[];
  features: string[];
};

export type AssistantTemplateSectionReferenceSummary = {
  templateId: string;
  templateName: string | null;
  blockIds: string[];
  paths: string[];
  count: number;
};

export type AssistantReferencedWidgetTemplateBlockSummary = {
  id: string;
  type: string;
  label: string | null;
  path: string;
  childCount: number;
  slotKeys: string[];
  dataKeys: string[];
  templateId: string | null;
  templateName: string | null;
};

export type AssistantReferencedWidgetTemplateSummary = {
  id: string;
  name: string;
  status: string;
  category: string;
  description: string | null;
  blockCount: number;
  blocks: AssistantReferencedWidgetTemplateBlockSummary[];
  settings: {
    wrapperContainer: string | null;
    sectionGap: string | null;
    hasBackgroundMedia: boolean;
  };
  warnings: string[];
};

export type AssistantResourceCatalogSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  budget: AssistantResourceCatalogBudget;
  pages?: AssistantPageSummary[];
  posts?: AssistantPostSummary[];
  entries?: AssistantEntrySummary[];
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
  media?: AssistantMediaSummary[];
  commerce?: {
    products: AssistantCommerceProductSummary[];
    collections: AssistantCommerceCollectionSummary[];
  };
  solutionKits?: AssistantSolutionKitSummary[];
  warnings: string[];
};
