import type { PageSectionV2 } from "../pages/pageDocumentV2";
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

/** Versions that may appear in STORED rows (v1 rows are read-converted to v2). */
export const detailPageStoredSchemaVersions = [1, 2] as const;
export type DetailPageStoredSchemaVersion = (typeof detailPageStoredSchemaVersions)[number];

/** Canonical stored version of the detail-page document (TASK-580-03). */
export type DetailPageSchemaVersion = 2;

/**
 * Detail-page error vocabulary (TASK-580-03-L02). Kept in the contract module
 * so route/service/domain layers map from one machine-readable code set.
 */
export type DetailPageErrorCode =
  | "detail_page_not_found"
  | "detail_page_invalid"
  | "detail_page_conflict"
  | "detail_page_route_conflict"
  | "detail_page_content_type_mismatch"
  | "detail_page_status_requires_lifecycle"
  | "detail_page_revision_not_found"
  | "detail_page_revision_delete_forbidden"
  | "detail_page_revision_snapshot_too_large"
  | "detail_page_document_invalid"
  | "detail_page_legacy_v1_invalid";

export type DetailPageStatus = (typeof detailPageStatusValues)[number];
export type DetailPageRevisionKind = (typeof detailPageRevisionKindValues)[number];
export type DetailPageMetaField = (typeof detailPageMetaFieldValues)[number];
export type DetailPageComputedResolver = (typeof detailPageComputedResolverValues)[number];
export type DetailPageBindingTransform = (typeof detailPageBindingTransformValues)[number];
export type DetailPageRelatedSourceKind = (typeof detailPageRelatedSourceKinds)[number];
export type DetailPageIdentityRole = (typeof detailPageIdentityRoles)[number];

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

/**
 * Structural shape of a stored v1 widget block (TASK-580-03-L02). The v1
 * kernel owns the concrete `WidgetBlock` type; the detail-page domain keeps
 * this structural mirror so the conversion/read adapter stay free of
 * `core/widgets/*` imports. Field names and semantics match the v1 kernel.
 */
export type DetailPageLegacyWidgetBlockV1 = {
  id: string;
  type: string;
  variant?: string;
  data: Record<string, unknown>;
  layout?: unknown;
  visibility?: unknown;
  editor?: unknown;
  children?: DetailPageLegacyWidgetBlockV1[];
  slots?: Record<string, DetailPageLegacyWidgetBlockV1[]>;
};

/**
 * Stored v1 detail-page document (read-converted to v2 by
 * `convertDetailPageDocumentV1ToV2`). Un-backfilled `detail_page_revisions`
 * and pre-migration rows keep restoring through the read adapter.
 */
export type DetailPageDocumentV1 = {
  schemaVersion: 1;
  id: string;
  name: string;
  contentTypeId: string;
  contentTypeSlug: string;
  status: DetailPageStatus;
  titlePattern: string;
  seo?: DetailPageSeo;
  settings: DetailPageSettings;
  blocks: DetailPageLegacyWidgetBlockV1[];
  bindings: DetailPageBinding[];
  related?: DetailPageRelatedSource[];
};

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
  sections: PageSectionV2[];
  bindings: DetailPageBinding[];
  related?: DetailPageRelatedSource[];
  /**
   * @deprecated Transitional v1-compat field, present only for the still-v1
   * admin editor and assistant authoring surfaces (TASK-580-03-L05/L06 cut
   * them over; L04 removes the runtime alias). Canonical documents NEVER
   * carry this field: the read/write normalizers and the v1→v2 conversion
   * emit `sections` only. Do not persist or read it in new code.
   */
  blocks?: DetailPageLegacyWidgetBlockV1[];
};

export type DetailPageRevisionSnapshot = DetailPageDocument;
