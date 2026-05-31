import type { WidgetBlock } from "../../widgets/types";
import type { PageLayoutSettings } from "../pages/layoutSettings";

export const detailPageStatusValues = ["draft", "published"] as const;
export const detailPageRevisionKindValues = ["publish", "autosave"] as const;
export const detailPageMetaFieldValues = ["title", "slug", "publishedAt", "author"] as const;
export const detailPageComputedResolverValues = [
  "detailHref",
  "relatedItems",
  "formContext",
] as const;
export const detailPageBindingTransformValues = [
  "text",
  "number",
  "currency",
  "area",
  "image",
  "gallery",
  "list",
] as const;
export const detailPageRelatedSourceKinds = ["same-content-type", "listing-query"] as const;
export const detailPageIdentityRoles = ["canonical-list-page", "supporting-page"] as const;

export type DetailPageStatus = (typeof detailPageStatusValues)[number];
export type DetailPageRevisionKind = (typeof detailPageRevisionKindValues)[number];
export type DetailPageMetaField = (typeof detailPageMetaFieldValues)[number];
export type DetailPageComputedResolver = (typeof detailPageComputedResolverValues)[number];
export type DetailPageBindingTransform = (typeof detailPageBindingTransformValues)[number];
export type DetailPageRelatedSourceKind = (typeof detailPageRelatedSourceKinds)[number];
export type DetailPageIdentityRole = (typeof detailPageIdentityRoles)[number];
export type DetailPageSchemaVersion = 1;

export type DetailPageSeo = {
  titlePattern?: string | null;
  descriptionField?: string | null;
  imageField?: string | null;
};

export type DetailPageSettings = {
  template: string;
  layout: PageLayoutSettings;
};

export type DetailPageBindingSource =
  | { kind: "entry-field"; field: string }
  | { kind: "entry-meta"; field: DetailPageMetaField }
  | { kind: "computed"; resolver: DetailPageComputedResolver };

export type DetailPageBinding = {
  id: string;
  blockId: string;
  propPath: string;
  source: DetailPageBindingSource;
  fallback?: string | number | boolean | null | Record<string, unknown>;
  transform?: DetailPageBindingTransform;
  required?: boolean;
};

export type DetailPageRelatedSource = {
  id: string;
  kind: DetailPageRelatedSourceKind;
  label: string;
  limit: number;
  listingQueryId?: string | null;
  excludeCurrentEntry?: boolean;
};

export type DetailPageBlock = WidgetBlock;

export type DetailPageDocument = {
  schemaVersion: DetailPageSchemaVersion;
  id: string;
  name: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status: DetailPageStatus;
  titlePattern: string;
  seo?: DetailPageSeo;
  settings: DetailPageSettings;
  blocks: DetailPageBlock[];
  bindings: DetailPageBinding[];
  related?: DetailPageRelatedSource[];
};

export type DetailPageRevisionSnapshot = DetailPageDocument;
