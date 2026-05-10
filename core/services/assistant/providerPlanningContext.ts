import type { DocsAnswerSource, DocsSearchHit } from "./docsTypes";
import type { AssistantActionContext, AssistantAdminRuntimeSnapshot } from "./actionPlanTypes";
import type { AssistantResourceCatalogSnapshot } from "./adminContextTypes";
import {
  buildAssistantAdminContext,
  sanitizeAssistantPlanningContext,
} from "./adminContextService";
import { redactAssistantMetadata, redactAssistantText } from "./assistantRedaction";
import { assistantOperationPolicy } from "./operationPolicy/assistantOperationPolicy";
import {
  buildProviderOperationDraftGuidance,
  buildProviderPolicyGuidance,
  buildProviderPolicyRegistry,
  type AssistantProviderPolicyGuidance,
} from "./operationPolicy/providerGuidance";
import {
  buildBlueprintProviderContext,
  type BlueprintProviderContextPackage,
} from "./blueprints/blueprintProviderContext";

export type AssistantProviderPlanningEvidence =
  | DocsSearchHit
  | DocsAnswerSource
  | {
      path?: unknown;
      title?: unknown;
      heading?: unknown;
      content?: unknown;
      snippet?: unknown;
      score?: unknown;
    };

export type AssistantProviderPlanningPromptInput = {
  prompt: string;
  context?: AssistantActionContext;
  evidence?: AssistantProviderPlanningEvidence[];
  maxDocs?: number;
  maxCharsPerDoc?: number;
  maxResourceItemsPerGroup?: number;
};

export type AssistantProviderPlanningPromptPackage = {
  schemaVersion: 1;
  prompt: string;
  locale: string | null;
  route: string | null;
  runtime: {
    route: string | null;
    activeHref: string | null;
    area: string;
    advancedModule: string | null;
    selectedResource: { kind: string; id: string } | null;
    visibleActions: Array<{
      id: string;
      kind: string;
      href: string | null;
      requiredPermission: string | null;
    }>;
  } | null;
  docs: Array<{
    path: string;
    heading: string;
    content: string;
    score: number | null;
  }>;
  resources: {
    schemaVersion: 1;
    budget: AssistantResourceCatalogSnapshot["budget"];
    pages: NonNullable<AssistantResourceCatalogSnapshot["pages"]>;
    posts: NonNullable<AssistantResourceCatalogSnapshot["posts"]>;
    entries: NonNullable<AssistantResourceCatalogSnapshot["entries"]>;
    contentTypes: AssistantResourceCatalogSnapshot["contentTypes"];
    customScreens: AssistantResourceCatalogSnapshot["customScreens"];
    listings: AssistantResourceCatalogSnapshot["listings"];
    forms: AssistantResourceCatalogSnapshot["forms"];
    menus: AssistantResourceCatalogSnapshot["menus"];
    seoDocuments: AssistantResourceCatalogSnapshot["seoDocuments"];
    widgets: AssistantResourceCatalogSnapshot["widgets"];
    media: NonNullable<AssistantResourceCatalogSnapshot["media"]>;
    commerce: {
      products: NonNullable<NonNullable<AssistantResourceCatalogSnapshot["commerce"]>["products"]>;
      collections: NonNullable<
        NonNullable<AssistantResourceCatalogSnapshot["commerce"]>["collections"]
      >;
    };
    solutionKits: NonNullable<AssistantResourceCatalogSnapshot["solutionKits"]>;
    warnings: string[];
  } | null;
  blueprints: BlueprintProviderContextPackage;
  registry: Array<{
    kind: string;
    aliases: string[];
    supportedOperations: string[];
    readPermissions: string[];
  }>;
  policyGuidance: AssistantProviderPolicyGuidance;
  operationDraftGuidance: {
    notes: string[];
    examples: Array<{
      prompt: string;
      draft: Record<string, unknown>;
    }>;
  };
  activeSurface: AssistantActionContext["activeSurface"];
  collectionWorkspace: AssistantActionContext["collectionWorkspace"];
  warnings: string[];
};

const DEFAULT_MAX_DOCS = 5;
const DEFAULT_MAX_CHARS_PER_DOC = 1_200;
const DEFAULT_MAX_RESOURCE_ITEMS_PER_GROUP = 20;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readString = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const clampPositiveInteger = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isFinite(value) ? Math.max(1, Math.floor(value)) : fallback;

const readEvidence = (value: AssistantProviderPlanningEvidence) => {
  if ("chunk" in value && isRecord(value.chunk)) {
    return {
      path: readString(value.chunk.docPath) ?? "unknown",
      heading: readString(value.chunk.heading) ?? readString(value.chunk.docTitle) ?? "Untitled",
      content: readString(value.chunk.content) ?? readString(value.snippet) ?? "",
      score: readNumber(value.score),
    };
  }

  const record = value as Record<string, unknown>;
  return {
    path: readString(record.path) ?? "unknown",
    heading: readString(record.heading) ?? readString(record.title) ?? "Untitled",
    content: readString(record.content) ?? readString(record.snippet) ?? "",
    score: readNumber(record.score),
  };
};

