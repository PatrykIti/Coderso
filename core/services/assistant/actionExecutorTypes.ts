// Shared action-executor types. Extracted from the legacy actionExecutorService monolith (TASK-569-01); type bodies are byte-identical.

import type { getSetting, setSetting } from "../settings/settingsService";
import type {
  getContentType,
  ContentTypeRecord,
  CreateContentTypeInput,
  UpdateContentTypeInput,
} from "../content/typeService";
import type {
  createCustomScreen,
  deleteCustomScreen,
  getCustomScreen,
  listCustomScreens,
  updateCustomScreen,
} from "../customScreens/customScreenService";
import type { ScreenBlockV1, ScreenDocumentV1 } from "../customScreens/customScreenSchemas";
import type {
  createListingQuery,
  deleteListingQuery,
  listListingQueries,
  updateListingQuery,
} from "../content/listingQueriesService";
import type {
  createListingTemplate,
  deleteListingTemplate,
  listListingTemplates,
  updateListingTemplate,
} from "../content/listingTemplatesService";
import type {
  getDetailPageDocument,
  prepareDetailPageDocumentUpsert,
  upsertDetailPageDocument,
} from "../content/detailPageDocumentService";
import type {
  createEntry,
  deleteEntry,
  getEntry,
  getEntryBySlug,
  publishEntry,
  updateEntry,
  updateEntryMetadata,
} from "../content/entryService";
import type {
  createPage,
  deletePage,
  getPage,
  getPageBySlug,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
} from "../pages/pageService";
import type {
  deleteSeoDocument,
  getSeoDocument,
  getSeoDocumentByTarget,
  updateSeoDocumentById,
  upsertSeoDocument,
} from "../seo/seoService";
import type {
  deleteWidgetTemplate,
  getWidgetTemplate,
  listWidgetTemplates,
  updateWidgetTemplate,
} from "../widgets/widgetTemplateService";
import type {
  countFormSubmissions,
  createForm,
  deleteForm,
  getForm,
  listForms,
  setFormFields,
  updateForm,
} from "../forms/formsService";
import type { listFormActions, setFormActions } from "../forms/formActionsService";
import type {
  createMenu,
  deleteMenuItem,
  listMenus,
  listMenuItems,
  replaceMenuItems,
  updateMenu,
} from "../menus/menuService";
import type { getMediaById } from "../media/mediaService";
import type { logAudit } from "../audit/auditService";
import type {
  AssistantActionExecuteResult,
  AssistantActionExecutionItem,
  AssistantActionPreviewChange,
  AssistantPlannedAction,
} from "./actionPlanTypes";
import type {
  executeGuidedSiteBuilder,
  previewGuidedSiteBuilderPlan,
  validateGuidedSiteBuilderRun,
} from "./siteBuilderExecutor";
import type {
  getAssistantActionExecutionByIdempotencyKey,
  saveAssistantActionExecutionResult,
} from "./actionExecutionStore";

export type ExecutionCacheEntry = {
  result: AssistantActionExecuteResult;
  actorId: string;
  planId: string;
  planHash: string;
  savedAt: number;
};

export type ListingResourceReferenceTarget = {
  listingQueryId?: string | null;
  listingTemplateId?: string | null;
};

export type ListingResourceReference = {
  containerType: "page" | "widget-template";
  containerId: string;
  containerName: string;
  adminHref: string;
};

