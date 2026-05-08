import { expect, test } from "bun:test";

import { planAssistantActions } from "../../../core/services/assistant/actionPlannerService";
import { buildCatalogFamilyPlan } from "../../../core/services/assistant/blueprints/catalogFamilyBlueprint";
import { PRODUCT_CATALOG_PRESET } from "../../../core/services/assistant/blueprints/catalogFamilyPresets";
import { buildHouseProjectsCatalogPlan } from "../../../core/services/assistant/blueprints/houseProjectsCatalogBlueprint";
import { buildLeadCaptureSitePlan } from "../../../core/services/assistant/blueprints/leadCaptureBlueprint";
import { buildProductInquiryCatalogPlan } from "../../../core/services/assistant/blueprints/productInquiryBlueprint";
import { buildEditorialContentHubPlan } from "../../../core/services/assistant/blueprints/editorialContentHubBlueprint";
import {
  resolveCustomScreenCapabilities,
  type CustomScreenCapabilities,
} from "../../../core/services/customScreens/capabilities";
import type {
  ListingQuery,
  ListingQueryCreateInput,
  ListingQueryUpdateInput,
} from "../../../core/services/content/queryBuilderService";
import {
  dryRunAssistantActionPlan,
  executeAssistantActionPlan,
} from "../../../core/services/assistant/actionExecutorService";
import {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "../../../core/services/assistant/siteBuilderExecutor";
import type {
  AssistantActionPlan,
  AssistantPlannedAction,
} from "../../../core/services/assistant/actionPlanTypes";
import type { AssistantUndoManifestItem } from "../../../core/services/assistant/actionUndoManifest";
import type { DetailPageDocument } from "../../../core/services/content/detailPageTypes";
import type { CustomScreenBinding } from "../../../core/services/customScreens/customScreenSchemas";
import type { ContentRouteSetting } from "../../../core/services/settings/settingsService";
import type { WidgetBlock } from "../../../core/widgets/types";

type ExecutorDeps = NonNullable<Parameters<typeof dryRunAssistantActionPlan>[1]>;

const createDeps = () => {
  let contentRoutes: ContentRouteSetting[] = [];
  const contentTypes: Array<{
    id: string;
    name: string;
    slug: string;
    schema: unknown;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const customScreens: Array<{
    id: string;
    name: string;
    contentTypeId: string;
    status: "draft" | "active";
    showInSidebar: boolean;
    sidebarLabel: string | null;
    schemaVersion: 1;
    blocks: WidgetBlock[];
    bindings: CustomScreenBinding[];
    capabilities: CustomScreenCapabilities;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const listingQueries: Array<{
    id: string;
    name: string;
    description: string | null;
    query: ListingQuery;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const listingTemplates: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    layout: "grid" | "list" | "table" | "calendar" | "map";
    config: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const pages: Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
    currentData: Record<string, unknown>;
    publishedData: Record<string, unknown> | null;
  }> = [];
  const forms: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    description: string | null;
    successMessage: string | null;
    submissionAccess: string;
  }> = [];
  const formSubmissionCounts = new Map<string, number>();
  const formActions = new Map<
    string,
    Array<{
      id: string;
      type: "email" | "webhook" | "entry_sync" | "redirect" | "success_message";
      label: string;
      enabled: boolean;
      continueOnError: boolean;
      condition: Record<string, unknown>;
      config: Record<string, unknown>;
      orderIndex: number;
    }>
  >();
  const entries: Array<{
    id: string;
    typeId: string;
    title: string;
    slug: string;
    status: "draft" | "published";
    data: Record<string, unknown>;
    authorId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const menuItemsByMenu = new Map<
    string,
    Array<{
      id: string;
      label: string;
      href: string | null;
      pageId: string | null;
      parentId: string | null;
      orderIndex: number;
      settings: Record<string, unknown>;
    }>
  >();
  const seoDocuments: Array<{
    id: string;
    targetType: "page" | "entry";
    targetId: string;
    slug: string | null;
    title: string | null;
    description: string | null;
    canonicalUrl: string | null;
    robots: string | null;
    score: number | null;
    status: "warning";
    issues: [];
    lastAuditAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const mediaAssets: Array<{
    id: string;
    key: string;
    url: string;
    originalName: string;
    type: "image" | "file";
    mimeType: string;
    size: number;
    alt: string | null;
    title: string | null;
    caption: string | null;
    createdBy: string | null;
    createdAt: Date;
  }> = [];
  const widgetTemplates: Array<{
    id: string;
    name: string;
    description: string | null;
    category: string;
    status: "draft" | "published";
    blocks: Array<Record<string, unknown>>;
    settings: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const detailPages: Array<{
    id: string;
    name: string;
    contentTypeId: string;
    status: "draft" | "published";
    currentDocument: DetailPageDocument;
    publishedDocument: DetailPageDocument | null;
    createdAt: Date;
    updatedAt: Date;
    publishedAt: Date | null;
  }> = [];
  const formFields = new Map<string, Array<Record<string, unknown>>>();
  const deps = {
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
      if (input.expectedExistingId && input.expectedExistingId !== input.document.id) {
        throw new Error("detail_page_conflict");
      }
      const contentType =
        contentTypes.find((entry) => entry.id === input.document.contentTypeId) ?? null;
      if (!contentType) {
        throw new Error("detail_page_invalid");
      }
      const existing = detailPages.find((entry) => entry.id === input.document.id) ?? null;
      if (existing && existing.contentTypeId !== contentType.id) {
        throw new Error("detail_page_content_type_mismatch");
      }
      return {
        contentType,
        existing,
        document: {
          ...input.document,
          contentTypeSlug: contentType.slug,
        },
      };
    },
    upsertDetailPageDocument: async (input: {
      document: DetailPageDocument;
      expectedExistingId?: string | null;
    }) => {
      const contentType =
        contentTypes.find((entry) => entry.id === input.document.contentTypeId) ?? null;
      if (!contentType) {
        throw new Error("detail_page_invalid");
      }
      if (input.expectedExistingId && input.expectedExistingId !== input.document.id) {
        throw new Error("detail_page_conflict");
      }
      const existingIndex = detailPages.findIndex((entry) => entry.id === input.document.id);
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: input.document.id,
        name: input.document.name,
        contentTypeId: input.document.contentTypeId,
        status: input.document.status,
        currentDocument: {
          ...input.document,
          contentTypeSlug: contentType.slug,
        },
        publishedDocument:
          input.document.status === "published"
            ? {
                ...input.document,
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
        id: `ct-${contentTypes.length + 1}`,
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
      showInSidebar?: boolean;
      sidebarLabel?: string | null;
      blocks?: WidgetBlock[] | null;
      bindings?: CustomScreenBinding[] | null;
    }) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `screen-${customScreens.length + 1}`,
        name: input.name,
        contentTypeId: input.contentTypeId,
        status: input.status ?? "draft",
        showInSidebar: input.showInSidebar === true,
        sidebarLabel: input.sidebarLabel ?? null,
        schemaVersion: 1 as const,
        blocks: input.blocks ?? [],
        bindings: input.bindings ?? [],
        capabilities: resolveCustomScreenCapabilities({
          blocks: input.blocks ?? [],
          bindings: input.bindings ?? [],
        }),
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
        showInSidebar?: boolean;
        sidebarLabel?: string | null;
        blocks?: WidgetBlock[] | null;
        bindings?: CustomScreenBinding[] | null;
      }
    ) => {
      const existing = customScreens.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.contentTypeId !== undefined) existing.contentTypeId = input.contentTypeId;
      if (input.status !== undefined) existing.status = input.status;
      if (input.showInSidebar !== undefined) existing.showInSidebar = input.showInSidebar;
      if (input.sidebarLabel !== undefined) existing.sidebarLabel = input.sidebarLabel;
      if (input.blocks !== undefined) existing.blocks = input.blocks ?? [];
      if (input.bindings !== undefined) existing.bindings = input.bindings ?? [];
      existing.capabilities = resolveCustomScreenCapabilities({
        blocks: existing.blocks,
        bindings: existing.bindings,
      });
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
    publishPage: async (id: string) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      existing.status = "published";
      existing.publishedData = existing.currentData;
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/pages/pageService"))["publishPage"]>
      >;
    },
    unpublishPage: async (id: string) => {
      const existing = pages.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      existing.status = "draft";
      existing.publishedData = null;
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/pages/pageService"))["unpublishPage"]>
      >;
    },
    getWidgetTemplate: async (id: string) =>
      widgetTemplates.find((entry) => entry.id === id) ?? null,
    listWidgetTemplates: async () => widgetTemplates,
    deleteWidgetTemplate: async (id: string) => {
      const index = widgetTemplates.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = widgetTemplates.splice(index, 1);
      return deleted ?? null;
    },
    updateWidgetTemplate: async (
      id: string,
      input: {
        name?: string;
        description?: string | null;
        category?: string;
        status?: "draft" | "published";
        blocks?: Array<Record<string, unknown>>;
        settings?: Record<string, unknown>;
      }
    ) => {
      const existing = widgetTemplates.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.description !== undefined) existing.description = input.description;
      if (input.category !== undefined) existing.category = input.category;
      if (input.status !== undefined) existing.status = input.status;
      if (input.blocks !== undefined) existing.blocks = input.blocks;
      if (input.settings !== undefined) existing.settings = input.settings;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing;
    },
    listForms: async () => forms,
    getForm: async (id: string) => forms.find((entry) => entry.id === id) ?? null,
    countFormSubmissions: async (formId: string) => formSubmissionCounts.get(formId) ?? 0,
    createForm: async (input: {
      name: string;
      slug?: string | null;
      status?: "draft" | "published" | "archived";
      description?: string | null;
      successMessage?: string | null;
      submissionAccess?: "public" | "internal";
    }) => {
      const record = {
        id: `form-${forms.length + 1}`,
        name: input.name,
        slug: input.slug ?? input.name.toLowerCase().replace(/\s+/g, "-"),
        status: input.status ?? "draft",
        description: input.description ?? null,
        successMessage: input.successMessage ?? null,
        submissionAccess: input.submissionAccess ?? "public",
      };
      forms.push(record);
      return record;
    },
    deleteForm: async (id: string) => {
      if ((formSubmissionCounts.get(id) ?? 0) > 0) return null;
      const index = forms.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = forms.splice(index, 1);
      formSubmissionCounts.delete(id);
      return deleted ?? null;
    },
    updateForm: async (
      id: string,
      input: {
        name?: string;
        slug?: string | null;
        status?: "draft" | "published" | "archived";
        description?: string | null;
        successMessage?: string | null;
        submissionAccess?: "public" | "internal";
      }
    ) => {
      const existing = forms.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.name !== undefined) existing.name = input.name;
      if (input.slug !== undefined && input.slug !== null) existing.slug = input.slug;
      if (input.status !== undefined) existing.status = input.status;
      if (input.description !== undefined) existing.description = input.description;
      if (input.successMessage !== undefined) existing.successMessage = input.successMessage;
      if (input.submissionAccess !== undefined) existing.submissionAccess = input.submissionAccess;
      return existing;
    },
    setFormFields: async (formId: string, fields: Array<Record<string, unknown>>) => {
      formFields.set(formId, fields);
      return fields;
    },
    listFormActions: async (formId: string) => formActions.get(formId) ?? [],
    setFormActions: async (
      formId: string,
      actions: Array<{
        id: string;
        type: "email" | "webhook" | "entry_sync" | "redirect" | "success_message";
        label: string;
        enabled: boolean;
        continueOnError: boolean;
        condition: Record<string, unknown>;
        config: Record<string, unknown>;
        orderIndex: number;
      }>
    ) => {
      const next = actions.map((action, index) => ({
        ...action,
        orderIndex: index,
      }));
      formActions.set(formId, next);
      return next;
    },
    getEntryBySlug: async (typeId: string, slug: string) =>
      (entries.find((entry) => entry.typeId === typeId && entry.slug === slug) ??
        null) as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/content/entryService"))["getEntryBySlug"]>
      >,
    getEntry: async (id: string) =>
      (entries.find((entry) => entry.id === id) ?? null) as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/content/entryService"))["getEntry"]>
      >,
    createEntry: async (
      typeId: string,
      input: {
        title: string;
        slug: string;
        data: Record<string, unknown>;
        authorId?: string | null;
      }
    ) => {
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `entry-${entries.length + 1}`,
        typeId,
        title: input.title,
        slug: input.slug,
        status: "draft" as const,
        data: input.data,
        authorId: input.authorId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      entries.push(record);
      return record as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/content/entryService"))["createEntry"]>
      >;
    },
    deleteEntry: async (id: string) => {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = entries.splice(index, 1);
      return deleted as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/content/entryService"))["deleteEntry"]>
      >;
    },
    updateEntry: async (
      id: string,
      input: {
        title?: string;
        slug?: string;
        data?: Record<string, unknown>;
      }
    ) => {
      const existing = entries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.title !== undefined) existing.title = input.title;
      if (input.slug !== undefined) existing.slug = input.slug;
      if (input.data !== undefined) existing.data = input.data;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing as unknown as Awaited<
        ReturnType<(typeof import("../../../core/services/content/entryService"))["updateEntry"]>
      >;
    },
    updateEntryMetadata: async (
      id: string,
      input: {
        status?: "draft" | "published" | "scheduled" | "archived";
        seo?: {
          title?: string | null;
          description?: string | null;
          canonicalUrl?: string | null;
          robots?: string | null;
        };
      }
    ) => {
      const existing = entries.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (
        input.status !== undefined &&
        input.status !== "scheduled" &&
        input.status !== "archived"
      ) {
        existing.status = input.status;
      }
      if (input.seo) {
        const seo =
          seoDocuments.find((entry) => entry.targetType === "entry" && entry.targetId === id) ??
          null;
        if (seo) {
          seo.title = input.seo.title ?? seo.title;
          seo.description = input.seo.description ?? seo.description;
          seo.canonicalUrl = input.seo.canonicalUrl ?? seo.canonicalUrl;
          seo.robots = input.seo.robots ?? seo.robots;
        } else {
          seoDocuments.push({
            id: `seo-${seoDocuments.length + 1}`,
            targetType: "entry",
            targetId: id,
            slug: existing.slug,
            title: input.seo.title ?? null,
            description: input.seo.description ?? null,
            canonicalUrl: input.seo.canonicalUrl ?? null,
            robots: input.seo.robots ?? null,
            score: null,
            status: "warning",
            issues: [],
            lastAuditAt: null,
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            updatedAt: new Date("2026-04-10T12:00:00.000Z"),
          });
        }
      }
      return existing as unknown as Awaited<
        ReturnType<
          (typeof import("../../../core/services/content/entryService"))["updateEntryMetadata"]
        >
      >;
    },
    listMenuItems: async (menuId: string) =>
      (menuItemsByMenu.get(menuId) ?? []).map((item) => ({
        ...item,
        children: [],
      })),
    deleteMenuItem: async (menuId: string, itemId: string) => {
      const existingItems = menuItemsByMenu.get(menuId) ?? [];
      const existing = existingItems.find((item) => item.id === itemId) ?? null;
      if (!existing) return null;
      const deleteIds = new Set([itemId]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const item of existingItems) {
          if (item.parentId && deleteIds.has(item.parentId) && !deleteIds.has(item.id)) {
            deleteIds.add(item.id);
            changed = true;
          }
        }
      }
      const next = existingItems.filter((item) => !deleteIds.has(item.id));
      menuItemsByMenu.set(menuId, next);
      return {
        deleted: existing,
        deletedIds: [...deleteIds].sort((left, right) => left.localeCompare(right)),
        items: next.map((item) => ({ ...item, children: [] })),
      };
    },
    replaceMenuItems: async (
      menuId: string,
      items: Array<{
        id?: string;
        label: string;
        href?: string | null;
        pageId?: string | null;
        parentId?: string | null;
        orderIndex?: number;
        settings?: unknown;
      }>
    ) => {
      const next = items.map((item, index) => ({
        id: item.id ?? `menu-item-${index + 1}`,
        label: item.label,
        href: item.href ?? null,
        pageId: item.pageId ?? null,
        parentId: item.parentId ?? null,
        orderIndex: item.orderIndex ?? index,
        settings:
          item.settings && typeof item.settings === "object" && !Array.isArray(item.settings)
            ? (item.settings as Record<string, unknown>)
            : {},
      }));
      menuItemsByMenu.set(menuId, next);
      return next.map((item) => ({
        ...item,
        children: [],
      }));
    },
    getSeoDocument: async (id: string) => seoDocuments.find((entry) => entry.id === id) ?? null,
    getSeoDocumentByTarget: async (targetType: "page" | "entry", targetId: string) =>
      seoDocuments.find(
        (entry) => entry.targetType === targetType && entry.targetId === targetId
      ) ?? null,
    deleteSeoDocument: async (id: string) => {
      const index = seoDocuments.findIndex((entry) => entry.id === id);
      if (index < 0) return null;
      const [deleted] = seoDocuments.splice(index, 1);
      return deleted ?? null;
    },
    updateSeoDocumentById: async (
      id: string,
      input: {
        title?: string | null;
        description?: string | null;
        canonicalUrl?: string | null;
        robots?: string | null;
      }
    ) => {
      const existing = seoDocuments.find((entry) => entry.id === id) ?? null;
      if (!existing) return null;
      if (input.title !== undefined) existing.title = input.title;
      if (input.description !== undefined) existing.description = input.description;
      if (input.canonicalUrl !== undefined) existing.canonicalUrl = input.canonicalUrl;
      if (input.robots !== undefined) existing.robots = input.robots;
      existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
      return existing;
    },
    upsertSeoDocument: async (input: {
      targetType: "page" | "entry";
      targetId: string;
      slug?: string | null;
      title?: string | null;
      description?: string | null;
      canonicalUrl?: string | null;
      robots?: string | null;
    }) => {
      const existing =
        seoDocuments.find(
          (entry) => entry.targetType === input.targetType && entry.targetId === input.targetId
        ) ?? null;
      if (existing) {
        existing.slug = input.slug ?? existing.slug;
        existing.title = input.title ?? existing.title;
        existing.description = input.description ?? existing.description;
        existing.canonicalUrl = input.canonicalUrl ?? existing.canonicalUrl;
        existing.robots = input.robots ?? existing.robots;
        existing.updatedAt = new Date("2026-04-10T12:01:00.000Z");
        return existing;
      }
      const now = new Date("2026-04-10T12:00:00.000Z");
      const record = {
        id: `seo-${seoDocuments.length + 1}`,
        targetType: input.targetType,
        targetId: input.targetId,
        slug: input.slug ?? null,
        title: input.title ?? null,
        description: input.description ?? null,
        canonicalUrl: input.canonicalUrl ?? null,
        robots: input.robots ?? null,
        score: null,
        status: "warning" as const,
        issues: [] as [],
        lastAuditAt: null,
        createdAt: now,
        updatedAt: now,
      };
      seoDocuments.push(record);
      return record;
    },
    getMediaById: async (id: string) => mediaAssets.find((entry) => entry.id === id) ?? null,
    logAudit: async () => ({
      id: "audit-1",
      actorId: "user-1",
      action: "assistant.actions.execute",
      targetType: "assistant-action-plan",
      targetId: "plan-house-projects-catalog",
      metadata: {},
      createdAt: new Date("2026-04-10T12:00:00.000Z"),
    }),
    previewSiteKitPlan: previewGuidedSiteBuilderPlan,
    executeSiteKit: (async (input) => {
      const preview = previewGuidedSiteBuilderPlan(input);
      return {
        ...preview,
        execution: {
          run: {
            id: "run-site-kit-1",
            kitId: preview.selectedKitId,
            mode: input.dryRun ? "dry_run" : "apply",
            status: "success",
            actorId: input.actorId ?? null,
            rollbackOfRunId: null,
            options: {},
            summary: {
              total: 1,
              success: 1,
              failed: 0,
              planned: 0,
              skipped: 0,
              operations: {
                create: 1,
                update: 0,
                noop: 0,
                delete: 0,
                restore: 0,
              },
            },
            error: null,
            createdAt: new Date("2026-04-10T12:00:00.000Z"),
            updatedAt: new Date("2026-04-10T12:00:00.000Z"),
            finishedAt: new Date("2026-04-10T12:00:01.000Z"),
          },
          items: [],
          summary: {
            total: 1,
            success: 1,
            failed: 0,
            planned: 0,
            skipped: 0,
            operations: {
              create: 1,
              update: 0,
              noop: 0,
              delete: 0,
              restore: 0,
            },
          },
          manifest: {
            id: preview.selectedKitId,
            title: preview.selectedKitTitle,
            vertical: "test",
            includes: {
              contentTypes: [],
              entries: [],
              widgets: [],
              templates: [],
              forms: [],
              menus: [],
            },
            requiredModules: [],
          },
          templateInstall: null,
        },
        validation: {
          runId: "run-site-kit-1",
          status: "ok",
          unresolvedItems: [],
          checks: [],
        },
      };
    }) as typeof executeGuidedSiteBuilder,
    validateSiteKitRun: (async (input) => ({
      runId: input.runId,
      status: "ok",
      unresolvedItems: [],
      checks: [],
    })) as typeof validateGuidedSiteBuilderRun,
  };

  const testDeps = Object.assign(deps, {
    __state: {
      contentRoutes,
      contentTypes,
      customScreens,
      listingQueries,
      listingTemplates,
      pages,
      forms,
      formSubmissionCounts,
      formActions,
      entries,
      menuItemsByMenu,
      seoDocuments,
      mediaAssets,
      widgetTemplates,
      detailPages,
      formFields,
    },
  });
  return testDeps as unknown as typeof testDeps & ExecutorDeps;
};

