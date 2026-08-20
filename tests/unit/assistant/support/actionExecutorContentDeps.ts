import type {
  ListingQueryCreateInput,
  ListingQueryUpdateInput,
} from "../../../../core/services/content/queryBuilderService";
import type { DetailPageDocument } from "../../../../core/services/content/detailPageTypes";
import { normalizeDetailPageDocumentForWrite } from "../../../../core/services/content/detailPageSchema";
import {
  type CustomScreenBinding,
  type CustomScreenCollectionRole,
  type CustomScreenDefinition,
} from "../../../../core/services/customScreens/customScreenSchemas";
import type { ContentRouteSetting } from "../../../../core/services/settings/settingsService";
import type { LegacyWidgetBlock } from "../../../../core/services/renderContracts/legacyWidgetBlock";

import {
  createTestCustomScreenDefinition,
  projectTestCustomScreenDefinition,
} from "./actionExecutorFixtures";
import type { ActionExecutorTestState } from "./actionExecutorTestState";

export const createActionExecutorContentDeps = (state: ActionExecutorTestState) => {
  let { contentRoutes } = state;
  const {
    contentTypes,
    customScreens,
    listingQueries,
    listingTemplates,
    pages,
    widgetTemplates,
    detailPages,
  } = state;

  return {
    getSetting: async (key: string) => {
      if (key === "site.contentRoutes") return contentRoutes;
      return null;
    },
    setSetting: async (key: string, value: unknown) => {
      if (key === "site.contentRoutes") {
        contentRoutes = (value as ContentRouteSetting[]).slice();
      }
      return { key, value, updatedAt: new Date("2026-04-10T12:00:00.000Z") };
    },
    getContentType: async (id: string) => contentTypes.find((entry) => entry.id === id) ?? null,
    getContentTypeBySlug: async (slug: string) =>
      contentTypes.find((entry) => entry.slug === slug) ?? null,
    getDetailPageDocument: async (id: string) =>
      detailPages.find((entry) => entry.id === id) ?? null,
    prepareDetailPageDocumentUpsert: async (input: {
      document: DetailPageDocument;
      expectedExistingId?: string | null;
    }) => {
      const normalized = normalizeDetailPageDocumentForWrite(input.document);
      if (input.expectedExistingId && input.expectedExistingId !== normalized.id) {
        throw new Error("detail_page_conflict");
      }
      const contentType =
        contentTypes.find((entry) => entry.id === normalized.contentTypeId) ?? null;
      if (!contentType) {
        throw new Error("detail_page_invalid");
      }
      const existing = detailPages.find((entry) => entry.id === normalized.id) ?? null;
      if (existing && existing.contentTypeId !== contentType.id) {
        throw new Error("detail_page_content_type_mismatch");
      }
      return {
        contentType,
        existing,
        document: {
          ...normalized,
          contentTypeSlug: contentType.slug,
        },
      };
    },
    upsertDetailPageDocument: async (input: {
      document: DetailPageDocument;
      expectedExistingId?: string | null;
    }) => {
      const normalized = normalizeDetailPageDocumentForWrite(input.document);
      const contentType =
        contentTypes.find((entry) => entry.id === normalized.contentTypeId) ?? null;
      if (!contentType) {
        throw new Error("detail_page_invalid");
      }
      if (input.expectedExistingId && input.expectedExistingId !== normalized.id) {
        throw new Error("detail_page_conflict");
      }
      const existingIndex = detailPages.findIndex((entry) => entry.id === normalized.id);
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: normalized.id,
        name: normalized.name,
        contentTypeId: normalized.contentTypeId,
        status: normalized.status,
        currentDocument: {
          ...normalized,
          contentTypeSlug: contentType.slug,
        },
        publishedDocument:
          normalized.status === "published"
            ? {
                ...normalized,
                contentTypeSlug: contentType.slug,
              }
            : null,
        createdAt: existingIndex >= 0 ? detailPages[existingIndex]!.createdAt : now,
        updatedAt: now,
        publishedAt: input.document.status === "published" ? now : null,
      };
      if (existingIndex >= 0) {
        detailPages[existingIndex] = record;
      } else {
        detailPages.push(record);
      }
      return {
        record,
        contentType,
      };
    },
    createContentType: async (input: { name: string; slug: string; schema: unknown }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `00000000-0000-4000-8000-${String(contentTypes.length + 1).padStart(12, "0")}`,
        name: input.name,
        slug: input.slug,
        schema: input.schema,
        createdAt: now,
        updatedAt: now,
      };
      contentTypes.push(record);
      return record;
    },
    updateContentType: async (
      id: string,
      input: { name?: string; slug?: string; schema?: unknown }
    ) => {
      const existing = contentTypes.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined) existing.slug = input.slug;
      if (input.schema !== undefined) existing.schema = input.schema;
      return existing;
    },
    deleteContentType: async (id: string) => {
      const index = contentTypes.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = contentTypes.splice(index, 1);
      return deleted ?? null;
    },
    listCustomScreens: async () => customScreens,
    getCustomScreen: async (id: string) => customScreens.find((entry) => entry.id === id) ?? null,
    createCustomScreen: async (input: {
      name: string;
      contentTypeId: string;
      status?: "draft" | "active";
      collectionRole?: CustomScreenCollectionRole | null;
      compositionKey?: string | null;
      showInSidebar?: boolean;
      sidebarLabel?: string | null;
      definition?: CustomScreenDefinition;
      blocks?: LegacyWidgetBlock[] | null;
      bindings?: CustomScreenBinding[] | null;
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const definition =
        input.definition ??
        createTestCustomScreenDefinition(input.blocks ?? [], input.bindings ?? []);
      const projection = projectTestCustomScreenDefinition(definition);
      const record = {
        id: `screen-${customScreens.length + 1}`,
        name: input.name,
        contentTypeId: input.contentTypeId,
        status: input.status ?? "draft",
        collectionRole: input.collectionRole ?? null,
        compositionKey: input.compositionKey ?? null,
        showInSidebar: input.showInSidebar === true,
        sidebarLabel: input.sidebarLabel ?? null,
        schemaVersion: 4 as const,
        definition,
        blocks: projection.blocks,
        bindings: projection.bindings,
        capabilities: projection.capabilities,
        revision: 1,
        createdAt: now,
        updatedAt: now,
      };
      customScreens.push(record);
      return record;
    },
    updateCustomScreen: async (
      id: string,
      input: {
        name?: string;
        contentTypeId?: string;
        status?: "draft" | "active";
        collectionRole?: CustomScreenCollectionRole | null;
        compositionKey?: string | null;
        showInSidebar?: boolean;
        sidebarLabel?: string | null;
        definition?: CustomScreenDefinition;
        blocks?: LegacyWidgetBlock[] | null;
        bindings?: CustomScreenBinding[] | null;
        expectedRevision?: number;
      }
    ) => {
      const existing = customScreens.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      state.customScreenUpdateCalls.push({ id, input: { ...input } });
      if (input.name !== undefined) existing.name = input.name;
      if (input.contentTypeId !== undefined) existing.contentTypeId = input.contentTypeId;
      if (input.status !== undefined) existing.status = input.status;
      if (input.collectionRole !== undefined) existing.collectionRole = input.collectionRole;
      if (input.compositionKey !== undefined) existing.compositionKey = input.compositionKey;
      if (input.showInSidebar !== undefined) existing.showInSidebar = input.showInSidebar;
      if (input.sidebarLabel !== undefined) existing.sidebarLabel = input.sidebarLabel;
      if (input.definition !== undefined) {
        existing.definition = input.definition;
      } else if (input.blocks !== undefined || input.bindings !== undefined) {
        existing.definition = createTestCustomScreenDefinition(
          input.blocks ?? existing.blocks,
          input.bindings ?? existing.bindings
        );
      }
      const projection = projectTestCustomScreenDefinition(existing.definition);
      existing.blocks = projection.blocks;
      existing.bindings = projection.bindings;
      existing.capabilities = projection.capabilities;
      // TASK-569: only definition-bearing writes bump the monotonic revision,
      // mirroring the server's conditional-update semantics.
      if (input.definition !== undefined || input.expectedRevision !== undefined) {
        existing.revision = (existing.revision ?? 0) + 1;
      }
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing;
    },
    deleteCustomScreen: async (id: string) => {
      const index = customScreens.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = customScreens.splice(index, 1);
      return deleted ?? null;
    },
    listListingQueries: async () => listingQueries,
    createListingQuery: async (input: unknown) => {
      const parsed = input as ListingQueryCreateInput;
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `query-${listingQueries.length + 1}`,
        name: parsed.name,
        description: parsed.description,
        query: parsed.query,
        createdAt: now,
        updatedAt: now,
      };
      listingQueries.push(record);
      return record;
    },
    updateListingQuery: async (id: string, input: unknown) => {
      const parsed = input as ListingQueryUpdateInput;
      const existing = listingQueries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (parsed.name !== undefined) existing.name = parsed.name;
      if (parsed.description !== undefined) existing.description = parsed.description;
      if (parsed.query !== undefined) existing.query = parsed.query;
      return existing;
    },
    deleteListingQuery: async (id: string) => {
      const index = listingQueries.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = listingQueries.splice(index, 1);
      return deleted ?? null;
    },
    listListingTemplates: async () => listingTemplates,
    createListingTemplate: async (input: {
      name: string;
      slug: string;
      description?: string | null;
      layout?: "grid" | "list" | "table" | "calendar" | "map";
      config?: Record<string, unknown>;
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `template-${listingTemplates.length + 1}`,
        name: input.name,
        slug: input.slug,
        description: input.description ?? null,
        layout: input.layout ?? "grid",
        config: input.config ?? {},
        createdAt: now,
        updatedAt: now,
      };
      listingTemplates.push(record);
      return record;
    },
    updateListingTemplate: async (
      id: string,
      input: {
        name?: string;
        slug?: string | null;
        description?: string | null;
        layout?: "grid" | "list" | "table" | "calendar" | "map";
        config?: Record<string, unknown>;
      }
    ) => {
      const existing = listingTemplates.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined && input.slug !== null) existing.slug = input.slug;
      if (input.description !== undefined) existing.description = input.description;
      if (input.layout !== undefined) existing.layout = input.layout;
      if (input.config !== undefined) existing.config = input.config;
      return existing;
    },
    deleteListingTemplate: async (id: string) => {
      const index = listingTemplates.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = listingTemplates.splice(index, 1);
      return deleted ?? null;
    },
    getPageBySlug: async (slug: string) => pages.find((entry) => entry.slug === slug) ?? null,
    getPage: async (id: string) => pages.find((entry) => entry.id === id) ?? null,
    listPages: async () =>
      pages.map((page) => ({
        id: page.id,
        title: page.title,
        slug: page.slug,
        status: page.status as "draft" | "published" | "scheduled" | "archived",
        updatedAt: new Date("2026-04-10T12:00:00.000Z"),
        author: null,
      })),
    createPage: async (input: {
      title: string;
      slug: string;
      data: Record<string, unknown>;
      authorId?: string;
    }) => {
      const record = {
        id: `page-${pages.length + 1}`,
        title: input.title,
        slug: input.slug,
        status: "draft",
        currentData: input.data,
        publishedData: null,
      };
      pages.push(record);
      return record;
    },
    deletePage: async (id: string) => {
      const index = pages.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = pages.splice(index, 1);
      return deleted ?? null;
    },
    updatePage: async (
      id: string,
      input: { title?: string; slug?: string; data?: Record<string, unknown> }
    ) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.title !== undefined) existing.title = input.title;
      if (input.slug !== undefined) existing.slug = input.slug;
      if (input.data !== undefined) existing.currentData = input.data;
      return existing;
    },
    publishPage: async (id: string, _actorId?: string, data?: Record<string, unknown>) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      existing.status = "published";
      existing.publishedData = data ?? existing.currentData;
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/pages/pageService"))["publishPage"]>
      >;
    },
    unpublishPage: async (id: string) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      existing.status = "draft";
      existing.publishedData = null;
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../../core/services/pages/pageService"))["unpublishPage"]>
      >;
    },
    getWidgetTemplate: async (id: string) =>
      widgetTemplates.find((entry) => entry.id === id) ?? null,
  };
};
