import { apiRequest } from "./apiClient";

export type TaxonomyKind = "category" | "tag";

export type ContentTaxonomy = {
  id: string;
  typeId: string;
  name: string;
  slug: string;
  kind: TaxonomyKind;
  createdAt: string;
  updatedAt: string;
};

export type ContentTerm = {
  id: string;
  taxonomyId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
};

export type TaxonomyConfigPayload = {
  categories?: boolean;
  tags?: boolean;
};

export type TaxonomyOverview = {
  taxonomies: {
    category?: ContentTaxonomy | null;
    tag?: ContentTaxonomy | null;
  };
  terms: {
    categories: ContentTerm[];
    tags: ContentTerm[];
  };
};

export async function listTaxonomies(typeId: string) {
  return apiRequest<{ items: ContentTaxonomy[] }>(
    `/content-types/${encodeURIComponent(typeId)}/taxonomies`,
    { method: "GET" }
  );
}

export async function updateTaxonomyConfig(
  typeId: string,
  payload: TaxonomyConfigPayload
) {
  return apiRequest<{ items: ContentTaxonomy[] }>(
    `/content-types/${encodeURIComponent(typeId)}/taxonomies`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function getTaxonomyOverview(typeId: string) {
  return apiRequest<TaxonomyOverview>(
    `/content-types/${encodeURIComponent(typeId)}/terms`,
    { method: "GET" }
  );
}

export async function listTaxonomyTerms(taxonomyId: string) {
  return apiRequest<ContentTerm[]>(
    `/taxonomies/${encodeURIComponent(taxonomyId)}/terms`,
    { method: "GET" }
  );
}

export async function createTaxonomyTerm(
  taxonomyId: string,
  payload: { name: string; slug?: string | null }
) {
  return apiRequest<ContentTerm>(
    `/taxonomies/${encodeURIComponent(taxonomyId)}/terms`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateTaxonomyTerm(
  termId: string,
  payload: { name?: string | null; slug?: string | null }
) {
  return apiRequest<ContentTerm>(
    `/terms/${encodeURIComponent(termId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteTaxonomyTerm(termId: string) {
  return apiRequest<{ ok: boolean }>(
    `/terms/${encodeURIComponent(termId)}`,
    { method: "DELETE" },
    { withCsrf: true }
  );
}