test("dryRunAssistantActionPlan previews create operations for house projects catalog", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes).toHaveLength(6);
  expect(preview.changes.every((change) => change.operation === "create")).toBe(true);
  expect(preview.warnings.some((warning) => warning.includes("system list route"))).toBe(true);
});

test("executeAssistantActionPlan creates and reuses draft entry actions", async () => {
  const deps = createDeps();
  await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
      },
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-entry-draft",
    status: "ready",
    intentId: "entry-draft",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create draft entry",
    answer: "I can create a draft entry.",
    summary: "Create one draft product entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-products-sample",
        type: "entry.upsert-draft",
        title: "Create sample product",
        description: "Create a draft product entry.",
        input: {
          contentTypeSlug: "products",
          title: "Sample Product",
          slug: "sample-product",
          values: {
            title: "Sample Product",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("create");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "content-type",
      targetKey: "products",
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.adminHref).toBe("/admin/advanced/entries/products/entry-1");
  expect(deps.__state.entries[0]?.authorId).toBe("user-1");

  const replayPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(replayPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan deletes entries through explicit delete actions", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
      },
    },
  });
  const entry = await deps.createEntry(contentType.id, {
    title: "Sample Product",
    slug: "sample-product",
    data: { title: "Sample Product" },
    authorId: "user-1",
  });
  const plan: AssistantActionPlan = {
    id: "plan-entry-delete",
    status: "ready",
    intentId: "entry-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete entry",
    answer: "I can delete the active entry.",
    summary: "Delete active entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-delete-1",
        type: "entry.delete",
        title: "Delete Sample Product",
        description: "Delete selected entry.",
        input: {
          id: entry.id,
          contentTypeSlug: "products",
          expectedTitle: "Sample Product",
          expectedSlug: "sample-product",
          expectedStatus: "draft",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted entry "Sample Product".');
  expect(await deps.getEntry(entry.id)).toBeNull();
});