export type ActionExecutorDeps = {
  getSetting: typeof getSetting;
  setSetting: typeof setSetting;
  getContentType: typeof getContentType;
  getContentTypeBySlug: (slug: string) => Promise<ContentTypeRecord | null>;
  getDetailPageDocument: typeof getDetailPageDocument;
  prepareDetailPageDocumentUpsert: typeof prepareDetailPageDocumentUpsert;
  upsertDetailPageDocument: typeof upsertDetailPageDocument;
  createContentType: (input: CreateContentTypeInput) => Promise<ContentTypeRecord>;
  deleteContentType: (id: string) => Promise<ContentTypeRecord | null>;
  updateContentType: (
    id: string,
    input: UpdateContentTypeInput
  ) => Promise<ContentTypeRecord | null>;
  listCustomScreens: typeof listCustomScreens;
  createCustomScreen: typeof createCustomScreen;
  updateCustomScreen: typeof updateCustomScreen;
  getCustomScreen: typeof getCustomScreen;
  deleteCustomScreen: typeof deleteCustomScreen;
  listListingQueries: typeof listListingQueries;
  createListingQuery: typeof createListingQuery;
  deleteListingQuery: typeof deleteListingQuery;
  updateListingQuery: typeof updateListingQuery;
  listListingTemplates: typeof listListingTemplates;
  createListingTemplate: typeof createListingTemplate;
  deleteListingTemplate: typeof deleteListingTemplate;
  updateListingTemplate: typeof updateListingTemplate;
  getPageBySlug: typeof getPageBySlug;
  getPage: typeof getPage;
  listPages: typeof listPages;
  createPage: typeof createPage;
  deletePage: typeof deletePage;
  updatePage: typeof updatePage;
  publishPage: typeof publishPage;
  unpublishPage: typeof unpublishPage;
  getWidgetTemplate: typeof getWidgetTemplate;
  listWidgetTemplates: typeof listWidgetTemplates;
  deleteWidgetTemplate: typeof deleteWidgetTemplate;
  updateWidgetTemplate: typeof updateWidgetTemplate;
  getForm: typeof getForm;
  listForms: typeof listForms;
  countFormSubmissions: typeof countFormSubmissions;
  createForm: typeof createForm;
  deleteForm: typeof deleteForm;
  updateForm: typeof updateForm;
  setFormFields: typeof setFormFields;
  listFormActions: typeof listFormActions;
  setFormActions: typeof setFormActions;
  getEntryBySlug: typeof getEntryBySlug;
  createEntry: typeof createEntry;
  deleteEntry: typeof deleteEntry;
  updateEntry: typeof updateEntry;
  publishEntry: typeof publishEntry;
  updateEntryMetadata: typeof updateEntryMetadata;
  getEntry: typeof getEntry;
  listMenus: typeof listMenus;
  createMenu: typeof createMenu;
  updateMenu: typeof updateMenu;
  deleteMenuItem: typeof deleteMenuItem;
  listMenuItems: typeof listMenuItems;
  replaceMenuItems: typeof replaceMenuItems;
  getSeoDocument: typeof getSeoDocument;
  deleteSeoDocument: typeof deleteSeoDocument;
  getSeoDocumentByTarget: typeof getSeoDocumentByTarget;
  updateSeoDocumentById: typeof updateSeoDocumentById;
  upsertSeoDocument: typeof upsertSeoDocument;
  getMediaById: typeof getMediaById;
  logAudit: typeof logAudit;
  previewSiteKitPlan: typeof previewGuidedSiteBuilderPlan;
  executeSiteKit: typeof executeGuidedSiteBuilder;
  validateSiteKitRun: typeof validateGuidedSiteBuilderRun;
  getExecutionResult?: typeof getAssistantActionExecutionByIdempotencyKey;
  saveExecutionResult?: typeof saveAssistantActionExecutionResult;
};

export type CustomScreenRecord = Awaited<
  ReturnType<ActionExecutorDeps["listCustomScreens"]>
>[number];

export type ListingQueryRecord = Awaited<
  ReturnType<ActionExecutorDeps["listListingQueries"]>
>[number];

export type ScreenBlockDataPatchResult = {
  status: "ok" | "missing_block" | "type_mismatch" | "missing_path";
  document: ScreenDocumentV1;
  beforeValue: unknown;
  nextValue: unknown;
  block: ScreenBlockV1 | null;
};

export type ActionHandlerContext = {
  deps: ActionExecutorDeps;
  actorId: string;
  planActions?: AssistantPlannedAction[];
  actionIndex?: number;
  priorResults?: Map<string, AssistantActionExecutionItem>;
};

export type AssistantActionHandler = {
  preview: (
    action: AssistantPlannedAction,
    ctx: ActionHandlerContext
  ) => Promise<AssistantActionPreviewChange>;
  execute: (
    action: AssistantPlannedAction,
    preview: AssistantActionPreviewChange,
    ctx: ActionHandlerContext
  ) => Promise<AssistantActionExecutionItem>;
};
