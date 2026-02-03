import { apiRequest } from "./apiClient";

export type ContentSchemaProperty = {
  type?: "string" | "number" | "boolean" | "array";
  items?: { type?: "string" };
  title?: string;
  description?: string;
  enum?: string[];
  default?: string | number | boolean | string[];
  xFieldType?: string;
  xFieldConfig?: Record<string, unknown>;
  xRelationTarget?: string;
};

export type ContentSchema = {
  type: "object";
  additionalProperties: false;
  required?: string[];
  properties: Record<string, ContentSchemaProperty>;
};

export type ContentTypeSummary = {
  id: string;
  name: string;
  slug: string;
  schema: ContentSchema;
  createdAt: string;
  updatedAt: string;
  entryCount?: number;
};

export type ContentTypePayload = {
  name: string;
  slug: string;
  schema: ContentSchema;
};

export async function listContentTypes() {
  return apiRequest<ContentTypeSummary[]>("/content-types", { method: "GET" });
}

export async function getContentType(id: string) {
  return apiRequest<ContentTypeSummary>(`/content-types/${id}`, { method: "GET" });
}

export async function getContentTypeBySlug(slug: string) {
  const types = await listContentTypes();
  return types.find((type) => type.slug === slug) ?? null;
}

export async function createContentType(payload: ContentTypePayload) {
  return apiRequest<ContentTypeSummary>(
    "/content-types",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function updateContentType(
  id: string,
  payload: Partial<ContentTypePayload>
) {
  return apiRequest<ContentTypeSummary>(
    `/content-types/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    { withCsrf: true }
  );
}

export async function deleteContentType(id: string) {
  return apiRequest<{ ok: boolean }>(
    `/content-types/${id}`,
    {
      method: "DELETE",
    },
    { withCsrf: true }
  );
}
