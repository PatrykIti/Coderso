import { expect, test } from "vitest";

import {
  buildCustomScreenPreviewRecordState,
  buildFallbackPreviewRecordState,
  buildPreviewRecordStateFromEntry,
  buildSchemaFallbackPreviewData,
} from "../../../core/admin/ui/custom-screens/customScreenPreviewData";

const contentType = {
  id: "type-1",
  name: "Projects",
  slug: "projects",
  status: "published" as const,
  schema: {
    type: "object" as const,
    additionalProperties: false as const,
    properties: {
      projectTitle: {
        type: "string" as const,
        title: "Project title",
        xFieldType: "text",
      },
      featured: {
        type: "boolean" as const,
        title: "Featured",
        xFieldType: "boolean",
      },
    },
  },
  createdAt: "2026-05-02T00:00:00.000Z",
  updatedAt: "2026-05-02T00:00:00.000Z",
};

test("buildPreviewRecordStateFromEntry prefers the first real record payload", () => {
  expect(
    buildPreviewRecordStateFromEntry(contentType, {
      id: "entry-1",
      typeId: "type-1",
      title: "Aurora",
      slug: "aurora",
      status: "draft",
      visibility: "public",
      hasPassword: false,
      data: { projectTitle: "Villa Aurora" },
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T11:00:00.000Z",
      publishedAt: null,
    })
  ).toEqual({
    source: "entry",
    entryId: "entry-1",
    note: "Previewing the first record from Projects.",
    data: {
      title: "Aurora",
      slug: "aurora",
      status: "draft",
      createdAt: "2026-05-02T10:00:00.000Z",
      updatedAt: "2026-05-02T11:00:00.000Z",
      publishedAt: null,
      projectTitle: "Villa Aurora",
    },
  });
});

test("buildFallbackPreviewRecordState explains empty and failed preview states", () => {
  expect(buildFallbackPreviewRecordState(contentType, "no-records")).toMatchObject({
    source: "fallback",
    fallbackReason: "no-records",
    note: "No records exist for this content type yet. Preview is using schema fallback values.",
  });
  expect(buildFallbackPreviewRecordState(contentType, "read-failed")).toMatchObject({
    source: "fallback",
    fallbackReason: "read-failed",
    note: "Preview data could not be loaded. Showing schema fallback values until records can be read.",
  });
});

test("buildSchemaFallbackPreviewData keeps schema-shaped preview defaults", () => {
  expect(buildSchemaFallbackPreviewData(contentType)).toMatchObject({
    title: "Project title",
    slug: "project-title",
    projectTitle: "Project Title preview",
    featured: true,
  });
});

test("buildSchemaFallbackPreviewData covers number, select, media, relation, and richtext branches", () => {
  const richContentType = {
    id: "type-2",
    name: "Catalog",
    slug: "catalog",
    status: "published" as const,
    schema: {
      type: "object" as const,
      additionalProperties: false as const,
      properties: {
        budget: {
          type: "number" as const,
          title: "Budget",
          xFieldType: "number",
        },
        stage: {
          type: "string" as const,
          title: "Stage",
          xFieldType: "select",
          enum: ["active"],
        },
        freeformStage: {
          type: "string" as const,
          title: "Freeform stage",
          xFieldType: "select",
        },
        cover: {
          type: "string" as const,
          title: "Cover",
          xFieldType: "media",
        },
        author: {
          type: "string" as const,
          title: "Author",
          xFieldType: "relation",
          xRelationTarget: "people",
        },
        tags: {
          type: "array" as const,
          title: "Tags",
          items: { type: "string" as const },
          xFieldType: "relation",
          xRelationTarget: "people",
        },
        body: {
          type: "string" as const,
          title: "Body",
          xFieldType: "richtext",
        },
      },
    },
    createdAt: "2026-05-02T00:00:00.000Z",
    updatedAt: "2026-05-02T00:00:00.000Z",
  };

  expect(buildSchemaFallbackPreviewData(richContentType)).toMatchObject({
    budget: 120,
    stage: "active",
    freeformStage: "Freeform Stage option",
    cover: "Hero image",
    author: "Related item",
    tags: ["Related item"],
    body: "Body example content",
  });
});

test("buildCustomScreenPreviewRecordState resets to fallback when there is no current record owner", () => {
  expect(
    buildCustomScreenPreviewRecordState({
      contentType,
      entries: null,
      readFailed: false,
    })
  ).toMatchObject({
    source: "fallback",
    entryId: null,
    note: null,
  });

  expect(
    buildCustomScreenPreviewRecordState({
      contentType: null,
      entries: null,
      readFailed: false,
    })
  ).toMatchObject({
    source: "fallback",
    fallbackReason: "no-content-type",
  });
});