test("executeAssistantActionPlan deletes content types when dependency count is zero", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-content-type-delete",
    status: "ready",
    intentId: "content-type-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete content type",
    answer: "I can delete the selected content type.",
    summary: "Delete content type.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "content-type-delete-1",
        type: "content-type.delete",
        title: "Delete Products",
        description: "Delete selected content type.",
        input: {
          id: contentType.id,
          name: "Products",
          slug: "products",
          expectedEntryCount: 0,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-content-type-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted content type "Products".');
  expect(await deps.getContentTypeBySlug("products")).toBeNull();
});

test("executeAssistantActionPlan deletes custom screens through explicit delete actions", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "House Projects",
    slug: "house-projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "House Projects Archive",
    contentTypeId: contentType.id,
    status: "active",
    showInSidebar: true,
    sidebarLabel: "House Projects Archive",
    blocks: [],
    bindings: [],
  });
  const plan: AssistantActionPlan = {
    id: "plan-delete-house-project-screen",
    status: "ready",
    intentId: "custom-screen-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete custom screen",
    answer: "I can delete the selected custom screen.",
    summary: "Delete one custom screen matching prefix.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-delete-1",
        type: "custom-screen.delete",
        title: "Delete House Projects Archive",
        description: "Delete selected custom screen.",
        input: {
          id: screen.id,
          name: screen.name,
          expectedNamePrefix: "House Projects",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings).toContain(
    "This active custom screen is shown in the Coderso sidebar."
  );

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-custom-screen-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted custom screen "House Projects Archive".');
  expect(await deps.getCustomScreen(screen.id)).toBeNull();
});

test("executeAssistantActionPlan updates custom screen metadata and binding mode", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Projects",
    slug: "projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "Projects Screen",
    contentTypeId: contentType.id,
    status: "draft",
    showInSidebar: false,
    sidebarLabel: null,
    blocks: [{ id: "hero-1", type: "hero", data: { headline: "Old headline" } }],
    bindings: [
      {
        id: "hero-headline",
        widgetId: "hero-1",
        propPath: "headline",
        field: "title",
        mode: "read",
      },
    ],
  });
  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-update",
    status: "ready",
    intentId: "custom-screen-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update custom screen",
    answer: "I can update the selected custom screen.",
    summary: "Update custom screen metadata and binding.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-update-1",
        type: "custom-screen.update",
        title: "Update Projects Screen",
        description: "Update selected custom screen.",
        input: {
          id: screen.id,
          name: "Projects Screen",
          expectedStatus: "draft",
          expectedContentTypeId: contentType.id,
          patch: {
            name: "Projects Admin",
            status: "active",
            showInSidebar: true,
            sidebarLabel: "Projects",
            binding: {
              widgetId: "hero-1",
              propPath: "headline",
              field: "title",
              mode: "readwrite",
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-custom-screen-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.customScreens[0]?.name).toBe("Projects Admin");
  expect(deps.__state.customScreens[0]?.showInSidebar).toBe(true);
  expect(deps.__state.customScreens[0]?.bindings[0]?.mode).toBe("readwrite");
  expect(deps.__state.customScreens[0]?.blocks[0]?.id).toBe("hero-1");
});

test("dryRunAssistantActionPlan treats matching custom screen upserts as noop", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "House Projects",
    slug: "house-projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createCustomScreen({
    name: "House Projects",
    contentTypeId: contentType.id,
    status: "active",
    showInSidebar: true,
    sidebarLabel: "House Projects",
    blocks: [
      {
        id: "header-1",
        type: "screen-record-header",
        data: {
          title: "Record overview",
        },
      },
    ],
    bindings: [
      {
        id: "binding-header-title",
        widgetId: "header-1",
        propPath: "title",
        field: "title",
        mode: "read",
      },
    ],
  });

  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-upsert-noop",
    status: "ready",
    intentId: "custom-screen-upsert",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Upsert custom screen",
    answer: "I can keep the selected custom screen as-is.",
    summary: "Verify custom screen reruns stay noop.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-upsert-1",
        type: "custom-screen.upsert",
        title: "Create a dedicated House Projects admin screen",
        description: "Keep the current House Projects screen contract.",
        input: {
          name: "House Projects",
          contentTypeSlug: "house-projects",
          status: "active",
          showInSidebar: true,
          sidebarLabel: "House Projects",
          blocks: [
            {
              id: "header-1",
              type: "screen-record-header",
              data: {
                title: "Record overview",
              },
            },
          ],
          bindings: [
            {
              id: "binding-header-title",
              widgetId: "header-1",
              propPath: "title",
              field: "title",
              mode: "read",
            },
          ],
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);

  expect(preview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan patches custom screen widget block data", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Projects",
    slug: "projects",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const screen = await deps.createCustomScreen({
    name: "Projects Screen",
    contentTypeId: contentType.id,
    status: "draft",
    showInSidebar: false,
    sidebarLabel: null,
    blocks: [
      { id: "hero-1", type: "hero", data: { headline: "Old headline", body: "Keep body" } },
      { id: "text-1", type: "rich-text-section", data: { title: "Keep sibling" } },
    ],
    bindings: [],
  });
  const plan: AssistantActionPlan = {
    id: "plan-custom-screen-widget-patch",
    status: "ready",
    intentId: "custom-screen-widget-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Patch custom screen widget",
    answer: "I can patch the selected custom screen widget.",
    summary: "Patch screen hero headline.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "custom-screen-widget-patch-1",
        type: "custom-screen.widget.patch",
        title: "Patch hero",
        description: "Patch selected custom screen widget.",
        input: {
          id: screen.id,
          name: "Projects Screen",
          expectedStatus: "draft",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New headline",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-custom-screen-widget-patch-1",
    },
    deps
  );

  expect(deps.__state.customScreens[0]?.blocks[0]?.data.headline).toBe("New headline");
  expect(deps.__state.customScreens[0]?.blocks[0]?.data.body).toBe("Keep body");
  expect(deps.__state.customScreens[0]?.blocks[1]?.data.title).toBe("Keep sibling");
});

test("executeAssistantActionPlan deletes pages through explicit delete actions", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "/contact",
    data: { blocks: [] },
    authorId: "user-1",
  });
  await deps.publishPage(page.id, "user-1", { blocks: [] });
  const plan: AssistantActionPlan = {
    id: "plan-delete-contact-page",
    status: "ready",
    intentId: "page-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Contact",
    answer: "I can delete the selected page.",
    summary: "Delete active page Contact.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-delete-contact",
        type: "page.delete",
        title: "Delete Contact",
        description: "Delete selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "published",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings).toContain(
    "This page is published and may be visible on the public site."
  );

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted page "Contact".');
  expect(await deps.getPage(page.id)).toBeNull();
});

