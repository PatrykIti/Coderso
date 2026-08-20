import type { CustomScreenCapabilities } from "../../../../core/services/customScreens/capabilities";
import type { ListingQuery } from "../../../../core/services/content/queryBuilderService";
import type { DetailPageDocument } from "../../../../core/services/content/detailPageTypes";
import {
  type CustomScreenBinding,
  type CustomScreenCollectionRole,
  type CustomScreenDefinition,
} from "../../../../core/services/customScreens/customScreenSchemas";
import type { ContentRouteSetting } from "../../../../core/services/settings/settingsService";
import type { LegacyWidgetBlock } from "../../../../core/services/renderContracts/legacyWidgetBlock";

export const createActionExecutorTestState = () => {
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
    collectionRole: CustomScreenCollectionRole | null;
    compositionKey: string | null;
    showInSidebar: boolean;
    sidebarLabel: string | null;
    schemaVersion: 4;
    definition: CustomScreenDefinition;
    blocks: LegacyWidgetBlock[];
    bindings: CustomScreenBinding[];
    capabilities: CustomScreenCapabilities;
    revision: number;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const customScreenUpdateCalls: Array<{
    id: string;
    input: {
      definition?: CustomScreenDefinition;
      expectedRevision?: number;
      [key: string]: unknown;
    };
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
  const menus: Array<{
    id: string;
    name: string;
    location: string | null;
    status: "draft" | "published";
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

  return {
    contentRoutes,
    contentTypes,
    customScreens,
    customScreenUpdateCalls,
    listingQueries,
    listingTemplates,
    pages,
    forms,
    formSubmissionCounts,
    formActions,
    entries,
    menus,
    menuItemsByMenu,
    seoDocuments,
    mediaAssets,
    widgetTemplates,
    detailPages,
    formFields,
  };
};

export type ActionExecutorTestState = ReturnType<typeof createActionExecutorTestState>;