const buildDocs = (
  evidence: AssistantProviderPlanningEvidence[] | undefined,
  maxDocs: number,
  maxCharsPerDoc: number,
  warnings: string[]
): AssistantProviderPlanningPromptPackage["docs"] => {
  const source = Array.isArray(evidence) ? evidence : [];
  if (source.length > maxDocs) warnings.push("docs_truncated");

  return source.slice(0, maxDocs).map((entry) => {
    const item = readEvidence(entry);
    const content = redactAssistantText(item.content, maxCharsPerDoc);
    if (item.content.length > maxCharsPerDoc) warnings.push("doc_content_truncated");
    return {
      path: redactAssistantText(item.path, 240),
      heading: redactAssistantText(item.heading, 240),
      content,
      score: item.score,
    };
  });
};

const clampItems = <T>(items: T[], max: number, warning: string, warnings: string[]) => {
  if (items.length > max) warnings.push(warning);
  return items.slice(0, max);
};

const buildResources = (
  catalog: AssistantResourceCatalogSnapshot | null,
  maxItemsPerGroup: number,
  warnings: string[]
): AssistantProviderPlanningPromptPackage["resources"] => {
  if (!catalog) return null;
  return {
    schemaVersion: 1,
    budget: catalog.budget,
    pages: clampItems(catalog.pages ?? [], maxItemsPerGroup, "pages_truncated", warnings),
    posts: clampItems(catalog.posts ?? [], maxItemsPerGroup, "posts_truncated", warnings),
    entries: clampItems(catalog.entries ?? [], maxItemsPerGroup, "entries_truncated", warnings),
    contentTypes: clampItems(
      catalog.contentTypes,
      maxItemsPerGroup,
      "content_types_truncated",
      warnings
    ),
    customScreens: clampItems(
      catalog.customScreens,
      maxItemsPerGroup,
      "custom_screens_truncated",
      warnings
    ),
    listings: {
      queries: clampItems(
        catalog.listings.queries,
        maxItemsPerGroup,
        "listing_queries_truncated",
        warnings
      ),
      templates: clampItems(
        catalog.listings.templates,
        maxItemsPerGroup,
        "listing_templates_truncated",
        warnings
      ),
    },
    forms: clampItems(catalog.forms, maxItemsPerGroup, "forms_truncated", warnings),
    menus: clampItems(catalog.menus, maxItemsPerGroup, "menus_truncated", warnings),
    seoDocuments: clampItems(
      catalog.seoDocuments,
      maxItemsPerGroup,
      "seo_documents_truncated",
      warnings
    ),
    widgets: clampItems(catalog.widgets, maxItemsPerGroup, "widgets_truncated", warnings),
    media: clampItems(catalog.media ?? [], maxItemsPerGroup, "media_truncated", warnings),
    commerce: {
      products: clampItems(
        catalog.commerce?.products ?? [],
        maxItemsPerGroup,
        "commerce_products_truncated",
        warnings
      ),
      collections: clampItems(
        catalog.commerce?.collections ?? [],
        maxItemsPerGroup,
        "commerce_collections_truncated",
        warnings
      ),
    },
    solutionKits: clampItems(
      catalog.solutionKits ?? [],
      maxItemsPerGroup,
      "solution_kits_truncated",
      warnings
    ),
    warnings: [...catalog.warnings],
  };
};

const buildRuntime = (snapshot: AssistantAdminRuntimeSnapshot | null) => {
  if (!snapshot) return null;
  return {
    route: snapshot.route,
    activeHref: snapshot.activeHref,
    area: snapshot.area,
    advancedModule: snapshot.advancedModule,
    selectedResource: snapshot.selectedResource,
    visibleActions: snapshot.visibleActions.map((action) => ({
      id: redactAssistantText(action.id, 120),
      kind: action.kind,
      href: action.href,
      requiredPermission: action.requiredPermission,
    })),
  };
};

const providerPolicyGuidance = buildProviderPolicyGuidance(assistantOperationPolicy);
const providerPolicyRegistry = buildProviderPolicyRegistry(assistantOperationPolicy);
const providerOperationDraftGuidance =
  buildProviderOperationDraftGuidance(assistantOperationPolicy);

export const buildProviderPlanningPromptPackage = (
  input: AssistantProviderPlanningPromptInput
): AssistantProviderPlanningPromptPackage => {
  const warnings: string[] = [];
  const context = buildAssistantAdminContext(sanitizeAssistantPlanningContext(input.context));
  const maxDocs = clampPositiveInteger(input.maxDocs, DEFAULT_MAX_DOCS);
  const maxCharsPerDoc = clampPositiveInteger(input.maxCharsPerDoc, DEFAULT_MAX_CHARS_PER_DOC);
  const maxResourceItemsPerGroup = clampPositiveInteger(
    input.maxResourceItemsPerGroup,
    DEFAULT_MAX_RESOURCE_ITEMS_PER_GROUP
  );

  const promptPackage: AssistantProviderPlanningPromptPackage = {
    schemaVersion: 1,
    prompt: redactAssistantText(input.prompt, 2_000),
    locale: context.locale,
    route: context.route,
    runtime: buildRuntime(context.runtimeSnapshot),
    docs: buildDocs(input.evidence, maxDocs, maxCharsPerDoc, warnings),
    resources: buildResources(context.resourceCatalog, maxResourceItemsPerGroup, warnings),
    blueprints: buildBlueprintProviderContext({
      maxCapabilities: maxResourceItemsPerGroup,
    }),
    registry: providerPolicyRegistry,
    policyGuidance: providerPolicyGuidance,
    operationDraftGuidance: providerOperationDraftGuidance,
    activeSurface: context.activeSurface,
    collectionWorkspace: context.collectionWorkspace,
    warnings,
  };

  return redactAssistantMetadata(promptPackage) as AssistantProviderPlanningPromptPackage;
};