test("executeAssistantActionPlan updates page metadata and preserves page blocks", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Contact",
    slug: "/contact",
    data: {
      blocks: [{ id: "hero", type: "hero", data: { title: "Hello" } }],
      settings: {
        template: "landing",
        showInNav: true,
      },
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-update-contact-page",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact",
    answer: "I can update the selected page.",
    summary: "Update active page metadata.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-contact",
        type: "page.update",
        title: "Update Contact",
        description: "Update selected page.",
        input: {
          id: page.id,
          title: "Contact",
          slug: "/contact",
          expectedStatus: "draft",
          patch: {
            title: "Contact Us",
            slug: "/contact-us",
            settings: {
              showInNav: false,
              template: "landing",
              seo: {
                title: "Contact Us",
                description: "Reach our team.",
              },
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(executed.results[0]?.message).toBe('Updated page "Contact Us".');
  expect(deps.__state.pages[0]?.title).toBe("Contact Us");
  expect(deps.__state.pages[0]?.slug).toBe("/contact-us");
  expect((deps.__state.pages[0]?.currentData.blocks as Array<{ id: string }>)[0]?.id).toBe("hero");
  expect((deps.__state.pages[0]?.currentData.settings as { showInNav?: boolean })?.showInNav).toBe(
    false
  );
});

test("executeAssistantActionPlan publishes page updates through page service", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Landing",
    slug: "/landing",
    data: { blocks: [] },
  });
  const plan: AssistantActionPlan = {
    id: "plan-publish-landing-page",
    status: "ready",
    intentId: "page-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Publish Landing",
    answer: "I can publish the selected page.",
    summary: "Publish active page.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-update-landing",
        type: "page.update",
        title: "Publish Landing",
        description: "Publish selected page.",
        input: {
          id: page.id,
          title: "Landing",
          slug: "/landing",
          expectedStatus: "draft",
          patch: {
            status: "published",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.warnings[0]).toContain("public site");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-update-publish-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.pages[0]?.status).toBe("published");
  expect(deps.__state.pages[0]?.publishedData).not.toBeNull();
});

test("executeAssistantActionPlan deletes widget templates through explicit delete actions", async () => {
  const deps = createDeps();
  const now = new Date("2026-04-10T12:00:00.000Z");
  deps.__state.widgetTemplates.push({
    id: "template-1",
    name: "Contact CTA",
    description: null,
    category: "Marketing",
    status: "published",
    blocks: [],
    settings: {},
    createdAt: now,
    updatedAt: now,
  });
  const plan: AssistantActionPlan = {
    id: "plan-delete-contact-template",
    status: "ready",
    intentId: "widget-template-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Contact CTA",
    answer: "I can delete the selected widget template.",
    summary: "Delete active widget template Contact CTA.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "widget-template-delete-contact",
        type: "widget-template.delete",
        title: "Delete Contact CTA",
        description: "Delete selected widget template.",
        input: {
          id: "template-1",
          name: "Contact CTA",
          expectedStatus: "published",
          expectedCategory: "Marketing",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings).toContain(
    "This reusable widget template may be referenced by pages or other templates."
  );
  expect(preview.changes[0]?.warnings).toContain("This widget template is published.");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-widget-template-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted widget template "Contact CTA".');
  expect(await deps.getWidgetTemplate("template-1")).toBeNull();
});

test("executeAssistantActionPlan updates widget template metadata and preserves blocks", async () => {
  const deps = createDeps();
  const now = new Date("2026-04-10T12:00:00.000Z");
  deps.__state.widgetTemplates.push({
    id: "template-1",
    name: "Contact CTA",
    description: null,
    category: "Marketing",
    status: "draft",
    blocks: [{ id: "hero-1", type: "hero", data: { headline: "Hello" } }],
    settings: {
      layout: {
        wrapper: {
          container: "full",
          padding: { top: "none", bottom: "none" },
          background: {
            color: "transparent",
            media: { type: "none", source: "external", src: null },
          },
        },
        sections: {
          gap: "none",
          defaults: {
            container: "default",
            padding: { top: "xl", bottom: "xl" },
            margin: { top: "none", bottom: "none" },
          },
        },
        applyDefaultsToNewBlocks: false,
      },
    },
    createdAt: now,
    updatedAt: now,
  });
  const plan: AssistantActionPlan = {
    id: "plan-update-contact-template",
    status: "ready",
    intentId: "widget-template-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Contact CTA",
    answer: "I can update the selected widget template.",
    summary: "Update active widget template.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "widget-template-update-contact",
        type: "widget-template.update",
        title: "Update Contact CTA",
        description: "Update selected widget template.",
        input: {
          id: "template-1",
          name: "Contact CTA",
          expectedStatus: "draft",
          expectedCategory: "Marketing",
          patch: {
            name: "Contact CTA Updated",
            status: "published",
            settings: {
              wrapperContainer: "narrow",
              sectionGap: "md",
            },
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-widget-template-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(executed.results[0]?.message).toBe('Updated widget template "Contact CTA Updated".');
  expect(deps.__state.widgetTemplates[0]?.name).toBe("Contact CTA Updated");
  expect(deps.__state.widgetTemplates[0]?.status).toBe("published");
  expect(deps.__state.widgetTemplates[0]?.blocks[0]?.id).toBe("hero-1");
  expect(
    (deps.__state.widgetTemplates[0]?.settings.layout as { wrapper?: { container?: string } })
      ?.wrapper?.container
  ).toBe("narrow");
});

test("executeAssistantActionPlan patches widget template block data and preserves siblings", async () => {
  const deps = createDeps();
  const now = new Date("2026-04-10T12:00:00.000Z");
  deps.__state.widgetTemplates.push({
    id: "template-1",
    name: "Hero Template",
    description: null,
    category: "Marketing",
    status: "draft",
    blocks: [
      { id: "hero-1", type: "hero", data: { headline: "Old headline", body: "Keep body" } },
      { id: "text-1", type: "rich-text-section", data: { title: "Keep sibling" } },
    ],
    settings: {},
    createdAt: now,
    updatedAt: now,
  });
  const plan: AssistantActionPlan = {
    id: "plan-template-block-patch",
    status: "ready",
    intentId: "widget-template-block-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Patch template hero",
    answer: "I can patch the selected widget template block.",
    summary: "Patch template hero headline.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "widget-template-block-patch-hero",
        type: "widget-template.block.patch",
        title: "Patch hero headline",
        description: "Patch selected template block.",
        input: {
          id: "template-1",
          name: "Hero Template",
          expectedStatus: "draft",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New headline",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-widget-template-block-patch-1",
    },
    deps
  );

  const firstBlockData = deps.__state.widgetTemplates[0]?.blocks[0]?.data as
    | Record<string, unknown>
    | undefined;
  const secondBlockData = deps.__state.widgetTemplates[0]?.blocks[1]?.data as
    | Record<string, unknown>
    | undefined;
  expect(firstBlockData?.headline).toBe("New headline");
  expect(firstBlockData?.body).toBe("Keep body");
  expect(secondBlockData?.title).toBe("Keep sibling");
});

test("executeAssistantActionPlan deletes listing queries and templates through explicit delete actions", async () => {
  const deps = createDeps();
  const query = await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-products",
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });
  const template = await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Product cards",
    layout: "grid",
    config: { fields: [] },
  });
  const plan: AssistantActionPlan = {
    id: "plan-listing-delete",
    status: "ready",
    intentId: "listing-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete listing resources",
    answer: "I can delete selected listing resources.",
    summary: "Delete listing query and template.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-delete-1",
        type: "listing-query.delete",
        title: "Delete Products Catalog Query",
        description: "Delete selected listing query.",
        input: {
          id: query.id,
          name: "Products Catalog Query",
        },
      },
      {
        id: "listing-template-delete-1",
        type: "listing-template.delete",
        title: "Delete Products Grid",
        description: "Delete selected listing template.",
        input: {
          id: template.id,
          name: "Products Grid",
          slug: "products-grid",
          expectedLayout: "grid",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes.map((change) => change.operation)).toEqual(["delete", "delete"]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(2);
  expect(deps.__state.listingQueries).toHaveLength(0);
  expect(deps.__state.listingTemplates).toHaveLength(0);
});

test("executeAssistantActionPlan blocks listing deletes when page references remain", async () => {
  const deps = createDeps();
  const query = await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-products",
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });
  const template = await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Product cards",
    layout: "grid",
    config: { fields: [] },
  });
  await deps.createPage({
    title: "Products",
    slug: "/products",
    data: {
      blocks: [
        {
          id: "catalog-list",
          type: "content-list",
          data: {
            source: {
              listingQueryId: query.id,
              listingTemplateId: template.id,
            },
          },
        },
      ],
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-listing-delete-blocked",
    status: "ready",
    intentId: "listing-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete listing query",
    answer: "I can delete selected listing query.",
    summary: "Delete listing query.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-delete-1",
        type: "listing-query.delete",
        title: "Delete Products Catalog Query",
        description: "Delete selected listing query.",
        input: {
          id: query.id,
          name: "Products Catalog Query",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.warnings[0]).toContain("referenced by 1 page");
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-delete-blocked-1",
    },
    deps
  );

  expect(executed.summary.failed).toBe(1);
  expect(executed.results[0]?.errorCode).toBe("assistant_action_dependency_conflict");
  expect(deps.__state.listingQueries).toHaveLength(1);
});

test("executeAssistantActionPlan updates listing query and template config without broad rewrites", async () => {
  const deps = createDeps();
  await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-products",
        includeDrafts: true,
      },
      filters: [{ field: "status", operator: "eq", value: "active" }],
      sort: [{ field: "title", dir: "asc" }],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });
  await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Product cards",
    layout: "grid",
    config: {
      columns: 3,
      card: { showImage: true },
    },
  });
  const query = deps.__state.listingQueries[0]!;
  const template = deps.__state.listingTemplates[0]!;
  const plan: AssistantActionPlan = {
    id: "plan-listing-update",
    status: "ready",
    intentId: "listing-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update listing resources",
    answer: "I can update selected listing resources.",
    summary: "Update listing query and template.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-update-1",
        type: "listing-query.update",
        title: "Update Products Query",
        description: "Update selected listing query.",
        input: {
          id: query.id,
          name: query.name,
          patch: {
            limit: 24,
            includeDrafts: false,
          },
        },
      },
      {
        id: "listing-template-update-1",
        type: "listing-template.update",
        title: "Update Products Grid",
        description: "Update selected listing template.",
        input: {
          id: template.id,
          name: template.name,
          slug: template.slug,
          expectedLayout: "grid",
          patch: {
            layout: "list",
            card: { showImage: false },
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(2);
  expect(deps.__state.listingQueries[0]?.query.pagination).toEqual({ limit: 24, offset: 0 });
  expect(deps.__state.listingQueries[0]?.query.sourceConfig).toEqual({
    contentTypeId: "ct-products",
    includeDrafts: false,
  });
  expect(deps.__state.listingQueries[0]?.query.filters).toHaveLength(1);
  expect(deps.__state.listingTemplates[0]?.layout).toBe("list");
  expect(deps.__state.listingTemplates[0]?.config.columns).toBe(3);
  expect(deps.__state.listingTemplates[0]?.config.card).toEqual({ showImage: false });
});

test("executeAssistantActionPlan deletes empty forms through explicit delete actions", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Contact Form",
    slug: "contact-form",
    status: "draft",
    description: "Contact intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  const plan: AssistantActionPlan = {
    id: "plan-form-delete",
    status: "ready",
    intentId: "form-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Contact Form",
    answer: "I can delete the selected form.",
    summary: "Delete empty form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-delete-1",
        type: "form.delete",
        title: "Delete Contact Form",
        description: "Delete selected form.",
        input: {
          id: form.id,
          name: "Contact Form",
          slug: "contact-form",
          expectedStatus: "draft",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.conflicts).toEqual([]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted form "Contact Form".');
  expect(deps.__state.forms).toHaveLength(0);
});

test("executeAssistantActionPlan blocks form hard delete when submissions exist", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Lead Capture",
    slug: "lead-capture",
    status: "published",
    description: "Lead intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  deps.__state.formSubmissionCounts.set(form.id, 2);
  const plan: AssistantActionPlan = {
    id: "plan-form-delete-blocked",
    status: "ready",
    intentId: "form-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Lead Capture",
    answer: "I can delete the selected form.",
    summary: "Delete selected form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-delete-1",
        type: "form.delete",
        title: "Delete Lead Capture",
        description: "Delete selected form.",
        input: {
          id: form.id,
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.warnings[0]).toContain("2 submissions");
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-delete-blocked-1",
    },
    deps
  );

  expect(executed.summary.failed).toBe(1);
  expect(executed.results[0]?.errorCode).toBe("assistant_action_dependency_conflict");
  expect(deps.__state.forms).toHaveLength(1);
});

test("executeAssistantActionPlan archives forms while retaining submissions", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Lead Capture",
    slug: "lead-capture",
    status: "published",
    description: "Lead intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  deps.__state.formSubmissionCounts.set(form.id, 3);
  const plan: AssistantActionPlan = {
    id: "plan-form-archive",
    status: "ready",
    intentId: "form-archive",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Archive Lead Capture",
    answer: "I can archive the selected form.",
    summary: "Archive selected form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-archive-1",
        type: "form.archive",
        title: "Archive Lead Capture",
        description: "Archive selected form.",
        input: {
          id: form.id,
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");
  expect(preview.changes[0]?.warnings[0]).toContain("submissions are retained");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-archive-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(executed.results[0]?.message).toBe('Archived form "Lead Capture".');
  expect(deps.__state.forms[0]?.status).toBe("archived");
  expect(deps.__state.formSubmissionCounts.get(form.id)).toBe(3);
});

test("executeAssistantActionPlan updates forms without reading submissions", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Lead Capture",
    slug: "lead-capture",
    status: "published",
    description: "Lead intake",
    successMessage: "Thanks.",
    submissionAccess: "public",
  });
  deps.__state.formSubmissionCounts.set(form.id, 3);
  const plan: AssistantActionPlan = {
    id: "plan-form-update",
    status: "ready",
    intentId: "form-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update Lead Capture",
    answer: "I can update the selected form.",
    summary: "Update selected form.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-update-1",
        type: "form.update",
        title: "Update Lead Capture",
        description: "Update selected form.",
        input: {
          id: form.id,
          name: "Lead Capture",
          slug: "lead-capture",
          expectedStatus: "published",
          patch: {
            name: "Lead Capture Updated",
            submissionAccess: "internal",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.forms[0]?.name).toBe("Lead Capture Updated");
  expect(deps.__state.forms[0]?.submissionAccess).toBe("internal");
  expect(deps.__state.formSubmissionCounts.get(form.id)).toBe(3);
});

test("executeAssistantActionPlan upserts menu items without duplicates", async () => {
  const deps = createDeps();
  const plan: AssistantActionPlan = {
    id: "plan-menu-item",
    status: "ready",
    intentId: "menu-item",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Add menu item",
    answer: "I can add a menu item.",
    summary: "Add products to the primary menu.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-products",
        type: "menu.item.upsert",
        title: "Add products menu item",
        description: "Add products catalog link to navigation.",
        input: {
          menuId: "menu-primary",
          label: "Products",
          href: "/products",
          orderIndex: 0,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("create");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "permission",
      targetKey: "menus:write",
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.resourceId).toBe("menu-item-1");
  expect(executed.results[0]?.publicHref).toBe("/products");
  expect(deps.__state.menuItemsByMenu.get("menu-primary")).toHaveLength(1);

  const menuAction = plan.actions[0];
  if (!menuAction || menuAction.type !== "menu.item.upsert") {
    throw new Error("missing_menu_action");
  }
  const updatedAction: Extract<AssistantPlannedAction, { type: "menu.item.upsert" }> = {
    ...menuAction,
    input: {
      ...menuAction.input,
      label: "Products Catalog",
    },
  };
  const updatedPlan: AssistantActionPlan = {
    ...plan,
    id: "plan-menu-item-update",
    actions: [updatedAction],
  };
  const updatePreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(updatePreview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan: updatedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-2",
    },
    deps
  );
  expect(deps.__state.menuItemsByMenu.get("menu-primary")).toHaveLength(1);
  expect(deps.__state.menuItemsByMenu.get("menu-primary")?.[0]?.label).toBe("Products Catalog");

  const noopPreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan updates menu items and preserves unrelated tree", async () => {
  const deps = createDeps();
  deps.__state.menuItemsByMenu.set("menu-primary", [
    {
      id: "menu-products",
      label: "Products",
      href: "/products",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      settings: {},
    },
    {
      id: "menu-about",
      label: "About",
      href: "/about",
      pageId: null,
      parentId: null,
      orderIndex: 1,
      settings: {},
    },
  ]);
  const plan: AssistantActionPlan = {
    id: "plan-menu-item-domain-update",
    status: "ready",
    intentId: "menu-item-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update menu item",
    answer: "I can update the selected menu item.",
    summary: "Update menu item.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-products-update",
        type: "menu.item.update",
        title: "Update Products menu item",
        description: "Update selected menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
          patch: {
            label: "Products Catalog",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.menuItemsByMenu.get("menu-primary")?.map((item) => item.label)).toEqual([
    "Products Catalog",
    "About",
  ]);
});

test("executeAssistantActionPlan upserts seo documents for known targets", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Products",
    slug: "/products",
    data: { blocks: [] },
  });
  const plan: AssistantActionPlan = {
    id: "plan-seo-document",
    status: "ready",
    intentId: "seo-document",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Update SEO",
    answer: "I can update SEO metadata.",
    summary: "Update products page SEO.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "seo-products",
        type: "seo.document.upsert",
        title: "Update products SEO",
        description: "Add SEO metadata for the products page.",
        input: {
          targetType: "page",
          targetId: page.id,
          seo: {
            title: "Products Catalog",
            description: "Browse the product catalog.",
            robots: "index,follow",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("create");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "page",
      targetKey: page.id,
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-seo-1",
    },
    deps
  );

  expect(executed.summary.create).toBe(1);
  expect(executed.results[0]?.resourceId).toBe("seo-1");
  expect(deps.__state.seoDocuments[0]?.slug).toBe("/products");
  expect(deps.__state.seoDocuments[0]?.title).toBe("Products Catalog");

  const seoAction = plan.actions[0];
  if (!seoAction || seoAction.type !== "seo.document.upsert") {
    throw new Error("missing_seo_action");
  }
  const updatedAction: Extract<AssistantPlannedAction, { type: "seo.document.upsert" }> = {
    ...seoAction,
    input: {
      ...seoAction.input,
      seo: {
        title: "Products Catalog",
        description: "Browse updated products.",
        robots: "index,follow",
      },
    },
  };
  const updatedPlan: AssistantActionPlan = {
    ...plan,
    id: "plan-seo-document-update",
    actions: [updatedAction],
  };
  const updatePreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(updatePreview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan: updatedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-seo-2",
    },
    deps
  );
  expect(deps.__state.seoDocuments).toHaveLength(1);
  expect(deps.__state.seoDocuments[0]?.description).toBe("Browse updated products.");

  const noopPreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan deletes menu items while preserving unrelated items", async () => {
  const deps = createDeps();
  deps.__state.menuItemsByMenu.set("menu-primary", [
    {
      id: "menu-products",
      label: "Products",
      href: "/products",
      pageId: null,
      parentId: null,
      orderIndex: 0,
      settings: {},
    },
    {
      id: "menu-products-child",
      label: "Featured",
      href: "/products/featured",
      pageId: null,
      parentId: "menu-products",
      orderIndex: 1,
      settings: {},
    },
    {
      id: "menu-about",
      label: "About",
      href: "/about",
      pageId: null,
      parentId: null,
      orderIndex: 2,
      settings: {},
    },
  ]);
  const plan: AssistantActionPlan = {
    id: "plan-menu-item-delete",
    status: "ready",
    intentId: "menu-item-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Products menu item",
    answer: "I can delete the selected menu item.",
    summary: "Delete menu item.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "menu-products-delete",
        type: "menu.item.delete",
        title: "Delete Products",
        description: "Delete selected menu item.",
        input: {
          menuId: "menu-primary",
          itemId: "menu-products",
          label: "Products",
          expectedHref: "/products",
          expectedParentId: null,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");
  expect(preview.changes[0]?.warnings[0]).toContain("nested child");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-menu-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe('Deleted menu item "Products".');
  expect(deps.__state.menuItemsByMenu.get("menu-primary")?.map((item) => item.id)).toEqual([
    "menu-about",
  ]);
});

test("executeAssistantActionPlan deletes SEO documents through explicit delete actions", async () => {
  const deps = createDeps();
  const page = await deps.createPage({
    title: "Products",
    slug: "/products",
    data: { blocks: [] },
  });
  const seo = await deps.upsertSeoDocument({
    targetType: "page",
    targetId: page.id,
    slug: "/products",
    title: "Products Catalog",
    description: "Browse the product catalog.",
    robots: "index,follow",
  });
  const plan: AssistantActionPlan = {
    id: "plan-seo-document-delete",
    status: "ready",
    intentId: "seo-document-delete",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Delete Products SEO",
    answer: "I can delete the selected SEO document.",
    summary: "Delete products SEO document.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "seo-products-delete",
        type: "seo.document.delete",
        title: "Delete Products SEO",
        description: "Delete selected SEO document.",
        input: {
          id: seo.id,
          targetType: "page",
          targetId: page.id,
          expectedSlug: "/products",
          expectedTitle: "Products Catalog",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("delete");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-seo-delete-1",
    },
    deps
  );

  expect(executed.summary.delete).toBe(1);
  expect(executed.results[0]?.message).toBe(`Deleted SEO document for page ${page.id}.`);
  expect(deps.__state.seoDocuments).toHaveLength(0);
});

test("executeAssistantActionPlan updates entries and SEO documents through domain services", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        price: { type: "number" },
      },
    },
  });
  const entry = await deps.createEntry(contentType.id, {
    title: "Sample Product",
    slug: "sample-product",
    data: { title: "Sample Product", price: 10 },
    authorId: "user-1",
  });
  const seo = await deps.upsertSeoDocument({
    targetType: "entry",
    targetId: entry.id,
    slug: "sample-product",
    title: "Sample Product SEO",
    description: "Old description.",
  });
  const plan: AssistantActionPlan = {
    id: "plan-entry-seo-update",
    status: "ready",
    intentId: "entry-seo-update",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Update entry and SEO",
    answer: "I can update the selected entry and SEO document.",
    summary: "Update entry and SEO.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "entry-update-1",
        type: "entry.update",
        title: "Update Sample Product",
        description: "Update selected entry.",
        input: {
          id: entry.id,
          contentTypeSlug: "products",
          expectedTitle: "Sample Product",
          expectedSlug: "sample-product",
          expectedStatus: "draft",
          patch: {
            title: "Sample Product Updated",
            values: { title: "Sample Product Updated" },
          },
        },
      },
      {
        id: "seo-update-1",
        type: "seo.document.update",
        title: "Update Sample Product SEO",
        description: "Update selected SEO document.",
        input: {
          id: seo.id,
          targetType: "entry",
          targetId: entry.id,
          expectedSlug: "sample-product",
          expectedTitle: "Sample Product SEO",
          patch: {
            description: "Updated description.",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-entry-seo-update-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(2);
  expect(deps.__state.entries[0]?.title).toBe("Sample Product Updated");
  expect(deps.__state.entries[0]?.data.price).toBe(10);
  expect(deps.__state.seoDocuments.find((item) => item.id === seo.id)?.description).toBe(
    "Updated description."
  );
});

test("executeAssistantActionPlan attaches existing media references to entries", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
        heroImage: { type: "string", xFieldType: "media" },
      },
    },
  });
  const entry = await deps.createEntry(contentType.id, {
    title: "Sample Product",
    slug: "sample-product",
    data: {
      title: "Sample Product",
    },
    authorId: "user-1",
  });
  deps.__state.mediaAssets.push({
    id: "media-1",
    key: "media-1.jpg",
    url: "/media/media-1.jpg",
    originalName: "media-1.jpg",
    type: "image",
    mimeType: "image/jpeg",
    size: 100,
    alt: null,
    title: null,
    caption: null,
    createdBy: "user-1",
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
  });
  const plan: AssistantActionPlan = {
    id: "plan-media-reference",
    status: "ready",
    intentId: "media-reference",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Attach media",
    answer: "I can attach media to an entry.",
    summary: "Attach hero image to draft entry.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "media-entry-hero",
        type: "media.reference.attach",
        title: "Attach hero image",
        description: "Attach existing media to the hero image field.",
        input: {
          mediaId: "media-1",
          targetType: "entry",
          targetId: entry.id,
          field: "heroImage",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");
  expect(preview.changes[0]?.dependencies).toEqual([
    {
      actionId: null,
      targetType: "media",
      targetKey: "media-1",
      optional: false,
    },
    {
      actionId: null,
      targetType: "entry",
      targetKey: entry.id,
      optional: false,
    },
  ]);

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-media-1",
    },
    deps
  );

  expect(executed.summary.update).toBe(1);
  expect(deps.__state.entries[0]?.data.heroImage).toBe("media-1");

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-media-2",
    },
    deps
  );
  expect(deps.__state.entries[0]?.data.heroImage).toBe("media-1");
});

test("content route actions preserve, clear, and replace detailPageId links", async () => {
  const deps = createDeps();
  await deps.setSetting("site.contentRoutes", [
    {
      type: "blog",
      listPath: "/blog",
      detailPath: "/blog/:slug",
      enabled: true,
      detailPageId: "4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    },
  ]);

  const preservePlan: AssistantActionPlan = {
    id: "plan-route-preserve",
    status: "ready",
    intentId: "route-preserve",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Preserve route link",
    answer: "I can preserve the linked detail page.",
    summary: "Keep the current route link.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "route-blog-preserve",
        type: "setting.content-route.upsert",
        title: "Update blog route",
        description: "Update the route without changing the detail page link.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
        },
      },
    ],
  };

  const preservePreview = await dryRunAssistantActionPlan({ plan: preservePlan }, deps);
  expect(preservePreview.changes[0]?.operation).toBe("noop");
  await executeAssistantActionPlan(
    {
      plan: preservePlan,
      actorId: "user-1",
      idempotencyKey: "assistant-route-preserve-1",
    },
    deps
  );
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBe("4dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");

  const clearPlan: AssistantActionPlan = {
    ...preservePlan,
    id: "plan-route-clear",
    intentId: "route-clear",
    title: "Clear route link",
    actions: [
      {
        id: "route-blog-clear",
        type: "setting.content-route.upsert",
        title: "Clear blog detail page link",
        description: "Clear the linked detail page.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
          detailPageId: null,
        },
      },
    ],
  };
  await executeAssistantActionPlan(
    {
      plan: clearPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-route-clear-1",
    },
    deps
  );
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBeNull();

  const replacePlan: AssistantActionPlan = {
    ...preservePlan,
    id: "plan-route-replace",
    intentId: "route-replace",
    title: "Replace route link",
    actions: [
      {
        id: "route-blog-replace",
        type: "setting.content-route.upsert",
        title: "Replace blog detail page link",
        description: "Set a new linked detail page.",
        input: {
          typeSlug: "blog",
          listPath: "/blog",
          detailPath: "/blog/:slug",
          enabled: true,
          detailPageId: "6dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
        },
      },
    ],
  };
  await executeAssistantActionPlan(
    {
      plan: replacePlan,
      actorId: "user-1",
      idempotencyKey: "assistant-route-replace-1",
    },
    deps
  );
  expect(
    (((await deps.getSetting("site.contentRoutes")) as ContentRouteSetting[]) ?? [])[0]
      ?.detailPageId
  ).toBe("6dd7f4d4-48d8-53f7-a9e6-0d01f6b89e6c");
});

test("executeAssistantActionPlan patches listing query filters without rewriting config", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string" },
      },
    },
  });
  await deps.createListingQuery({
    name: "Products Catalog Query",
    description: "Product listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: contentType.id,
      },
      filters: [],
      sort: [{ field: "title", dir: "asc" }],
      limit: 12,
    },
  });
  const filters = [
    {
      field: "category",
      operator: "eq",
      value: "chairs",
    },
  ];
  const plan: AssistantActionPlan = {
    id: "plan-listing-filters",
    status: "ready",
    intentId: "listing-filters",
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
    title: "Patch listing filters",
    answer: "I can patch listing filters.",
    summary: "Add filters to an existing listing query.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-query-filters",
        type: "listing-query.filters.patch",
        title: "Add category filter",
        description: "Patch product listing filters.",
        input: {
          listingQueryName: "Products Catalog Query",
          filters,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-filters-1",
    },
    deps
  );
  expect(deps.__state.listingQueries[0]?.query.filters).toEqual(filters);
  expect((deps.__state.listingQueries[0]?.query as { limit?: number } | undefined)?.limit).toBe(12);

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan patches listing template card config without rewriting config", async () => {
  const deps = createDeps();
  await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Product listing template",
    layout: "grid",
    config: {
      columns: 3,
      card: {
        showImage: true,
      },
    },
  });
  const card = {
    showImage: true,
    showPrice: true,
    showStatus: true,
  };
  const plan: AssistantActionPlan = {
    id: "plan-listing-card",
    status: "ready",
    intentId: "listing-card",
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
    title: "Patch listing card",
    answer: "I can patch listing card config.",
    summary: "Add price and status to listing cards.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "listing-card-patch",
        type: "listing-template.card.patch",
        title: "Show price and status",
        description: "Patch listing template card config.",
        input: {
          listingTemplateSlug: "products-grid",
          card,
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-listing-card-1",
    },
    deps
  );
  expect(deps.__state.listingTemplates[0]?.config.card).toEqual(card);
  expect(deps.__state.listingTemplates[0]?.config.columns).toBe(3);

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan upserts top-level page widget blocks and preserves legacy blocks", async () => {
  const deps = createDeps();
  await deps.createPage({
    title: "Products",
    slug: "/products",
    data: {
      blocks: [
        {
          id: "legacy-1",
          type: "legacy-widget",
          data: {
            untouched: true,
          },
        },
      ],
      settings: {
        template: "default",
      },
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-page-widget",
    status: "ready",
    intentId: "page-widget",
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
    title: "Patch page widget",
    answer: "I can patch a page widget.",
    summary: "Append a spacer block.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-widget-spacer",
        type: "page.widget.patch",
        title: "Add spacer",
        description: "Append a spacer block to the page.",
        input: {
          pageSlug: "/products",
          operation: "upsert-block",
          block: {
            id: "assistant-spacer",
            type: "spacer",
            data: {},
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-widget-1",
    },
    deps
  );

  const blocks = deps.__state.pages[0]?.currentData.blocks as Array<Record<string, unknown>>;
  expect(blocks).toHaveLength(2);
  expect(blocks[0]).toMatchObject({ id: "legacy-1", type: "legacy-widget" });
  expect(blocks[1]).toMatchObject({
    id: "assistant-spacer",
    type: "spacer",
    variant: "responsive",
  });

  const noopPreview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan patches selected page widget data and preserves unrelated blocks", async () => {
  const deps = createDeps();
  await deps.createPage({
    title: "Landing",
    slug: "/landing",
    data: {
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            headline: "Old title",
            body: "Welcome",
          },
        },
        {
          id: "text-1",
          type: "rich-text-section",
          data: {
            text: "Keep this",
          },
        },
      ],
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-page-widget-data",
    status: "ready",
    intentId: "page-widget-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Patch selected block",
    answer: "I can patch the selected block.",
    summary: "Patch hero title.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-widget-title",
        type: "page.widget.patch",
        title: "Patch hero title",
        description: "Patch selected block data.",
        input: {
          pageSlug: "/landing",
          operation: "patch-data",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["headline"],
          value: "New title",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-page-widget-data-1",
    },
    deps
  );

  const blocks = deps.__state.pages[0]?.currentData.blocks as Array<{
    id: string;
    data: Record<string, unknown>;
  }>;
  expect(blocks[0]?.data.headline).toBe("New title");
  expect(blocks[0]?.data.body).toBe("Welcome");
  expect(blocks[1]?.data.text).toBe("Keep this");
});

test("dryRunAssistantActionPlan blocks missing page widget data paths", async () => {
  const deps = createDeps();
  await deps.createPage({
    title: "Landing",
    slug: "/landing",
    data: {
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          data: {
            title: "Old title",
          },
        },
      ],
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-page-widget-missing-path",
    status: "ready",
    intentId: "page-widget-patch",
    promptKind: "refinement_request",
    intentFamily: "unknown",
    title: "Patch selected block",
    answer: "I can patch the selected block.",
    summary: "Patch missing field.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-widget-missing",
        type: "page.widget.patch",
        title: "Patch missing field",
        description: "Patch selected block data.",
        input: {
          pageSlug: "/landing",
          operation: "patch-data",
          blockId: "hero-1",
          expectedBlockType: "hero",
          dataPath: ["missing"],
          value: "New value",
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.conflicts[0]?.message).toBe(
    "Selected page widget data path does not exist."
  );
});

test("dryRunAssistantActionPlan rejects unsupported page widget patch types", async () => {
  const deps = createDeps();
  await deps.createPage({
    title: "Products",
    slug: "/products",
    data: {
      blocks: [],
    },
  });
  const plan: AssistantActionPlan = {
    id: "plan-page-widget-unsupported",
    status: "ready",
    intentId: "page-widget",
    promptKind: "refinement_request",
    intentFamily: "product_catalog",
    title: "Patch page widget",
    answer: "I can patch a page widget.",
    summary: "Append a widget block.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-widget-unknown",
        type: "page.widget.patch",
        title: "Add unknown widget",
        description: "Append an unknown widget block to the page.",
        input: {
          pageSlug: "/products",
          operation: "upsert-block",
          block: {
            id: "assistant-unknown",
            type: "unknown-widget",
            data: {},
          },
        },
      },
    ],
  };

  await expect(dryRunAssistantActionPlan({ plan }, deps)).rejects.toThrow("widget_unknown_type");
});

test("executeAssistantActionPlan upserts safe form automation without duplicates", async () => {
  const deps = createDeps();
  const form = await deps.createForm({
    name: "Contact",
    slug: "contact",
    status: "published",
    submissionAccess: "public",
  });
  const plan: AssistantActionPlan = {
    id: "plan-form-automation",
    status: "ready",
    intentId: "form-automation",
    promptKind: "refinement_request",
    intentFamily: "lead_capture_site",
    title: "Set form automation",
    answer: "I can set a form automation.",
    summary: "Set success message automation.",
    confidence: 0.9,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "form-success",
        type: "form.automation.upsert",
        title: "Set success message",
        description: "Set form success message automation.",
        input: {
          formId: form.id,
          action: {
            id: "success-message",
            type: "success_message",
            label: "Show success",
            enabled: true,
            continueOnError: true,
            condition: { operator: "always" },
            config: {
              message: "Thanks for your message.",
            },
            orderIndex: 0,
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.operation).toBe("update");

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-automation-1",
    },
    deps
  );

  expect(deps.__state.formActions.get(form.id)).toHaveLength(1);
  expect(deps.__state.formActions.get(form.id)?.[0]?.config).toEqual({
    message: "Thanks for your message.",
  });

  const formAction = plan.actions[0];
  if (!formAction || formAction.type !== "form.automation.upsert") {
    throw new Error("missing_form_action");
  }
  const updatedAction: Extract<AssistantPlannedAction, { type: "form.automation.upsert" }> = {
    ...formAction,
    input: {
      ...formAction.input,
      action: {
        ...formAction.input.action,
        config: {
          message: "Thanks. We will reply soon.",
        },
      },
    },
  };
  const updatedPlan: AssistantActionPlan = {
    ...plan,
    id: "plan-form-automation-update",
    actions: [updatedAction],
  };

  await executeAssistantActionPlan(
    {
      plan: updatedPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-form-automation-2",
    },
    deps
  );
  expect(deps.__state.formActions.get(form.id)).toHaveLength(1);
  expect(deps.__state.formActions.get(form.id)?.[0]?.config).toEqual({
    message: "Thanks. We will reply soon.",
  });

  const noopPreview = await dryRunAssistantActionPlan({ plan: updatedPlan }, deps);
  expect(noopPreview.changes[0]?.operation).toBe("noop");
});

test("executeAssistantActionPlan creates lead capture form and landing page", async () => {
  const deps = createDeps();
  const plan = buildLeadCaptureSitePlan();

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes.map((change) => change.targetType)).toEqual(["form", "page"]);

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-lead-capture-1",
    },
    deps
  );

  expect(deps.__state.forms).toHaveLength(1);
  expect(deps.__state.forms[0]?.slug).toBe("lead-capture-inquiry");
  expect(deps.__state.formFields.get("form-1")).toHaveLength(4);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.pages[0]?.slug).toBe("/kontakt");
  const blocks = deps.__state.pages[0]?.currentData.blocks as Array<Record<string, unknown>>;
  expect(blocks.map((block) => block.type)).toEqual(["rich-text-section", "form-embed"]);

  await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-lead-capture-2",
    },
    deps
  );
  expect(deps.__state.forms).toHaveLength(1);
  expect(deps.__state.pages).toHaveLength(1);
});

test("executeAssistantActionPlan creates editorial hub page without post mutations", async () => {
  const deps = createDeps();
  const plan = buildEditorialContentHubPlan();

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-editorial-hub-1",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.pages[0]?.slug).toBe("/blog");
  const blocks = deps.__state.pages[0]?.currentData.blocks as Array<Record<string, unknown>>;
  expect(blocks.map((block) => block.type)).toEqual(["rich-text-section", "posts-feed"]);
});

test("executeAssistantActionPlan creates resources and reuses idempotency key", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-1",
    },
    deps
  );
  const second = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-1",
    },
    deps
  );

  expect(first.summary.failed).toBe(0);
  expect(first.summary.create).toBe(6);
  expect(first.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
  expect(first.results.some((item) => item.publicHref === "/projekty-domow")).toBe(true);
  expect(second.summary).toEqual(first.summary);
  expect(second.results).toEqual(first.results);
  expect(second.idempotency).toEqual({ replayed: true, scope: "actor_plan_hash" });
});

test("executeAssistantActionPlan replays persisted idempotency result", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = createDeps();
  type SavedExecution = {
    idempotencyKey: string;
    actorId: string;
    planId: string;
    planHash: string;
    result: Awaited<ReturnType<typeof executeAssistantActionPlan>>;
    undoItems?: AssistantUndoManifestItem[];
  };
  let saved: SavedExecution | null = null;

  const persistentDeps = Object.assign(deps, {
    getExecutionResult: async (input: {
      idempotencyKey: string;
      actorId: string;
      planId: string;
      planHash: string;
    }) => {
      if (
        saved &&
        saved.idempotencyKey === input.idempotencyKey &&
        saved.actorId === input.actorId &&
        saved.planId === input.planId &&
        saved.planHash === input.planHash
      ) {
        return saved.result;
      }
      return null;
    },
    saveExecutionResult: async (input: {
      idempotencyKey: string;
      actorId: string;
      planId: string;
      planHash: string;
      result: Awaited<ReturnType<typeof executeAssistantActionPlan>>;
      undoItems?: AssistantUndoManifestItem[];
    }) => {
      saved = input;
    },
  });

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-persistent-1",
    },
    persistentDeps
  );
  const second = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-persistent-1",
    },
    persistentDeps
  );

  const savedRecord = saved as unknown as SavedExecution;
  expect(savedRecord.planId).toBe(plan.id);
  expect(savedRecord.result.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
  expect(savedRecord.undoItems?.length).toBe(first.results.length);
  expect(
    savedRecord.undoItems?.some(
      (item: AssistantUndoManifestItem) =>
        item.actionType === "content-type.upsert" &&
        item.resourceType === "content-type" &&
        item.undoStrategy === "delete"
    )
  ).toBe(true);
  expect(first.idempotency).toEqual({ replayed: false, scope: "actor_plan_hash" });
  expect(second.summary).toEqual(first.summary);
  expect(second.results).toEqual(first.results);
  expect(second.idempotency).toEqual({ replayed: true, scope: "actor_plan_hash" });
});

test("executeAssistantActionPlan propagates idempotency conflicts", async () => {
  const plan = buildHouseProjectsCatalogPlan();
  const deps = Object.assign(createDeps(), {
    getExecutionResult: async () => {
      throw new Error("assistant_action_idempotency_conflict");
    },
    saveExecutionResult: async () => undefined,
  });

  await expect(
    executeAssistantActionPlan(
      {
        plan,
        actorId: "user-1",
        idempotencyKey: "assistant-house-projects-conflict-1",
      },
      deps
    )
  ).rejects.toThrow("assistant_action_idempotency_conflict");
});

test("dryRunAssistantActionPlan supports product catalog preset through the same executor contract", async () => {
  const plan = buildCatalogFamilyPlan(PRODUCT_CATALOG_PRESET, {
    promptKind: "setup_request",
    intentFamily: "product_catalog",
  });

  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes).toHaveLength(6);
  expect(preview.changes.some((change) => change.targetKey === "products")).toBe(true);
  expect(preview.changes.some((change) => change.targetKey === "/produkty")).toBe(true);
});

test("dryRunAssistantActionPlan previews site-kit recommend and install actions", async () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  const preview = await dryRunAssistantActionPlan({ plan }, createDeps());

  expect(preview.readyToExecute).toBe(true);
  expect(preview.changes.map((change) => change.type)).toEqual([
    "site-kit.recommend",
    "site-kit.install",
  ]);
  expect(preview.changes[0]?.operation).toBe("noop");
  expect(preview.changes[1]?.operation).toBe("create");
  expect(preview.changes[1]?.details?.siteKit?.plan?.selectedKitId).toBe("automotive-workshop");
});

test("executeAssistantActionPlan delegates site-kit install to guided site-builder executor", async () => {
  const plan = planAssistantActions({
    prompt: "prepare a starter site kit",
    context: {
      locale: "en",
      siteKit: {
        businessType: "automotive_workshop",
        goals: ["lead_generation"],
        locale: "en",
        selectedKitId: "automotive-workshop",
        enabledStepIds: ["settings", "pages", "qa"],
      },
    },
  });

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-site-kit-install-1",
    },
    createDeps()
  );

  const installResult = result.results.find((item) => item.type === "site-kit.install");
  expect(result.summary.failed).toBe(0);
  expect(result.summary.create).toBe(1);
  expect(result.summary.noop).toBe(1);
  expect(installResult?.resourceId).toBe("run-site-kit-1");
  expect(installResult?.details?.siteKit?.execution?.validation.status).toBe("ok");
});

test("executeAssistantActionPlan refines existing house-project catalog without creating duplicate page", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-initial",
    },
    deps
  );

  const refinementPlan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/advanced/widgets",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.create).toBe(0);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "listing-filters")).toBe(true);
});

test("executeAssistantActionPlan adds inquiry form without creating duplicate page", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-form-initial",
    },
    deps
  );

  const refinementPlan = planAssistantActions({
    prompt: "dodaj formularz zapytania do strony szczegolowej",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-form-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.create).toBe(1);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.forms).toHaveLength(1);
  const form = deps.__state.forms[0];
  if (!form) throw new Error("missing_form");
  expect(deps.__state.formFields.get(form.id)?.length).toBeGreaterThan(0);
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "form-embed")).toBe(true);
});

test("executeAssistantActionPlan creates product inquiry catalog and form", async () => {
  const deps = createDeps();
  const plan = buildProductInquiryCatalogPlan();

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-product-inquiry",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(deps.__state.contentTypes.some((entry) => entry.slug === "products")).toBe(true);
  expect(deps.__state.forms[0]?.slug).toBe("product-catalog-inquiry");
  expect(deps.__state.pages[0]?.slug).toBe("/produkty");
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "form-embed")).toBe(true);
  expect(
    (deps.__state.pages[0]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    pageRole: "canonical-list-page",
    listingQueryId: deps.__state.listingQueries[0]?.id,
    listingTemplateId: deps.__state.listingTemplates[0]?.id,
  });
  expect(
    (
      deps.__state.pages[0]?.currentData.settings as {
        collectionLink?: { contentTypeId?: string };
      }
    )?.collectionLink?.contentTypeId
  ).toBe(deps.__state.contentTypes[0]?.id);
});

test("executeAssistantActionPlan resolves supporting page collection links from content type slugs", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link",
    status: "ready",
    intentId: "supporting-page-collection-link",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting products page.",
    summary: "Supporting products page with an explicit collection link.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-products-comparison",
        type: "page.upsert",
        title: "Create products comparison page",
        description: "Create a supporting page linked to the products collection.",
        input: {
          title: "Compare Products",
          slug: "/compare-products",
          status: "draft",
          introTitle: "Compare products",
          introBody: "Pick the right model.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Compare products",
              },
            },
          ],
          collectionLink: {
            contentTypeSlug: "products",
            pageRole: "supporting-page",
            compositionKey: "comparison",
          },
        },
      },
    ],
  };

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (deps.__state.pages[0]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    contentTypeId: contentType.id,
    pageRole: "supporting-page",
    compositionKey: "comparison",
  });
});

test("executeAssistantActionPlan resolves supporting page collection-link listing locators into persisted ids", async () => {
  const deps = createDeps();
  const plan = buildProductInquiryCatalogPlan();
  plan.actions.push({
    id: "page-products-comparison",
    type: "page.upsert",
    title: "Create products comparison page",
    description: "Create a supporting page linked to the products collection.",
    input: {
      title: "Compare Products",
      slug: "/compare-products",
      status: "draft",
      introTitle: "Compare products",
      introBody: "Pick the right model.",
      blocks: [
        {
          id: "hero-1",
          type: "hero",
          variant: "centered",
          data: {
            headline: "Compare products",
          },
        },
      ],
      collectionLink: {
        contentTypeSlug: PRODUCT_CATALOG_PRESET.contentTypeSlug,
        pageRole: "supporting-page",
        compositionKey: "comparison",
        listingQueryName: PRODUCT_CATALOG_PRESET.listingQueryName,
        listingTemplateSlug: PRODUCT_CATALOG_PRESET.listingTemplateSlug,
      },
    },
  });

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link-locators",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (deps.__state.pages[1]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    contentTypeId: deps.__state.contentTypes[0]?.id,
    pageRole: "supporting-page",
    compositionKey: "comparison",
    listingQueryId: deps.__state.listingQueries[0]?.id,
    listingTemplateId: deps.__state.listingTemplates[0]?.id,
  });
});

test("executeAssistantActionPlan accepts supporting page collection-link ids without name locators", async () => {
  const deps = createDeps();
  const contentType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  const query = await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: contentType.id,
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });
  const template = await deps.createListingTemplate({
    name: "Products Grid",
    slug: "products-grid",
    description: "Products template",
    layout: "grid",
    config: { fields: [] },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-ids",
    status: "ready",
    intentId: "supporting-page-collection-link-ids",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting products page.",
    summary: "Supporting page with persisted collection-link ids.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-products-comparison",
        type: "page.upsert",
        title: "Create products comparison page",
        description: "Create a supporting page linked to the products collection.",
        input: {
          title: "Compare Products",
          slug: "/compare-products",
          status: "draft",
          introTitle: "Compare products",
          introBody: "Pick the right model.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Compare products",
              },
            },
          ],
          collectionLink: {
            contentTypeId: contentType.id,
            pageRole: "supporting-page",
            compositionKey: "comparison",
            listingQueryId: query.id,
            listingTemplateId: template.id,
          },
        },
      },
    ],
  };

  const result = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link-ids",
    },
    deps
  );

  expect(result.summary.failed).toBe(0);
  expect(
    (deps.__state.pages[0]?.currentData.settings as { collectionLink?: Record<string, unknown> })
      ?.collectionLink
  ).toMatchObject({
    contentTypeId: contentType.id,
    pageRole: "supporting-page",
    compositionKey: "comparison",
    listingQueryId: query.id,
    listingTemplateId: template.id,
  });
});

test("dryRunAssistantActionPlan flags conflicting supporting page collection-link locators", async () => {
  const deps = createDeps();
  await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createContentType({
    name: "Cars",
    slug: "cars",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: "ct-1",
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-preview-conflict",
    status: "ready",
    intentId: "supporting-page-collection-link-preview-conflict",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Preview conflicting supporting page",
    answer: "I can preview a conflicting supporting page.",
    summary: "Supporting page with conflicting collection locators.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-cars-comparison",
        type: "page.upsert",
        title: "Create cars comparison page",
        description: "Create a supporting page linked to the cars collection.",
        input: {
          title: "Compare Cars",
          slug: "/compare-cars",
          status: "draft",
          introTitle: "Compare cars",
          introBody: "Pick the right model.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Compare cars",
              },
            },
          ],
          collectionLink: {
            contentTypeSlug: "cars",
            pageRole: "supporting-page",
            listingQueryName: "Products Query",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);

  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_conflict");
});

test("executeAssistantActionPlan rejects conflicting collection-link content type and listing locators", async () => {
  const deps = createDeps();
  const productsType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createContentType({
    name: "Cars",
    slug: "cars",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: productsType.id,
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-conflict",
    status: "ready",
    intentId: "supporting-page-collection-link-conflict",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting cars page.",
    summary: "Supporting page with conflicting collection locators.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-cars-comparison",
        type: "page.upsert",
        title: "Create cars comparison page",
        description: "Create a supporting page linked to the cars collection.",
        input: {
          title: "Compare Cars",
          slug: "/compare-cars",
          status: "draft",
          introTitle: "Compare cars",
          introBody: "Pick the right model.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Compare cars",
              },
            },
          ],
          collectionLink: {
            contentTypeSlug: "cars",
            pageRole: "supporting-page",
            listingQueryName: "Products Query",
          },
        },
      },
    ],
  };

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link-conflict",
    },
    deps
  );

  expect(executed.summary.failed).toBe(1);
  expect(executed.results[0]?.errorCode).toBe("assistant_action_dependency_conflict");
});

test("executeAssistantActionPlan rejects stale supporting page collection-link listing ids", async () => {
  const deps = createDeps();
  const productsType = await deps.createContentType({
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {},
    },
  });
  await deps.createListingQuery({
    name: "Products Query",
    description: "Products listing",
    query: {
      source: "entries",
      sourceConfig: {
        contentTypeId: productsType.id,
      },
      filters: [],
      sort: [],
      pagination: { limit: 12, offset: 0 },
      fields: ["title"],
    },
  });

  const plan: AssistantActionPlan = {
    id: "plan-supporting-page-collection-link-stale-id",
    status: "ready",
    intentId: "supporting-page-collection-link-stale-id",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create supporting page",
    answer: "I can create a supporting products page.",
    summary: "Supporting page with stale listing ids.",
    confidence: 0.82,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "page-products-comparison",
        type: "page.upsert",
        title: "Create products comparison page",
        description: "Create a supporting page linked to the products collection.",
        input: {
          title: "Compare Products",
          slug: "/compare-products",
          status: "draft",
          introTitle: "Compare products",
          introBody: "Pick the right model.",
          blocks: [
            {
              id: "hero-1",
              type: "hero",
              variant: "centered",
              data: {
                headline: "Compare products",
              },
            },
          ],
          collectionLink: {
            contentTypeSlug: "products",
            pageRole: "supporting-page",
            listingQueryId: "query-stale",
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);
  expect(preview.changes[0]?.conflicts[0]?.code).toBe("assistant_action_dependency_missing");

  const executed = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-supporting-page-collection-link-stale-id",
    },
    deps
  );

  expect(executed.summary.failed).toBe(1);
  expect(executed.results[0]?.errorCode).toBe("assistant_action_dependency_missing");
});

test("dryRunAssistantActionPlan flags detail-page upserts whose content type does not exist", async () => {
  const deps = createDeps();

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-missing-content-type",
    status: "ready",
    intentId: "detail-page-missing-content-type",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can preview the detail template.",
    summary: "Preview a detail template with a missing content type.",
    confidence: 0.84,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: {
            schemaVersion: 1,
            id: "24d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            name: "Products detail template",
            contentTypeId: "94d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            contentTypeSlug: "products",
            status: "draft",
            titlePattern: "{{ title }}",
            settings: {
              template: "detail",
              layout: {
                wrapper: {
                  container: "default",
                  padding: { top: "md", bottom: "lg" },
                  background: {
                    color: "#ffffff",
                    image: null,
                    media: {
                      type: "none",
                      source: "external",
                      src: null,
                    },
                  },
                },
                sections: {
                  gap: "lg",
                  defaults: {
                    container: "default",
                    padding: { top: "xl", bottom: "xl" },
                    margin: { top: "none", bottom: "none" },
                  },
                },
                applyDefaultsToNewBlocks: false,
              },
            },
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                variant: "centered",
                data: {
                  headline: "Products detail",
                },
              },
            ],
            bindings: [],
          },
        },
      },
    ],
  };

  const preview = await dryRunAssistantActionPlan({ plan }, deps);

  expect(preview.changes[0]?.conflicts[0]?.code).toBe("detail_page_invalid");
});

test("executeAssistantActionPlan upserts detail-page documents through the content-domain seam", async () => {
  const deps = createDeps();
  const contentType = {
    id: "64d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
    name: "Products",
    slug: "products",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        headline: { type: "string", xFieldType: "text" },
      },
    },
    createdAt: new Date("2026-04-10T12:00:00.000Z"),
    updatedAt: new Date("2026-04-10T12:00:00.000Z"),
  };
  deps.__state.contentTypes.push(contentType);

  const plan: AssistantActionPlan = {
    id: "plan-detail-page-upsert",
    status: "ready",
    intentId: "detail-page-upsert",
    promptKind: "setup_request",
    intentFamily: "product_catalog",
    title: "Create detail template",
    answer: "I can create the detail template.",
    summary: "Create a products detail template.",
    confidence: 0.91,
    assumptions: [],
    questions: [],
    actions: [
      {
        id: "detail-page-products",
        type: "detail-page.upsert",
        title: "Create products detail template",
        description: "Create a products detail template.",
        input: {
          document: {
            schemaVersion: 1,
            id: "34d7f4d4-48d8-53f7-a9e6-0d01f6b89e6c",
            name: "Products detail template",
            contentTypeId: contentType.id,
            contentTypeSlug: "stale-products-slug",
            status: "published",
            titlePattern: "{{ title }}",
            settings: {
              template: "detail",
              layout: {
                wrapper: {
                  container: "default",
                  padding: { top: "md", bottom: "lg" },
                  background: {
                    color: "#ffffff",
                    image: null,
                    media: {
                      type: "none",
                      source: "external",
                      src: null,
                    },
                  },
                },
                sections: {
                  gap: "lg",
                  defaults: {
                    container: "default",
                    padding: { top: "xl", bottom: "xl" },
                    margin: { top: "none", bottom: "none" },
                  },
                },
                applyDefaultsToNewBlocks: false,
              },
            },
            blocks: [
              {
                id: "hero-1",
                type: "hero",
                variant: "centered",
                data: {
                  headline: "Products detail",
                },
              },
            ],
            bindings: [],
          },
        },
      },
    ],
  };

  const first = await executeAssistantActionPlan(
    {
      plan,
      actorId: "user-1",
      idempotencyKey: "assistant-detail-page-upsert-1",
    },
    deps
  );

  expect(first.summary.failed).toBe(0);
  expect(first.summary.create).toBe(1);
  expect(deps.__state.detailPages).toHaveLength(1);
  expect(deps.__state.detailPages[0]?.currentDocument.contentTypeSlug).toBe("products");
  expect(deps.__state.detailPages[0]?.publishedDocument?.contentTypeSlug).toBe("products");

  const detailAction = plan.actions[0];
  if (!detailAction || detailAction.type !== "detail-page.upsert") {
    throw new Error("missing_detail_page_action");
  }

  const second = await executeAssistantActionPlan(
    {
      plan: {
        ...plan,
        actions: [
          {
            ...detailAction,
            input: {
              ...detailAction.input,
              document: {
                ...detailAction.input.document,
                name: "Products detail template updated",
                status: "draft",
              },
            },
          },
        ],
      },
      actorId: "user-1",
      idempotencyKey: "assistant-detail-page-upsert-2",
    },
    deps
  );

  expect(second.summary.failed).toBe(0);
  expect(second.summary.update).toBe(1);
  expect(deps.__state.detailPages).toHaveLength(1);
  expect(deps.__state.detailPages[0]?.name).toBe("Products detail template updated");
  expect(deps.__state.detailPages[0]?.status).toBe("draft");
  expect(deps.__state.detailPages[0]?.publishedDocument).toBeNull();
});

test("executeAssistantActionPlan resolves renamed listing resources from existing page state", async () => {
  const deps = createDeps();
  const initialPlan = buildHouseProjectsCatalogPlan();

  await executeAssistantActionPlan(
    {
      plan: initialPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-renamed-initial",
    },
    deps
  );

  const query = deps.__state.listingQueries[0];
  const template = deps.__state.listingTemplates[0];
  if (!query || !template) throw new Error("missing_listing_resources");
  query.name = "Renamed editorial query";
  template.slug = "renamed-editorial-template";

  const refinementPlan = planAssistantActions({
    prompt: "dodaj filtr po metrazu i liczbie pokoi",
    context: {
      page: "/admin/pages/projekty-domow",
      locale: "pl-PL",
    },
  });

  const refinementResult = await executeAssistantActionPlan(
    {
      plan: refinementPlan,
      actorId: "user-1",
      idempotencyKey: "assistant-house-projects-renamed-refinement",
    },
    deps
  );

  expect(refinementResult.summary.failed).toBe(0);
  expect(refinementResult.summary.update).toBeGreaterThan(0);
  expect(deps.__state.pages).toHaveLength(1);
  expect(deps.__state.listingQueries).toHaveLength(1);
  expect(deps.__state.listingTemplates).toHaveLength(1);
  const pageBlocks = deps.__state.pages[0]?.currentData.blocks as Array<{ type?: string }>;
  expect(pageBlocks.some((block) => block.type === "listing-filters")).toBe(true);
});
